import Link from "next/link";
import {
  ArrowLeft,
  Bell,
  CalendarDays,
  CheckCircle2,
  ClipboardList,
  Clock3,
  DoorOpen,
  FileCheck2,
  Hourglass,
  Plus,
  Send,
  ShieldCheck,
  UserRound
} from "lucide-react";
import { requireOnboarded } from "@/lib/auth/session";
import { isAdminUser } from "@/lib/auth/admin";
import { hasServiceEnv } from "@/lib/env";
import { createServiceRoleSupabaseClient } from "@/lib/supabase/admin";
import { getDemoActivityCards, getDemoActivityRooms } from "@/lib/demo-data";
import { BottomNav } from "@/components/BottomNav";

export const dynamic = "force-dynamic";

type ActivityCard = {
  id: string;
  title: string;
  category: string;
  status: string;
  event_datetime: string;
  role: "host" | "applicant";
  application_status?: "pending" | "approved" | "rejected_closed";
};

type ActivityRoom = {
  id: string;
  title: string;
  status: "active" | "closed";
  event_datetime: string;
};

type NextAction = {
  title: string;
  body: string;
  href: string;
  label: string;
  priority: "high" | "normal";
};

export default async function MePage() {
  const { user, profile } = await requireOnboarded();
  const [cards, rooms, isAdmin] = await Promise.all([
    getActivityCards(user.id),
    getActivityRooms(user.id),
    isAdminUser(user.id)
  ]);

  const hostedCards = cards.filter((card) => card.role === "host");
  const appliedCards = cards.filter((card) => card.role === "applicant");
  const activeRooms = rooms.filter((room) => room.status === "active");
  const reviewRooms = rooms.filter((room) => room.status === "closed");
  const pendingApplications = appliedCards.filter((card) => card.application_status === "pending");
  const approvedApplications = appliedCards.filter((card) => card.application_status === "approved");
  const nextActions = buildNextActions({ hostedCards, pendingApplications, activeRooms, reviewRooms });

  return (
    <main className="min-h-dvh px-5 pb-[calc(88px+env(safe-area-inset-bottom))] pt-[calc(24px+env(safe-area-inset-top))]">
      <section className="mx-auto w-full max-w-md space-y-5">
        <Link href="/feed" className="inline-flex min-h-10 items-center gap-2 text-sm font-semibold text-ink/70">
          <ArrowLeft className="h-4 w-4" aria-hidden />
          피드로 돌아가기
        </Link>

        <header className="space-y-4">
          <div className="space-y-2">
            <p className="text-sm font-semibold text-moss">My Activity</p>
            <h1 className="text-3xl font-bold leading-tight tracking-normal text-ink">
              {profile?.nickname ?? "나"}님의 진행 현황
            </h1>
            <p className="text-sm leading-6 text-ink/60">
              만든 카드, 신청한 카드, 열린 Room, 남은 후속 작업을 한 화면에서 확인합니다.
            </p>
          </div>

          <section className="grid grid-cols-3 gap-2" aria-label="활동 요약">
            <Metric label="처리할 일" value={nextActions.length} tone={nextActions.length > 0 ? "strong" : "calm"} />
            <Metric label="진행 Room" value={activeRooms.length} tone="calm" />
            <Metric label="승인 신청" value={approvedApplications.length} tone="calm" />
          </section>

          {isAdmin ? (
            <Link
              href="/admin"
              className="flex min-h-11 items-center justify-center gap-2 rounded-md border border-line bg-white/80 px-3 text-sm font-semibold text-ink/80 shadow-soft"
            >
              <ShieldCheck className="h-4 w-4 text-moss" aria-hidden />
              관리자 콘솔
            </Link>
          ) : null}
        </header>

        <section className="grid grid-cols-2 gap-2">
          <Link
            href="/cards/new"
            className="flex min-h-12 items-center justify-center gap-2 rounded-md mate-cta px-3 text-sm font-semibold text-white"
          >
            <Plus className="h-4 w-4" aria-hidden />
            Mate 만들기
          </Link>
          <Link
            href="/alerts"
            className="flex min-h-12 items-center justify-center gap-2 rounded-md mate-cta px-3 text-sm font-semibold text-white"
          >
            <Bell className="h-4 w-4" aria-hidden />
            알림 보기
          </Link>
        </section>

        <section className="space-y-3">
          <SectionTitle icon={<Clock3 className="h-5 w-5" aria-hidden />} title="지금 할 일" />
          {nextActions.length > 0 ? (
            <div className="space-y-2">
              {nextActions.map((action) => (
                <Link
                  key={`${action.href}-${action.title}`}
                  href={action.href}
                  className={`block rounded-lg border p-4 shadow-soft transition hover:border-moss ${
                    action.priority === "high" ? "border-moss bg-moss/10" : "border-line bg-white"
                  }`}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0 space-y-1">
                      <p className="text-sm font-semibold text-ink">{action.title}</p>
                      <p className="text-sm leading-6 text-ink/60">{action.body}</p>
                    </div>
                    <span className="shrink-0 rounded-full bg-ink px-2.5 py-1 text-xs font-semibold text-white">
                      {action.label}
                    </span>
                  </div>
                </Link>
              ))}
            </div>
          ) : (
            <EmptyState
              icon={<CheckCircle2 className="h-4 w-4" aria-hidden />}
              title="지금 처리할 일은 없어요"
              body="새 카드를 만들거나 피드에서 관심 있는 카드를 신청하면 다음 액션이 여기에 모입니다."
              href="/feed"
              action="피드 보기"
            />
          )}
        </section>

        <section className="space-y-3">
          <SectionTitle icon={<DoorOpen className="h-5 w-5" aria-hidden />} title="Mate Room" />
          {rooms.length > 0 ? (
            <div className="space-y-2">
              {rooms.map((room) => (
                <ActivityRow
                  key={room.id}
                  href={room.status === "active" ? `/rooms/${room.id}` : `/rooms/${room.id}/review`}
                  eyebrow={room.status === "active" ? "진행 중" : "후기 필요"}
                  title={room.title}
                  meta={formatDateTime(room.event_datetime)}
                  badge={room.status === "active" ? "입장" : "후기"}
                  icon={<DoorOpen className="h-4 w-4" aria-hidden />}
                  urgent={room.status === "closed"}
                />
              ))}
            </div>
          ) : (
            <EmptyState
              icon={<DoorOpen className="h-4 w-4" aria-hidden />}
              title="아직 열린 Room이 없어요"
              body="신청이 승인되거나 호스트가 신청자를 승인하면 확정 Room이 표시됩니다."
              href="/feed"
              action="신청할 카드 찾기"
            />
          )}
        </section>

        <section className="space-y-3">
          <SectionTitle icon={<FileCheck2 className="h-5 w-5" aria-hidden />} title="내가 만든 카드" />
          {hostedCards.length > 0 ? (
            <div className="space-y-2">
              {hostedCards.map((card) => (
                <ActivityRow
                  key={`host-${card.id}`}
                  href={`/cards/${card.id}/applicants`}
                  eyebrow={`${card.category} · 호스트`}
                  title={card.title}
                  meta={formatDateTime(card.event_datetime)}
                  badge={formatCardStatus(card)}
                  icon={<ClipboardList className="h-4 w-4" aria-hidden />}
                  urgent={card.status === "open"}
                />
              ))}
            </div>
          ) : (
            <EmptyState
              icon={<Plus className="h-4 w-4" aria-hidden />}
              title="아직 만든 카드가 없어요"
              body="같이 하고 싶은 활동이 생기면 카드로 열고 신청자를 받을 수 있습니다."
              href="/cards/new"
              action="Mate 만들기"
            />
          )}
        </section>

        <section className="space-y-3">
          <SectionTitle icon={<Send className="h-5 w-5" aria-hidden />} title="내가 신청한 카드" />
          {appliedCards.length > 0 ? (
            <div className="space-y-2">
              {appliedCards.map((card) => (
                <ActivityRow
                  key={`apply-${card.id}`}
                  href={`/cards/${card.id}`}
                  eyebrow={`${card.category} · 신청`}
                  title={card.title}
                  meta={formatDateTime(card.event_datetime)}
                  badge={formatCardStatus(card)}
                  icon={<Hourglass className="h-4 w-4" aria-hidden />}
                  urgent={card.application_status === "approved"}
                />
              ))}
            </div>
          ) : (
            <EmptyState
              icon={<UserRound className="h-4 w-4" aria-hidden />}
              title="아직 신청한 카드가 없어요"
              body="가볍게 참여할 수 있는 활동을 피드에서 찾아보세요."
              href="/feed"
              action="피드 보기"
            />
          )}
        </section>
      </section>

      <BottomNav active="me" />
    </main>
  );
}

