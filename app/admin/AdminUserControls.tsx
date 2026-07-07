"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2, ShieldMinus, ShieldPlus } from "lucide-react";

type AdminCandidate = {
  id: string;
  nickname: string;
};

type AdminUserControlsProps = {
  candidates: AdminCandidate[];
};

export function AdminGrantForm({ candidates }: AdminUserControlsProps) {
  const router = useRouter();
  const [userId, setUserId] = useState(candidates[0]?.id ?? "");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setErrorMessage("");
    setIsSubmitting(true);

    const response = await fetch("/api/admin/admins", {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({ userId })
    });

    const payload = await response.json().catch(() => null);
    setIsSubmitting(false);

    if (!response.ok) {
      setErrorMessage(payload?.error?.message ?? "운영자를 추가하지 못했어요.");
      return;
    }

    router.refresh();
  }

  return (
    <form className="space-y-2" onSubmit={handleSubmit}>
      <div className="grid grid-cols-[1fr_auto] gap-2">
        <select
          className="min-h-11 rounded-md border border-line bg-white px-3 text-sm text-ink outline-none focus:border-moss"
          value={userId}
          onChange={(event) => setUserId(event.target.value)}
        >
          {candidates.length > 0 ? (
            candidates.map((candidate) => (
              <option key={candidate.id} value={candidate.id}>
                {candidate.nickname}
              </option>
            ))
          ) : (
            <option value="">추가 가능한 후보 없음</option>
          )}
        </select>
        <button
          className="inline-flex min-h-11 items-center justify-center rounded-md bg-ink px-3 text-sm font-semibold text-white transition disabled:cursor-not-allowed disabled:bg-ink/35"
          type="submit"
          disabled={isSubmitting || !userId}
          aria-label="운영자 부여"
        >
          {isSubmitting ? (
            <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
          ) : (
            <ShieldPlus className="h-4 w-4" aria-hidden />
          )}
        </button>
      </div>
      {errorMessage ? <p className="text-xs font-semibold text-red-600">{errorMessage}</p> : null}
    </form>
  );
}

type AdminRevokeButtonProps = {
  userId: string;
};

export function AdminRevokeButton({ userId }: AdminRevokeButtonProps) {
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");

  async function handleClick() {
    setErrorMessage("");
    setIsSubmitting(true);

    const response = await fetch("/api/admin/admins", {
      method: "DELETE",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({ userId })
    });

    const payload = await response.json().catch(() => null);
    setIsSubmitting(false);

    if (!response.ok) {
      setErrorMessage(payload?.error?.message ?? "운영자 권한을 회수하지 못했어요.");
      return;
    }

    router.refresh();
  }

  return (
    <div className="space-y-1">
      <button
        className="inline-flex min-h-9 w-full items-center justify-center gap-2 rounded-md border border-line bg-white px-3 text-xs font-semibold text-ink transition hover:border-red-200 hover:bg-red-50 hover:text-red-700 disabled:cursor-not-allowed disabled:opacity-55"
        type="button"
        onClick={handleClick}
        disabled={isSubmitting}
      >
        {isSubmitting ? (
          <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden />
        ) : (
          <ShieldMinus className="h-3.5 w-3.5" aria-hidden />
        )}
        회수
      </button>
      {errorMessage ? <p className="text-xs font-semibold text-red-600">{errorMessage}</p> : null}
    </div>
  );
}
