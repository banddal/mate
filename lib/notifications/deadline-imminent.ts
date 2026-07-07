import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import { createNotification } from "@/lib/notifications/create";
import { CARD_DEADLINE_IMMINENT_MINUTES } from "@/shared/config";

type ImminentCard = {
  id: string;
  host_id: string;
  title: string;
  deadline_at: string;
};

/**
 * 마감 임박 open 카드의 호스트에게 card_deadline_imminent 알림을 만든다(§9).
 *
 * 대상 조건:
 *  - status='open'
 *  - deadline_at이 지금부터 CARD_DEADLINE_IMMINENT_MINUTES 이내(아직 지나지 않음)
 *  - 아직 처리되지 않은 pending 신청이 하나라도 있음
 *    (신청자가 없으면 승인을 재촉할 이유가 없고, 곧 resolve-cards가 cancelled 처리)
 *
 * 24h + card_id dedup으로 매 cron 주기마다 중복 발송되지 않는다.
 *
 * 반환: 생성된 알림 수.
 */
export async function notifyDeadlineImminent(admin: SupabaseClient): Promise<number> {
  const now = Date.now();
  const nowIso = new Date(now).toISOString();
  const windowIso = new Date(
    now + CARD_DEADLINE_IMMINENT_MINUTES * 60 * 1000
  ).toISOString();

  const { data: cards } = await admin
    .from("cards")
    .select("id, host_id, title, deadline_at")
    .eq("status", "open")
    .gt("deadline_at", nowIso)
    .lte("deadline_at", windowIso)
    .returns<ImminentCard[]>();

  if (!cards || cards.length === 0) {
    return 0;
  }

  let created = 0;

  for (const card of cards) {
    const { count: pendingCount } = await admin
      .from("applications")
      .select("id", { count: "exact", head: true })
      .eq("card_id", card.id)
      .eq("status", "pending");

    if (!pendingCount || pendingCount === 0) {
      continue;
    }

    const result = await createNotification(admin, {
      userId: card.host_id,
      type: "card_deadline_imminent",
      cardId: card.id,
      payload: {
        cardId: card.id,
        cardTitle: card.title,
        pendingCount
      }
    });

    if (result === "created") {
      created += 1;
    }
  }

  return created;
}