function Metric({ label, value, tone }: { label: string; value: number; tone: "strong" | "calm" }) {
  return (
    <div className={`rounded-lg border px-3 py-3 shadow-soft ${tone === "strong" ? "border-moss bg-moss/10" : "border-line bg-white"}`}>
      <p className="text-xs font-semibold text-ink/45">{label}</p>
      <p className="mt-1 text-xl font-bold tracking-normal text-ink">{value}</p>
    </div>
  );
}

function SectionTitle({ icon, title }: { icon: React.ReactNode; title: string }) {
  return (
    <div className="flex items-center gap-2 text-sm font-semibold text-ink">
      <span className="text-moss">{icon}</span>
      {title}
    </div>
  );
}

function ActivityRow({
  href,
  eyebrow,
  title,
  meta,
  badge,
  icon,
  urgent
}: {
  href: string;
  eyebrow: string;
  title: string;
  meta: string;
  badge: string;
  icon: React.ReactNode;
  urgent?: boolean;
}) {
  return (
    <Link
      href={href}
      className={`block rounded-lg border p-4 shadow-soft transition hover:border-moss ${urgent ? "border-moss/40 bg-white" : "border-line bg-white"}`}
    >
      <div className="flex items-start gap-3">
        <span className={`mt-0.5 rounded-md p-2 ${urgent ? "bg-moss/10 text-moss" : "bg-paper text-moss"}`}>
          {icon}
        </span>
        <div className="min-w-0 flex-1 space-y-1">
          <div className="flex items-start justify-between gap-3">
            <p className="text-xs font-semibold text-ink/45">{eyebrow}</p>
            <span className="shrink-0 rounded-full bg-paper px-2 py-1 text-xs font-semibold text-ink/55">{badge}</span>
          </div>
          <p className="truncate text-sm font-semibold text-ink">{title}</p>
          <p className="flex items-center gap-1.5 text-xs text-ink/50">
            <CalendarDays className="h-3.5 w-3.5 text-moss" aria-hidden />
            {meta}
          </p>
        </div>
      </div>
    </Link>
  );
}

