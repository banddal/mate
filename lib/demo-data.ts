import { DEV_AUTH_FALLBACK_USER_ID } from "@/lib/dev-auth";
import type { CardDetail, FeedCard } from "@/lib/cards/queries";

export const DEMO_APPLY_CARD_ID = "demo-apply-card";
export const DEMO_CREATED_CARD_ID = "demo-created-card";
export const DEMO_ROOM_ID = "demo-room";

export function isDemoCardId(cardId: string) {
  return cardId === DEMO_CREATED_CARD_ID || getDemoFeedCards().some((card) => card.id === cardId);
}

export type DemoApplicant = {
  id: string;
  applicant_id: string;
  nickname: string;
  reason_text: string;
  status: "pending" | "approved" | "rejected_closed";
  phone_verified: boolean;
  created_at: string;
};

export type DemoMessage = {
  id: string;
  sender_name: string;
  body: string;
  created_at: string;
  is_mine: boolean;
};

export type DemoReport = {
  id: string;
  reporter_name: string;
  reason: string;
  status: "open" | "reviewing" | "resolved";
  created_at: string;
};

export type DemoReviewCard = {
  id: string;
  title: string;
  status: "pending_review";
  created_at: string;
};

export type DemoAdminUser = {
  user_id: string;
  nickname: string;
  granted_at: string;
};

export type DemoAdminCandidate = {
  id: string;
  nickname: string;
};

export type DemoBannedWord = {
  id: string;
  word: string;
  severity: "block" | "flag";
  category_hint: string | null;
};

export type DemoAdminAction = {
  id: string;
  admin_name: string;
  action_type: string;
  target_id: string | null;
  notes: string | null;
  created_at: string;
};

export type DemoActivityCard = {
  id: string;
  title: string;
  category: string;
  status: string;
  event_datetime: string;
  role: "host" | "applicant";
  application_status?: "pending" | "approved" | "rejected_closed";
};

export type DemoActivityRoom = {
  id: string;
  title: string;
  status: "active" | "closed";
  event_datetime: string;
};

