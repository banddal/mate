import { DEV_AUTH_FALLBACK_USER_ID } from "@/lib/dev-auth";
import type { CardDetail, FeedCard } from "@/lib/cards/queries";

export const DEMO_APPLY_CARD_ID = "demo-apply-card";
export const DEMO_CREATED_CARD_ID = "demo-created-card";

export function getDemoFeedCards(): FeedCard[] {
  const now = Date.now();

  return [
    {
      id: DEMO_APPLY_CARD_ID,
      host_id: "00000000-0000-4000-8000-000000000099",
      title: "토요일 잠실 야구 직관 같이 갈 mate",
      category: "야구 직관",
      level: "L1",
      event_datetime: new Date(now + 1000 * 60 * 60 * 28).toISOString(),
      location: "잠실야구장 1루 쪽",
      capacity: 2,
      host_offer: "예매해 둔 2연석 중 1자리",
      cost_info: "티켓 정가 각자 부담",
      description: "혼자 보기 아쉬운 경기라 가볍게 응원하고 경기 끝나면 각자 이동하는 상황입니다.",
      deadline_at: new Date(now + 1000 * 60 * 60 * 8).toISOString(),
      status: "open",
      created_at: new Date(now - 1000 * 60 * 20).toISOString()
    },
    {
      id: "demo-cafe-card",
      host_id: "00000000-0000-4000-8000-000000000098",
      title: "성수 전시 보고 근처 카페까지",
      category: "전시",
      level: "L1",
      event_datetime: new Date(now + 1000 * 60 * 60 * 52).toISOString(),
      location: "성수동 전시 공간 앞",
      capacity: 3,
      host_offer: "예약해 둔 전시 입장 시간",
      cost_info: "입장권 각자 구매",
      description: "전시를 같이 보고 근처 카페에서 짧게 감상만 나누는 가벼운 일정입니다.",
      deadline_at: new Date(now + 1000 * 60 * 60 * 24).toISOString(),
      status: "open",
      created_at: new Date(now - 1000 * 60 * 60).toISOString()
    }
  ];
}

export function getDemoCardDetail(cardId: string): CardDetail | null {
  if (cardId === DEMO_CREATED_CARD_ID) {
    return {
      id: DEMO_CREATED_CARD_ID,
      host_id: DEV_AUTH_FALLBACK_USER_ID,
      title: "방금 만든 데모 카드",
      category: "맛집",
      level: "L2",
      event_datetime: new Date(Date.now() + 1000 * 60 * 60 * 30).toISOString(),
      location: "연남동 입구",
      capacity: 2,
      host_offer: "예약해 둔 2인 자리",
      cost_info: "각자 식사비 부담",
      description: "카드 생성 화면에서 이어지는 상세 화면을 확인하기 위한 데모 카드입니다.",
      deadline_at: new Date(Date.now() + 1000 * 60 * 60 * 6).toISOString(),
      status: "open",
      created_at: new Date().toISOString()
    };
  }

  return getDemoFeedCards().find((card) => card.id === cardId) as CardDetail | null;
}