function EmptyState({
  icon,
  title,
  body,
  href,
  action
}: {
  icon: React.ReactNode;
  title: string;
  body: string;
  href: string;
  action: string;
}) {
  return (
    <div className="rounded-lg border border-line bg-white p-4 shadow-soft">
      <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-full bg-paper text-moss">{icon}</div>
      <p className="text-sm font-semibold text-ink">{title}</p>
      <p className="mt-1 text-sm leading-6 text-ink/60">{body}</p>
      <Link href={href} className="mt-4 inline-flex min-h-10 items-center justify-center rounded-md mate-cta px-3 text-sm font-semibold text-white">
        {action}
      </Link>
    </div>
  );
}

async function getActivityCards(userId: string): Promise<ActivityCard[]> {
  if (!hasServiceEnv()) {
    return getDemoActivityCards();
  }

  const admin = createServiceRoleSupabaseClient();
  const { data: hostedCards } = await admin
    .from("cards")
    .select("id, title, category, status, event_datetime")
    .eq("host_id", userId)
    .order("created_at", { ascending: false })
    .limit(20);

  const { data: applications } = await admin
    .from("applications")
    .select("id, card_id, status, created_at")
    .eq("applicant_id", userId)
    .order("created_at", { ascending: false })
    .limit(20);

  const cardIds = [...new Set((applications ?? []).map((application) => application.card_id))];
  const { data: appliedCards } =
    cardIds.length > 0
      ? await admin.from("cards").select("id, title, category, status, event_datetime").in("id", cardIds)
      : { data: [] };

  const appliedCardMap = new Map((appliedCards ?? []).map((card) => [card.id, card]));

  const hostActivities: ActivityCard[] = (hostedCards ?? []).map((card) => ({
    id: card.id,
    title: card.title,
    category: card.category,
    status: card.status,
    event_datetime: card.event_datetime,
    role: "host"
  }));

  const applicationActivities: ActivityCard[] = [];

  for (const application of applications ?? []) {
    const card = appliedCardMap.get(application.card_id);

    if (!card) {
      continue;
    }

    applicationActivities.push({
      id: card.id,
      title: card.title,
      category: card.category,
      status: card.status,
      event_datetime: card.event_datetime,
      role: "applicant",
      application_status: application.status as ActivityCard["application_status"]
    });
  }

  return [...hostActivities, ...applicationActivities];
}

