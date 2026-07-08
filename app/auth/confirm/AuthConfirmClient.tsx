"use client";

import { AlertTriangle, Loader2 } from "lucide-react";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";
import { createBrowserSupabaseClient } from "@/lib/supabase/browser";

export function AuthConfirmClient() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [message, setMessage] = useState("로그인 링크를 확인하고 있어요.");
  const [error, setError] = useState("");

  useEffect(() => {
    let cancelled = false;

    async function confirmAuth() {
      const code = searchParams.get("code");
      const next = searchParams.get("next") || "/onboarding";

      if (!code) {
        setError("로그인 코드가 없습니다. 새 매직링크를 요청해주세요.");
        return;
      }

      try {
        const supabase = createBrowserSupabaseClient();
        const { error: exchangeError } = await supabase.auth.exchangeCodeForSession(code);

        if (cancelled) {
          return;
        }

        if (exchangeError) {
          setError(getAuthConfirmMessage(exchangeError.message));
          return;
        }

        setMessage("로그인했어요. 다음 화면으로 이동합니다.");
        router.replace(next);
      } catch (confirmError) {
        if (cancelled) {
          return;
        }

        setError(
          confirmError instanceof Error
            ? getAuthConfirmMessage(confirmError.message)
            : "로그인 링크 처리 중 문제가 생겼어요."
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
            {error ? "로그인 링크를 다시 확인해주세요" : "로그인 처리 중"}
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
              <p>메일 링크를 복사해서, 매직링크를 요청했던 같은 브라우저 주소창에 붙여넣어 주세요.</p>
              <p>메일 앱 내장 브라우저, 시크릿 모드, 다른 기기에서는 이 오류가 다시 납니다.</p>
            </div>
            <a
              href="/login"
              className="flex min-h-11 items-center justify-center rounded-md bg-ink px-4 text-sm font-semibold text-white"
            >
              새 매직링크 받기
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
    return "이 링크는 요청한 브라우저와 다른 곳에서 열렸거나 저장 정보가 지워져 사용할 수 없습니다. 같은 브라우저에서 새 매직링크를 요청하고, 그 브라우저에서 바로 열어주세요.";
  }

  return message;
}
