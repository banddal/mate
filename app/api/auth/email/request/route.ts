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

    const otpUrl = new URL("/auth/v1/otp", env.NEXT_PUBLIC_SUPABASE_URL);
    if (body.data.redirectTo) {
      otpUrl.searchParams.set("redirect_to", body.data.redirectTo);
    }

    const response = await fetch(otpUrl, {
      method: "POST",
      headers: {
        apikey: env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
        Authorization: `Bearer ${env.NEXT_PUBLIC_SUPABASE_ANON_KEY}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        email: body.data.email,
        create_user: true
      })
    });

    const responseText = await response.text();

    if (!response.ok) {
      const normalized = normalizeAuthError({
        status: response.status,
        statusText: response.statusText,
        body: responseText
      });

      return fail(normalized, normalized.status);
    }

    if (responseText) {
      const payload = parseResponseBody(responseText);
      if (isErrorPayload(payload)) {
        const normalized = normalizeAuthError({
          status: response.status,
          statusText: response.statusText,
          body: responseText
        });

        return fail(normalized, normalized.status);
      }
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

  if (
    lowerMessage.includes("error sending magic link email") ||
    lowerMessage.includes("error sending confirmation email") ||
    lowerMessage.includes("error sending email")
  ) {
    return {
      code: "SMTP_SEND_FAILED",
      message:
        "Supabase가 SMTP 서버로 인증 메일을 보내지 못했어요. Gmail 앱 비밀번호, SMTP host/port, 발신자 주소, Custom SMTP 활성화 상태를 확인해주세요.",
      status: 502
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
  if (isAuthHttpError(error)) {
    const parsedBody = parseResponseBody(error.body);
    const bodyMessage =
      getBodyMessage(parsedBody) ||
      (error.body && error.body !== "{}" ? error.body : null) ||
      error.statusText ||
      "Supabase Auth 응답이 비어 있습니다.";

    return {
      message: `Supabase Auth HTTP ${error.status}: ${bodyMessage}`,
      status: error.status
    };
  }

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

function isAuthHttpError(error: unknown): error is { status: number; statusText?: string; body: string } {
  if (!error || typeof error !== "object") {
    return false;
  }

  const record = error as Record<string, unknown>;
  return typeof record.status === "number" && typeof record.body === "string";
}

function parseResponseBody(body: string) {
  if (!body) {
    return null;
  }

  try {
    return JSON.parse(body) as unknown;
  } catch {
    return body;
  }
}

function isErrorPayload(payload: unknown) {
  if (!payload || typeof payload !== "object") {
    return false;
  }

  const record = payload as Record<string, unknown>;
  return Boolean(record.error || record.error_code || record.error_description || record.msg || record.message);
}

function getBodyMessage(payload: unknown) {
  if (!payload || typeof payload !== "object") {
    return typeof payload === "string" && payload ? payload : null;
  }

  const record = payload as Record<string, unknown>;
  return (
    getString(record.message) ||
    getString(record.msg) ||
    getString(record.error_description) ||
    getString(record.error_code) ||
    getString(record.error) ||
    JSON.stringify(record)
  );
}