async function getActivityRooms(userId: string): Promise<ActivityRoom[]> {
  if (!hasServiceEnv()) {
    return getDemoActivityRooms();
  }

  const admin = createServiceRoleSupabaseClient();
  const { data: hostedCards } = await admin.from("cards").select("id").eq("host_id", userId);
  const { data: approvedApplications } = await admin
    .from("applications")
    .select("card_id")
    .eq("applicant_id", userId)
    .eq("status", "approved");

  const cardIds = [
    ...new Set([
      ...(hostedCards ?? []).map((card) => card.id),
      ...(approvedApplications ?? []).map((application) => application.card_id)
    ])
  ];

  if (cardIds.length === 0) {
    return [];
  }

  const { data: rooms } = await admin
    .from("rooms")
    .select("id, card_id, status")
    .in("card_id", cardIds)
    .order("status", { ascending: true });

  const roomCardIds = [...new Set((rooms ?? []).map((room) => room.card_id))];
  const { data: cards } =
    roomCardIds.length > 0
      ? await admin.from("cards").select("id, title, event_datetime").in("id", roomCardIds)
      : { data: [] };
  const cardMap = new Map((cards ?? []).map((card) => [card.id, card]));

  return (rooms ?? [])
    .map((room) => {
      const card = cardMap.get(room.card_id);

      if (!card) {
        return null;
      }

      return {
        id: room.id,
        title: card.title,
        status: room.status as ActivityRoom["status"],
        event_datetime: card.event_datetime
      };
    })
    .filter((room): room is ActivityRoom => Boolean(room));
}

function buildNextActions({
  hostedCards,
  pendingApplications,
  activeRooms,
  reviewRooms
}: {
  hostedCards: ActivityCard[];
  pendingApplications: ActivityCard[];
  activeRooms: ActivityRoom[];
  reviewRooms: ActivityRoom[];
}): NextAction[] {
  const actions: NextAction[] = [];
  const openHostCard = hostedCards.find((card) => card.status === "open");
  const pendingApplication = pendingApplications[0];
  const activeRoom = activeRooms[0];
  const reviewRoom = reviewRooms[0];

  if (reviewRoom) {
    actions.push({
      title: "후기 확인이 남았어요",
      body: reviewRoom.title,
      href: `/rooms/${reviewRoom.id}/review`,
      label: "후기",
      priority: "high"
    });
  }

  if (openHostCard) {
    actions.push({
      title: "신청자를 확인할 수 있어요",
      body: openHostCard.title,
      href: `/cards/${openHostCard.id}/applicants`,
      label: "검토",
      priority: "high"
    });
  }

  if (activeRoom) {
    actions.push({
      title: "진행 중인 Room이 있어요",
      body: activeRoom.title,
      href: `/rooms/${activeRoom.id}`,
      label: "입장",
      priority: "normal"
    });
  }

  if (pendingApplication) {
    actions.push({
      title: "호스트 응답을 기다리는 중이에요",
      body: pendingApplication.title,
      href: `/cards/${pendingApplication.id}`,
      label: "대기",
      priority: "normal"
    });
  }

  return actions.slice(0, 3);
}

function formatCardStatus(card: ActivityCard) {
  if (card.role === "applicant") {
    if (card.application_status === "approved") {
      return "승인";
    }

    if (card.application_status === "rejected_closed") {
      return "마감";
    }

    return "대기";
  }

  if (card.status === "open") {
    return "모집 중";
  }

  if (card.status === "pending_review") {
    return "검수 중";
  }

  if (card.status === "closed") {
    return "마감";
  }

  if (card.status === "rejected") {
    return "반려";
  }

  return "취소";
}

function formatDateTime(value: string) {
  return new Intl.DateTimeFormat("ko-KR", {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit"
  }).format(new Date(value));
}
