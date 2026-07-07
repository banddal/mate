import { fail, ok } from "@/lib/api/responses";
import { getCurrentUserAndProfile, isProfileComplete } from "@/lib/auth/session";
import { createServiceRoleSupabaseClient } from "@/lib/supabase/admin";
import { hasServiceEnv } from "@/lib/env";
import { DEMO_ROOM_ID } from "@/lib/demo-data";
import { z } from "zod";

export const dynamic = "force-dynamic";

const reportSchema = z
  .object({
    targetRoomId: z.string().trim().optional(),
    targetCardId: z.string().trim().optional(),
    reason: z
      .string()
      .trim()
      .min(8, "신고 사유는 8자 이상 입력해주세요.")
      .max(500, "신고 사유는 500자 이내로 입력해주세요.")
  })
  .refine((data) => data.targetRoomId || data.targetCardId, {
    message: "신고 대상을 확인해주세요."
  });

export async function POST(request: Request) {
  const { user, profile } = await getCurrentUserAndProfile();

  if (!user) {
    return fail({ code: "UNAUTHORIZED", message: "로그인이 필요합니다." }, 401);
  }

  if (!isProfileComplete(profile)) {
    return fail({ code: "ONBOARDING_REQUIRED", message: "온보딩을 완료해주세요." }, 403);
  }

  const parsed = reportSchema.safeParse(await request.json().catch(() => null));

  if (!parsed.success) {
    return fail(
      {
        code: "INVALID_REPORT",
        message: parsed.error.issues[0]?.message ?? "신고 내용을 확인해주세요."
      },
      400
    );
  }

  if (!hasServiceEnv() || parsed.data.targetRoomId === DEMO_ROOM_ID) {
    return ok({
      report: {
        id: "demo-report",
        status: "open"
      }
    });
  }

  const admin = createServiceRoleSupabaseClient();
  const { data: report, error } = await admin
    .from("reports")
    .insert({
      reporter_id: user.id,
      target_room_id: parsed.data.targetRoomId || null,
      target_card_id: parsed.data.targetCardId || null,
      reason: parsed.data.reason,
      status: "open"
    })
    .select("id, status")
    .single();

  if (error || !report) {
    return fail({ code: "REPORT_CREATE_FAILED", message: "신고를 저장하지 못했어요." }, 500);
  }

  return ok({ report });
}
