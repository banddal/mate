import { fail, ok } from "@/lib/api/responses";
import { getCurrentUserAndProfile, isProfileComplete } from "@/lib/auth/session";
import { createServiceRoleSupabaseClient } from "@/lib/supabase/admin";
import { hasServiceEnv } from "@/lib/env";
import { DEMO_ROOM_ID } from "@/lib/demo-data";
import { z } from "zod";

export const dynamic = "force-dynamic";

const reviewSchema = z.object({
  attended: z.boolean(),
  onTime: z.boolean(),
  matchesDescription: z.boolean(),
  wouldRejoin: z.boolean(),
  reported: z.boolean()
});

type ReviewRouteContext = {
  params: {
    id: string;
  };
};

export async function POST(request: Request, { params }: ReviewRouteContext) {
  const { user, profile } = await getCurrentUserAndProfile();

  if (!user) {
    return fail({ code: "UNAUTHORIZED", message: "로그인이 필요합니다." }, 401);
  }

  if (!isProfileComplete(profile)) {
    return fail({ code: "ONBOARDING_REQUIRED", message: "온보딩을 완료해주세요." }, 403);
  }

  const parsed = reviewSchema.safeParse(await request.json().catch(() => null));

  if (!parsed.success) {
    return fail({ code: "INVALID_REVIEW", message: "후기 항목을 확인해주세요." }, 400);
  }

  if (!hasServiceEnv() || params.id === DEMO_ROOM_ID) {
    return ok({
      review: {
        id: "demo-review",
        room_id: params.id
      },
      next: "/feed"
    });
  }

  const admin = createServiceRoleSupabaseClient();
  const { data: review, error } = await admin
    .from("reviews")
    .insert({
      room_id: params.id,
      user_id: user.id,
      attended: parsed.data.attended,
      on_time: parsed.data.onTime,
      matches_description: parsed.data.matchesDescription,
      would_rejoin: parsed.data.wouldRejoin,
      reported: parsed.data.reported
    })
    .select("id, room_id")
    .single();

  if (error || !review) {
    return fail({ code: "REVIEW_CREATE_FAILED", message: "후기를 저장하지 못했어요." }, 500);
  }

  return ok({
    review,
    next: "/feed"
  });
}
