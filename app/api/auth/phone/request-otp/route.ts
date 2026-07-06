import { addMinutes, differenceInSeconds } from "@/lib/datetime";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { createServiceRoleSupabaseClient } from "@/lib/supabase/admin";
import { createPhoneOtp, hashOtp } from "@/lib/auth/otp";
import { fail, ok } from "@/lib/api/responses";
import {
  PHONE_OTP_EXPIRY_MINUTES,
  PHONE_OTP_RESEND_COOLDOWN_SECONDS
} from "@/shared/config";
import { z } from "zod";

export const runtime = "nodejs";

const requestSchema = z.object({
  phoneNumber: z.string().trim().min(8).max(20)
});

export async function POST(request: Request) {
  const body = requestSchema.safeParse(await request.json().catch(() => null));

  if (!body.success) {
    return fail(
      {
        code: "INVALID_PHONE_NUMBER",
        message: "휴대폰 번호를 확인해주세요."
      },
      400
    );
  }

  const supabase = createServerSupabaseClient();
  const {
    data: { user }
  } = await supabase.auth.getUser();

  if (!user) {
    return fail({ code: "UNAUTHORIZED", message: "로그인이 필요합니다." }, 401);
  }

  const admin = createServiceRoleSupabaseClient();
  const { data: latestRequest, error: latestError } = await admin
    .from("phone_otp_requests")
    .select("created_at")
    .eq("user_id", user.id)
    .eq("phone_number", body.data.phoneNumber)
    .is("verified_at", null)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (latestError) {
    return fail({ code: "OTP_LOOKUP_FAILED", message: "인증 요청을 확인하지 못했어요." }, 500);
  }

  if (
    latestRequest &&
    differenceInSeconds(new Date(), new Date(latestRequest.created_at)) <
      PHONE_OTP_RESEND_COOLDOWN_SECONDS
  ) {
    return fail(
      {
        code: "OTP_COOLDOWN",
        message: "잠시 후 다시 요청해주세요."
      },
      429
    );
  }

  const otp = createPhoneOtp();
  const { error: insertError } = await admin.from("phone_otp_requests").insert({
    user_id: user.id,
    phone_number: body.data.phoneNumber,
    otp_hash: hashOtp(otp),
    expires_at: addMinutes(new Date(), PHONE_OTP_EXPIRY_MINUTES).toISOString()
  });

  if (insertError) {
    return fail({ code: "OTP_CREATE_FAILED", message: "인증번호를 만들지 못했어요." }, 500);
  }

  if (!process.env.SMS_VENDOR_API_KEY) {
    return ok({
      devOtp: otp,
      expiresInMinutes: PHONE_OTP_EXPIRY_MINUTES
    });
  }

  return fail(
    {
      code: "SMS_VENDOR_NOT_IMPLEMENTED",
      message: "SMS 발송 연동이 아직 준비되지 않았어요."
    },
    501
  );
}
