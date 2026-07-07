import { describe, it, expect } from "vitest";
import { createSubscriptionSchema } from "@/lib/notifications/subscription-schema";
import {
  pushSubscribeSchema,
  pushUnsubscribeSchema
} from "@/lib/notifications/subscription";

describe("createSubscriptionSchema", () => {
  it("유효한 구독 입력을 통과시킨다", () => {
    const result = createSubscriptionSchema.safeParse({
      location: "잠실야구장",
      timePattern: "주말 저녁",
      category: "야구 직관"
    });
    expect(result.success).toBe(true);
  });

  it("빈 장소는 거부한다", () => {
    const result = createSubscriptionSchema.safeParse({
      location: "",
      timePattern: "주말 저녁",
      category: "야구 직관"
    });
    expect(result.success).toBe(false);
  });

  it("공백만 있는 시간패턴은 거부한다", () => {
    const result = createSubscriptionSchema.safeParse({
      location: "잠실",
      timePattern: "   ",
      category: "야구 직관"
    });
    expect(result.success).toBe(false);
  });

  it("장소를 트림한다", () => {
    const result = createSubscriptionSchema.safeParse({
      location: "  잠실  ",
      timePattern: "저녁",
      category: "공연"
    });
    expect(result.success && result.data.location).toBe("잠실");
  });
});

describe("pushSubscribeSchema", () => {
  it("표준 PushSubscription 형태를 통과시킨다", () => {
    const result = pushSubscribeSchema.safeParse({
      endpoint: "https://fcm.googleapis.com/fcm/send/abc",
      keys: { p256dh: "key1", auth: "key2" }
    });
    expect(result.success).toBe(true);
  });

  it("endpoint가 URL이 아니면 거부한다", () => {
    const result = pushSubscribeSchema.safeParse({
      endpoint: "not-a-url",
      keys: { p256dh: "key1", auth: "key2" }
    });
    expect(result.success).toBe(false);
  });

  it("keys가 없으면 거부한다", () => {
    const result = pushSubscribeSchema.safeParse({
      endpoint: "https://example.com/push"
    });
    expect(result.success).toBe(false);
  });
});

describe("pushUnsubscribeSchema", () => {
  it("endpoint URL을 통과시킨다", () => {
    expect(
      pushUnsubscribeSchema.safeParse({ endpoint: "https://example.com/push" }).success
    ).toBe(true);
  });

  it("빈 객체는 거부한다", () => {
    expect(pushUnsubscribeSchema.safeParse({}).success).toBe(false);
  });
});
