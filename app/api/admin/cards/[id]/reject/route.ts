import { fail, ok } from "@/lib/api/responses";
import { getCurrentUserAndProfile, isProfileComplete } from "@/lib/auth/session";
import { createServiceRoleSupabaseClient } from "@/lib/supabase/admin";
import { hasServiceEnv } from "@/lib/env";
import { createNotification } from "@/lib/notifications/create";
import { z } from "zod";

export const dynamic = "force-dynamic";

const rejectSchema = z.object({
  rejectionReason: z.string().trim().min(4).max(200)
});

type CardRejectRouteContext = {
  params: {
    id: string;
  };
};

export async function POST(request: Request, { params }: CardRejectRouteContext) {
  const { user, profile } = await getCurrentUserAndProfile();

  if (!user) {
    return fail({ code: "UNAUTHORIZED", message: "로그인이 필요합니다." }, 401);
  }

  if (!isProfileComplete(profile)) {
    return fail({ code: "ONBOARDING_REQUIRED", message: "온보딩을 완료해주세요." }, 403);
  }

  const parsed = rejectSchema.safeParse(await request.json().catch(() => null));

  if (!parsed.success) {
    return fail({ code: "INVALID_REJECTION", message: "반려 사유를 확인해주세요." }, 400);
  }

  if (!hasServiceEnv() || params.id.startsWith("demo-")) {
    return ok({
      card: {
        id: params.id,
        status: "rejected",
        rejection_reason: parsed.data.rejectionReason
      }
    });
  }

  const admin = createServiceRoleSupabaseClient();
  const { data: card, error } = await admin
    .from("cards")
    .update({
      status: "rejected",
      rejection_reason: parsed.data.rejectionReason
    })
    .eq("id", params.id)
    .eq("status", "pending_review")
    .select("id, status, rejection_reason, host_id")
    .single();

  if (error || !card) {
    return fail({ code: "CARD_REJECT_FAILED", message: "카드를 반려하지 못했어요." }, 500);
  }

  await admin.from("admin_actions").insert({
    admin_id: user.id,
    action_type: "card_reject",
    target_id: params.id,
    notes: parsed.data.rejectionReason
  });

  // 호스트에게 반려 알림(§7/§9). 정확한 매칭 단어는 노출하지 않고 일반화된 결과만 전달한다.
  try {
    await createNotification(admin, {
      userId: card.host_id,
      type: "card_review_resolved",
      cardId: card.id,
      payload: {
        cardId: card.id,
        outcome: "rejected"
      }
    });
  } catch {
    // 알림 실패 무시
  }

  return ok({
    card: {
      id: card.id,
      status: card.status,
      rejection_reason: card.rejection_reason
    }
  });
}
