import "server-only";

import { cookies } from "next/headers";
import { createServiceRoleSupabaseClient } from "@/lib/supabase/admin";
import { hasServiceEnv } from "@/lib/env";
import type { MateProfile } from "@/lib/auth/session";

export const DEV_AUTH_COOKIE = "mate_dev_user_id";
export const DEV_AUTH_EMAIL = "dev-mate@local.test";
export const DEV_AUTH_FALLBACK_USER_ID = "00000000-0000-4000-8000-000000000001";

export function isDevAuthBypassEnabled() {
  return process.env.DISABLE_DEV_AUTH_BYPASS !== "1";
}

export async function getDevAuthSession() {
  if (!isDevAuthBypassEnabled()) {
    return null;
  }

  const userId = cookies().get(DEV_AUTH_COOKIE)?.value;

  if (!userId) {
    return null;
  }

  if (!hasServiceEnv()) {
    return getFallbackDevSession(userId);
  }

  const admin = createServiceRoleSupabaseClient();
  const { data: profile } = await admin
    .from("profiles")
    .select("id, nickname, age_range, gender, categories, phone_verified, created_at")
    .eq("id", userId)
    .maybeSingle<MateProfile>();

  if (!profile) {
    return getFallbackDevSession(userId);
  }

  return {
    user: {
      id: profile.id,
      email: DEV_AUTH_EMAIL
    },
    profile
  };
}

export async function ensureDevAuthProfile() {
  if (!isDevAuthBypassEnabled()) {
    throw new Error("DEV_AUTH_BYPASS_DISABLED");
  }

  if (!hasServiceEnv()) {
    return getFallbackDevSession(DEV_AUTH_FALLBACK_USER_ID);
  }

  const admin = createServiceRoleSupabaseClient();
  const { data: usersData, error: usersError } = await admin.auth.admin.listUsers({
    page: 1,
    perPage: 1000
  });

  if (usersError) {
    throw usersError;
  }

  let user = usersData.users.find((candidate) => candidate.email === DEV_AUTH_EMAIL) ?? null;

  if (!user) {
    const { data: createdUserData, error: createUserError } =
      await admin.auth.admin.createUser({
        email: DEV_AUTH_EMAIL,
        password: "dev-mate-local-password",
        email_confirm: true,
        user_metadata: {
          name: "Dev Mate"
        }
      });

    if (createUserError || !createdUserData.user) {
      throw createUserError ?? new Error("DEV_USER_CREATE_FAILED");
    }

    user = createdUserData.user;
  }

  const { data: profile, error: profileError } = await admin
    .from("profiles")
    .upsert(
      {
        id: user.id,
        nickname: "Dev Mate",
        age_range: "20s",
        gender: "prefer_not_to_say",
        categories: ["야구 직관", "맛집"],
        phone_verified: true
      },
      { onConflict: "id" }
    )
    .select("id, nickname, age_range, gender, categories, phone_verified, created_at")
    .single<MateProfile>();

  if (profileError) {
    throw profileError;
  }

  return { user, profile };
}

function getFallbackDevSession(userId: string) {
  const profile: MateProfile = {
    id: userId || DEV_AUTH_FALLBACK_USER_ID,
    nickname: "Dev Mate",
    age_range: "20s",
    gender: "prefer_not_to_say",
    categories: ["야구 직관", "맛집"],
    phone_verified: true,
    created_at: new Date().toISOString()
  };

  return {
    user: {
      id: profile.id,
      email: DEV_AUTH_EMAIL
    },
    profile
  };
}
