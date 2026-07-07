import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import { createNotification } from "@/lib/notifications/create";

type SubscriptionRow = {
  id: string;
  user_id: string;
  location: string;
  category: string;
};

type MatchableCard = {
  id: string;
  host_id: string;
  category: string;
  location: string;
};

/**
 * 새로 공개된 카드에 매칭되는 상황 템플릿 구독자에게 subscription_match 알림을 만든다
 * (Mate_Backend_Spec.md §9).
 *
 * V0.1 매칭 기준(실용):
 *  - category 완전 일치
 *  - location 부분 일치(구독 location 문자열이 카드 location에 포함되거나 그 역)
 *  - time_pattern은 자유 텍스트라 V0.1에서는 매칭에 사용하지 않는다(추후 정형화 시 추가)
 *
 * 원칙:
 *  - 카드 호스트 본인에게는 보내지 않는다.
 *  - payload에 상대방(호스트) 식별 정보를 절대 넣지 않는다(호스트 구독 기각 원칙 연장).
 *  - 알림 생성 실패가 카드 생성을 되돌리지 않도록 호출부에서 예외를 삼킨다.
 *
 * 반환: 생성된 알림 수.
 */
export async function notifySubscriptionMatches(
  admin: SupabaseClient,
  card: MatchableCard
): Promise<number> {
  const { data: subscriptions } = await admin
    .from("subscriptions")
    .select("id, user_id, location, category")
    .eq("category", card.category)
    .returns<SubscriptionRow[]>();

  if (!subscriptions || subscriptions.length === 0) {
    return 0;
  }

  const cardLocation = card.location.trim().toLowerCase();
  const notifiedUsers = new Set<string>();
  let created = 0;

  for (const subscription of subscriptions) {
    if (subscription.user_id === card.host_id) {
      continue;
    }

    // 한 유저가 여러 구독으로 중복 매칭돼도 카드당 1회만 보낸다.
    if (notifiedUsers.has(subscription.user_id)) {
      continue;
    }

    const subLocation = subscription.location.trim().toLowerCase();
    const locationMatches =
      subLocation.length > 0 &&
      (cardLocation.includes(subLocation) || subLocation.includes(cardLocation));

    if (!locationMatches) {
      continue;
    }

    notifiedUsers.add(subscription.user_id);

    const result = await createNotification(admin, {
      userId: subscription.user_id,
      type: "subscription_match",
      cardId: card.id,
      payload: {
        cardId: card.id,
        category: card.category
        // 상대방 식별 정보 미포함(§9)
      }
    });

    if (result === "created") {
      created += 1;
    }
  }

  return created;
}
