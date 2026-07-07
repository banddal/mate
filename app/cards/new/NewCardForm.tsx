"use client";

import { useRouter } from "next/navigation";
import { FormEvent, useState } from "react";
import { ArrowLeft, CalendarClock, CheckCircle2, Loader2, MapPin, Ticket } from "lucide-react";
import Link from "next/link";
import { CARD_CATEGORY_OPTIONS } from "@/lib/cards/categories";

type ApiResponse<T> = {
  data: T | null;
  error: { code: string; message: string } | null;
};

type CreatedCard = {
  card: {
    id: string;
    status: "open" | "pending_review";
  };
};

const quickTemplates = [
  {
    label: "야구 직관",
    title: "이번 주말 잠실 야구 직관 mate",
    category: "야구 직관",
    location: "잠실야구장 1루 출입구",
    capacity: 2,
    hostOffer: "예매해 둔 2연석 중 1자리",
    costInfo: "티켓 정가 각자 부담",
    description: "경기 시작 전에 만나서 같이 입장하고 경기 후에는 각자 이동하는 가벼운 일정입니다."
  },
  {
    label: "전시+카페",
    title: "성수 전시 보고 근처 카페까지",
    category: "전시",
    location: "성수동 전시 공간 앞",
    capacity: 3,
    hostOffer: "예약해 둔 전시 입장 시간",
    costInfo: "입장권과 카페 비용 각자 부담",
    description: "전시를 같이 보고 근처 카페에서 짧게 감상만 나누는 부담 없는 일정입니다."
  }
];

