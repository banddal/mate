import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { requireOnboarded } from "@/lib/auth/session";

type CardDetailPageProps = {
  params: {
    id: string;
  };
};

export default async function CardDetailPage({ params }: CardDetailPageProps) {
  await requireOnboarded();

  return (
    <main className="min-h-dvh px-5 pt-[calc(24px+env(safe-area-inset-top))]">
      <section className="mx-auto w-full max-w-md space-y-5">
        <Link href="/feed" className="inline-flex min-h-10 items-center gap-2 text-sm font-semibold text-ink/70">
          <ArrowLeft className="h-4 w-4" aria-hidden />
          피드로 돌아가기
        </Link>
        <div className="rounded-lg border border-line bg-white p-5 shadow-soft">
          <p className="text-sm font-semibold text-moss">카드 상세</p>
          <h1 className="mt-2 text-2xl font-bold tracking-normal text-ink">카드가 생성됐어요</h1>
          <p className="mt-3 break-all text-sm leading-7 text-ink/65">
            카드 ID: {params.id}
          </p>
          <p className="mt-3 leading-7 text-ink/70">
            다음 단계에서 상세 조회와 신청 bottom sheet를 연결합니다.
          </p>
        </div>
      </section>
    </main>
  );
}
