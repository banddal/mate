import { createServerSupabaseClient } from "@/lib/supabase/server";
import { createServiceRoleSupabaseClient } from "@/lib/supabase/admin";
import { verifyOtp } from "@/lib/auth/otp";
import { fail, ok } from "@/lib/api/responses";
import { PHONE_OTP_MAX_ATTEMPTS } from "@/shared/config";
import { z } from "zod";

export const runtime = "nodejs";

const verifySchema = z.object({
  phoneNumber: z.string().trim().min(8).max(20),
  otp: z.string().trim().regex(/^\d{6}$/)
});

export async function POST(request: Request) {
  const body = verifySchema.safeParse(await request.json().catch(() => null));

  if (!body.success) {
    return fail({ code: "INVALID_OTP", message: "인증번호를 확인해주세요." }, 400);
  }

  const supabase = createServerSupabaseClient();
  const {
    data: { user }
  } = await supabase.auth.getUser();

  if (!user) {
    return fail({ code: "UNAUTHORIZED", message: "로그인이 필요합니다." }, 401);
  }

  const admin = createServiceRoleSupabaseClient();
  const { data: otpRequest, error: lookupError } = await admin
    .from("phone_otp_requests")
    .select("id, otp_hash, expires_at, attempt_count")
    .eq("user_id", user.id)
    .eq("phone_number", body.data.phoneNumber)
    .is("verified_at", null)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (lookupError) {
    return fail({ code: "OTP_LOOKUP_FAILED", message: "인증 요청을 확인하지 못했어요." }, 500);
  }

  if (!otpRequest) {
    return fail({ code: "OTP_NOT_FOUND", message: "먼저 인증번호를 요청해주세요." }, 404);
  }

  if (new Date(otpRequest.expires_at).getTime() < Date.now()) {
    return fail({ code: "OTP_EXPIRED", message: "인증번호가 만료됐어요." }, 400);
  }

  if (otpRequest.attempt_count >= PHONE_OTP_MAX_ATTEMPTS) {
    return fail({ code: "OTP_ATTEMPTS_EXCEEDED", message: "인증 시도 횟수를 초과했어요." }, 429);
  }

  const matches = verifyOtp(body.data.otp, otpRequest.otp_hash);

  if (!matches) {
    await admin
      .from("phone_otp_requests")
      .update({ attempt_count: otpRequest.attempt_count + 1 })
      .eq("id", otpRequest.id);

    return fail({ code: "OTP_MISMATCH", message: "인증번호가 맞지 않아요." }, 400);
  }

  const verifiedAt = new Date().toISOString();
  const { error: updateOtpError } = await admin
    .from("phone_otp_requests")
    .update({ verified_at: verifiedAt })
    .eq("id", otpRequest.id);

  if (updateOtpError) {
    return fail({ code: "OTP_VERIFY_FAILED", message: "인증 상태를 저장하지 못했어요." }, 500);
  }

  const { error: updateProfileError } = await admin
    .from("profiles")
    .update({ phone_verified: true })
    .eq("id", user.id);

  if (updateProfileError) {
    return fail({ code: "PROFILE_UPDATE_FAILED", message: "프로필 인증 상태를 저장하지 못했어요." }, 500);
  }

  return ok({ phoneVerified: true });
}
