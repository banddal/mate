"use client";

import { FormEvent, useState } from "react";
import Link from "next/link";
import { Loader2, Send } from "lucide-react";
import { APPLICATION_REASON_MAX_LENGTH } from "@/shared/config";

type ApplyCardSheetProps = {
  cardId: string;
};

type ApiResponse<T> = {
  data: T | null;
  error: { code: string; message: string } | null;
};

export function ApplyCardSheet({ cardId }: ApplyCardSheetProps) {
  const [reasonText, setReasonText] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  async function submitApplication(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setMessage("");
    setError("");
    setIsSubmitting(true);

    try {
      const response = await fetch(`/api/cards/${cardId}/apply`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ reasonText })
      });
      const payload = (await response.json()) as ApiResponse<{
        application: {
          id: string;
          status: string;
        };
      }>;

      if (!response.ok || payload.error) {
        setError(payload.error?.message ?? "신청을 저장하지 못했어요.");
        return;
      }

      setMessage("신청이 접수됐어요. 마감 후 확정된 신청자에게만 안내가 가요.");
      setReasonText("");
      setSubmitted(true);
    } catch {
      setError("신청 처리 중 문제가 생겼어요.");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <section className="fixed inset-x-0 bottom-0 border-t border-line bg-white px-5 pb-[calc(16px+env(safe-area-inset-bottom))] pt-4 shadow-soft">
      <form className="mx-auto max-w-md space-y-3" onSubmit={submitApplication}>
        <div className="flex items-center justify-between gap-3">
          <div>
            <p className="text-sm font-semibold text-ink">{submitted ? "신청 접수 완료" : "신청하기"}</p>
            <p className="text-xs text-ink/55">
              {submitted ? "내 활동에서 대기 상태를 확인할 수 있어요." : "자기소개가 아니라 참여 이유만 적어주세요."}
            </p>
          </div>
          {!submitted ? (
            <span className="text-xs font-semibold text-ink/45">
              {reasonText.length}/{APPLICATION_REASON_MAX_LENGTH}
            </span>
          ) : null}
        </div>

        {!submitted ? (
          <textarea
            value={reasonText}
            onChange={(event) => setReasonText(event.target.value)}
            maxLength={APPLICATION_REASON_MAX_LENGTH}
            minLength={4}
            required
            className="min-h-24 w-full resize-none rounded-md border border-line bg-paper/70 px-3 py-3 text-sm outline-none focus:border-moss"
            placeholder="예: 혼자 가기 아쉬웠는데 같은 경기 보며 가볍게 응원하고 싶어요."
          />
        ) : null}

        {message ? <p className="text-sm font-medium text-moss">{message}</p> : null}
        {error ? <p className="text-sm font-medium text-red-700">{error}</p> : null}

        {submitted ? (
          <Link
            href="/me"
            className="flex min-h-12 w-full items-center justify-center rounded-md mate-cta px-4 text-sm font-semibold text-white"
          >
            내 활동에서 보기
          </Link>
        ) : (
          <button
            type="submit"
            disabled={isSubmitting || reasonText.trim().length < 4}
            className="flex min-h-12 w-full items-center justify-center gap-2 rounded-md mate-cta px-4 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:opacity-60"
          >
            {isSubmitting ? <Loader2 className="h-5 w-5 animate-spin" aria-hidden /> : <Send className="h-5 w-5" aria-hidden />}
            신청 보내기
          </button>
        )}
      </form>
    </section>
  );
}
