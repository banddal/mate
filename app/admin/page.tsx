import Link from "next/link";
import { ArrowLeft, ClipboardList, ShieldAlert, ShieldX, UserCog } from "lucide-react";
import { requireOnboarded } from "@/lib/auth/session";
import { createServiceRoleSupabaseClient } from "@/lib/supabase/admin";
import { hasServiceEnv } from "@/lib/env";
import {
  getDemoAdminCandidates,
  getDemoAdminUsers,
  getDemoBannedWords,
  getDemoReports,
  getDemoReviewCards
} from "@/lib/demo-data";
import { AdminActionButton } from "./AdminActionButton";
import { AdminGrantForm, AdminRevokeButton } from "./AdminUserControls";
import { BannedWordDeleteButton, BannedWordForm } from "./BannedWordControls";

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

type AdminUser = {
  user_id: string;
  nickname: string;
  granted_at: string;
};

type AdminCandidate = {
  id: string;
  nickname: string;
};

type BannedWord = {
  id: string;
  word: string;
  severity: "block" | "flag";
  category_hint: string | null;
};

export default async function AdminPage() {
  await requireOnboarded();
  const [reports, reviewCards, adminUsers, adminCandidates, bannedWords] = await Promise.all([
    getReports(),
    getReviewCards(),
    getAdminUsers(),
    getAdminCandidates(),
    getBannedWords()
  ]);

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
                <AdminActionButton action="resolve-report" targetId={report.id} />
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
              <article key={card.id} className="space-y-3 rounded-lg border border-line bg-white p-4 shadow-soft">
                <p className="text-sm font-semibold text-ink">{card.title}</p>
                <p className="mt-1 text-xs text-ink/45">{formatDateTime(card.created_at)}</p>
                <div className="grid grid-cols-2 gap-2">
                  <AdminActionButton action="approve-card" targetId={card.id} />
                  <AdminActionButton action="reject-card" targetId={card.id} />
                </div>
              </article>
            ))
          ) : (
            <p className="rounded-lg border border-line bg-white p-4 text-sm text-ink/60 shadow-soft">
              검수 대기 카드가 없습니다.
            </p>
          )}
        </section>

        <section className="space-y-3">
          <div className="flex items-center gap-2 text-sm font-semibold text-ink">
            <UserCog className="h-5 w-5 text-moss" aria-hidden />
            운영자 권한
          </div>

          <div className="space-y-3 rounded-lg border border-line bg-white p-4 shadow-soft">
            <AdminGrantForm candidates={adminCandidates} />

            <div className="space-y-2">
              {adminUsers.length > 0 ? (
                adminUsers.map((adminUser) => (
                  <div
                    key={adminUser.user_id}
                    className="grid grid-cols-[1fr_80px] items-center gap-3 rounded-md bg-warm px-3 py-3"
                  >
                    <div className="min-w-0">
                      <p className="truncate text-sm font-semibold text-ink">{adminUser.nickname}</p>
                      <p className="text-xs text-ink/45">{formatDateTime(adminUser.granted_at)}</p>
                    </div>
                    <AdminRevokeButton userId={adminUser.user_id} />
                  </div>
                ))
              ) : (
                <p className="text-sm text-ink/60">등록된 운영자가 없습니다.</p>
              )}
            </div>
          </div>
        </section>

        <section className="space-y-3">
          <div className="flex items-center gap-2 text-sm font-semibold text-ink">
            <ShieldX className="h-5 w-5 text-moss" aria-hidden />
            금지어 관리
          </div>

          <div className="space-y-3 rounded-lg border border-line bg-white p-4 shadow-soft">
            <BannedWordForm />

            <div className="space-y-2">
              {bannedWords.length > 0 ? (
                bannedWords.map((bannedWord) => (
                  <div
                    key={bannedWord.id}
                    className="grid grid-cols-[1fr_76px] items-center gap-3 rounded-md bg-warm px-3 py-3"
                  >
                    <div className="min-w-0 space-y-1">
                      <div className="flex items-center gap-2">
                        <p className="truncate text-sm font-semibold text-ink">{bannedWord.word}</p>
                        <span
                          className={
                            bannedWord.severity === "block"
                              ? "rounded-full bg-red-50 px-2 py-0.5 text-[11px] font-semibold text-red-700"
                              : "rounded-full bg-amber-50 px-2 py-0.5 text-[11px] font-semibold text-amber-700"
                          }
                        >
                          {bannedWord.severity === "block" ? "차단" : "검수"}
                        </span>
                      </div>
                      <p className="truncate text-xs text-ink/45">
                        {bannedWord.category_hint ?? "분류 없음"}
                      </p>
                    </div>
                    <BannedWordDeleteButton wordId={bannedWord.id} />
                  </div>
                ))
              ) : (
                <p className="text-sm text-ink/60">등록된 금지어가 없습니다.</p>
              )}
            </div>
          </div>
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
    return getDemoReviewCards();
  }

  const admin = createServiceRoleSupabaseClient();
  const { data: cards, error } = await admin
    .from("cards")
    .select("id, title, status, created_at")
    .eq("status", "pending_review")
    .order("created_at", { ascending: false })
    .limit(20);

  if (error || !cards) {
    return getDemoReviewCards();
  }

  return cards;
}

async function getAdminUsers(): Promise<AdminUser[]> {
  if (!hasServiceEnv()) {
    return getDemoAdminUsers();
  }

  const admin = createServiceRoleSupabaseClient();
  const { data: rows, error } = await admin
    .from("admin_users")
    .select("user_id, granted_at")
    .order("granted_at", { ascending: false })
    .limit(20);

  if (error || !rows) {
    return getDemoAdminUsers();
  }

  const userIds = rows.map((row) => row.user_id);
  const { data: profiles } = await admin.from("profiles").select("id, nickname").in("id", userIds);
  const profileMap = new Map((profiles ?? []).map((profile) => [profile.id, profile.nickname]));

  return rows.map((row) => ({
    user_id: row.user_id,
    nickname: profileMap.get(row.user_id) ?? "운영자",
    granted_at: row.granted_at
  }));
}

async function getAdminCandidates(): Promise<AdminCandidate[]> {
  if (!hasServiceEnv()) {
    return getDemoAdminCandidates();
  }

  const admin = createServiceRoleSupabaseClient();
  const { data: adminRows } = await admin.from("admin_users").select("user_id");
  const adminIds = new Set((adminRows ?? []).map((row) => row.user_id));

  const { data: profiles, error } = await admin
    .from("profiles")
    .select("id, nickname")
    .order("created_at", { ascending: false })
    .limit(30);

  if (error || !profiles) {
    return getDemoAdminCandidates();
  }

  return profiles
    .filter((profile) => !adminIds.has(profile.id))
    .slice(0, 10)
    .map((profile) => ({
      id: profile.id,
      nickname: profile.nickname
    }));
}

async function getBannedWords(): Promise<BannedWord[]> {
  if (!hasServiceEnv()) {
    return getDemoBannedWords();
  }

  const admin = createServiceRoleSupabaseClient();
  const { data: bannedWords, error } = await admin
    .from("banned_words")
    .select("id, word, severity, category_hint")
    .order("word", { ascending: true })
    .limit(50);

  if (error || !bannedWords) {
    return getDemoBannedWords();
  }

  return bannedWords.map((bannedWord) => ({
    id: bannedWord.id,
    word: bannedWord.word,
    severity: bannedWord.severity,
    category_hint: bannedWord.category_hint
  }));
}

function formatDateTime(value: string) {
  return new Intl.DateTimeFormat("ko-KR", {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit"
  }).format(new Date(value));
}
