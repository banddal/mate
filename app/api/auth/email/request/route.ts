import { createClient } from "@supabase/supabase-js";
import { z } from "zod";
import { fail, ok } from "@/lib/api/responses";
import { getPublicEnv } from "@/lib/env";

const bodySchema = z.object({
  email: z.string().trim().email(),
  redirectTo: z.string().url().optional()
});

export async function POST(request: Request) {
  const body = bodySchema.safeParse(await request.json().catch(() => null));

  if (!body.success) {
    return fail(
      {
        code: "INVALID_EMAIL_REQUEST",
        message: "이메일 주소를 확인해주세요."
      },
      400
    );
  }

  try {
    const env = getPublicEnv();
    const supabase = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.NEXT_PUBLIC_SUPABASE_ANON_KEY, {
      auth: {
        persistSession: false,
        autoRefreshToken: false
      }
    });

    const { error } = await supabase.auth.signInWithOtp({
      email: body.data.email,
      options: {
        emailRedirectTo: body.data.redirectTo
      }
    });

    if (error) {
      const normalized = normalizeAuthError(error);
      return fail(normalized, normalized.status);
    }

    return ok({ sent: true });
  } catch (error) {
    const normalized = normalizeAuthError(error);
    return fail(normalized, normalized.status);
  }
}

function normalizeAuthError(error: unknown) {
  const details = getErrorDetails(error);
  const lowerMessage = details.message.toLowerCase();
  const status = details.status;

  if (lowerMessage.includes("rate limit") || status === 429) {
    return {
      code: "EMAIL_RATE_LIMITED",
      message:
        "Supabase 이메일 발송 제한에 걸렸어요. Custom SMTP 적용 여부와 Authentication > Rate Limits 값을 확인해주세요.",
      status: 429
    };
  }

  if (
    lowerMessage.includes("timeout") ||
    lowerMessage.includes("context deadline") ||
    status === 504
  ) {
    return {
      code: "EMAIL_PROVIDER_TIMEOUT",
      message:
        "Supabase가 인증 메일 발송 단계에서 시간 초과됐어요. SMTP 계정/앱 비밀번호/발신자 주소 설정을 다시 확인해주세요.",
      status: 504
    };
  }

  if (lowerMessage.includes("not authorized") || lowerMessage.includes("unauthorized")) {
    return {
      code: "EMAIL_NOT_AUTHORIZED",
      message:
        "Supabase 기본 메일 서버가 이 주소 발송을 허용하지 않았어요. Custom SMTP가 실제로 활성화됐는지 확인해주세요.",
      status: 403
    };
  }

  return {
    code: "EMAIL_AUTH_REQUEST_FAILED",
    message: details.message,
    status: status >= 400 ? status : 500
  };
}

function getErrorDetails(error: unknown) {
  if (error instanceof Error) {
    const status = getStatus(error);
    const message = error.message && error.message !== "{}" ? error.message : "Supabase Auth 요청이 실패했지만 상세 메시지가 비어 있습니다.";
    return { message, status };
  }

  if (error && typeof error === "object") {
    const record = error as Record<string, unknown>;
    const message =
      getString(record.message) ||
      getString(record.error_description) ||
      getString(record.error) ||
      JSON.stringify(record);

    return {
      message: message && message !== "{}" ? message : "Supabase Auth 요청이 실패했지만 상세 메시지가 비어 있습니다.",
      status: getStatus(record)
    };
  }

  return {
    message: typeof error === "string" && error ? error : "Supabase Auth 요청 중 알 수 없는 문제가 생겼어요.",
    status: 500
  };
}

function getString(value: unknown) {
  return typeof value === "string" && value.length > 0 ? value : null;
}

function getStatus(value: unknown) {
  if (!value || typeof value !== "object") {
    return 500;
  }

  const record = value as Record<string, unknown>;
  const status = record.status ?? record.statusCode;
  return typeof status === "number" ? status : 500;
}
