"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2, Plus, Trash2 } from "lucide-react";

export function BannedWordForm() {
  const router = useRouter();
  const [word, setWord] = useState("");
  const [severity, setSeverity] = useState<"block" | "flag">("flag");
  const [categoryHint, setCategoryHint] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setErrorMessage("");
    setIsSubmitting(true);

    const response = await fetch("/api/admin/banned-words", {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        word,
        severity,
        categoryHint: categoryHint || null
      })
    });

    const payload = await response.json().catch(() => null);
    setIsSubmitting(false);

    if (!response.ok) {
      setErrorMessage(payload?.error?.message ?? "금지어를 추가하지 못했어요.");
      return;
    }

    setWord("");
    setCategoryHint("");
    router.refresh();
  }

  return (
    <form className="space-y-2" onSubmit={handleSubmit}>
      <div className="grid grid-cols-[1fr_96px] gap-2">
        <input
          className="min-h-11 rounded-md border border-line bg-white px-3 text-sm text-ink outline-none focus:border-moss"
          placeholder="단어 또는 문장"
          value={word}
          onChange={(event) => setWord(event.target.value)}
        />
        <select
          className="min-h-11 rounded-md border border-line bg-white px-3 text-sm font-semibold text-ink outline-none focus:border-moss"
          value={severity}
          onChange={(event) => setSeverity(event.target.value as "block" | "flag")}
        >
          <option value="flag">검수</option>
          <option value="block">차단</option>
        </select>
      </div>
      <div className="grid grid-cols-[1fr_auto] gap-2">
        <input
          className="min-h-11 rounded-md border border-line bg-white px-3 text-sm text-ink outline-none focus:border-moss"
          placeholder="분류 힌트"
          value={categoryHint}
          onChange={(event) => setCategoryHint(event.target.value)}
        />
        <button
          className="inline-flex min-h-11 items-center justify-center rounded-md bg-ink px-3 text-sm font-semibold text-white transition disabled:cursor-not-allowed disabled:bg-ink/35"
          type="submit"
          disabled={isSubmitting || word.trim().length < 2}
          aria-label="금지어 추가"
        >
          {isSubmitting ? (
            <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
          ) : (
            <Plus className="h-4 w-4" aria-hidden />
          )}
        </button>
      </div>
      {errorMessage ? <p className="text-xs font-semibold text-red-600">{errorMessage}</p> : null}
    </form>
  );
}

type BannedWordDeleteButtonProps = {
  wordId: string;
};

export function BannedWordDeleteButton({ wordId }: BannedWordDeleteButtonProps) {
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");

  async function handleClick() {
    setErrorMessage("");
    setIsSubmitting(true);

    const response = await fetch("/api/admin/banned-words", {
      method: "DELETE",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({ wordId })
    });

    const payload = await response.json().catch(() => null);
    setIsSubmitting(false);

    if (!response.ok) {
      setErrorMessage(payload?.error?.message ?? "금지어를 삭제하지 못했어요.");
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
          <Trash2 className="h-3.5 w-3.5" aria-hidden />
        )}
        삭제
      </button>
      {errorMessage ? <p className="text-xs font-semibold text-red-600">{errorMessage}</p> : null}
    </div>
  );
}
