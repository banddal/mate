import { fail, ok } from "@/lib/api/responses";
import { parseCardFeedFilters } from "@/lib/cards/filters";
import { getOpenCards } from "@/lib/cards/queries";
import { getCurrentUserAndProfile, isProfileComplete } from "@/lib/auth/session";
import { z } from "zod";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const { user, profile } = await getCurrentUserAndProfile();

  if (!user) {
    return fail({ code: "UNAUTHORIZED", message: "로그인이 필요합니다." }, 401);
  }

  if (!isProfileComplete(profile)) {
    return fail({ code: "ONBOARDING_REQUIRED", message: "온보딩을 완료해주세요." }, 403);
  }

  try {
    const filters = parseCardFeedFilters(new URL(request.url).searchParams);
    const cards = await getOpenCards(filters);

    return ok({ cards });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return fail({ code: "INVALID_FILTER", message: "필터 값을 확인해주세요." }, 400);
    }

    return fail({ code: "CARDS_LOOKUP_FAILED", message: "카드를 불러오지 못했어요." }, 500);
  }
}
