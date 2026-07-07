"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Check, Loader2 } from "lucide-react";

type ApproveApplicationButtonProps = {
  cardId: string;
  applicationId: string;
};

type ApiResponse<T> = {
  data: T | null;
  error: { code: string; message: string } | null;
};

export function ApproveApplicationButton({
  cardId,
  applicationId
}: ApproveApplicationButtonProps) {
  const router = useRouter();
  const [isApproving, setIsApproving] = useState(false);
  const [error, setError] = useState("");

  async function approve() {
    setError("");
    setIsApproving(true);

    try {
      const response = await fetch(`/api/cards/${cardId}/approve`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ applicationId })
      });
      const payload = (await response.json()) as ApiResponse<{
        room: {
          id: string;
        };
      }>;

      if (!response.ok || payload.error || !payload.data) {
        setError(payload.error?.message ?? "승인하지 못했어요.");
        return;
      }

      router.push(`/rooms/${payload.data.room.id}`);
      router.refresh();
    } catch {
      setError("승인 처리 중 문제가 생겼어요.");
    } finally {
      setIsApproving(false);
    }
  }

  return (
    <div className="space-y-2">
      <button
        type="button"
        onClick={approve}
        disabled={isApproving}
        className="flex min-h-11 w-full items-center justify-center gap-2 rounded-md bg-ink px-4 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:opacity-60"
      >
        {isApproving ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden /> : <Check className="h-4 w-4" aria-hidden />}
        이 신청자 승인
      </button>
      {error ? <p className="text-sm font-medium text-red-700">{error}</p> : null}
    </div>
  );
}
