"use client";

import { FormEvent, useState } from "react";
import Link from "next/link";
import { CheckCircle2, Loader2 } from "lucide-react";

type ReviewFormProps = {
  roomId: string;
};

type ApiResponse<T> = {
  data: T | null;
  error: { code: string; message: string } | null;
};

export function ReviewForm({ roomId }: ReviewFormProps) {
  const [attended, setAttended] = useState(true);
  const [onTime, setOnTime] = useState(true);
  const [matchesDescription, setMatchesDescription] = useState(true);
  const [wouldRejoin, setWouldRejoin] = useState(true);
  const [reported, setReported] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState("");

  async function submitReview(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setIsSubmitting(true);

    try {
      const response = await fetch(`/api/rooms/${roomId}/review`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          attended,
          onTime,
          matchesDescription,
          wouldRejoin,
          reported
        })
      });
      const payload = (await response.json()) as ApiResponse<{
        next: string;
      }>;

      if (!response.ok || payload.error || !payload.data) {
        setError(payload.error?.message ?? "후기를 저장하지 못했어요.");
        return;
      }

      setSubmitted(true);
    } catch {
      setError("후기 제출 중 문제가 생겼어요.");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <form className="space-y-4" onSubmit={submitReview}>
      {submitted ? (
        <section className="rounded-lg border border-moss bg-moss/10 p-4 shadow-soft">
          <div className="flex items-start gap-3">
            <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-moss" aria-hidden />
            <div>
              <p className="text-sm font-semibold text-ink">후기가 저장됐어요</p>
              <p className="mt-1 text-sm leading-6 text-ink/60">
                남긴 사실 확인은 다음 매칭 품질을 정리하는 데 사용됩니다.
              </p>
            </div>
          </div>
          <Link
            href="/me"
            className="mt-4 flex min-h-11 w-full items-center justify-center rounded-md mate-cta px-4 text-sm font-semibold text-white"
          >
            내 활동으로 돌아가기
          </Link>
        </section>
      ) : (
        <>
          <ReviewCheck label="실제로 만났어요" checked={attended} onChange={setAttended} />
          <ReviewCheck label="시간을 지켰어요" checked={onTime} onChange={setOnTime} />
          <ReviewCheck label="카드 설명과 상황이 맞았어요" checked={matchesDescription} onChange={setMatchesDescription} />
          <ReviewCheck label="비슷한 상황이면 다시 참여할래요" checked={wouldRejoin} onChange={setWouldRejoin} />
          <ReviewCheck label="신고가 필요한 상황이 있었어요" checked={reported} onChange={setReported} />

          {error ? <p className="rounded-md bg-red-50 px-3 py-2 text-sm font-medium text-red-700">{error}</p> : null}

          <button
            type="submit"
            disabled={isSubmitting}
            className="flex min-h-12 w-full items-center justify-center gap-2 rounded-md mate-cta px-4 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:opacity-60"
          >
            {isSubmitting ? <Loader2 className="h-5 w-5 animate-spin" aria-hidden /> : <CheckCircle2 className="h-5 w-5" aria-hidden />}
            후기 제출
          </button>
        </>
      )}
    </form>
  );
}

function ReviewCheck({
  label,
  checked,
  onChange
}: {
  label: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
}) {
  return (
    <label className="flex min-h-12 items-center justify-between gap-3 rounded-lg border border-line bg-white px-4 shadow-soft">
      <span className="text-sm font-medium text-ink">{label}</span>
      <input
        type="checkbox"
        checked={checked}
        onChange={(event) => onChange(event.target.checked)}
        className="h-5 w-5 accent-[#4F6F52]"
      />
    </label>
  );
}
