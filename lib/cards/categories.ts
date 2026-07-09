export type CardLevel = "L1" | "L2" | "L3";

export type CategoryGroup = "관람" | "휴식" | "탐방" | "운동" | "자기개발";

export type CardCategoryOption = {
  label: string;
  level: CardLevel;
  group: CategoryGroup;
};

export const CATEGORY_GROUP_ORDER: CategoryGroup[] = [
  "관람",
  "휴식",
  "탐방",
  "운동",
  "자기개발"
];

export const CARD_CATEGORY_OPTIONS: CardCategoryOption[] = [
  { label: "영화", level: "L1", group: "관람" },
  { label: "공연·전시", level: "L1", group: "관람" },
  { label: "스포츠 직관", level: "L1", group: "관람" },
  { label: "퇴근 후 맥주", level: "L2", group: "휴식" },
  { label: "페스티벌", level: "L2", group: "휴식" },
  { label: "나들이", level: "L2", group: "휴식" },
  { label: "맛집", level: "L2", group: "탐방" },
  { label: "카페", level: "L2", group: "탐방" },
  { label: "산책", level: "L2", group: "탐방" },
  { label: "러닝", level: "L2", group: "운동" },
  { label: "등산", level: "L2", group: "운동" },
  { label: "자전거", level: "L2", group: "운동" },
  { label: "독서", level: "L2", group: "자기개발" },
  { label: "스터디", level: "L2", group: "자기개발" },
  { label: "보드게임", level: "L2", group: "자기개발" }
];

export const CARD_CATEGORY_LABELS = CARD_CATEGORY_OPTIONS.map((option) => option.label);

export function getCategoryLevel(category: string) {
  return CARD_CATEGORY_OPTIONS.find((option) => option.label === category)?.level;
}

export function getCategoriesByGroup() {
  return CATEGORY_GROUP_ORDER.map((group) => ({
    group,
    options: CARD_CATEGORY_OPTIONS.filter((option) => option.group === group)
  }));
}
