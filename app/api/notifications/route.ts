import { fail, ok } from "@/lib/api/responses";
import { getCurrentUserAndProfile, isProfileComplete } from "@/lib/auth/session";
import { hasServiceEnv } from "@/lib/env";
import { createServiceRoleSupabaseClient } from "@/lib/supabase/admin";

export const dynamic = "force-dynamic";

type NotificationRow = {
  id: string;
  type: string;
  payload: Record<string, unknown>;
  status: "pending" | "sent" | "failed";
  attempts: number;
  created_at: string;
};

export async function GET() {
  const { user, profile } = await getCurrentUserAndProfile();

  if (!user) {
    return fail({ code: "UNAUTHORIZED", message: "로그인이 필요합니다." }, 401);
  }

  if (!isProfileComplete(profile)) {
    return fail({ code: "ONBOARDING_REQUIRED", message: "온보딩을 완료해주세요." }, 403);
  }

  if (!hasServiceEnv()) {
    return ok({
      notifications: [
        {
          id: "demo-notification-1",
          type: "application_resolved",
          payload: {
            cardTitle: "잠실 야구 직관 같이 가요",
            outcome: "approved"
          },
          status: "sent",
          attempts: 1,
          created_at: new Date().toISOString()
        }
      ] satisfies NotificationRow[]
    });
  }

  const admin = createServiceRoleSupabaseClient();
  const { data, error } = await admin
    .from("notifications")
    .select("id, type, payload, status, attempts, created_at")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false })
    .limit(20)
    .returns<NotificationRow[]>();

  if (error) {
    return fail({ code: "NOTIFICATION_LOOKUP_FAILED", message: "알림을 불러오지 못했어요." }, 500);
  }

  return ok({ notifications: data ?? [] });
}
