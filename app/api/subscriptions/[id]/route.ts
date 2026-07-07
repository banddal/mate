import { fail, ok } from "@/lib/api/responses";
import { getCurrentUserAndProfile } from "@/lib/auth/session";
import { createServiceRoleSupabaseClient } from "@/lib/supabase/admin";
import { hasServiceEnv } from "@/lib/env";

export const dynamic = "force-dynamic";

type SubscriptionRouteContext = {
  params: {
    id: string;
  };
};

/**
 * 자기 소유(user_id 일치) 상황 템플릿 구독을 삭제한다.
 */
export async function DELETE(_request: Request, { params }: SubscriptionRouteContext) {
  const { user } = await getCurrentUserAndProfile();

  if (!user) {
    return fail({ code: "UNAUTHORIZED", message: "로그인이 필요합니다." }, 401);
  }

  if (!hasServiceEnv()) {
    return fail({ code: "SERVER_CONFIG_MISSING", message: "서버 환경변수 설정이 필요합니다." }, 500);
  }

  const admin = createServiceRoleSupabaseClient();
  const { error } = await admin
    .from("subscriptions")
    .delete()
    .eq("id", params.id)
    .eq("user_id", user.id);

  if (error) {
    return fail({ code: "SUBSCRIPTION_DELETE_FAILED", message: "구독을 해지하지 못했어요." }, 500);
  }

  return ok({ deleted: true });
}
