"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Check, Loader2, X } from "lucide-react";

type AdminActionButtonProps = {
  action: "resolve-report" | "approve-card" | "reject-card";
  targetId: string;
};

type ApiResponse<T> = {
  data: T | null;
  error: { code: string; message: string } | null;
};

const actionConfig = {
  "resolve-report": {
    label: "해결 처리",
    icon: Check,
    endpoint: (id: string) => `/api/admin/reports/${id}/resolve`,
    body: { resolution: "dismissed" }
  },
  "approve-card": {
    label: "공개 승인",
    icon: Check,
    endpoint: (id: string) => `/api/admin/cards/${id}/approve`,
    body: {}
  },
  "reject-card": {
    label: "반려",
    icon: X,
    endpoint: (id: string) => `/api/admin/cards/${id}/reject`,
    body: { rejectionReason: "운영 기준에 맞지 않아 반려됐어요." }
  }
} as const;

export function AdminActionButton({ action, targetId }: AdminActionButtonProps) {
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState("");
  const config = actionConfig[action];
  const Icon = config.icon;

  async function runAction() {
    setError("");
    setIsSubmitting(true);

    try {
      const response = await fetch(config.endpoint(targetId), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(config.body)
      });
      const payload = (await response.json()) as ApiResponse<unknown>;

      if (!response.ok || payload.error) {
        setError(payload.error?.message ?? "처리하지 못했어요.");
        return;
      }

      router.refresh();
    } catch {
      setError("처리 중 문제가 생겼어요.");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div className="space-y-1">
      <button
        type="button"
        onClick={runAction}
        disabled={isSubmitting}
        className="flex min-h-10 w-full items-center justify-center gap-2 rounded-md border border-line bg-white px-3 text-sm font-semibold text-ink disabled:cursor-not-allowed disabled:opacity-60"
      >
        {isSubmitting ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden /> : <Icon className="h-4 w-4" aria-hidden />}
        {config.label}
      </button>
      {error ? <p className="text-xs font-medium text-red-700">{error}</p> : null}
    </div>
  );
}
