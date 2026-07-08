"use client";

import { KeyRound, Mail, MessageCircle, ShieldCheck } from "lucide-react";
import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import { createBrowserSupabaseClient } from "@/lib/supabase/browser";

type LoginFormProps = {
  canUseKakao: boolean;
  canUseDevAuth: boolean;
  initialError?: string;
};

export function LoginForm({ canUseKakao, canUseDevAuth, initialError }: LoginFormProps) {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [otpCode, setOtpCode] = useState("");
  const [status, setStatus] = useState<"idle" | "loading" | "sent" | "verifying" | "error">(
    initialError ? "error" : "idle"
  );
  const [message, setMessage] = useState(initialError ?? "");
  const [isMessageError, setIsMessageError] = useState(Boolean(initialError));

  const siteUrl = getSiteUrl();
  const redirectTo = siteUrl ? `${siteUrl.replace(/\/$/, "")}/auth/confirm` : undefined;
  const hasSupabasePublicEnv = Boolean(
    process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  );

  async function handleKakaoLogin() {
    setStatus("loading");
    setMessage("");
    setIsMessageError(false);

    try {
      if (!hasSupabasePublicEnv) {
        throw new Error("Supabase 공개 환경변수가 설정되지 않았습니다.");
      }

      const supabase = createBrowserSupabaseClient();
      const { error } = await supabase.auth.signInWithOAuth({
        provider: "kakao",
        options: {
          redirectTo
        }
      });

      if (error) {
        throw error;
      }
    } catch (error) {
      setStatus("error");
      setIsMessageError(true);
      setMessage(getLoginErrorMessage(error, "카카오 로그인을 시작하지 못했어요."));
    }
  }

  async function handleEmailLogin(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setStatus("loading");
    setMessage("");
    setIsMessageError(false);

    try {
      if (!hasSupabasePublicEnv) {
        throw new Error("Supabase 공개 환경변수가 설정되지 않았습니다.");
      }

      const supabase = createBrowserSupabaseClient();
      const { error } = await supabase.auth.signInWithOtp({
        email,
        options: {
          emailRedirectTo: redirectTo
        }
      });

      if (error) {
        throw error;
      }

      setStatus("sent");
      setIsMessageError(false);
      setMessage("메일을 보냈어요. 메일에 있는 6자리 코드를 아래에 입력해주세요.");
    } catch (error) {
      setStatus("error");
      setIsMessageError(true);
      setMessage(getLoginErrorMessage(error, "로그인 코드를 보내지 못했어요."));
    }
  }

  async function handleOtpVerify(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setStatus("verifying");
    setMessage("");
    setIsMessageError(false);

    try {
      if (!hasSupabasePublicEnv) {
        throw new Error("Supabase 공개 환경변수가 설정되지 않았습니다.");
      }

      const normalizedEmail = email.trim();
      const normalizedCode = otpCode.trim().replace(/\s/g, "");

      if (!normalizedEmail || normalizedCode.length < 6) {
        throw new Error("이메일과 6자리 코드를 확인해주세요.");
      }

      const supabase = createBrowserSupabaseClient();
      const { error } = await supabase.auth.verifyOtp({
        email: normalizedEmail,
        token: normalizedCode,
        type: "email"
      });

      if (error) {
        throw error;
      }

      setMessage("로그인했어요. 다음 화면으로 이동합니다.");
      router.replace("/onboarding");
    } catch (error) {
      setStatus("sent");
      setIsMessageError(true);
      setMessage(getLoginErrorMessage(error, "로그인 코드를 확인하지 못했어요."));
    }
  }

  return (
    <main className="min-h-dvh px-5 pb-[calc(24px+env(safe-area-inset-bottom))] pt-[calc(28px+env(safe-area-inset-top))]">
      <section className="mx-auto flex min-h-[calc(100dvh-56px)] w-full max-w-md flex-col justify-between">
        <div className="space-y-8">
          <div className="flex items-center justify-between">
            <div className="text-xl font-semibold tracking-normal">Mate</div>
            <div className="rounded-full border border-line bg-white/70 px-3 py-1 text-xs font-medium text-ink/70">
              V0.1
            </div>
          </div>

          <div className="space-y-4 pt-8">
            <p className="text-sm font-semibold text-moss">상황 카드로 시작</p>
            <h1 className="text-4xl font-bold leading-tight tracking-normal text-ink">
              오늘 같이 갈 사람을 가볍게 찾기
            </h1>
            <p className="max-w-sm text-base leading-7 text-ink/68">
              시간, 장소, 활동이 정해진 카드에 신청하고 모임이 끝나면 화면의 관계는 남기지 않습니다.
            </p>
          </div>

          <div className="grid gap-3">
            <div className="flex items-center gap-3 rounded-lg border border-line bg-white/72 px-4 py-3">
              <ShieldCheck className="h-5 w-5 shrink-0 text-moss" aria-hidden />
              <span className="text-sm text-ink/75">가입 후 휴대폰 인증과 온보딩을 이어갑니다.</span>
            </div>
          </div>
        </div>

        <div className="mt-10 rounded-lg border border-line bg-white p-4 shadow-soft">
          {!hasSupabasePublicEnv ? (
            <div className="mb-3 rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm leading-6 text-red-700">
              Vercel에 Supabase 공개 환경변수가 필요합니다:
              <br />
              NEXT_PUBLIC_SUPABASE_URL, NEXT_PUBLIC_SUPABASE_ANON_KEY
            </div>
          ) : null}

          {canUseKakao ? (
            <button
              type="button"
              onClick={handleKakaoLogin}
              disabled={status === "loading"}
              className="flex min-h-12 w-full items-center justify-center gap-2 rounded-md bg-[#FEE500] px-4 text-sm font-semibold text-[#191600] transition hover:brightness-95 disabled:cursor-not-allowed disabled:opacity-60"
            >
              <MessageCircle className="h-5 w-5" aria-hidden />
              카카오로 시작하기
            </button>
          ) : (
            <div className="space-y-4">
              <form className="space-y-3" onSubmit={handleEmailLogin}>
                <label className="block text-sm font-medium text-ink" htmlFor="email">
                  이메일
                </label>
                <div className="flex min-h-12 items-center gap-2 rounded-md border border-line bg-paper/70 px-3">
                  <Mail className="h-5 w-5 shrink-0 text-ink/50" aria-hidden />
                  <input
                    id="email"
                    type="email"
                    value={email}
                    onChange={(event) => setEmail(event.target.value)}
                    required
                    placeholder="you@example.com"
                    className="h-11 w-full bg-transparent text-base outline-none placeholder:text-ink/35"
                  />
                </div>
                <button
                  type="submit"
                  disabled={status === "loading" || status === "verifying"}
                  className="min-h-12 w-full rounded-md bg-ink px-4 text-sm font-semibold text-white transition hover:bg-ink/90 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {status === "sent" ? "로그인 코드 다시 받기" : "이메일 코드 받기"}
                </button>
              </form>

              {status === "sent" || status === "verifying" ? (
                <form className="space-y-3 rounded-md border border-line bg-paper/70 p-3" onSubmit={handleOtpVerify}>
                  <label className="block text-sm font-medium text-ink" htmlFor="otp-code">
                    6자리 로그인 코드
                  </label>
                  <div className="flex min-h-12 items-center gap-2 rounded-md border border-line bg-white px-3">
                    <KeyRound className="h-5 w-5 shrink-0 text-moss" aria-hidden />
                    <input
                      id="otp-code"
                      inputMode="numeric"
                      pattern="[0-9]*"
                      value={otpCode}
                      onChange={(event) => setOtpCode(event.target.value.replace(/\D/g, "").slice(0, 6))}
                      required
                      minLength={6}
                      maxLength={6}
                      placeholder="123456"
                      className="h-11 w-full bg-transparent text-center text-xl font-bold tracking-[0.3em] outline-none placeholder:text-ink/25"
                    />
                  </div>
                  <button
                    type="submit"
                    disabled={status === "verifying" || otpCode.trim().length !== 6}
                    className="min-h-12 w-full rounded-md bg-moss px-4 text-sm font-semibold text-white transition hover:bg-moss/90 disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    {status === "verifying" ? "확인 중" : "코드로 로그인"}
                  </button>
                </form>
              ) : null}
            </div>
          )}

          {message ? (
            <p
              className={`mt-3 text-sm ${
                isMessageError ? "text-red-700" : "text-moss"
              }`}
              role="status"
            >
              {message}
            </p>
          ) : null}

          {status === "sent" ? (
            <div className="mt-3 rounded-md border border-line bg-paper/70 px-3 py-3 text-sm leading-6 text-ink/65">
              <div className="mb-2 flex items-center gap-2 font-semibold text-ink">
                <KeyRound className="h-4 w-4 text-moss" aria-hidden />
                코드 로그인이 필요한 이유
              </div>
              <p>메일 링크는 앱 안의 브라우저에서 열려 실패할 수 있어요.</p>
              <p>링크를 열지 말고 메일에 표시된 6자리 코드를 이 화면에 입력해주세요.</p>
            </div>
          ) : null}

          {canUseDevAuth ? (
            <a
              href="/dev-login"
              className="mt-3 flex min-h-11 w-full items-center justify-center rounded-md border border-line bg-paper px-4 text-sm font-semibold text-ink transition hover:bg-paper/70"
            >
              개발용 계정으로 바로 들어가기
            </a>
          ) : null}
        </div>
      </section>
    </main>
  );
}

function getLoginErrorMessage(error: unknown, fallback: string) {
  if (error instanceof Error && error.message) {
    return `${fallback} (${error.message})`;
  }

  return fallback;
}

function getSiteUrl() {
  const configuredSiteUrl = process.env.NEXT_PUBLIC_SITE_URL?.replace(/\/$/, "") ?? "";

  if (typeof window === "undefined") {
    return configuredSiteUrl;
  }

  return window.location.origin;
}