export function NewCardForm() {
  const router = useRouter();
  const [title, setTitle] = useState("");
  const [category, setCategory] = useState(CARD_CATEGORY_OPTIONS[0]?.label ?? "");
  const [eventDatetime, setEventDatetime] = useState("");
  const [location, setLocation] = useState("");
  const [capacity, setCapacity] = useState(2);
  const [hostOffer, setHostOffer] = useState("");
  const [costInfo, setCostInfo] = useState("");
  const [description, setDescription] = useState("");
  const [deadlineAt, setDeadlineAt] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [notice, setNotice] = useState("");
  const [error, setError] = useState("");

  async function submitCard(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setNotice("");
    setError("");
    setIsSubmitting(true);

    try {
      const eventIso = toIsoString(eventDatetime);
      const deadlineIso = toIsoString(deadlineAt);

      if (!eventIso || !deadlineIso) {
        setError("일시와 마감시간을 확인해주세요.");
        return;
      }

      if (new Date(eventIso).getTime() <= Date.now()) {
        setError("모임 일시는 현재보다 이후여야 합니다.");
        return;
      }

      if (new Date(deadlineIso).getTime() >= new Date(eventIso).getTime()) {
        setError("신청 마감시간은 모임 일시보다 이전이어야 합니다.");
        return;
      }

      const response = await fetch("/api/cards", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title,
          category,
          eventDatetime: eventIso,
          location,
          capacity,
          hostOffer,
          costInfo,
          description,
          deadlineAt: deadlineIso
        })
      });
      const payload = (await response.json()) as ApiResponse<CreatedCard>;

      if (!response.ok || payload.error || !payload.data) {
        setError(payload.error?.message ?? "카드를 만들지 못했어요.");
        return;
      }

      if (payload.data.card.status === "pending_review") {
        setNotice("검수 중입니다. 승인되면 피드에 공개돼요.");
        return;
      }

      router.push(`/cards/${payload.data.card.id}`);
    } catch {
      setError("카드 생성 중 문제가 생겼어요.");
    } finally {
      setIsSubmitting(false);
    }
  }

  function applyTemplate(template: (typeof quickTemplates)[number]) {
    setTitle(template.title);
    setCategory(template.category);
    setLocation(template.location);
    setCapacity(template.capacity);
    setHostOffer(template.hostOffer);
    setCostInfo(template.costInfo);
    setDescription(template.description);
  }

  return (
    <main className="min-h-dvh px-5 pb-[calc(28px+env(safe-area-inset-bottom))] pt-[calc(24px+env(safe-area-inset-top))]">
      <section className="mx-auto w-full max-w-md space-y-5">
        <header className="space-y-4">
          <Link href="/feed" className="inline-flex min-h-10 items-center gap-2 text-sm font-semibold text-ink/70">
            <ArrowLeft className="h-4 w-4" aria-hidden />
            피드로 돌아가기
          </Link>
          <div>
            <p className="text-sm font-semibold text-moss">카드 만들기</p>
            <h1 className="mt-2 text-3xl font-bold leading-tight tracking-normal text-ink">
              같이 할 상황만 빠르게 열기
            </h1>
            <p className="mt-2 text-sm leading-6 text-ink/60">
              테스트 버전에서는 필요한 정보만 채우고, 세부 디자인과 문구는 이후 조정합니다.
            </p>
          </div>
        </header>

        <form className="space-y-4" onSubmit={submitCard}>
          <section className="space-y-3 rounded-lg border border-line bg-white p-4 shadow-soft">
            <StepLabel icon={<CheckCircle2 className="h-5 w-5" aria-hidden />} label="빠른 시작" />
            <div className="grid grid-cols-2 gap-2">
              {quickTemplates.map((template) => (
                <button
                  key={template.label}
                  type="button"
                  onClick={() => applyTemplate(template)}
                  className="min-h-11 rounded-md border border-line bg-white px-3 text-sm font-semibold text-ink hover:border-moss"
                >
                  {template.label}
                </button>
              ))}
            </div>
            <p className="text-xs leading-5 text-ink/50">
              템플릿은 예시만 채웁니다. 일시와 마감시간은 직접 선택해주세요.
            </p>
          </section>

          <section className="space-y-4 rounded-lg border border-line bg-white p-4 shadow-soft">
            <StepLabel icon={<CalendarClock className="h-5 w-5" aria-hidden />} label="기본 정보" />

            <Field label="제목">
              <input
                value={title}
                onChange={(event) => setTitle(event.target.value)}
                required
                minLength={4}
                maxLength={60}
                className="field-input"
                placeholder="예: 토요일 잠실 야구 직관 mate"
              />
            </Field>

            <Field label="카테고리">
              <select
                value={category}
                onChange={(event) => setCategory(event.target.value)}
                className="field-input"
              >
                {CARD_CATEGORY_OPTIONS.map((option) => (
                  <option key={option.label} value={option.label}>
                    {option.label}
                  </option>
                ))}
              </select>
            </Field>

            <div className="grid grid-cols-2 gap-3">
              <Field label="일시">
                <input
                  value={eventDatetime}
                  onChange={(event) => setEventDatetime(event.target.value)}
                  required
                  type="datetime-local"
                  className="field-input"
                />
              </Field>
              <Field label="모집인원">
                <input
                  value={capacity}
                  onChange={(event) => setCapacity(Number(event.target.value))}
                  required
                  type="number"
                  min={1}
                  max={12}
                  className="field-input"
                />
              </Field>
            </div>

            <Field label="장소">
              <div className="flex min-h-12 items-center gap-2 rounded-md border border-line bg-paper/60 px-3 focus-within:border-moss">
                <MapPin className="h-4 w-4 shrink-0 text-moss" aria-hidden />
                <input
                  value={location}
                  onChange={(event) => setLocation(event.target.value)}
                  required
                  maxLength={80}
                  className="w-full bg-transparent outline-none"
                  placeholder="잠실야구장 1루 쪽"
                />
              </div>
            </Field>
          </section>

          <section className="space-y-4 rounded-lg border border-line bg-white p-4 shadow-soft">
            <StepLabel icon={<Ticket className="h-5 w-5" aria-hidden />} label="호스트가 건 것" />

            <Field label="상황에 묶인 것">
              <input
                value={hostOffer}
                onChange={(event) => setHostOffer(event.target.value)}
                required
                maxLength={120}
                className="field-input"
                placeholder="예: 예매해 둔 2연석 중 1자리"
              />
            </Field>

            <Field label="비용 안내">
              <input
                value={costInfo}
                onChange={(event) => setCostInfo(event.target.value)}
                maxLength={80}
                className="field-input"
                placeholder="예: 티켓 정가 각자 부담"
              />
            </Field>

            <Field label="설명">
              <textarea
                value={description}
                onChange={(event) => setDescription(event.target.value)}
                required
                minLength={10}
                maxLength={800}
                className="min-h-32 w-full rounded-md border border-line bg-paper/60 px-3 py-3 outline-none focus:border-moss"
                placeholder="무엇을 언제 어디서 어떻게 할지 활동 중심으로 적어주세요."
              />
            </Field>
          </section>

          <section className="space-y-4 rounded-lg border border-line bg-white p-4 shadow-soft">
            <StepLabel icon={<CheckCircle2 className="h-5 w-5" aria-hidden />} label="공개 전 확인" />

            <Field label="신청 마감시간">
              <input
                value={deadlineAt}
                onChange={(event) => setDeadlineAt(event.target.value)}
                required
                type="datetime-local"
                className="field-input"
              />
            </Field>
            <div className="rounded-md bg-paper/70 px-3 py-3 text-sm leading-6 text-ink/60">
              카드가 바로 공개되지 않으면 운영 검수 후 피드에 올라갑니다. 금지어 이유를 화면에 직접 노출하지는 않습니다.
            </div>
          </section>

          {notice ? <p className="rounded-md bg-moss/10 px-3 py-2 text-sm font-medium text-moss">{notice}</p> : null}
          {error ? <p className="rounded-md bg-red-50 px-3 py-2 text-sm font-medium text-red-700">{error}</p> : null}

          <button
            type="submit"
            disabled={isSubmitting}
            className="flex min-h-12 w-full items-center justify-center gap-2 rounded-md bg-ink px-4 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:opacity-60"
          >
            {isSubmitting ? <Loader2 className="h-5 w-5 animate-spin" aria-hidden /> : null}
            카드 열기
          </button>
        </form>
      </section>
    </main>
  );
}

function StepLabel({ icon, label }: { icon: React.ReactNode; label: string }) {
  return (
    <div className="flex items-center gap-2 text-sm font-semibold text-ink">
      <span className="text-moss">{icon}</span>
      {label}
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block space-y-2">
      <span className="text-sm font-medium text-ink/80">{label}</span>
      {children}
    </label>
  );
}

function toIsoString(value: string) {
  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return null;
  }

  return date.toISOString();
}
