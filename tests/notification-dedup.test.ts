import { describe, it, expect, vi } from "vitest";

vi.mock("server-only", () => ({}));

import { createNotification } from "@/lib/notifications/create";

// createNotification이 쓰는 최소 표면만 흉내내는 fake:
//  - .from("notifications").select().eq().eq().gte().contains().limit().maybeSingle()  → dedup 조회
//  - .from("notifications").insert(row)  → 큐 insert
function makeFakeAdmin(options: { existingDuplicate: boolean }) {
  const inserted: Array<Record<string, unknown>> = [];

  const selectChain = {
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
      return { data: options.existingDuplicate ? { id: "existing" } : null };
    }
  };

  const from = () => ({
    select() {
      return selectChain;
    },
    async insert(row: Record<string, unknown>) {
      inserted.push(row);
      return { data: null, error: null };
    }
  });

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return { admin: { from } as any, inserted };
}

describe("createNotification dedup", () => {
  it("24h 내 동일 알림이 있으면 건너뛰고 insert하지 않는다", async () => {
    const { admin, inserted } = makeFakeAdmin({ existingDuplicate: true });

    const result = await createNotification(admin, {
      userId: "user-1",
      type: "application_resolved",
      cardId: "card-1",
      payload: { cardId: "card-1" }
    });

    expect(result).toBe("skipped_duplicate");
    expect(inserted).toHaveLength(0);
  });

  it("중복이 없으면 새로 큐에 넣는다", async () => {
    const { admin, inserted } = makeFakeAdmin({ existingDuplicate: false });

    const result = await createNotification(admin, {
      userId: "user-1",
      type: "application_resolved",
      cardId: "card-1",
      payload: { cardId: "card-1" }
    });

    expect(result).toBe("created");
    expect(inserted).toHaveLength(1);
    expect(inserted[0]).toMatchObject({
      user_id: "user-1",
      type: "application_resolved",
      status: "pending"
    });
  });

  it("cardId가 없으면 dedup 조회를 건너뛰고 항상 insert한다", async () => {
    // report_status_change처럼 cardId 없는 알림
    const { admin, inserted } = makeFakeAdmin({ existingDuplicate: true });

    const result = await createNotification(admin, {
      userId: "user-1",
      type: "report_status_change",
      payload: { reportId: "r-1", status: "resolved" }
    });

    expect(result).toBe("created");
    expect(inserted).toHaveLength(1);
  });
});
