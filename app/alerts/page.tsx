import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { requireOnboarded } from "@/lib/auth/session";
import { CARD_CATEGORY_OPTIONS } from "@/lib/cards/categories";
import { AlertsClient } from "./AlertsClient";

export const dynamic = "force-dynamic";

export default async function AlertsPage() {
  await requireOnboarded();
  const categories = CARD_CATEGORY_OPTIONS.filter((option) => option.level !== "L3").map(
    (option) => option.label
  );

  return (
    <main className="min-h-dvh px-5 pb-[calc(88px+env(safe-area-inset-bottom))] pt-[calc(24px+env(safe-area-inset-top))]">
      <section className="mx-auto w-full max-w-md space-y-5">
        <Link href="/feed" className="inline-flex min-h-10 items-center gap-2 text-sm font-semibold text-ink/70">
          <ArrowLeft className="h-4 w-4" aria-hidden />
          피드로 돌아가기
        </Link>

        <header className="space-y-2">
          <p className="text-sm font-semibold text-moss">Alerts</p>
          <h1 className="text-3xl font-bold leading-tight tracking-normal text-ink">내 알림</h1>
          <p className="text-sm leading-6 text-ink/60">
            신청, 승인, 후기처럼 내 활동에 필요한 알림을 먼저 보고, 관심 상황은 가볍게 저장합니다.
          </p>
        </header>

        <AlertsClient categories={categories} />
      </section>

      <BottomNav />
    </main>
  );
}

function BottomNav() {
  return (
    <nav className="fixed inset-x-0 bottom-0 border-t border-line bg-white/95 px-5 pb-[calc(10px+env(safe-area-inset-bottom))] pt-2 backdrop-blur">
      <div className="mx-auto grid max-w-md grid-cols-4 text-center text-xs font-semibold text-ink/55">
        <Link className="rounded-md px-2 py-2" href="/feed">
          피드
        </Link>
        <Link className="rounded-md px-2 py-2" href="/me">
          내 활동
        </Link>
        <Link className="rounded-md px-2 py-2 text-moss" href="/alerts">
          알림
        </Link>
        <Link className="rounded-md px-2 py-2" href="/admin">
          관리자
        </Link>
      </div>
    </nav>
  );
}
