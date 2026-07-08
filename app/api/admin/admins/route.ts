import { fail, ok } from "@/lib/api/responses";
import { getVerifiedAdmin } from "@/lib/auth/admin";
import { hasServiceEnv } from "@/lib/env";
import { createServiceRoleSupabaseClient } from "@/lib/supabase/admin";
import { z } from "zod";

export const dynamic = "force-dynamic";

const adminUserSchema = z.object({
  userId: z.string().trim().min(1)
});

export async function POST(request: Request) {
  const auth = await getVerifiedAdmin();

  if (!auth.ok) {
    return auth.response;
  }

  const parsed = adminUserSchema.safeParse(await request.json().catch(() => null));

  if (!parsed.success) {
    return fail({ code: "INVALID_ADMIN_USER", message: "운영자로 추가할 사용자를 확인해주세요." }, 400);
  }

  const userId = parsed.data.userId;

  if (!hasServiceEnv() || userId.startsWith("demo-")) {
    return ok({
      adminUser: {
        user_id: userId,
        granted_by: auth.userId,
        granted_at: new Date().toISOString()
      }
    });
  }

  const admin = createServiceRoleSupabaseClient();
  const { data: profile } = await admin.from("profiles").select("id").eq("id", userId).maybeSingle();

  if (!profile) {
    return fail({ code: "PROFILE_NOT_FOUND", message: "해당 사용자를 찾지 못했어요." }, 404);
  }

  const { data: adminUser, error } = await admin
    .from("admin_users")
    .upsert(
      {
        user_id: userId,
        granted_by: auth.userId
      },
      { onConflict: "user_id" }
    )
    .select("user_id, granted_by, granted_at")
    .single();

  if (error || !adminUser) {
    return fail({ code: "ADMIN_GRANT_FAILED", message: "운영자 권한을 부여하지 못했어요." }, 500);
  }

  await admin.from("admin_actions").insert({
    admin_id: auth.userId,
    action_type: "admin_grant",
    target_id: userId,
    notes: "운영자 권한 부여"
  });

  return ok({ adminUser });
}

export async function DELETE(request: Request) {
  const auth = await getVerifiedAdmin();

  if (!auth.ok) {
    return auth.response;
  }

  const parsed = adminUserSchema.safeParse(await request.json().catch(() => null));

  if (!parsed.success) {
    return fail({ code: "INVALID_ADMIN_USER", message: "권한을 회수할 사용자를 확인해주세요." }, 400);
  }

  const userId = parsed.data.userId;

  if (userId === auth.userId) {
    return fail({ code: "SELF_REVOKE_BLOCKED", message: "현재 로그인한 운영자 권한은 직접 회수할 수 없어요." }, 400);
  }

  if (!hasServiceEnv() || userId.startsWith("demo-")) {
    return ok({
      adminUser: {
        user_id: userId,
        revoked: true
      }
    });
  }

  const admin = createServiceRoleSupabaseClient();
  const { error } = await admin.from("admin_users").delete().eq("user_id", userId);

  if (error) {
    return fail({ code: "ADMIN_REVOKE_FAILED", message: "운영자 권한을 회수하지 못했어요." }, 500);
  }

  await admin.from("admin_actions").insert({
    admin_id: auth.userId,
    action_type: "admin_revoke",
    target_id: userId,
    notes: "운영자 권한 회수"
  });

  return ok({
    adminUser: {
      user_id: userId,
      revoked: true
    }
  });
}
