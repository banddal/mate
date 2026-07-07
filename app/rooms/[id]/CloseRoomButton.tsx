"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { DoorClosed, Loader2 } from "lucide-react";

type CloseRoomButtonProps = {
  roomId: string;
};

type ApiResponse<T> = {
  data: T | null;
  error: { code: string; message: string } | null;
};

export function CloseRoomButton({ roomId }: CloseRoomButtonProps) {
  const router = useRouter();
  const [isClosing, setIsClosing] = useState(false);
  const [error, setError] = useState("");

  async function closeRoom() {
    setError("");
    setIsClosing(true);

    try {
      const response = await fetch(`/api/rooms/${roomId}/close`, {
        method: "POST"
      });
      const payload = (await response.json()) as ApiResponse<{
        next: string;
      }>;

      if (!response.ok || payload.error || !payload.data) {
        setError(payload.error?.message ?? "방을 종료하지 못했어요.");
        return;
      }

      router.push(payload.data.next);
    } catch {
      setError("방 종료 중 문제가 생겼어요.");
    } finally {
      setIsClosing(false);
    }
  }

  return (
    <div className="space-y-2">
      <button
        type="button"
        onClick={closeRoom}
        disabled={isClosing}
        className="flex min-h-11 w-full items-center justify-center gap-2 rounded-md border border-line bg-white px-4 text-sm font-semibold text-ink disabled:cursor-not-allowed disabled:opacity-60"
      >
        {isClosing ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden /> : <DoorClosed className="h-4 w-4" aria-hidden />}
        만남 종료하고 후기 쓰기
      </button>
      {error ? <p className="text-sm font-medium text-red-700">{error}</p> : null}
    </div>
  );
}
