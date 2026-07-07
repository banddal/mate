import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { requireOnboarded } from "@/lib/auth/session";
import { hasServiceEnv } from "@/lib/env";
import { DEMO_ROOM_ID } from "@/lib/demo-data";
import { getRoomAccess } from "@/lib/rooms/access";
import { ReviewForm } from "./ReviewForm";

type ReviewPageProps = {
  params: {
    id: string;
  };
};

export default async function ReviewPage({ params }: ReviewPageProps) {
  const { user } = await requireOnboarded();

  if (hasServiceEnv() && params.id !== DEMO_ROOM_ID) {
    const room = await getRoomAccess(params.id, user.id);

    if (!room) {
      notFound();
    }

    if (room.status === "active") {
      redirect(`/rooms/${room.id}`);
    }
  }

  return (
    <main className="min-h-dvh px-5 pb-8 pt-[calc(24px+env(safe-area-inset-top))]">
      <section className="mx-auto w-full max-w-md space-y-5">
        <Link href="/feed" className="inline-flex min-h-10 items-center gap-2 text-sm font-semibold text-ink/70">
          <ArrowLeft className="h-4 w-4" aria-hidden />
          피드로 돌아가기
        </Link>

        <header className="space-y-2">
          <p className="text-sm font-semibold text-moss">후기</p>
          <h1 className="text-3xl font-bold leading-tight tracking-normal text-ink">사실 체크만 남기기</h1>
          <p className="text-sm leading-6 text-ink/60">
            별점이나 긴 평가는 받지 않습니다. 다음 매칭에 필요한 사실만 확인합니다.
          </p>
        </header>

        <ReviewForm roomId={params.id} />
      </section>
    </main>
  );
}