export function getDemoFeedCards(): FeedCard[] {
  const now = Date.now();

  return [
    {
      id: DEMO_APPLY_CARD_ID,
      host_id: "00000000-0000-4000-8000-000000000099",
      title: "토요일 잠실 야구 직관 같이 갈 mate",
      category: "스포츠 직관",
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
      category: "공연·전시",
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
    },
    {
      id: "demo-concert-card",
      host_id: "00000000-0000-4000-8000-000000000097",
      title: "금요일 저녁 홍대 소극장 공연 mate",
      category: "공연·전시",
      level: "L1",
      event_datetime: new Date(now + 1000 * 60 * 60 * 34).toISOString(),
      location: "홍대입구역 8번 출구",
      capacity: 2,
      host_offer: "예매 완료한 앞쪽 2연석 중 1자리",
      cost_info: "티켓 정가만 각자 부담",
      description: "공연 시작 전에 10분 정도만 만나고, 끝난 뒤에는 짧게 감상만 나누는 일정입니다.",
      deadline_at: new Date(now + 1000 * 60 * 60 * 12).toISOString(),
      status: "open",
      created_at: new Date(now - 1000 * 60 * 75).toISOString()
    },
    {
      id: "demo-running-card",
      host_id: "00000000-0000-4000-8000-000000000096",
      title: "한강 5km 천천히 뛰는 러닝 mate",
      category: "러닝",
      level: "L1",
      event_datetime: new Date(now + 1000 * 60 * 60 * 18).toISOString(),
      location: "여의나루역 2번 출구",
      capacity: 3,
      host_offer: "6분 40초 페이스로 무리 없이 맞추기",
      cost_info: "비용 없음",
      description: "기록보다 완주가 우선인 가벼운 러닝입니다. 끝나면 편의점에서 물만 사고 해산해요.",
      deadline_at: new Date(now + 1000 * 60 * 60 * 5).toISOString(),
      status: "open",
      created_at: new Date(now - 1000 * 60 * 90).toISOString()
    },
    {
      id: "demo-food-card",
      host_id: "00000000-0000-4000-8000-000000000095",
      title: "을지로 예약 어려운 파스타집 mate",
      category: "맛집",
      level: "L2",
      event_datetime: new Date(now + 1000 * 60 * 60 * 58).toISOString(),
      location: "을지로3가역 근처",
      capacity: 2,
      host_offer: "이미 잡아둔 2인 예약 중 1자리",
      cost_info: "각자 주문한 메뉴 부담",
      description: "예약 시간을 맞출 수 있는 분이면 좋습니다. 식사 후 추가 일정 없이 마무리합니다.",
      deadline_at: new Date(now + 1000 * 60 * 60 * 30).toISOString(),
      status: "open",
      created_at: new Date(now - 1000 * 60 * 130).toISOString()
    },
    {
      id: "demo-festival-card",
      host_id: "00000000-0000-4000-8000-000000000094",
      title: "주말 노들섬 페스티벌 낮 시간 mate",
      category: "페스티벌",
      level: "L1",
      event_datetime: new Date(now + 1000 * 60 * 60 * 72).toISOString(),
      location: "노들섬 메인 입구",
      capacity: 4,
      host_offer: "돗자리 자리 잡고 낮 공연 위주로 보기",
      cost_info: "입장권 각자 준비",
      description: "너무 늦게까지 있지 않고 낮 공연 중심으로 가볍게 보는 일정입니다.",
      deadline_at: new Date(now + 1000 * 60 * 60 * 42).toISOString(),
      status: "open",
      created_at: new Date(now - 1000 * 60 * 160).toISOString()
    },
    {
      id: "demo-book-cafe-card",
      host_id: "00000000-0000-4000-8000-000000000093",
      title: "망원 조용한 북카페 1시간 집중 mate",
      category: "카페",
      level: "L1",
      event_datetime: new Date(now + 1000 * 60 * 60 * 22).toISOString(),
      location: "망원역 1번 출구",
      capacity: 2,
      host_offer: "각자 할 일 하고 마지막 10분만 대화",
      cost_info: "각자 음료 부담",
      description: "처음부터 긴 대화보다 조용히 집중하는 목적입니다. 부담 없는 짧은 만남이에요.",
      deadline_at: new Date(now + 1000 * 60 * 60 * 10).toISOString(),
      status: "open",
      created_at: new Date(now - 1000 * 60 * 210).toISOString()
    },
    {
      id: "demo-museum-card",
      host_id: "00000000-0000-4000-8000-000000000092",
      title: "국립현대미술관 오후 전시 mate",
      category: "공연·전시",
      level: "L1",
      event_datetime: new Date(now + 1000 * 60 * 60 * 46).toISOString(),
      location: "안국역 1번 출구",
      capacity: 2,
      host_offer: "느린 속도로 90분 정도 같이 관람",
      cost_info: "입장권 각자 구매",
      description: "작품을 깊게 토론하기보다 편하게 둘러보고 인상적인 것만 짧게 나누는 일정입니다.",
      deadline_at: new Date(now + 1000 * 60 * 60 * 20).toISOString(),
      status: "open",
      created_at: new Date(now - 1000 * 60 * 260).toISOString()
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

export function getDemoApplicants(): DemoApplicant[] {
  return [
    {
      id: "demo-application-1",
      applicant_id: "00000000-0000-4000-8000-000000000201",
      nickname: "야구초보",
      reason_text: "혼자 가기 아쉬웠는데 같은 경기 보며 가볍게 응원하고 싶어요.",
      status: "pending",
      phone_verified: true,
      created_at: new Date(Date.now() - 1000 * 60 * 12).toISOString()
    },
    {
      id: "demo-application-2",
      applicant_id: "00000000-0000-4000-8000-000000000202",
      nickname: "주말러너",
      reason_text: "경기 끝나고 바로 이동할 수 있고, 부담 없는 일정이면 좋겠습니다.",
      status: "pending",
      phone_verified: true,
      created_at: new Date(Date.now() - 1000 * 60 * 35).toISOString()
    }
  ];
}

export function getDemoMessages(): DemoMessage[] {
  return [
    {
      id: "demo-message-1",
      sender_name: "야구초보",
      body: "안녕하세요. 경기 시작 20분 전에 도착할 수 있어요.",
      created_at: new Date(Date.now() - 1000 * 60 * 14).toISOString(),
      is_mine: false
    },
    {
      id: "demo-message-2",
      sender_name: "Dev Mate",
      body: "좋아요. 1루 출입구 앞에서 가볍게 만나요.",
      created_at: new Date(Date.now() - 1000 * 60 * 9).toISOString(),
      is_mine: true
    }
  ];
}

export function getDemoReports(): DemoReport[] {
  return [
    {
      id: "demo-report-1",
      reporter_name: "Dev Mate",
      reason: "상대가 외부 메신저로 이동하자고 반복해서 말했어요.",
      status: "open",
      created_at: new Date(Date.now() - 1000 * 60 * 18).toISOString()
    }
  ];
}

export function getDemoReviewCards(): DemoReviewCard[] {
  return [
    {
      id: "demo-review-card",
      title: "금액 표현이 있어 검수가 필요한 데모 카드",
      status: "pending_review",
      created_at: new Date(Date.now() - 1000 * 60 * 24).toISOString()
    }
  ];
}

export function getDemoAdminUsers(): DemoAdminUser[] {
  return [
    {
      user_id: DEV_AUTH_FALLBACK_USER_ID,
      nickname: "Dev Mate",
      granted_at: new Date(Date.now() - 1000 * 60 * 120).toISOString()
    }
  ];
}

export function getDemoAdminCandidates(): DemoAdminCandidate[] {
  return [
    {
      id: "demo-admin-candidate-1",
      nickname: "운영 후보 A"
    },
    {
      id: "demo-admin-candidate-2",
      nickname: "운영 후보 B"
    }
  ];
}

export function getDemoBannedWords(): DemoBannedWord[] {
  return [
    {
      id: "demo-banned-word-1",
      word: "외로움",
      severity: "block",
      category_hint: "emotional_vulnerability"
    },
    {
      id: "demo-banned-word-2",
      word: "사례비",
      severity: "flag",
      category_hint: "cash_compensation"
    }
  ];
}

export function getDemoAdminActions(): DemoAdminAction[] {
  return [
    {
      id: "demo-admin-action-1",
      admin_name: "Dev Mate",
      action_type: "report_resolve",
      target_id: "demo-report-1",
      notes: "dismissed",
      created_at: new Date(Date.now() - 1000 * 60 * 8).toISOString()
    },
    {
      id: "demo-admin-action-2",
      admin_name: "Dev Mate",
      action_type: "banned_word_create",
      target_id: "demo-banned-word-2",
      notes: "flag:사례비",
      created_at: new Date(Date.now() - 1000 * 60 * 16).toISOString()
    }
  ];
}

export function getDemoActivityCards(): DemoActivityCard[] {
  const created = getDemoCardDetail(DEMO_CREATED_CARD_ID);
  const applying = getDemoCardDetail(DEMO_APPLY_CARD_ID);

  return [
    ...(created
      ? [
          {
            id: created.id,
            title: created.title,
            category: created.category,
            status: created.status,
            event_datetime: created.event_datetime,
            role: "host" as const
          }
        ]
      : []),
    ...(applying
      ? [
          {
            id: applying.id,
            title: applying.title,
            category: applying.category,
            status: applying.status,
            event_datetime: applying.event_datetime,
            role: "applicant" as const,
            application_status: "pending" as const
          }
        ]
      : [])
  ];
}

export function getDemoActivityRooms(): DemoActivityRoom[] {
  const card = getDemoCardDetail(DEMO_CREATED_CARD_ID);

  return card
    ? [
        {
          id: DEMO_ROOM_ID,
          title: card.title,
          status: "active",
          event_datetime: card.event_datetime
        }
      ]
    : [];
}
