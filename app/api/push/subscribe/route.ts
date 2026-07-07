import { fail, ok } from "@/lib/api/responses";
import { getCurrentUserAndProfile, isProfileComplete } from "@/lib/auth/session";
import { createServiceRoleSupabaseClient } from "@/lib/supabase/admin";
import { hasServiceEnv } from "@/lib/env";
import { pushSubscribeSchema } from "@/lib/notifications/subscription";

export const dynamic = "force-dynamic";

/**
 * Web Push 구독 등록/갱신 (Mate_Backend_Spec.md §9).
 *
 * 브라우저의 PushSubscription을 받아 push_subscriptions에 저장한다.
 * endpoint는 unique이므로 upsert(onConflict: endpoint)로 처리한다 —
 * 같은 기기가 재구독하거나, 기기가 다른 유저로 넘어간 경우 소유자를
 * 현재 로그인 유저로 갱신한다.
 */
export async function POST(request: Request) {
  const { user, profile } = await getCurrentUserAndProfile();

  if (!user) {
    return fail({ code: "UNAUTHORIZED", message: "로그인이 필요합니다." }, 401);
  }

  if (!isProfileComplete(profile)) {
    return fail({ code: "ONBOARDING_REQUIRED", message: "온보딩을 완료해주세요." }, 403);
  }

  const parsed = pushSubscribeSchema.safeParse(await request.json().catch(() => null));

  if (!parsed.success) {
    return fail({ code: "INVALID_SUBSCRIPTION", message: "구독 정보를 확인해주세요." }, 400);
  }

  if (!hasServiceEnv()) {
    return fail({ code: "SERVER_CONFIG_MISSING", message: "서버 환경변수 설정이 필요합니다." }, 500);
  }

  const admin = createServiceRoleSupabaseClient();
  const { data: subscription, error } = await admin
    .from("push_subscriptions")
    .upsert(
      {
        user_id: user.id,
        endpoint: parsed.data.endpoint,
        p256dh: parsed.data.keys.p256dh,
        auth_key: parsed.data.keys.auth
      },
      { onConflict: "endpoint" }
    )
    .select("id")
    .single();

  if (error || !subscription) {
    return fail({ code: "SUBSCRIPTION_SAVE_FAILED", message: "구독을 저장하지 못했어요." }, 500);
  }

  return ok({ subscription: { id: subscription.id } });
}
