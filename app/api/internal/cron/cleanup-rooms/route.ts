import { fail, ok } from "@/lib/api/responses";
import { isAuthorizedCronRequest } from "@/lib/cron/auth";
import { createServiceRoleSupabaseClient } from "@/lib/supabase/admin";
import { hasServiceEnv } from "@/lib/env";

export const dynamic = "force-dynamic";

// 종료 후 보관 유예 시간(§4: 48h)
const RETENTION_GRACE_HOURS = 48;

type ClosedRoom = {
  id: string;
  card_id: string;
  closed_at: string;
};

type MessageRow = {
  id: string;
  sender_id: string;
  body: string;
  created_at: string;
};

/**
 * Mate_Backend_Spec.md §4:
 * 종료 48h 경과 room의 messages를 하드 삭제하고 retention_archive로 이관한다.
 * 단, reports.frozen_until이 미래로 걸린 room은 제외한다(증거 보존).
 *
 * 참고: rooms close 시점에 이미 messages를 삭제하지만, 이 배치는
 *  (a) 어떤 이유로 남아있는 메시지의 최종 정리
 *  (b) 동결 해제된 room의 지연 정리
 * 를 담당하는 안전망이다. archive_payload에는 삭제 시점 스냅샷을 남긴다.
 */
export async function POST(request: Request) {
  if (!isAuthorizedCronRequest(request)) {
    return fail({ code: "UNAUTHORIZED", message: "허가되지 않은 요청입니다." }, 401);
  }

  if (!hasServiceEnv()) {
    return fail({ code: "SERVER_CONFIG_MISSING", message: "서버 환경변수 설정이 필요합니다." }, 500);
  }

  const admin = createServiceRoleSupabaseClient();
  const cutoffIso = new Date(Date.now() - RETENTION_GRACE_HOURS * 60 * 60 * 1000).toISOString();
  const nowIso = new Date().toISOString();

  const { data: rooms, error: roomsError } = await admin
    .from("rooms")
    .select("id, card_id, closed_at")
    .eq("status", "closed")
    .lte("closed_at", cutoffIso)
    .returns<ClosedRoom[]>();

  if (roomsError) {
    return fail({ code: "ROOM_LOOKUP_FAILED", message: "방을 조회하지 못했어요." }, 500);
  }

  const summary = {
    scanned: rooms?.length ?? 0,
    cleaned: 0,
    skippedFrozen: 0,
    archived: 0,
    errors: 0
  };

  for (const room of rooms ?? []) {
    try {
      // 동결(frozen_until 미래)된 신고가 걸린 room은 건너뛴다.
      const { data: frozen } = await admin
        .from("reports")
        .select("id")
        .eq("target_room_id", room.id)
        .gt("frozen_until", nowIso)
        .limit(1)
        .maybeSingle<{ id: string }>();

      if (frozen) {
        summary.skippedFrozen += 1;
        continue;
      }

      const { data: messages } = await admin
        .from("messages")
        .select("id, sender_id, body, created_at")
        .eq("room_id", room.id)
        .returns<MessageRow[]>();

      // 남은 메시지가 있으면 스냅샷을 archive에 남기고 하드 삭제한다.
      if (messages && messages.length > 0) {
        const { error: archiveError } = await admin.from("retention_archive").insert({
          room_id: room.id,
          reason: "standard_retention",
          archived_payload: {
            card_id: room.card_id,
            closed_at: room.closed_at,
            message_count: messages.length,
            messages
          }
        });

        if (archiveError) {
          summary.errors += 1;
          continue;
        }

        await admin.from("messages").delete().eq("room_id", room.id);
        summary.archived += 1;
      }

      summary.cleaned += 1;
    } catch {
      summary.errors += 1;
    }
  }

  return ok({ summary });
}

// Vercel Cron은 스케줄된 path로 GET 요청을 보낸다(Authorization: Bearer CRON_SECRET 포함).
// POST와 동일하게 처리한다.
export async function GET(request: Request) {
  return POST(request);
}
