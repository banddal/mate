import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, CalendarDays, CheckCircle2, Clock3, Hourglass, MapPin, Ticket, UsersRound } from "lucide-react";
import { requireOnboarded } from "@/lib/auth/session";
import { getCardDetail } from "@/lib/cards/queries";
import { hasServiceEnv } from "@/lib/env";
import { createServiceRoleSupabaseClient } from "@/lib/supabase/admin";
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
  const myApplication = isHost ? null : await getMyApplicationStatus(card.id, user.id);
  const canApply = card.status === "open" && !isHost && !myApplication;

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

          <StatusPanel
            isHost={isHost}
            cardStatus={card.status}
            applicationStatus={myApplication?.status ?? null}
          />

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
            <div className="space-y-2">
              <Link
                href={`/cards/${card.id}/applicants`}
                className="flex min-h-12 w-full items-center justify-center rounded-md bg-ink px-4 text-sm font-semibold text-white"
              >
                신청자 검토하기
              </Link>
              <p className="text-center text-xs font-medium text-ink/45">
                승인하면 Mate Room이 열리고 정원이 차면 카드가 마감됩니다.
              </p>
            </div>
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

function StatusPanel({
  isHost,
  cardStatus,
  applicationStatus
}: {
  isHost: boolean;
  cardStatus: string;
  applicationStatus: "pending" | "approved" | "rejected_closed" | null;
}) {
  if (isHost) {
    return (
      <div className="flex items-start gap-3 rounded-lg border border-moss/30 bg-moss/10 px-4 py-3">
        <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-moss" aria-hidden />
        <div>
          <p className="text-sm font-semibold text-ink">내가 연 카드입니다</p>
          <p className="mt-1 text-sm leading-6 text-ink/60">
            신청자를 검토하고 승인하면 Mate Room이 열립니다.
          </p>
        </div>
      </div>
    );
  }

  if (applicationStatus === "pending") {
    return (
      <div className="flex items-start gap-3 rounded-lg border border-moss/30 bg-moss/10 px-4 py-3">
        <Hourglass className="mt-0.5 h-5 w-5 shrink-0 text-moss" aria-hidden />
        <div>
          <p className="text-sm font-semibold text-ink">신청이 접수되어 있어요</p>
          <p className="mt-1 text-sm leading-6 text-ink/60">
            호스트가 승인하면 내 활동과 알림에서 다음 단계를 확인할 수 있습니다.
          </p>
        </div>
      </div>
    );
  }

  if (applicationStatus === "approved") {
    return (
      <div className="flex items-start gap-3 rounded-lg border border-moss/30 bg-moss/10 px-4 py-3">
        <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-moss" aria-hidden />
        <div>
          <p className="text-sm font-semibold text-ink">승인된 신청입니다</p>
          <p className="mt-1 text-sm leading-6 text-ink/60">
            내 활동에서 열린 Mate Room으로 이동할 수 있습니다.
          </p>
        </div>
      </div>
    );
  }

  if (applicationStatus === "rejected_closed") {
    return (
      <div className="rounded-lg border border-line bg-paper px-4 py-3 text-sm leading-6 text-ink/60">
        이 신청은 마감되었습니다. 피드에서 다른 카드를 찾아보세요.
      </div>
    );
  }

  if (cardStatus !== "open") {
    return (
      <div className="rounded-lg border border-line bg-paper px-4 py-3 text-sm leading-6 text-ink/60">
        현재 상태는 {formatCardStatus(cardStatus)}입니다. 지금은 새 신청을 받을 수 없습니다.
      </div>
    );
  }

  return null;
}

function CardMeta({ icon, children }: { icon: React.ReactNode; children: React.ReactNode }) {
  return (
    <div className="flex items-center gap-2">
      <span className="text-moss">{icon}</span>
      <span>{children}</span>
    </div>
  );
}

async function getMyApplicationStatus(cardId: string, userId: string) {
  if (!hasServiceEnv()) {
    return null;
  }

  const admin = createServiceRoleSupabaseClient();
  const { data } = await admin
    .from("applications")
    .select("id, status")
    .eq("card_id", cardId)
    .eq("applicant_id", userId)
    .maybeSingle<{ id: string; status: "pending" | "approved" | "rejected_closed" }>();

  return data ?? null;
}

function formatCardStatus(status: string) {
  if (status === "pending_review") {
    return "검수 중";
  }

  if (status === "closed") {
    return "마감";
  }

  if (status === "rejected") {
    return "반려";
  }

  if (status === "cancelled") {
    return "취소";
  }

  return "모집 중";
}

function formatDateTime(value: string) {
  return new Intl.DateTimeFormat("ko-KR", {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit"
  }).format(new Date(value));
}
