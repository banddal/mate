"use client";

import { FormEvent, useState } from "react";
import { Loader2, ShieldAlert } from "lucide-react";

type ReportRoomFormProps = {
  roomId: string;
};

type ApiResponse<T> = {
  data: T | null;
  error: { code: string; message: string } | null;
};

export function ReportRoomForm({ roomId }: ReportRoomFormProps) {
  const [reason, setReason] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  async function submitReport(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setMessage("");
    setError("");
    setIsSubmitting(true);

    try {
      const response = await fetch("/api/reports", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          targetRoomId: roomId,
          reason
        })
      });
      const payload = (await response.json()) as ApiResponse<{
        report: {
          id: string;
        };
      }>;

      if (!response.ok || payload.error || !payload.data) {
        setError(payload.error?.message ?? "신고를 접수하지 못했어요.");
        return;
      }

      setReason("");
      setMessage("신고가 접수됐어요. 운영자가 확인합니다.");
    } catch {
      setError("신고 접수 중 문제가 생겼어요.");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <form className="space-y-3 rounded-lg border border-line bg-white p-4 shadow-soft" onSubmit={submitReport}>
      <div className="flex items-center gap-2 text-sm font-semibold text-ink">
        <ShieldAlert className="h-5 w-5 text-moss" aria-hidden />
        신고
      </div>
      <textarea
        value={reason}
        onChange={(event) => setReason(event.target.value)}
        required
        minLength={8}
        maxLength={500}
        className="min-h-24 w-full resize-none rounded-md border border-line bg-paper/70 px-3 py-3 text-sm outline-none focus:border-moss"
        placeholder="어떤 일이 있었는지 사실 중심으로 적어주세요."
      />
      {message ? <p className="text-sm font-medium text-moss">{message}</p> : null}
      {error ? <p className="text-sm font-medium text-red-700">{error}</p> : null}
      <button
        type="submit"
        disabled={isSubmitting || reason.trim().length < 8}
        className="flex min-h-11 w-full items-center justify-center gap-2 rounded-md border border-line bg-white px-4 text-sm font-semibold text-ink disabled:cursor-not-allowed disabled:opacity-60"
      >
        {isSubmitting ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden /> : null}
        신고 접수
      </button>
    </form>
  );
}
