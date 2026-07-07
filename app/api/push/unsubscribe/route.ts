import { fail, ok } from "@/lib/api/responses";
import { getCurrentUserAndProfile } from "@/lib/auth/session";
import { createServiceRoleSupabaseClient } from "@/lib/supabase/admin";
import { hasServiceEnv } from "@/lib/env";
import { pushUnsubscribeSchema } from "@/lib/notifications/subscription";

export const dynamic = "force-dynamic";

/**
 * Web Push 구독 해지.
 * 자기 소유(user_id 일치) endpoint만 삭제한다.
 */
export async function POST(request: Request) {
  const { user } = await getCurrentUserAndProfile();

  if (!user) {
    return fail({ code: "UNAUTHORIZED", message: "로그인이 필요합니다." }, 401);
  }

  const parsed = pushUnsubscribeSchema.safeParse(await request.json().catch(() => null));

  if (!parsed.success) {
    return fail({ code: "INVALID_SUBSCRIPTION", message: "구독 정보를 확인해주세요." }, 400);
  }

  if (!hasServiceEnv()) {
    return fail({ code: "SERVER_CONFIG_MISSING", message: "서버 환경변수 설정이 필요합니다." }, 500);
  }

  const admin = createServiceRoleSupabaseClient();
  const { error } = await admin
    .from("push_subscriptions")
    .delete()
    .eq("user_id", user.id)
    .eq("endpoint", parsed.data.endpoint);

  if (error) {
    return fail({ code: "SUBSCRIPTION_DELETE_FAILED", message: "구독을 해지하지 못했어요." }, 500);
  }

  return ok({ unsubscribed: true });
}
