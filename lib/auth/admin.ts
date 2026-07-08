import "server-only";

import { redirect } from "next/navigation";
import { fail } from "@/lib/api/responses";
import { DEV_AUTH_FALLBACK_USER_ID } from "@/lib/dev-auth";
import { hasServiceEnv } from "@/lib/env";
import { createServiceRoleSupabaseClient } from "@/lib/supabase/admin";
import { getCurrentUserAndProfile, isProfileComplete, requireOnboarded } from "@/lib/auth/session";

export async function isAdminUser(userId: string) {
  if (!hasServiceEnv() || userId === DEV_AUTH_FALLBACK_USER_ID) {
    return true;
  }

  const admin = createServiceRoleSupabaseClient();
  const { data: adminUser } = await admin
    .from("admin_users")
    .select("user_id")
    .eq("user_id", userId)
    .maybeSingle();

  return Boolean(adminUser);
}

export async function requireAdmin() {
  const session = await requireOnboarded();

  if (!(await isAdminUser(session.user.id))) {
    redirect("/feed");
  }

  return session;
}

export async function getVerifiedAdmin() {
  const { user, profile } = await getCurrentUserAndProfile();

  if (!user) {
    return {
      ok: false as const,
      response: fail({ code: "UNAUTHORIZED", message: "로그인이 필요합니다." }, 401)
    };
  }

  if (!isProfileComplete(profile)) {
    return {
      ok: false as const,
      response: fail({ code: "ONBOARDING_REQUIRED", message: "온보딩을 완료해주세요." }, 403)
    };
  }

  if (!(await isAdminUser(user.id))) {
    return {
      ok: false as const,
      response: fail({ code: "ADMIN_REQUIRED", message: "운영자 권한이 필요합니다." }, 403)
    };
  }

  return {
    ok: true as const,
    userId: user.id
  };
}
