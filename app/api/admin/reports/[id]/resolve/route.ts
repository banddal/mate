import { fail, ok } from "@/lib/api/responses";
import { getCurrentUserAndProfile, isProfileComplete } from "@/lib/auth/session";
import { createServiceRoleSupabaseClient } from "@/lib/supabase/admin";
import { hasServiceEnv } from "@/lib/env";
import { createNotification } from "@/lib/notifications/create";
import { z } from "zod";

export const dynamic = "force-dynamic";

const resolveSchema = z.object({
  resolution: z.enum(["dismissed", "warned", "suspended_temp", "suspended_perm", "escalated"])
});

type ResolveRouteContext = {
  params: {
    id: string;
  };
};

export async function POST(request: Request, { params }: ResolveRouteContext) {
  const { user, profile } = await getCurrentUserAndProfile();

  if (!user) {
    return fail({ code: "UNAUTHORIZED", message: "로그인이 필요합니다." }, 401);
  }

  if (!isProfileComplete(profile)) {
    return fail({ code: "ONBOARDING_REQUIRED", message: "온보딩을 완료해주세요." }, 403);
  }

  const parsed = resolveSchema.safeParse(await request.json().catch(() => null));

  if (!parsed.success) {
    return fail({ code: "INVALID_RESOLUTION", message: "처리 결과를 확인해주세요." }, 400);
  }

  if (!hasServiceEnv() || params.id.startsWith("demo-")) {
    return ok({
      report: {
        id: params.id,
        status: "resolved",
        resolution: parsed.data.resolution
      }
    });
  }

  const admin = createServiceRoleSupabaseClient();

  // 이미 종결된 신고의 재처리 방지(§6: escalated/suspended_perm는 되돌릴 수 없고
  // resolved 이후 update를 막는다). status='resolved' 조건으로 update를 제한한다.
  const { data: existing } = await admin
    .from("reports")
    .select("id, status, reporter_id")
    .eq("id", params.id)
    .maybeSingle<{ id: string; status: string; reporter_id: string }>();

  if (!existing) {
    return fail({ code: "REPORT_NOT_FOUND", message: "신고를 찾지 못했어요." }, 404);
  }

  if (existing.status === "resolved") {
    return fail({ code: "REPORT_ALREADY_RESOLVED", message: "이미 종결된 신고입니다." }, 400);
  }

  const { data: report, error } = await admin
    .from("reports")
    .update({
      status: "resolved",
      resolution: parsed.data.resolution,
      resolved_by: user.id,
      resolved_at: new Date().toISOString()
    })
    .eq("id", params.id)
    .neq("status", "resolved")
    .select("id, status, resolution")
    .single();

  if (error || !report) {
    return fail({ code: "REPORT_RESOLVE_FAILED", message: "신고를 해결 처리하지 못했어요." }, 500);
  }

  await admin.from("admin_actions").insert({
    admin_id: user.id,
    action_type: "report_resolve",
    target_id: params.id,
    notes: parsed.data.resolution
  });

  // 신고자에게 처리 결과 알림(§6/§9). 구체적 처분 내용은 담지 않고 상태 변경만 알린다.
  try {
    await createNotification(admin, {
      userId: existing.reporter_id,
      type: "report_status_change",
      payload: {
        reportId: report.id,
        status: "resolved"
      }
    });
  } catch {
    // 알림 실패 무시
  }

  return ok({ report });
}
