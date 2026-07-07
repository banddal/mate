import { fail, ok } from "@/lib/api/responses";
import { isAuthorizedCronRequest } from "@/lib/cron/auth";
import { createServiceRoleSupabaseClient } from "@/lib/supabase/admin";
import { hasServiceEnv } from "@/lib/env";
import { dispatchPendingNotifications } from "@/lib/notifications/dispatch";

export const dynamic = "force-dynamic";

/**
 * Mate_Backend_Spec.md §4/§9:
 * notifications.status='pending' 행을 Web Push로 발송한다(1분 주기).
 * 실제 발송/재시도/죽은 구독 정리 로직은 lib/notifications/dispatch.ts에 있다.
 */
export async function POST(request: Request) {
  if (!isAuthorizedCronRequest(request)) {
    return fail({ code: "UNAUTHORIZED", message: "허가되지 않은 요청입니다." }, 401);
  }

  if (!hasServiceEnv()) {
    return fail({ code: "SERVER_CONFIG_MISSING", message: "서버 환경변수 설정이 필요합니다." }, 500);
  }

  const admin = createServiceRoleSupabaseClient();
  const summary = await dispatchPendingNotifications(admin);

  return ok({ summary });
}

// Vercel Cron은 스케줄된 path로 GET 요청을 보낸다(Authorization: Bearer CRON_SECRET 포함).
// POST와 동일하게 처리한다.
export async function GET(request: Request) {
  return POST(request);
}
