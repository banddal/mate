import { fail, ok } from "@/lib/api/responses";
import { getVerifiedAdmin } from "@/lib/auth/admin";
import { createServiceRoleSupabaseClient } from "@/lib/supabase/admin";
import { hasServiceEnv } from "@/lib/env";
import { createNotification } from "@/lib/notifications/create";
import { notifySubscriptionMatches } from "@/lib/notifications/subscription-match";

export const dynamic = "force-dynamic";

type CardApproveRouteContext = {
  params: {
    id: string;
  };
};

export async function POST(_request: Request, { params }: CardApproveRouteContext) {
  const auth = await getVerifiedAdmin();

  if (!auth.ok) {
    return auth.response;
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
    .select("id, status, host_id, category, location")
    .single();

  if (error || !card) {
    return fail({ code: "CARD_APPROVE_FAILED", message: "카드를 승인하지 못했어요." }, 500);
  }

  await admin.from("admin_actions").insert({
    admin_id: auth.userId,
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

  // 검수 통과로 이제 막 공개된 카드 → 구독자 매칭 알림(§9).
  try {
    await notifySubscriptionMatches(admin, {
      id: card.id,
      host_id: card.host_id,
      category: card.category,
      location: card.location
    });
  } catch {
    // 알림 실패 무시
  }

  return ok({ card: { id: card.id, status: card.status } });
}
