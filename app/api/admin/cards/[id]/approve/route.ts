import { fail, ok } from "@/lib/api/responses";
import { getCurrentUserAndProfile, isProfileComplete } from "@/lib/auth/session";
import { createServiceRoleSupabaseClient } from "@/lib/supabase/admin";
import { hasServiceEnv } from "@/lib/env";
import { createNotification } from "@/lib/notifications/create";

export const dynamic = "force-dynamic";

type CardApproveRouteContext = {
  params: {
    id: string;
  };
};

export async function POST(_request: Request, { params }: CardApproveRouteContext) {
  const { user, profile } = await getCurrentUserAndProfile();

  if (!user) {
    return fail({ code: "UNAUTHORIZED", message: "로그인이 필요합니다." }, 401);
  }

  if (!isProfileComplete(profile)) {
    return fail({ code: "ONBOARDING_REQUIRED", message: "온보딩을 완료해주세요." }, 403);
  }

  if (!hasServiceEnv() || params.id.startsWith("demo-")) {
    return ok({
      card: {
        id: params.id,
        status: "open"
      }
    });
  }

  const admin = createServiceRoleSupabaseClient();
  const { data: card, error } = await admin
    .from("cards")
    .update({
      status: "open",
      rejection_reason: null
    })
    .eq("id", params.id)
    .eq("status", "pending_review")
    .select("id, status, host_id")
    .single();

  if (error || !card) {
    return fail({ code: "CARD_APPROVE_FAILED", message: "카드를 승인하지 못했어요." }, 500);
  }

  await admin.from("admin_actions").insert({
    admin_id: user.id,
    action_type: "card_approve",
    target_id: params.id,
    notes: "검수 카드 공개 승인"
  });

  // 호스트에게 검수 결과 알림(§7/§9).
  try {
    await createNotification(admin, {
      userId: card.host_id,
      type: "card_review_resolved",
      cardId: card.id,
      payload: {
        cardId: card.id,
        outcome: "approved"
      }
    });
  } catch {
    // 알림 실패 무시
  }

  return ok({ card: { id: card.id, status: card.status } });
}
