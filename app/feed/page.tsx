import Link from "next/link";
import {
  CalendarDays,
  ChevronDown,
  Clock3,
  MapPin,
  RotateCw,
  ShieldCheck,
  Sparkles,
  Ticket
} from "lucide-react";
import { requireOnboarded } from "@/lib/auth/session";
import { isAdminUser } from "@/lib/auth/admin";
import { parseCardFeedFilters } from "@/lib/cards/filters";
import { getOpenCards, type FeedCard } from "@/lib/cards/queries";

export const dynamic = "force-dynamic";

const periodTabs = [
  { label: "전체", value: "all" },
  { label: "오늘", value: "today" },
  { label: "이번주", value: "week" },
  { label: "마감임박", value: "deadline" }
] as const;

const categoryTabs = ["야구 직관", "공연", "전시", "페스티벌", "맛집", "카페", "러닝"];

type FeedPageProps = {
  searchParams: Record<string, string | string[] | undefined>;
};

export default async function FeedPage({ searchParams }: FeedPageProps) {
  const { user, profile } = await requireOnboarded();
  const filters = parseCardFeedFilters(searchParams);
  const [cards, canOpenAdmin] = await Promise.all([getOpenCards(filters), isAdminUser(user.id)]);

  return (
    <main className="min-h-dvh pb-[calc(28px+env(safe-area-inset-bottom))]">
      <section className="mx-auto w-full max-w-md px-5 pt-[calc(24px+env(safe-area-inset-top))]">
        <header className="space-y-5 pb-5">
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="text-sm font-semibold text-moss">Mate Feed</p>
              <h1 className="text-3xl font-bold tracking-normal text-ink">
                {profile?.nickname}님, 오늘의 상황
              </h1>
            </div>
            <div className="flex shrink-0 items-center gap-2">
              {canOpenAdmin ? (
                <Link
                  href="/admin"
                  className="flex h-11 w-11 items-center justify-center rounded-full border border-line bg-white text-moss shadow-soft"
                  aria-label="관리자"
                >
                  <ShieldCheck className="h-5 w-5" aria-hidden />
                </Link>
              ) : null}
            </div>
          </div>

          <nav className="flex gap-2 overflow-x-auto pb-1" aria-label="기간 필터">
            {periodTabs.map((tab) => (
              <FilterChip
                key={tab.value}
                href={buildFeedHref({ period: tab.value, category: filters.category })}
                active={filters.period === tab.value}
              >
                {tab.label}
              </FilterChip>
            ))}
          </nav>

          <nav className="flex gap-2 overflow-x-auto pb-1" aria-label="카테고리 필터">
            <FilterChip href={buildFeedHref({ period: filters.period })} active={!filters.category}>
              전체 카테고리
            </FilterChip>
            {categoryTabs.map((category) => (
              <FilterChip
                key={category}
                href={buildFeedHref({ period: filters.period, category })}
                active={filters.category === category}
              >
                {category}
              </FilterChip>
            ))}
          </nav>
        </header>

        {cards.length > 0 ? (
          <div className="space-y-3">
            {cards.map((card) => (
              <FeedCardItem key={card.id} card={card} />
            ))}
          </div>
        ) : (
          <EmptyFeed />
        )}
      </section>
    </main>
  );
}

function FilterChip({
  href,
  active,
  children
}: {
  href: string;
  active: boolean;
  children: React.ReactNode;
}) {
  return (
    <Link
      href={href}
      className={`flex min-h-10 shrink-0 items-center rounded-full border px-4 text-sm font-semibold transition ${
        active
          ? "border-ink bg-ink text-white"
          : "border-line bg-white text-ink/72 hover:border-moss"
      }`}
    >
      {children}
    </Link>
  );
}

