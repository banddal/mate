import "server-only";
import { redirect } from "next/navigation";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { hasPublicEnv } from "@/lib/env";
import { getDevAuthSession } from "@/lib/dev-auth";

export type MateProfile = {
  id: string;
  nickname: string;
  age_range: string;
  gender: string;
  categories: string[];
  phone_verified: boolean;
  created_at: string;
};

export function isProfileComplete(profile: MateProfile | null) {
  // MVP는 휴대폰 인증을 요구하지 않는다 (Mate_MVP_Scope.md §2).
  return Boolean(
    profile &&
      profile.nickname &&
      profile.age_range &&
      profile.gender &&
      profile.categories.length > 0
  );
}

export async function getCurrentUserAndProfile() {
  // 실제 로그인 세션이 있으면 dev 쿠키보다 항상 우선한다.
  // (과거 /dev-login 쿠키가 남아 실제 유저를 dev 유저로 오인하는 문제 방지)
  if (!hasPublicEnv()) {
    const devSession = await getDevAuthSession();
    return devSession ?? { user: null, profile: null };
  }

  const supabase = createServerSupabaseClient();
  const {
    data: { user },
    error: userError
  } = await supabase.auth.getUser();

  if (userError || !user) {
    const devSession = await getDevAuthSession();
    return devSession ?? { user: null, profile: null };
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("id, nickname, age_range, gender, categories, phone_verified, created_at")
    .eq("id", user.id)
    .maybeSingle<MateProfile>();

  return { user, profile: profile ?? null };
}

export async function requireUser() {
  const { user, profile } = await getCurrentUserAndProfile();

  if (!user) {
    redirect("/login");
  }

  return { user, profile };
}

export async function requireOnboarded() {
  const { user, profile } = await requireUser();

  if (!isProfileComplete(profile)) {
    redirect("/onboarding");
  }

  return { user, profile };
}
