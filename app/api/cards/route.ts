import { fail, ok } from "@/lib/api/responses";
import { parseCardFeedFilters } from "@/lib/cards/filters";
import { getOpenCards } from "@/lib/cards/queries";
import { getCurrentUserAndProfile, isProfileComplete } from "@/lib/auth/session";
import { getCategoryLevel } from "@/lib/cards/categories";
import { createCardSchema } from "@/lib/cards/schema";
import { moderateCardText } from "@/lib/cards/moderation";
import { createServiceRoleSupabaseClient } from "@/lib/supabase/admin";
import { hasServiceEnv } from "@/lib/env";
import { DEMO_CREATED_CARD_ID } from "@/lib/demo-data";
import { DEV_AUTH_FALLBACK_USER_ID } from "@/lib/dev-auth";
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
  const { user, profile } = await getCurrentUserAndProfile();

  if (!user) {
    return fail({ code: "UNAUTHORIZED", message: "로그인이 필요합니다." }, 401);
  }

  if (!isProfileComplete(profile)) {
    return fail({ code: "ONBOARDING_REQUIRED", message: "온보딩을 완료해주세요." }, 403);
  }

  const parsed = createCardSchema.safeParse(await request.json().catch(() => null));

  if (!parsed.success) {
    return fail(
      {
        code: "INVALID_CARD_INPUT",
        message: getCreateCardErrorMessage(parsed.error)
      },
      400
    );
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

  if (!hasServiceEnv() || user.id === DEV_AUTH_FALLBACK_USER_ID) {
    return ok({
      card: {
        id: DEMO_CREATED_CARD_ID,
        status: "open"
      }
    });
  }

  let decision;

  try {
    decision = await moderateCardText([
      parsed.data.title,
      parsed.data.description,
      parsed.data.hostOffer,
      parsed.data.costInfo ?? ""
    ]);
  } catch {
    return fail(
      {
        code: "CARD_REVIEW_FAILED",
        message:
          "금지어 검수용 DB 조회 또는 Supabase service role 설정 문제로 카드를 검수하지 못했어요."
      },
      500
    );
  }

  if (decision.status === "blocked") {
    return fail(
      {
        code: "CONTENT_BLOCKED",
        message: "금지어 기준에 걸려 공개할 수 없어요. 활동 중심으로 다시 작성해주세요."
      },
      400
    );
  }

  try {
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
      return fail(
        {
          code: "CARD_CREATE_FAILED",
          message: "카드 저장에 실패했어요. Supabase service role 권한이나 cards 테이블 설정을 확인해주세요."
        },
        500
      );
    }

    return ok({ card });
  } catch {
    return fail({ code: "CARD_CREATE_FAILED", message: "카드 저장 중 문제가 생겼어요." }, 500);
  }
}

function getCreateCardErrorMessage(error: z.ZodError) {
  return error.issues[0]?.message ?? "카드 내용을 확인해주세요.";
}
