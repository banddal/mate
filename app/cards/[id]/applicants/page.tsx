import Link from "next/link";
import { notFound } from "next/navigation";
import { BadgeCheck, DoorOpen, ShieldCheck, UsersRound } from "lucide-react";
import { requireOnboarded } from "@/lib/auth/session";
import { createServiceRoleSupabaseClient } from "@/lib/supabase/admin";
import { hasServiceEnv } from "@/lib/env";
import { getCardDetail } from "@/lib/cards/queries";
import { DEMO_CREATED_CARD_ID, DEMO_ROOM_ID, getDemoApplicants } from "@/lib/demo-data";
import { ApproveApplicationButton } from "./ApproveApplicationButton";
import { BottomNav } from "@/components/BottomNav";
import { BackLink } from "@/components/BackLink";

type ApplicantsPageProps = {
  params: {
    id: string;
  };
};

type ApplicantRow = {
  id: string;
  applicant_id: string;
  nickname: string;
  reason_text: string;
  status: "pending" | "approved" | "rejected_closed";
  phone_verified: boolean;
  created_at: string;
};

export default async function ApplicantsPage({ params }: ApplicantsPageProps) {
  const { user } = await requireOnboarded();
  const card = await getCardDetail(params.id);

  if (!card) {
    notFound();
  }

  if (card.host_id !== user.id) {
    notFound();
  }

  const applicants = await getApplicants(params.id);
  const approvedCount = applicants.filter((applicant) => applicant.status === "approved").length;
  const pendingCount = applicants.filter((applicant) => applicant.status === "pending").length;
  const remainingSlots = Math.max(card.capacity - approvedCount, 0);
  const roomId = await getRoomId(params.id);
  const canApproveMore = card.status === "open" && remainingSlots > 0;

  return (
    <main className="min-h-dvh px-5 pb-[calc(96px+env(safe-area-inset-bottom))] pt-[calc(24px+env(safe-area-inset-top))]">
      <section className="mx-auto w-full max-w-md space-y-5">
        <BackLink label="카드로 돌아가기" fallbackHref={`/cards/${params.id}`} />

        <header className="space-y-2">
          <p className="text-sm font-semibold text-moss">신청자 검토</p>
          <h1 className="text-3xl font-bold leading-tight tracking-normal text-ink">{card.title}</h1>
          <p className="text-sm leading-6 text-ink/60">
            승인하면 Mate Room이 열리고, 정원이 차면 남은 신청은 조용히 마감됩니다.
          </p>
        </header>

        <section className="grid grid-cols-3 gap-2">
          <ApplicantMetric label="승인" value={approvedCount} />
          <ApplicantMetric label="대기" value={pendingCount} />
          <ApplicantMetric label="남은 자리" value={remainingSlots} />
        </section>

        {roomId ? (
          <Link
            href={`/rooms/${roomId}`}
            className="flex min-h-12 items-center justify-center gap-2 rounded-md mate-cta px-4 text-sm font-semibold text-white"
          >
            <DoorOpen className="h-4 w-4" aria-hidden />
            열린 Mate Room 보기
          </Link>
        ) : null}

        <section className="rounded-lg border border-line bg-white p-4 shadow-soft">
          <div className="flex items-start gap-3">
            <span className="rounded-md bg-moss/10 p-2 text-moss">
              <UsersRound className="h-4 w-4" aria-hidden />
            </span>
            <div className="space-y-1">
              <p className="text-sm font-semibold text-ink">
                최대 {card.capacity}명까지 승인할 수 있어요.
              </p>
              <p className="text-sm leading-6 text-ink/60">
                정원이 차기 전까지는 카드를 계속 열어두고 추가 신청자를 승인할 수 있습니다.
              </p>
            </div>
          </div>
        </section>

        <div className="grid gap-3">
          {applicants.length > 0 ? (
            applicants.map((applicant) => (
              <article key={applicant.id} className="space-y-4 rounded-lg border border-line bg-white p-4 shadow-soft">
                <div className="flex items-start justify-between gap-3">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <h2 className="font-semibold text-ink">{applicant.nickname}</h2>
                      {applicant.phone_verified ? (
                        <ShieldCheck className="h-4 w-4 text-moss" aria-label="휴대폰 인증 완료" />
                      ) : null}
                    </div>
                    <p className="text-xs font-medium text-ink/45">{formatStatus(applicant.status)}</p>
                  </div>
                  {applicant.status === "approved" ? (
                    <span className="inline-flex items-center gap-1 rounded-full bg-moss/10 px-2 py-1 text-xs font-semibold text-moss">
                      <BadgeCheck className="h-3.5 w-3.5" aria-hidden />
                      승인됨
                    </span>
                  ) : null}
                </div>

                <p className="rounded-md bg-paper/70 px-3 py-3 text-sm leading-6 text-ink/72">
                  {applicant.reason_text}
                </p>

                {applicant.status === "pending" ? (
                  <ApproveApplicationButton
                    cardId={params.id}
                    applicationId={applicant.id}
                    disabled={!canApproveMore}
                  />
                ) : null}
              </article>
            ))
          ) : (
            <p className="rounded-lg border border-line bg-white p-4 text-sm text-ink/60 shadow-soft">
              아직 신청자가 없습니다.
            </p>
          )}
        </div>
      </section>
      <BottomNav active="me" />
    </main>
  );
}

function ApplicantMetric({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-lg border border-line bg-white px-3 py-3 shadow-soft">
      <p className="text-xs font-semibold text-ink/45">{label}</p>
      <p className="mt-1 text-xl font-bold tracking-normal text-ink">{value}</p>
    </div>
  );
}

async function getApplicants(cardId: string): Promise<ApplicantRow[]> {
  if (!hasServiceEnv() || cardId === DEMO_CREATED_CARD_ID) {
    return getDemoApplicants();
  }

  const admin = createServiceRoleSupabaseClient();
  const { data: applications, error: applicationsError } = await admin
    .from("applications")
    .select("id, applicant_id, reason_text, status, created_at")
    .eq("card_id", cardId)
    .order("created_at", { ascending: true });

  if (applicationsError || !applications) {
    return [];
  }

  const applicantIds = applications.map((application) => application.applicant_id);
  const { data: profiles } = await admin
    .from("profiles")
    .select("id, nickname, phone_verified")
    .in("id", applicantIds);

  const profileMap = new Map((profiles ?? []).map((profile) => [profile.id, profile]));

  return applications.map((application) => {
    const profile = profileMap.get(application.applicant_id);

    return {
      id: application.id,
      applicant_id: application.applicant_id,
      nickname: profile?.nickname ?? "신청자",
      reason_text: application.reason_text,
      status: application.status,
      phone_verified: Boolean(profile?.phone_verified),
      created_at: application.created_at
    };
  });
}

async function getRoomId(cardId: string): Promise<string | null> {
  if (!hasServiceEnv() || cardId === DEMO_CREATED_CARD_ID) {
    return cardId === DEMO_CREATED_CARD_ID ? DEMO_ROOM_ID : null;
  }

  const admin = createServiceRoleSupabaseClient();
  const { data: room } = await admin
    .from("rooms")
    .select("id")
    .eq("card_id", cardId)
    .maybeSingle<{ id: string }>();

  return room?.id ?? null;
}

function formatStatus(status: ApplicantRow["status"]) {
  if (status === "approved") {
    return "승인됨";
  }

  if (status === "rejected_closed") {
    return "마감됨";
  }

  return "검토 대기";
}
