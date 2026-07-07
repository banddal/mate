import { describe, it, expect } from "vitest";
import { getCategoryLevel, CARD_CATEGORY_OPTIONS } from "@/lib/cards/categories";

describe("getCategoryLevel", () => {
  it("등록된 L1 카테고리의 레벨을 반환한다", () => {
    expect(getCategoryLevel("야구 직관")).toBe("L1");
  });

  it("등록된 L2 카테고리의 레벨을 반환한다", () => {
    expect(getCategoryLevel("퇴근 후 맥주")).toBe("L2");
  });

  it("존재하지 않는 카테고리는 undefined", () => {
    expect(getCategoryLevel("존재하지않는카테고리")).toBeUndefined();
  });

  it("V0.1 카테고리 옵션에 L3가 노출되지 않는다 (PRD §8 — L1/L2만 오픈)", () => {
    const hasL3 = CARD_CATEGORY_OPTIONS.some((option) => option.level === "L3");
    expect(hasL3).toBe(false);
  });

  it("빈 문자열은 undefined", () => {
    expect(getCategoryLevel("")).toBeUndefined();
  });
});
