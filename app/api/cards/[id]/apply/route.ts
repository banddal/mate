import { fail, ok } from "@/lib/api/responses";
import { getCurrentUserAndProfile, isProfileComplete } from "@/lib/auth/session";
import { applyCardSchema } from "@/lib/cards/applications";
import { createServiceRoleSupabaseClient } from "@/lib/supabase/admin";
import { hasServiceEnv } from "@/lib/env";
import { DEMO_APPLY_CARD_ID, DEMO_CREATED_CARD_ID } from "@/lib/demo-data";
import { z } from "zod";

export const dynamic = "force-dynamic";

type ApplyRouteContext = {
  params: {
    id: string;
  };
};

export async function POST(request: Request, { params }: ApplyRouteContext) {
  const { user, profile } = await getCurrentUserAndProfile();

  if (!user) {
    return fail({ code: "UNAUTHORIZED", message: "로그인이 필요합니다." }, 401);
  }

  if (!isProfileComplete(profile)) {
    return fail({ code: "ONBOARDING_REQUIRED", message: "온보딩을 완료해주세요." }, 403);
  }

  const parsed = applyCardSchema.safeParse(await request.json().catch(() => null));

  if (!parsed.success) {
    return fail({ code: "INVALID_REASON", message: "신청 사유를 확인해주세요." }, 400);
  }

  if (!hasServiceEnv() && [DEMO_APPLY_CARD_ID, DEMO_CREATED_CARD_ID].includes(params.id)) {
    return ok({
      application: {
        id: "demo-application",
        status: "pending",
        created_at: new Date().toISOString()
      }
    });
  }

  if (!hasServiceEnv()) {
    return fail(
      {
        code: "SERVER_CONFIG_MISSING",
        message: "서버 환경변수 설정이 필요합니다."
      },
      500
    );
  }

  try {
    const admin = createServiceRoleSupabaseClient();
    const { data: card, error: cardError } = await admin
      .from("cards")
      .select("id, host_id, status, deadline_at")
      .eq("id", params.id)
      .maybeSingle<{
        id: string;
        host_id: string;
        status: string;
        deadline_at: string;
      }>();

    if (cardError) {
      return fail({ code: "CARD_LOOKUP_FAILED", message: "카드를 확인하지 못했어요." }, 500);
    }

    if (!card || card.status !== "open") {
      return fail({ code: "CARD_NOT_OPEN", message: "신청할 수 없는 카드입니다." }, 400);
    }

    if (card.host_id === user.id) {
      return fail({ code: "HOST_CANNOT_APPLY", message: "내가 연 카드에는 신청할 수 없어요." }, 400);
    }

    if (new Date(card.deadline_at).getTime() <= Date.now()) {
      return fail({ code: "DEADLINE_PASSED", message: "신청 마감시간이 지났어요." }, 400);
    }

    const { data: existingApplication, error: existingError } = await admin
      .from("applications")
      .select("id, status")
      .eq("card_id", card.id)
      .eq("applicant_id", user.id)
      .maybeSingle<{ id: string; status: string }>();

    if (existingError) {
      return fail({ code: "APPLICATION_LOOKUP_FAILED", message: "신청 상태를 확인하지 못했어요." }, 500);
    }

    if (existingApplication) {
      return fail({ code: "ALREADY_APPLIED", message: "이미 신청한 카드입니다." }, 409);
    }

    const { data: application, error: insertError } = await admin
      .from("applications")
      .insert({
        card_id: card.id,
        applicant_id: user.id,
        reason_text: parsed.data.reasonText,
        status: "pending"
      })
      .select("id, status, created_at")
      .single();

    if (insertError) {
      return fail({ code: "APPLICATION_CREATE_FAILED", message: "신청을 저장하지 못했어요." }, 500);
    }

    return ok({ application });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return fail({ code: "INVALID_REASON", message: "신청 사유를 확인해주세요." }, 400);
    }

    return fail({ code: "APPLICATION_FAILED", message: "신청 처리 중 문제가 생겼어요." }, 500);
  }
}
