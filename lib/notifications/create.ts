import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import { NOTIFICATION_DEDUP_WINDOW_HOURS } from "@/shared/config";

export type NotificationType =
  | "card_deadline_imminent"
  | "application_resolved"
  | "subscription_match"
  | "report_status_change"
  | "card_review_resolved"
  | "room_created"
  | "room_message";

export type CreateNotificationInput = {
  userId: string;
  type: NotificationType;
  payload: Record<string, unknown>;
  /**
   * 중복 방지 판단에 쓰는 카드 id (Mate_Backend_Spec.md §9:
   * 동일 type + user_id + card_id 조합은 24h 내 재발송하지 않는다).
   * payload.cardId가 있으면 그것으로 판단한다.
   */
  cardId?: string | null;
};

/**
 * notifications 큐에 pending 행을 하나 넣는다.
 * 실제 발송은 dispatch-notifications cron이 담당한다(§9).
 *
 * 반환값:
 *  - "created": 새로 큐에 넣음
 *  - "skipped_duplicate": 24h 내 동일 알림이 이미 있어 건너뜀
 *
 * 알림 생성 실패가 원래 액션(승인 등)을 되돌려서는 안 되므로,
 * 호출부는 이 함수의 실패를 치명적으로 다루지 않는다(로그만).
 */
export async function createNotification(
  admin: SupabaseClient,
  input: CreateNotificationInput
): Promise<"created" | "skipped_duplicate"> {
  const cardId = input.cardId ?? (input.payload.cardId as string | undefined) ?? null;

  if (cardId) {
    const since = new Date(
      Date.now() - NOTIFICATION_DEDUP_WINDOW_HOURS * 60 * 60 * 1000
    ).toISOString();

    const { data: existing } = await admin
      .from("notifications")
      .select("id")
      .eq("user_id", input.userId)
      .eq("type", input.type)
      .gte("created_at", since)
      .contains("payload", { cardId })
      .limit(1)
      .maybeSingle<{ id: string }>();

    if (existing) {
      return "skipped_duplicate";
    }
  }

  await admin.from("notifications").insert({
    user_id: input.userId,
    type: input.type,
    payload: input.payload,
    status: "pending"
  });

  return "created";
}
