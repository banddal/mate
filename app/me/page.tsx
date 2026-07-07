import Link from "next/link";
import { ArrowLeft, Bell, CalendarDays, ClipboardList, DoorOpen, Plus, Send, UserRound } from "lucide-react";
import { requireOnboarded } from "@/lib/auth/session";
import { hasServiceEnv } from "@/lib/env";
import { createServiceRoleSupabaseClient } from "@/lib/supabase/admin";
import { getDemoActivityCards, getDemoActivityRooms } from "@/lib/demo-data";

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

export default async function MePage() {
  const { user, profile } = await requireOnboarded();
  const [cards, rooms] = await Promise.all([getActivityCards(user.id), getActivityRooms(user.id)]);
  const hostingCount = cards.filter((card) => card.role === "host").length;
  const applyingCount = cards.filter((card) => card.role === "applicant").length;

  return (
    <main className="min-h-dvh px-5 pb-[calc(88px+env(safe-area-inset-bottom))] pt-[calc(24px+env(safe-area-inset-top))]">
      <section className="mx-auto w-full max-w-md space-y-5">
        <Link href="/feed" className="inline-flex min-h-10 items-center gap-2 text-sm font-semibold text-ink/70">
          <ArrowLeft className="h-4 w-4" aria-hidden />
          피드로 돌아가기
        </Link>

        <header className="space-y-3">
          <div className="space-y-2">
            <p className="text-sm font-semibold text-moss">My Activity</p>
            <h1 className="text-3xl font-bold leading-tight tracking-normal text-ink">
              {profile?.nickname ?? "나"}님의 활동
            </h1>
            <p className="text-sm leading-6 text-ink/60">
              내가 연 카드, 신청한 카드, 확정된 Mate Room을 한곳에서 확인합니다.
            </p>
          </div>

          <div className="grid grid-cols-3 gap-2">
            <Metric label="연 카드" value={hostingCount} />
            <Metric label="신청" value={applyingCount} />
            <Metric label="Room" value={rooms.length} />
          </div>
        </header>

        <section className="grid grid-cols-2 gap-2">
          <Link
            href="/cards/new"
            className="flex min-h-12 items-center justify-center gap-2 rounded-md bg-ink px-3 text-sm font-semibold text-white"
          >
            <Plus className="h-4 w-4" aria-hidden />
            카드 만들기
          </Link>
          <Link
            href="/alerts"
            className="flex min-h-12 items-center justify-center gap-2 rounded-md border border-line bg-white px-3 text-sm font-semibold text-ink"
          >
            <Bell className="h-4 w-4" aria-hidden />
            알림 설정
          </Link>
        </section>

        <section className="space-y-3">
          <div className="flex items-center gap-2 text-sm font-semibold text-ink">
            <DoorOpen className="h-5 w-5 text-moss" aria-hidden />
            Mate Room
          </div>
          {rooms.length > 0 ? (
            <div className="space-y-2">
              {rooms.map((room) => (
                <Link
                  key={room.id}
                  href={room.status === "active" ? `/rooms/${room.id}` : `/rooms/${room.id}/review`}
                  className="block rounded-lg border border-line bg-white p-4 shadow-soft"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0 space-y-1">
                      <p className="truncate text-sm font-semibold text-ink">{room.title}</p>
                      <p className="text-xs text-ink/45">{formatDateTime(room.event_datetime)}</p>
                    </div>
                    <StatusBadge status={room.status === "active" ? "진행 중" : "종료"} tone={room.status === "active" ? "moss" : "paper"} />
                  </div>
                </Link>
              ))}
            </div>
          ) : (
            <EmptyState title="아직 열린 Room이 없어요" body="신청이 승인되거나 호스트가 신청자를 승인하면 Room이 여기에 표시됩니다." />
          )}
        </section>

        <section className="space-y-3">
          <div className="flex items-center gap-2 text-sm font-semibold text-ink">
            <ClipboardList className="h-5 w-5 text-moss" aria-hidden />
            카드 활동
          </div>
          {cards.length > 0 ? (
            <div className="space-y-2">
              {cards.map((card) => (
                <Link
                  key={`${card.role}-${card.id}`}
                  href={card.role === "host" ? `/cards/${card.id}/applicants` : `/cards/${card.id}`}
                  className="block rounded-lg border border-line bg-white p-4 shadow-soft"
                >
                  <div className="space-y-3">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0 space-y-1">
                        <div className="flex flex-wrap gap-2">
                          <span className="rounded-full bg-moss/10 px-2.5 py-1 text-xs font-semibold text-moss">
                            {card.category}
                          </span>
                          <span className="rounded-full bg-paper px-2.5 py-1 text-xs font-semibold text-ink/55">
                            {card.role === "host" ? "호스트" : "신청"}
                          </span>
                        </div>
                        <p className="truncate text-sm font-semibold text-ink">{card.title}</p>
                      </div>
                      <StatusBadge status={formatCardStatus(card)} tone={card.role === "host" ? "moss" : "paper"} />
                    </div>
                    <div className="flex items-center gap-2 text-xs text-ink/50">
                      <CalendarDays className="h-3.5 w-3.5 text-moss" aria-hidden />
                      {formatDateTime(card.event_datetime)}
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          ) : (
            <EmptyState title="카드 활동이 아직 없어요" body="카드를 만들거나 피드에서 신청하면 이곳에 모입니다." />
          )}
        </section>
      </section>

      <BottomNav />
    </main>
  );
}

function Metric({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-lg border border-line bg-white px-3 py-3 shadow-soft">
      <p className="text-xs font-semibold text-ink/45">{label}</p>
      <p className="mt-1 text-xl font-bold tracking-normal text-ink">{value}</p>
    </div>
  );
}

function EmptyState({ title, body }: { title: string; body: string }) {
  return (
    <div className="rounded-lg border border-line bg-white p-4 shadow-soft">
      <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-full bg-paper text-moss">
        <UserRound className="h-4 w-4" aria-hidden />
      </div>
      <p className="text-sm font-semibold text-ink">{title}</p>
      <p className="mt-1 text-sm leading-6 text-ink/60">{body}</p>
    </div>
  );
}

function StatusBadge({ status, tone }: { status: string; tone: "moss" | "paper" }) {
  return (
    <span
      className={
        tone === "moss"
          ? "shrink-0 rounded-full bg-moss/10 px-2 py-1 text-xs font-semibold text-moss"
          : "shrink-0 rounded-full bg-paper px-2 py-1 text-xs font-semibold text-ink/55"
      }
    >
      {status}
    </span>
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
      ? await admin
          .from("cards")
          .select("id, title, category, status, event_datetime")
          .in("id", cardIds)
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
      ? await admin
          .from("cards")
          .select("id, title, event_datetime")
          .in("id", roomCardIds)
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

function BottomNav() {
  return (
    <nav className="fixed inset-x-0 bottom-0 border-t border-line bg-white/95 px-5 pb-[calc(10px+env(safe-area-inset-bottom))] pt-2 backdrop-blur">
      <div className="mx-auto grid max-w-md grid-cols-4 text-center text-xs font-semibold text-ink/55">
        <Link className="rounded-md px-2 py-2" href="/feed">
          피드
        </Link>
        <Link className="rounded-md px-2 py-2 text-moss" href="/me">
          내 활동
        </Link>
        <Link className="rounded-md px-2 py-2" href="/alerts">
          알림
        </Link>
        <Link className="rounded-md px-2 py-2" href="/admin">
          관리자
        </Link>
      </div>
    </nav>
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
