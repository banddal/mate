"use client";

import { FormEvent, useState } from "react";
import { Loader2, Send } from "lucide-react";

type RoomMessage = {
  id: string;
  sender_name: string;
  body: string;
  created_at: string;
  is_mine: boolean;
};

type RoomMessagePanelProps = {
  roomId: string;
  initialMessages: RoomMessage[];
};

type ApiResponse<T> = {
  data: T | null;
  error: { code: string; message: string } | null;
};

export function RoomMessagePanel({ roomId, initialMessages }: RoomMessagePanelProps) {
  const [messages, setMessages] = useState(initialMessages);
  const [body, setBody] = useState("");
  const [isSending, setIsSending] = useState(false);
  const [error, setError] = useState("");

  async function sendMessage(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setIsSending(true);

    try {
      const response = await fetch(`/api/rooms/${roomId}/messages`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ body })
      });
      const payload = (await response.json()) as ApiResponse<{
        message: RoomMessage;
      }>;

      if (!response.ok || payload.error || !payload.data) {
        setError(payload.error?.message ?? "메시지를 보내지 못했어요.");
        return;
      }

      setMessages((current) => [...current, payload.data.message]);
      setBody("");
    } catch {
      setError("메시지 전송 중 문제가 생겼어요.");
    } finally {
      setIsSending(false);
    }
  }

  return (
    <section className="space-y-3 rounded-lg border border-line bg-white p-4 shadow-soft">
      <div className="space-y-3">
        {messages.map((message) => (
          <article
            key={message.id}
            className={`rounded-lg px-3 py-2 text-sm leading-6 ${
              message.is_mine ? "ml-8 bg-ink text-white" : "mr-8 bg-paper/80 text-ink/75"
            }`}
          >
            <p className={`mb-1 text-xs font-semibold ${message.is_mine ? "text-white/65" : "text-ink/45"}`}>
              {message.sender_name}
            </p>
            <p>{message.body}</p>
          </article>
        ))}
      </div>

      <form className="space-y-2" onSubmit={sendMessage}>
        <textarea
          value={body}
          onChange={(event) => setBody(event.target.value)}
          required
          maxLength={500}
          className="min-h-20 w-full resize-none rounded-md border border-line bg-paper/70 px-3 py-3 text-sm outline-none focus:border-moss"
          placeholder="장소 확인, 도착 예정 시간처럼 만남에 필요한 말만 남겨주세요."
        />
        {error ? <p className="text-sm font-medium text-red-700">{error}</p> : null}
        <button
          type="submit"
          disabled={isSending || body.trim().length === 0}
          className="flex min-h-11 w-full items-center justify-center gap-2 rounded-md bg-ink px-4 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:opacity-60"
        >
          {isSending ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden /> : <Send className="h-4 w-4" aria-hidden />}
          메시지 보내기
        </button>
      </form>
    </section>
  );
}
