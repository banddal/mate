import { fail, ok } from "@/lib/api/responses";
import { isAuthorizedCronRequest } from "@/lib/cron/auth";
import { createServiceRoleSupabaseClient } from "@/lib/supabase/admin";
import { hasServiceEnv } from "@/lib/env";
import { createNotification } from "@/lib/notifications/create";
import { notifyDeadlineImminent } from "@/lib/notifications/deadline-imminent";

export const dynamic = "force-dynamic";

type OpenCard = {
  id: string;
  host_id: string;
  title: string;
  capacity: number;
  deadline_at: string;
};

type ApplicationRow = {
  id: string;
  applicant_id: string;
  status: string;
};

/**
 * Mate_Backend_Spec.md §4 / PRD §5:
 * `deadline_at <= now() and status='open'` 카드를 일괄 해소한다.
 *
 * 카드별 처리:
 *  - 승인된 신청이 하나라도 있으면 → 미승인 신청 rejected_closed, 카드 closed,
 *    room upsert(active), 승인자에게 application_resolved 알림
 *  - 승인된 신청이 없으면 → 카드 cancelled (아무도 확정되지 않음)
 *
 * 거절 개별 통지는 하지 않는다(다크패턴 방지) — 상태만 일괄 전환한다.
 */
export async function POST(request: Request) {
  if (!isAuthorizedCronRequest(request)) {
    return fail({ code: "UNAUTHORIZED", message: "허가되지 않은 요청입니다." }, 401);
  }

  if (!hasServiceEnv()) {
    return fail({ code: "SERVER_CONFIG_MISSING", message: "서버 환경변수 설정이 필요합니다." }, 500);
  }

  const admin = createServiceRoleSupabaseClient();
  const nowIso = new Date().toISOString();

  const { data: cards, error: cardsError } = await admin
    .from("cards")
    .select("id, host_id, title, capacity, deadline_at")
    .eq("status", "open")
    .lte("deadline_at", nowIso)
    .returns<OpenCard[]>();

  if (cardsError) {
    return fail({ code: "CARD_LOOKUP_FAILED", message: "카드를 조회하지 못했어요." }, 500);
  }

  const summary = {
    scanned: cards?.length ?? 0,
    closed: 0,
    cancelled: 0,
    approvedNotified: 0,
    errors: 0
  };

  for (const card of cards ?? []) {
    try {
      const { data: applications } = await admin
        .from("applications")
        .select("id, applicant_id, status")
        .eq("card_id", card.id)
        .returns<ApplicationRow[]>();

      const approved = (applications ?? []).filter((app) => app.status === "approved");

      if (approved.length === 0) {
        // 확정자 없음 → 카드 취소
        const { error: cancelError } = await admin
          .from("cards")
          .update({ status: "cancelled" })
          .eq("id", card.id)
          .eq("status", "open");

        if (cancelError) {
          summary.errors += 1;
          continue;
        }

        // 남은 pending 신청도 정리
        await admin
          .from("applications")
          .update({ status: "rejected_closed" })
          .eq("card_id", card.id)
          .eq("status", "pending");

        summary.cancelled += 1;
        continue;
      }

      // 확정자 있음 → 미승인 신청 일괄 해소 + 카드 마감
      await admin
        .from("applications")
        .update({ status: "rejected_closed" })
        .eq("card_id", card.id)
        .eq("status", "pending");

      const { error: closeError } = await admin
        .from("cards")
        .update({ status: "closed" })
        .eq("id", card.id)
        .eq("status", "open");

      if (closeError) {
        summary.errors += 1;
        continue;
      }

      // room 보장(승인 시 이미 만들어졌을 수 있으므로 upsert)
      await admin
        .from("rooms")
        .upsert(
          { card_id: card.id, status: "active", closed_at: null },
          { onConflict: "card_id" }
        );

      // 승인자에게만 확정 알림(§9 dedup 적용)
      for (const app of approved) {
        const result = await createNotification(admin, {
          userId: app.applicant_id,
          type: "application_resolved",
          cardId: card.id,
          payload: {
            cardId: card.id,
            cardTitle: card.title,
            outcome: "approved"
          }
        });
        if (result === "created") {
          summary.approvedNotified += 1;
        }
      }

      summary.closed += 1;
    } catch {
      summary.errors += 1;
    }
  }

  // 마감 임박(1시간 이내) open 카드의 호스트에게 승인 재촉 알림(§9).
  let deadlineImminentNotified = 0;
  try {
    deadlineImminentNotified = await notifyDeadlineImminent(admin);
  } catch {
    // 알림 실패가 카드 해소 결과를 되돌리지 않는다.
  }

  return ok({ summary: { ...summary, deadlineImminentNotified } });
}

// Vercel Cron은 스케줄된 path로 GET 요청을 보낸다(Authorization: Bearer CRON_SECRET 포함).
// POST와 동일하게 처리한다.
export async function GET(request: Request) {
  return POST(request);
}