function FeedCardItem({ card }: { card: FeedCard }) {
  const deadlineState = getDeadlineState(card.deadline_at);

  return (
    <details className="group rounded-lg border border-line bg-white shadow-soft transition hover:border-moss">
      <summary className="feed-card-summary grid cursor-pointer list-none gap-4 p-4">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0 space-y-3">
            <div className="flex items-center gap-2">
              <span className="rounded-full bg-moss/12 px-2.5 py-1 text-xs font-semibold text-moss">
                {card.category}
              </span>
              <span
                className={`rounded-full px-2.5 py-1 text-xs font-semibold ${
                  deadlineState.urgent ? "bg-sun/25 text-ink" : "bg-paper text-ink/55"
                }`}
              >
                {deadlineState.label}
              </span>
            </div>
            <h2 className="text-[1.35rem] font-bold leading-snug tracking-normal text-ink">{card.title}</h2>
          </div>
          <span className="mt-1 flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-line bg-paper/70 text-moss transition group-open:rotate-180">
            <ChevronDown className="h-4 w-4" aria-hidden />
          </span>
        </div>

        <div className="flex items-start gap-2 rounded-md bg-paper/70 px-3 py-3 text-sm font-semibold leading-6 text-ink/78">
          <Sparkles className="mt-1 h-4 w-4 shrink-0 text-moss" aria-hidden />
          <span>{card.host_offer}</span>
        </div>
      </summary>

      <div className="feed-card-panel mx-4 mb-4 space-y-4 rounded-lg border border-line bg-paper/55 p-4">
        <div className="grid gap-2 text-sm text-ink/72">
          <CardMeta icon={<CalendarDays className="h-4 w-4" aria-hidden />}>
            {formatDateTime(card.event_datetime)}
          </CardMeta>
          <CardMeta icon={<MapPin className="h-4 w-4" aria-hidden />}>{card.location}</CardMeta>
          <CardMeta icon={<Ticket className="h-4 w-4" aria-hidden />}>
            {card.capacity}명까지 · {card.cost_info ?? "비용 안내 없음"}
          </CardMeta>
          <CardMeta icon={<Clock3 className="h-4 w-4" aria-hidden />}>
            마감 {formatDateTime(card.deadline_at)}
          </CardMeta>
        </div>

        <p className="rounded-md bg-white/5 px-3 py-3 text-sm leading-6 text-ink/70">{card.description}</p>

        <Link
          href={`/cards/${card.id}`}
          className="flex min-h-11 w-full items-center justify-center rounded-md bg-ink px-4 text-sm font-semibold text-white"
        >
          신청 화면으로 이동
        </Link>
      </div>
    </details>
  );
}

function CardMeta({ icon, children }: { icon: React.ReactNode; children: React.ReactNode }) {
  return (
    <div className="flex items-center gap-2">
      <span className="text-moss">{icon}</span>
      <span className="min-w-0 truncate">{children}</span>
    </div>
  );
}

function EmptyFeed() {
  return (
    <section className="rounded-lg border border-line bg-white p-6 text-center shadow-soft">
      <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-paper text-moss">
        <RotateCw className="h-5 w-5" aria-hidden />
      </div>
      <h2 className="mt-4 text-xl font-bold tracking-normal text-ink">열린 카드가 아직 없어요</h2>
      <p className="mt-2 leading-7 text-ink/68">
        필터를 바꾸면 지금 열려 있는 다른 Mate 상황을 볼 수 있어요.
      </p>
    </section>
  );
}

function buildFeedHref({ period, category }: { period?: string; category?: string }) {
  const params = new URLSearchParams();

  if (period && period !== "all") {
    params.set("period", period);
  }

  if (category) {
    params.set("category", category);
  }

  const query = params.toString();
  return query ? `/feed?${query}` : "/feed";
}

function formatDateTime(value: string) {
  return new Intl.DateTimeFormat("ko-KR", {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit"
  }).format(new Date(value));
}

function getDeadlineState(value: string) {
  const remainingMs = new Date(value).getTime() - Date.now();
  const remainingHours = Math.ceil(remainingMs / (1000 * 60 * 60));

  if (remainingHours <= 0) {
    return { label: "마감", urgent: true };
  }

  if (remainingHours <= 6) {
    return { label: `${remainingHours}시간 남음`, urgent: true };
  }

  if (remainingHours <= 24) {
    return { label: "오늘 마감", urgent: true };
  }

  return { label: "모집 중", urgent: false };
}
