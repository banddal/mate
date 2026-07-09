"use client";

import { AlertTriangle, Loader2 } from "lucide-react";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";
import { createBrowserSupabaseClient } from "@/lib/supabase/browser";
import { captureEvent } from "@/lib/analytics";

type OtpType = "signup" | "invite" | "magiclink" | "recovery" | "email_change" | "email";

export function AuthConfirmClient() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [message, setMessage] = useState("로그인 정보를 확인하고 있어요.");
  const [error, setError] = useState("");

  useEffect(() => {
    let cancelled = false;

    async function confirmAuth() {
      const code = searchParams.get("code");
      const tokenHash = searchParams.get("token_hash");
      const type = normalizeOtpType(searchParams.get("type"));
      const next = searchParams.get("next") || "/onboarding";

      try {
        const supabase = createBrowserSupabaseClient();

        if (tokenHash && type) {
          const { error: verifyError } = await supabase.auth.verifyOtp({
            token_hash: tokenHash,
            type
          });

          if (cancelled) {
            return;
          }

          if (verifyError) {
            setError(getAuthConfirmMessage(verifyError.message));
            return;
          }

          captureEvent("login_success");
          setMessage("로그인했어요. 다음 화면으로 이동합니다.");
          router.replace(next);
          return;
        }

        const existingSession = await waitForDetectedSession();

        if (cancelled) {
          return;
        }

        if (existingSession) {
          captureEvent("login_success");
          setMessage("로그인했어요. 다음 화면으로 이동합니다.");
          router.replace(next);
          return;
        }

        if (!code) {
          setError("로그인 정보를 확인하지 못했어요. 로그인 화면에서 Google 로그인을 다시 시작해주세요.");
          return;
        }

        const { error: exchangeError } = await supabase.auth.exchangeCodeForSession(code);

        if (cancelled) {
          return;
        }

        if (exchangeError) {
          setError(getAuthConfirmMessage(exchangeError.message));
          return;
        }

        captureEvent("login_success");
          setMessage("로그인했어요. 다음 화면으로 이동합니다.");
        router.replace(next);
      } catch (confirmError) {
        if (cancelled) {
          return;
        }

        setError(
          confirmError instanceof Error
            ? getAuthConfirmMessage(confirmError.message)
            : "로그인 처리 중 문제가 생겼어요."
        );
      }
    }

    confirmAuth();

    return () => {
      cancelled = true;
    };
  }, [router, searchParams]);

  return (
    <main className="flex min-h-dvh items-center justify-center px-5">
      <section className="w-full max-w-md rounded-lg border border-line bg-white p-5 shadow-soft">
        <div className="flex items-center gap-3">
          {!error ? <Loader2 className="h-5 w-5 animate-spin text-moss" aria-hidden /> : null}
          <h1 className="text-lg font-semibold text-ink">
            {error ? "로그인을 다시 시도해주세요" : "로그인 처리 중"}
          </h1>
        </div>
        <p className={`mt-3 text-sm leading-6 ${error ? "text-red-700" : "text-ink/70"}`}>
          {error || message}
        </p>
        {error ? (
          <div className="mt-4 grid gap-2">
            <div className="rounded-md border border-red-100 bg-red-50 px-3 py-3 text-sm leading-6 text-red-800">
              <div className="mb-1 flex items-center gap-2 font-semibold">
                <AlertTriangle className="h-4 w-4" aria-hidden />
                다시 시도할 때
              </div>
              <p>로그인 화면으로 돌아가 Google 로그인을 다시 시작해주세요.</p>
              <p>브라우저의 뒤로 가기보다 로그인 화면에서 새로 시작하는 편이 안정적입니다.</p>
            </div>
            <a
              href="/login"
              className="flex min-h-11 items-center justify-center rounded-md bg-ink px-4 text-sm font-semibold text-white"
            >
              Google 로그인 다시 하기
            </a>
            <a
              href="/dev-login"
              className="flex min-h-11 items-center justify-center rounded-md border border-line bg-paper px-4 text-sm font-semibold text-ink"
            >
              개발용 계정으로 계속 검증하기
            </a>
          </div>
        ) : null}
      </section>
    </main>
  );
}

function getAuthConfirmMessage(message: string) {
  if (message.toLowerCase().includes("code verifier")) {
    return "로그인 요청을 시작한 브라우저와 다른 곳에서 열렸거나 저장 정보가 지워져 사용할 수 없습니다. 같은 브라우저에서 Google 로그인을 다시 시작해주세요.";
  }

  return message;
}

function normalizeOtpType(type: string | null): OtpType | null {
  if (
    type === "signup" ||
    type === "invite" ||
    type === "magiclink" ||
    type === "recovery" ||
    type === "email_change" ||
    type === "email"
  ) {
    return type;
  }

  return null;
}

async function waitForDetectedSession() {
  const supabase = createBrowserSupabaseClient();
  const { data } = await supabase.auth.getSession();

  if (data.session) {
    return data.session;
  }

  if (typeof window === "undefined" || !window.location.hash.includes("access_token")) {
    return null;
  }

  await new Promise((resolve) => {
    window.setTimeout(resolve, 500);
  });

  const { data: retryData } = await supabase.auth.getSession();
  return retryData.session;
}
