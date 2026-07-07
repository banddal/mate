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
  return Boolean(
    profile &&
      profile.nickname &&
      profile.age_range &&
      profile.gender &&
      profile.categories.length > 0 &&
      profile.phone_verified
  );
}

export async function getCurrentUserAndProfile() {
  const devSession = await getDevAuthSession();

  if (devSession) {
    return devSession;
  }

  if (!hasPublicEnv()) {
    return { user: null, profile: null };
  }

  const supabase = createServerSupabaseClient();
  const {
    data: { user },
    error: userError
  } = await supabase.auth.getUser();

  if (userError || !user) {
    return { user: null, profile: null };
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
