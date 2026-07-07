import { z } from "zod";

/**
 * 상황 템플릿 구독 (장소 × 시간 패턴 × 카테고리).
 * 사람 구독 필드는 존재하지 않는다(스키마 레벨 원천 차단).
 */
export const createSubscriptionSchema = z.object({
  location: z.string().trim().min(1, "장소를 입력해주세요.").max(100),
  timePattern: z.string().trim().min(1, "시간대를 입력해주세요.").max(100),
  category: z.string().trim().min(1, "카테고리를 선택해주세요.")
});

export type CreateSubscriptionInput = z.infer<typeof createSubscriptionSchema>;
