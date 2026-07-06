export type CardLevel = "L1" | "L2" | "L3";

export type CardCategoryOption = {
  label: string;
  level: CardLevel;
};

export const CARD_CATEGORY_OPTIONS: CardCategoryOption[] = [
  { label: "야구 직관", level: "L1" },
  { label: "공연", level: "L1" },
  { label: "전시", level: "L1" },
  { label: "페스티벌", level: "L1" },
  { label: "맛집", level: "L2" },
  { label: "카페", level: "L2" },
  { label: "러닝", level: "L2" },
  { label: "퇴근 후 맥주", level: "L2" }
];

export function getCategoryLevel(category: string) {
  return CARD_CATEGORY_OPTIONS.find((option) => option.label === category)?.level;
}
