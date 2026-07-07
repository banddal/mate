import { fail, ok } from "@/lib/api/responses";
import { getCurrentUserAndProfile, isProfileComplete } from "@/lib/auth/session";
import { getCategoryLevel } from "@/lib/cards/categories";
import { createSubscriptionSchema } from "@/lib/notifications/subscription-schema";
import { createServiceRoleSupabaseClient } from "@/lib/supabase/admin";
import { hasServiceEnv } from "@/lib/env";

export const dynamic = "force-dynamic";

type SubscriptionRow = {
  id: string;
  location: string;
  time_pattern: string;
  category: string;
  created_at: string;
};

// 한 유저가 만들 수 있는 구독 상한(스팸/과알림 방지)
const MAX_SUBSCRIPTIONS_PER_USER = 20;

export async function GET() {
  const { user, profile } = await getCurrentUserAndProfile();

  if (!user) {
    return fail({ code: "UNAUTHORIZED", message: "로그인이 필요합니다." }, 401);
  }

  if (!isProfileComplete(profile)) {
    return fail({ code: "ONBOARDING_REQUIRED", message: "온보딩을 완료해주세요." }, 403);
  }

  if (!hasServiceEnv()) {
    return ok({ subscriptions: [] });
  }

  const admin = createServiceRoleSupabaseClient();
  const { data, error } = await admin
    .from("subscriptions")
    .select("id, location, time_pattern, category, created_at")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false })
    .returns<SubscriptionRow[]>();

  if (error) {
    return fail({ code: "SUBSCRIPTION_LOOKUP_FAILED", message: "구독을 불러오지 못했어요." }, 500);
  }

  return ok({ subscriptions: data ?? [] });
}

export async function POST(request: Request) {
  const { user, profile } = await getCurrentUserAndProfile();

  if (!user) {
    return fail({ code: "UNAUTHORIZED", message: "로그인이 필요합니다." }, 401);
  }

  if (!isProfileComplete(profile)) {
    return fail({ code: "ONBOARDING_REQUIRED", message: "온보딩을 완료해주세요." }, 403);
  }

  const parsed = createSubscriptionSchema.safeParse(await request.json().catch(() => null));

  if (!parsed.success) {
    return fail(
      {
        code: "INVALID_SUBSCRIPTION",
        message: parsed.error.issues[0]?.message ?? "구독 정보를 확인해주세요."
      },
      400
    );
  }

  const level = getCategoryLevel(parsed.data.category);

  if (!level) {
    return fail({ code: "INVALID_CATEGORY", message: "카테고리를 확인해주세요." }, 400);
  }

  // L3는 V0.1에서 카드 자체가 차단되므로 구독도 만들 수 없다(일관성).
  if (level === "L3") {
    return fail({ code: "L3_NOT_AVAILABLE_YET", message: "지원하지 않는 카테고리예요." }, 400);
  }

  if (!hasServiceEnv()) {
    return fail({ code: "SERVER_CONFIG_MISSING", message: "서버 환경변수 설정이 필요합니다." }, 500);
  }

  const admin = createServiceRoleSupabaseClient();

  const { count } = await admin
    .from("subscriptions")
    .select("id", { count: "exact", head: true })
    .eq("user_id", user.id);

  if ((count ?? 0) >= MAX_SUBSCRIPTIONS_PER_USER) {
    return fail(
      { code: "SUBSCRIPTION_LIMIT_REACHED", message: "구독은 최대 20개까지 만들 수 있어요." },
      400
    );
  }

  // 동일 조건 중복 구독 방지
  const { data: existing } = await admin
    .from("subscriptions")
    .select("id")
    .eq("user_id", user.id)
    .eq("location", parsed.data.location)
    .eq("time_pattern", parsed.data.timePattern)
    .eq("category", parsed.data.category)
    .limit(1)
    .maybeSingle<{ id: string }>();

  if (existing) {
    return fail({ code: "SUBSCRIPTION_DUPLICATE", message: "이미 같은 구독이 있어요." }, 409);
  }

  const { data: subscription, error } = await admin
    .from("subscriptions")
    .insert({
      user_id: user.id,
      location: parsed.data.location,
      time_pattern: parsed.data.timePattern,
      category: parsed.data.category
    })
    .select("id, location, time_pattern, category, created_at")
    .single();

  if (error || !subscription) {
    return fail({ code: "SUBSCRIPTION_CREATE_FAILED", message: "구독을 저장하지 못했어요." }, 500);
  }

  return ok({ subscription });
}
