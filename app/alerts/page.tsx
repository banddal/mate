import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { requireOnboarded } from "@/lib/auth/session";
import { isAdminUser } from "@/lib/auth/admin";
import { CARD_CATEGORY_OPTIONS } from "@/lib/cards/categories";
import { BottomNav } from "@/components/BottomNav";
import { AlertsClient } from "./AlertsClient";

export const dynamic = "force-dynamic";

export default async function AlertsPage() {
  const { user } = await requireOnboarded();
  const canOpenAdmin = await isAdminUser(user.id);
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

      <BottomNav active="alerts" showAdmin={canOpenAdmin} />
    </main>
  );
}
