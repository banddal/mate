import Link from "next/link";
import { ArrowLeft, ClipboardList, ShieldAlert } from "lucide-react";
import { requireOnboarded } from "@/lib/auth/session";
import { createServiceRoleSupabaseClient } from "@/lib/supabase/admin";
import { hasServiceEnv } from "@/lib/env";
import { getDemoReports } from "@/lib/demo-data";

type AdminReport = {
  id: string;
  reporter_name: string;
  reason: string;
  status: "open" | "reviewing" | "resolved";
  created_at: string;
};

type ReviewCard = {
  id: string;
  title: string;
  status: string;
  created_at: string;
};

export default async function AdminPage() {
  await requireOnboarded();
  const [reports, reviewCards] = await Promise.all([getReports(), getReviewCards()]);

  return (
    <main className="min-h-dvh px-5 pb-8 pt-[calc(24px+env(safe-area-inset-top))]">
      <section className="mx-auto w-full max-w-md space-y-5">
        <Link href="/feed" className="inline-flex min-h-10 items-center gap-2 text-sm font-semibold text-ink/70">
          <ArrowLeft className="h-4 w-4" aria-hidden />
          피드로 돌아가기
        </Link>

        <header className="space-y-2">
          <p className="text-sm font-semibold text-moss">Admin</p>
          <h1 className="text-3xl font-bold leading-tight tracking-normal text-ink">운영 대기열</h1>
          <p className="text-sm leading-6 text-ink/60">
            V0.1 운영에 필요한 신고와 검수 대기 카드만 먼저 모았습니다.
          </p>
        </header>

        <section className="space-y-3">
          <div className="flex items-center gap-2 text-sm font-semibold text-ink">
            <ShieldAlert className="h-5 w-5 text-moss" aria-hidden />
            열린 신고
          </div>
          {reports.length > 0 ? (
            reports.map((report) => (
              <article key={report.id} className="space-y-2 rounded-lg border border-line bg-white p-4 shadow-soft">
                <div className="flex items-center justify-between gap-3">
                  <p className="text-sm font-semibold text-ink">{report.reporter_name}</p>
                  <span className="rounded-full bg-red-50 px-2 py-1 text-xs font-semibold text-red-700">
                    {report.status}
                  </span>
                </div>
                <p className="text-sm leading-6 text-ink/70">{report.reason}</p>
                <p className="text-xs text-ink/40">{formatDateTime(report.created_at)}</p>
              </article>
            ))
          ) : (
            <p className="rounded-lg border border-line bg-white p-4 text-sm text-ink/60 shadow-soft">
              열린 신고가 없습니다.
            </p>
          )}
        </section>

        <section className="space-y-3">
          <div className="flex items-center gap-2 text-sm font-semibold text-ink">
            <ClipboardList className="h-5 w-5 text-moss" aria-hidden />
            검수 대기 카드
          </div>
          {reviewCards.length > 0 ? (
            reviewCards.map((card) => (
              <article key={card.id} className="rounded-lg border border-line bg-white p-4 shadow-soft">
                <p className="text-sm font-semibold text-ink">{card.title}</p>
                <p className="mt-1 text-xs text-ink/45">{formatDateTime(card.created_at)}</p>
              </article>
            ))
          ) : (
            <p className="rounded-lg border border-line bg-white p-4 text-sm text-ink/60 shadow-soft">
              검수 대기 카드가 없습니다.
            </p>
          )}
        </section>
      </section>
    </main>
  );
}

async function getReports(): Promise<AdminReport[]> {
  if (!hasServiceEnv()) {
    return getDemoReports();
  }

  const admin = createServiceRoleSupabaseClient();
  const { data: reports, error } = await admin
    .from("reports")
    .select("id, reporter_id, reason, status, created_at")
    .neq("status", "resolved")
    .order("created_at", { ascending: false })
    .limit(20);

  if (error || !reports) {
    return getDemoReports();
  }

  const reporterIds = reports.map((report) => report.reporter_id);
  const { data: profiles } = await admin
    .from("profiles")
    .select("id, nickname")
    .in("id", reporterIds);
  const profileMap = new Map((profiles ?? []).map((profile) => [profile.id, profile.nickname]));

  return reports.map((report) => ({
    id: report.id,
    reporter_name: profileMap.get(report.reporter_id) ?? "신고자",
    reason: report.reason,
    status: report.status,
    created_at: report.created_at
  }));
}

async function getReviewCards(): Promise<ReviewCard[]> {
  if (!hasServiceEnv()) {
    return [];
  }

  const admin = createServiceRoleSupabaseClient();
  const { data: cards, error } = await admin
    .from("cards")
    .select("id, title, status, created_at")
    .eq("status", "pending_review")
    .order("created_at", { ascending: false })
    .limit(20);

  if (error || !cards) {
    return [];
  }

  return cards;
}

function formatDateTime(value: string) {
  return new Intl.DateTimeFormat("ko-KR", {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit"
  }).format(new Date(value));
}
