import { describe, it, expect } from "vitest";
import {
  getCategoryLevel,
  getCategoriesByGroup,
  CARD_CATEGORY_OPTIONS,
  CATEGORY_GROUP_ORDER
} from "@/lib/cards/categories";

describe("getCategoryLevel", () => {
  it("등록된 L1 카테고리의 레벨을 반환한다", () => {
    expect(getCategoryLevel("스포츠 직관")).toBe("L1");
    expect(getCategoryLevel("영화")).toBe("L1");
  });

  it("등록된 L2 카테고리의 레벨을 반환한다", () => {
    expect(getCategoryLevel("퇴근 후 맥주")).toBe("L2");
    expect(getCategoryLevel("나들이")).toBe("L2");
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

describe("getCategoriesByGroup", () => {
  it("5개 그룹이 정의된 순서대로 반환된다", () => {
    const groups = getCategoriesByGroup();
    expect(groups.map((entry) => entry.group)).toEqual(CATEGORY_GROUP_ORDER);
  });

  it("각 그룹은 3개 카테고리를 가진다 (3x5 그리드)", () => {
    for (const entry of getCategoriesByGroup()) {
      expect(entry.options).toHaveLength(3);
    }
  });

  it("관람 그룹은 전부 L1이고 나머지 그룹은 전부 L2다", () => {
    for (const entry of getCategoriesByGroup()) {
      const expected = entry.group === "관람" ? "L1" : "L2";
      for (const option of entry.options) {
        expect(option.level).toBe(expected);
      }
    }
  });
});
