import { describe, it, expect } from "vitest";
import { hasCashPaymentPattern } from "@/lib/cards/cash-pattern";

// Mate_Backend_Spec.md §7: 금액 표현 AND 지급 의사 표현이 둘 다 있어야 현금성으로 flag.
describe("hasCashPaymentPattern", () => {
  it("키워드 없이 금액+지급의사만 있어도 잡는다 (스펙 핵심 케이스)", () => {
    expect(hasCashPaymentPattern("같이 야구 보실 분, 5만원 드립니다")).toBe(true);
  });

  it("정확한 단어(사례비)와 금액이 함께면 잡는다", () => {
    expect(hasCashPaymentPattern("사례비 3만원 지급")).toBe(true);
  });

  it("금액만 있고 지급 의사가 없으면 통과시킨다", () => {
    // 비용 안내(더치페이 맥락)는 현금성이 아니다.
    expect(hasCashPaymentPattern("입장료 2만원, 각자 결제")).toBe(false);
  });

  it("지급 의사 표현만 있고 금액이 없으면 통과시킨다", () => {
    expect(hasCashPaymentPattern("맛있는 커피 사드릴게요")).toBe(false);
  });

  it("금액도 지급의사도 없는 평범한 카드는 통과시킨다", () => {
    expect(hasCashPaymentPattern("주말 아침 러닝 같이 하실 분 구해요")).toBe(false);
  });

  it("천원/만원 단위와 공백 변형도 잡는다", () => {
    expect(hasCashPaymentPattern("5000 원 송금해드려요")).toBe(true);
    expect(hasCashPaymentPattern("10만원 입금")).toBe(true);
  });

  it("빈 문자열은 false", () => {
    expect(hasCashPaymentPattern("")).toBe(false);
  });
});
