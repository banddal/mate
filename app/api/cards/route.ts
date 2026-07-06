import { fail, ok } from "@/lib/api/responses";
import { parseCardFeedFilters } from "@/lib/cards/filters";
import { getOpenCards } from "@/lib/cards/queries";
import { getCurrentUserAndProfile, isProfileComplete } from "@/lib/auth/session";
import { getCategoryLevel } from "@/lib/cards/categories";
import { createCardSchema } from "@/lib/cards/schema";
import { moderateCardText } from "@/lib/cards/moderation";
import { createServiceRoleSupabaseClient } from "@/lib/supabase/admin";
import { hasServiceEnv } from "@/lib/env";
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

export async function POST(request: Request) {
  if (!hasServiceEnv()) {
    return fail(
      {
        code: "SERVER_CONFIG_MISSING",
        message: "서버 환경변수 설정이 필요합니다."
      },
      500
    );
  }

  const { user, profile } = await getCurrentUserAndProfile();

  if (!user) {
    return fail({ code: "UNAUTHORIZED", message: "로그인이 필요합니다." }, 401);
  }

  if (!isProfileComplete(profile)) {
    return fail({ code: "ONBOARDING_REQUIRED", message: "온보딩을 완료해주세요." }, 403);
  }

  const parsed = createCardSchema.safeParse(await request.json().catch(() => null));

  if (!parsed.success) {
    return fail({ code: "INVALID_CARD_INPUT", message: "카드 내용을 확인해주세요." }, 400);
  }

  const level = getCategoryLevel(parsed.data.category);

  if (!level) {
    return fail({ code: "INVALID_CATEGORY", message: "카테고리를 확인해주세요." }, 400);
  }

  if (level === "L3") {
    return fail(
      {
        code: "L3_NOT_AVAILABLE_YET",
        message: "활동 중심으로 구체적으로 작성해주세요."
      },
      400
    );
  }

  try {
    const decision = await moderateCardText([
      parsed.data.title,
      parsed.data.description,
      parsed.data.hostOffer,
      parsed.data.costInfo ?? ""
    ]);

    if (decision.status === "blocked") {
      return fail(
        {
          code: "CONTENT_BLOCKED",
          message: "활동 중심으로 구체적으로 작성해주세요."
        },
        400
      );
    }

    const admin = createServiceRoleSupabaseClient();
    const { data: card, error } = await admin
      .from("cards")
      .insert({
        host_id: user.id,
        title: parsed.data.title,
        category: parsed.data.category,
        level,
        event_datetime: parsed.data.eventDatetime,
        location: parsed.data.location,
        capacity: parsed.data.capacity,
        host_offer: parsed.data.hostOffer,
        cost_info: parsed.data.costInfo || null,
        description: parsed.data.description,
        deadline_at: parsed.data.deadlineAt,
        status: decision.status
      })
      .select("id, status")
      .single();

    if (error) {
      return fail({ code: "CARD_CREATE_FAILED", message: "카드를 만들지 못했어요." }, 500);
    }

    return ok({ card });
  } catch {
    return fail({ code: "CARD_REVIEW_FAILED", message: "카드를 검수하지 못했어요." }, 500);
  }
}
