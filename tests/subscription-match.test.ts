import { describe, it, expect, vi } from "vitest";

vi.mock("server-only", () => ({}));

import { notifySubscriptionMatches } from "@/lib/notifications/subscription-match";

type Sub = { id: string; user_id: string; location: string; category: string };

// subscriptions 조회 + notifications(dedup 조회/insert)를 흉내내는 fake.
// - subscriptions: .from("subscriptions").select().eq("category", x).returns() → 매칭 후보
// - notifications: createNotification 내부의 select 체인(dedup, 항상 중복 없음) + insert
function makeFakeAdmin(subscriptions: Sub[]) {
  const notified: Array<Record<string, unknown>> = [];

  const notifSelectChain = {
    eq() {
      return this;
    },
    gte() {
      return this;
    },
    contains() {
      return this;
    },
    limit() {
      return this;
    },
    async maybeSingle() {
      return { data: null }; // dedup: 중복 없음
    }
  };

  const from = (table: string) => {
    if (table === "subscriptions") {
      return {
        select() {
          return {
            eq() {
              return this;
            },
            returns() {
              return Promise.resolve({ data: subscriptions });
            }
          };
        }
      };
    }
    // notifications
    return {
      select() {
        return notifSelectChain;
      },
      async insert(row: Record<string, unknown>) {
        notified.push(row);
        return { data: null, error: null };
      }
    };
  };

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return { admin: { from } as any, notified };
}

const card = {
  id: "card-1",
  host_id: "host-1",
  category: "스포츠 직관",
  location: "잠실야구장"
};

describe("notifySubscriptionMatches", () => {
  it("category 일치 + location 부분 일치 구독자에게 알림을 만든다", async () => {
    const { admin, notified } = makeFakeAdmin([
      { id: "s1", user_id: "user-2", location: "잠실", category: "스포츠 직관" }
    ]);

    const created = await notifySubscriptionMatches(admin, card);

    expect(created).toBe(1);
    expect(notified).toHaveLength(1);
    expect(notified[0]).toMatchObject({ user_id: "user-2", type: "subscription_match" });
  });

  it("호스트 본인에게는 보내지 않는다", async () => {
    const { admin, notified } = makeFakeAdmin([
      { id: "s1", user_id: "host-1", location: "잠실", category: "스포츠 직관" }
    ]);

    const created = await notifySubscriptionMatches(admin, card);

    expect(created).toBe(0);
    expect(notified).toHaveLength(0);
  });

  it("location이 전혀 겹치지 않으면 보내지 않는다", async () => {
    const { admin, notified } = makeFakeAdmin([
      { id: "s1", user_id: "user-2", location: "부산사직", category: "스포츠 직관" }
    ]);

    const created = await notifySubscriptionMatches(admin, card);

    expect(created).toBe(0);
    expect(notified).toHaveLength(0);
  });

  it("한 유저가 여러 구독으로 매칭돼도 카드당 1회만 보낸다", async () => {
    const { admin, notified } = makeFakeAdmin([
      { id: "s1", user_id: "user-2", location: "잠실", category: "스포츠 직관" },
      { id: "s2", user_id: "user-2", location: "잠실야구장", category: "스포츠 직관" }
    ]);

    const created = await notifySubscriptionMatches(admin, card);

    expect(created).toBe(1);
    expect(notified).toHaveLength(1);
  });

  it("payload에 상대방(호스트) 식별 정보를 넣지 않는다 (§9)", async () => {
    const { admin, notified } = makeFakeAdmin([
      { id: "s1", user_id: "user-2", location: "잠실", category: "스포츠 직관" }
    ]);

    await notifySubscriptionMatches(admin, card);

    const payload = notified[0]?.payload as Record<string, unknown>;
    expect(payload).toBeDefined();
    // host_id나 host 관련 필드가 payload에 없어야 한다.
    expect(JSON.stringify(payload)).not.toContain("host");
    expect(payload).not.toHaveProperty("host_id");
  });
});
