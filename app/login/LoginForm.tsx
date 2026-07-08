"use client";

import { Chrome, ShieldCheck } from "lucide-react";
import { useState } from "react";
import { createBrowserSupabaseClient } from "@/lib/supabase/browser";

type LoginFormProps = {
  canUseDevAuth: boolean;
  initialError?: string;
};

export function LoginForm({ canUseDevAuth, initialError }: LoginFormProps) {
  const [status, setStatus] = useState<"idle" | "loading" | "error">(
    initialError ? "error" : "idle"
  );
  const [message, setMessage] = useState(initialError ?? "");

  const siteUrl = getSiteUrl();
  const redirectTo = siteUrl ? `${siteUrl.replace(/\/$/, "")}/auth/confirm` : undefined;
  const hasSupabasePublicEnv = Boolean(
    process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  );

  async function handleGoogleLogin() {
    setStatus("loading");
    setMessage("");

    try {
      if (!hasSupabasePublicEnv) {
        throw new Error("Supabase 공개 환경변수가 설정되지 않았습니다.");
      }

      const supabase = createBrowserSupabaseClient();
      const { error } = await supabase.auth.signInWithOAuth({
        provider: "google",
        options: {
          redirectTo,
          queryParams: {
            access_type: "offline",
            prompt: "select_account"
          }
        }
      });

      if (error) {
        throw error;
      }
    } catch (error) {
      setStatus("error");
      setMessage(getLoginErrorMessage(error, "Google 로그인을 시작하지 못했어요."));
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
              <span className="text-sm text-ink/75">Google 계정으로 가입과 로그인을 간단히 처리합니다.</span>
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

          <button
            type="button"
            onClick={handleGoogleLogin}
            disabled={status === "loading"}
            className="flex min-h-12 w-full items-center justify-center gap-2 rounded-md bg-ink px-4 text-sm font-semibold text-white transition hover:bg-ink/90 disabled:cursor-not-allowed disabled:opacity-60"
          >
            <Chrome className="h-5 w-5" aria-hidden />
            {status === "loading" ? "Google로 이동 중" : "Google 계정으로 시작하기"}
          </button>

          {message ? (
            <p
              className={`mt-3 text-sm ${status === "error" ? "text-red-700" : "text-moss"}`}
              role="status"
            >
              {message}
            </p>
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
