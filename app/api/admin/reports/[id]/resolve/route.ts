import { fail, ok } from "@/lib/api/responses";
import { getCurrentUserAndProfile, isProfileComplete } from "@/lib/auth/session";
import { createServiceRoleSupabaseClient } from "@/lib/supabase/admin";
import { hasServiceEnv } from "@/lib/env";
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
  const { data: report, error } = await admin
    .from("reports")
    .update({
      status: "resolved",
      resolution: parsed.data.resolution,
      resolved_by: user.id,
      resolved_at: new Date().toISOString()
    })
    .eq("id", params.id)
    .select("id, status, resolution")
    .single();

  if (error || !report) {
    return fail({ code: "REPORT_RESOLVE_FAILED", message: "신고를 해결 처리하지 못했어요." }, 500);
  }

  return ok({ report });
}
