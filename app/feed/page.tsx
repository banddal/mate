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
import { BottomNav } from "@/components/BottomNav";
import { TopicScroller } from "./TopicScroller";

export const dynamic = "force-dynamic";

const periodTabs = [
  { label: "전체", value: "all" },
  { label: "10분 내", value: "ten" },
  { label: "한시간 내", value: "hour" },
  { label: "오늘 내", value: "today" },
  { label: "이번주 내", value: "week" }
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
    <main className="min-h-dvh pb-[calc(88px+env(safe-area-inset-bottom))]">
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

          <nav className="grid grid-cols-5 gap-2" aria-label="마감 시간 필터">
            {periodTabs.map((tab) => (
              <TimeFilterButton
                key={tab.value}
                href={buildFeedHref({ period: tab.value, category: filters.category })}
                active={filters.period === tab.value}
              >
                {tab.label}
              </TimeFilterButton>
            ))}
          </nav>

          <TopicScroller>
            <TopicChip href={buildFeedHref({ period: filters.period })} active={!filters.category}>
              전체 주제
            </TopicChip>
            {categoryTabs.map((category) => (
              <TopicChip
                key={category}
                href={buildFeedHref({ period: filters.period, category })}
                active={filters.category === category}
              >
                {category}
              </TopicChip>
            ))}
          </TopicScroller>
        </header>

        {cards.length > 0 ? (
          <div className="space-y-2.5">
            {cards.map((card) => (
              <FeedCardItem key={card.id} card={card} />
            ))}
          </div>
        ) : (
          <EmptyFeed />
        )}
      </section>
      <BottomNav active="feed" />
    </main>
  );
}

function TimeFilterButton({
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
      className={`flex min-h-11 items-center justify-center rounded-md border px-1 text-xs font-semibold transition sm:text-sm ${
        active
          ? "border-white/70 bg-white/25 text-ink shadow-soft"
          : "border-white/20 bg-white/10 text-ink/68 hover:border-white/40 hover:bg-white/20"
      }`}
    >
      {children}
    </Link>
  );
}

function TopicChip({
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
      className={`flex min-h-9 shrink-0 items-center px-1 text-sm font-semibold transition ${
        active
          ? "text-white"
          : "text-ink/58 hover:text-ink"
      }`}
    >
      #{children}
    </Link>
  );
}

function FeedCardItem({ card }: { card: FeedCard }) {
  const deadlineState = getDeadlineState(card.deadline_at);
  const urgency = getDeadlineVisualState(card.deadline_at);
  const title = clampCardTitle(card.title);

  return (
    <details
      className="feed-card-shell group rounded-lg border border-white/20 shadow-soft transition hover:border-moss"
      style={
        {
          "--feed-card-alpha": urgency.alpha,
          "--feed-card-title-color": urgency.titleColor,
          "--feed-card-text-color": urgency.textColor,
          "--feed-card-muted-color": urgency.mutedColor
        } as React.CSSProperties
      }
    >
      <summary className="feed-card-summary grid cursor-pointer list-none gap-3 p-3">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0 space-y-2">
            <div className="flex items-center gap-2">
              <span className="feed-card-chip rounded-full px-2.5 py-0.5 text-xs font-semibold">
                {card.category}
              </span>
              <span
                className={`feed-deadline-chip rounded-full px-2.5 py-0.5 text-xs font-bold ${deadlineState.className}`}
              >
                {deadlineState.label}
              </span>
            </div>
            <h2 className="feed-card-title text-lg font-bold tracking-normal" title={card.title}>
              {title}
            </h2>
          </div>
          <span className="mt-1 flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-line bg-paper/65 text-moss transition group-open:rotate-180">
            <ChevronDown className="h-4 w-4" aria-hidden />
          </span>
        </div>

        <div className="feed-card-offer flex items-start gap-2 rounded-md bg-paper/65 px-3 py-2 text-sm font-semibold leading-5">
          <Sparkles className="mt-1 h-4 w-4 shrink-0 text-moss" aria-hidden />
          <span>{card.host_offer}</span>
        </div>
      </summary>

      <div className="feed-card-panel mx-3 mb-3 space-y-3 rounded-lg border border-line bg-paper/55 p-3">
        <div className="feed-card-meta grid gap-2 text-sm">
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

        <p className="feed-card-meta rounded-md bg-white/5 px-3 py-3 text-sm leading-6">{card.description}</p>

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

function clampCardTitle(title: string) {
  const maxLength = 18;

  return title.length > maxLength ? `${title.slice(0, maxLength).trimEnd()}...` : title;
}

function getDeadlineVisualState(value: string) {
  const remainingMs = new Date(value).getTime() - Date.now();
  const remainingMinutes = Math.ceil(remainingMs / (1000 * 60));
  const remainingHours = remainingMinutes / 60;

  if (remainingMinutes <= 2) {
    return getFeedCardTone("0.62", "0.98", "0.84", "0.7");
  }

  if (remainingMinutes <= 10) {
    return getFeedCardTone("0.52", "0.94", "0.8", "0.66");
  }

  if (remainingHours <= 1) {
    return getFeedCardTone("0.42", "0.9", "0.74", "0.6");
  }

  if (remainingHours <= 24) {
    return getFeedCardTone("0.28", "0.82", "0.66", "0.5");
  }

  return getFeedCardTone("0.14", "0.72", "0.56", "0.42");
}

function getFeedCardTone(alpha: string, titleAlpha: string, textAlpha: string, mutedAlpha: string) {
  return {
    alpha,
    titleColor: `rgba(255, 255, 255, ${titleAlpha})`,
    textColor: `rgba(245, 241, 238, ${textAlpha})`,
    mutedColor: `rgba(245, 241, 238, ${mutedAlpha})`
  };
}

function getDeadlineState(value: string) {
  const remainingMs = new Date(value).getTime() - Date.now();
  const remainingMinutes = Math.ceil(remainingMs / (1000 * 60));
  const remainingHours = remainingMinutes / 60;

  if (remainingMinutes <= 0) {
    return { label: "closed", className: "feed-deadline-urgent" };
  }

  if (remainingMinutes <= 10) {
    return { label: "10M", className: "feed-deadline-urgent" };
  }

  if (remainingMinutes <= 60) {
    return { label: "D-1hour", className: "feed-deadline-hour" };
  }

  if (remainingHours <= 24) {
    return { label: "today", className: "feed-deadline-today" };
  }

  if (remainingHours <= 24 * 7) {
    return { label: "D-7d", className: "feed-deadline-week" };
  }

  return { label: "open", className: "feed-deadline-open" };
}
