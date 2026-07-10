import { z } from "zod";
import { CARD_CATEGORY_OPTIONS } from "@/lib/cards/categories";

const allowedCategories = CARD_CATEGORY_OPTIONS.map((option) => option.label);

export const createCardSchema = z
  .object({
    title: z
      .string()
      .trim()
      .min(4, "제목은 4자 이상 입력해주세요.")
      .max(60, "제목은 60자 이내로 입력해주세요."),
    category: z
      .string()
      .trim()
      .refine((value) => allowedCategories.includes(value), "카테고리를 목록에서 선택해주세요."),
    eventDatetime: z.string().datetime("모임 일시를 선택해주세요."),
    location: z
      .string()
      .trim()
      .min(2, "장소는 2자 이상 입력해주세요.")
      .max(80, "장소는 80자 이내로 입력해주세요."),
    capacity: z.coerce
      .number()
      .int("모집인원은 정수로 입력해주세요.")
      .min(1, "모집인원은 최소 1명이어야 합니다.")
      .max(12, "모집인원은 최대 12명까지 가능합니다."),
    hostOffer: z
      .string()
      .trim()
      .min(2, "Mate의 약속을 2자 이상 입력해주세요.")
      .max(120, "Mate의 약속은 120자 이내로 입력해주세요."),
    costInfo: z.string().trim().max(80, "비용 제안은 80자 이내로 입력해주세요.").optional(),
    description: z
      .string()
      .trim()
      .min(10, "설명은 10자 이상 입력해주세요.")
      .max(800, "설명은 800자 이내로 입력해주세요."),
    deadlineAt: z.string().datetime("신청 마감시간을 선택해주세요.")
  })
  .refine((data) => new Date(data.eventDatetime).getTime() > Date.now(), {
    path: ["eventDatetime"],
    message: "모임 일시는 현재보다 이후여야 합니다."
  })
  .refine(
    (data) => new Date(data.deadlineAt).getTime() < new Date(data.eventDatetime).getTime(),
    {
      path: ["deadlineAt"],
      message: "신청 마감시간은 모임 일시보다 이전이어야 합니다."
    }
  );

export type CreateCardInput = z.infer<typeof createCardSchema>;
