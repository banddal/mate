import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, CalendarDays, Clock3, MapPin, Ticket, UsersRound } from "lucide-react";
import { requireOnboarded } from "@/lib/auth/session";
import { getCardDetail } from "@/lib/cards/queries";
import { ApplyCardSheet } from "./ApplyCardSheet";

type CardDetailPageProps = {
  params: {
    id: string;
  };
};

export default async function CardDetailPage({ params }: CardDetailPageProps) {
  const { user } = await requireOnboarded();
  const card = await getCardDetail(params.id);

  if (!card) {
    notFound();
  }

  const isHost = card.host_id === user.id;
  const canApply = card.status === "open" && !isHost;

  return (
    <main className={`min-h-dvh px-5 pt-[calc(24px+env(safe-area-inset-top))] ${canApply ? "pb-72" : "pb-8"}`}>
      <section className="mx-auto w-full max-w-md space-y-5">
        <Link href="/feed" className="inline-flex min-h-10 items-center gap-2 text-sm font-semibold text-ink/70">
          <ArrowLeft className="h-4 w-4" aria-hidden />
          피드로 돌아가기
        </Link>

        <div className="space-y-5 rounded-lg border border-line bg-white p-5 shadow-soft">
          <div className="space-y-3">
            <div className="flex flex-wrap gap-2">
              <span className="rounded-full bg-moss/12 px-3 py-1 text-xs font-semibold text-moss">
                {card.category}
              </span>
              <span className="rounded-full bg-paper px-3 py-1 text-xs font-semibold text-ink/60">
                {card.level}
              </span>
              {isHost ? (
                <span className="rounded-full bg-sun/15 px-3 py-1 text-xs font-semibold text-ink/70">
                  내가 연 카드
                </span>
              ) : null}
            </div>
            <h1 className="text-3xl font-bold leading-tight tracking-normal text-ink">{card.title}</h1>
            <p className="leading-7 text-ink/70">{card.description}</p>
          </div>

          <div className="grid gap-3 rounded-lg bg-paper/70 p-4 text-sm text-ink/72">
            <CardMeta icon={<CalendarDays className="h-4 w-4" aria-hidden />}>
              {formatDateTime(card.event_datetime)}
            </CardMeta>
            <CardMeta icon={<MapPin className="h-4 w-4" aria-hidden />}>{card.location}</CardMeta>
            <CardMeta icon={<UsersRound className="h-4 w-4" aria-hidden />}>
              최대 {card.capacity}명
            </CardMeta>
            <CardMeta icon={<Clock3 className="h-4 w-4" aria-hidden />}>
              신청 마감 {formatDateTime(card.deadline_at)}
            </CardMeta>
          </div>

          <section className="space-y-2">
            <div className="flex items-center gap-2 text-sm font-semibold text-ink">
              <Ticket className="h-5 w-5 text-moss" aria-hidden />
              호스트가 건 것
            </div>
            <p className="rounded-lg border border-line bg-white px-4 py-3 text-sm leading-6 text-ink/75">
              {card.host_offer}
            </p>
            {card.cost_info ? <p className="text-sm leading-6 text-ink/60">{card.cost_info}</p> : null}
          </section>

          {isHost ? (
            <Link
              href={`/cards/${card.id}/applicants`}
              className="flex min-h-12 w-full items-center justify-center rounded-md bg-ink px-4 text-sm font-semibold text-white"
            >
              신청자 보기
            </Link>
          ) : null}

          {!canApply && !isHost ? (
            <p className="rounded-md bg-paper px-3 py-2 text-sm font-medium text-ink/60">
              지금은 신청할 수 없는 카드입니다.
            </p>
          ) : null}
        </div>
      </section>

      {canApply ? <ApplyCardSheet cardId={card.id} /> : null}
    </main>
  );
}

function CardMeta({ icon, children }: { icon: React.ReactNode; children: React.ReactNode }) {
  return (
    <div className="flex items-center gap-2">
      <span className="text-moss">{icon}</span>
      <span>{children}</span>
    </div>
  );
}

function formatDateTime(value: string) {
  return new Intl.DateTimeFormat("ko-KR", {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit"
  }).format(new Date(value));
}
