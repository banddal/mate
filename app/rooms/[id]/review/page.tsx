import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { ArrowLeft, CheckCircle2, ClipboardCheck, MessageCircle } from "lucide-react";
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
        <Link href="/me" className="inline-flex min-h-10 items-center gap-2 text-sm font-semibold text-ink/70">
          <ArrowLeft className="h-4 w-4" aria-hidden />
          내 활동으로 돌아가기
        </Link>

        <header className="space-y-2">
          <p className="text-sm font-semibold text-moss">후기</p>
          <h1 className="text-3xl font-bold leading-tight tracking-normal text-ink">사실 체크만 남기기</h1>
          <p className="text-sm leading-6 text-ink/60">
            별점이나 긴 평가는 받지 않습니다. 다음 매칭에 필요한 사실만 확인합니다.
          </p>
        </header>

        <section className="grid grid-cols-3 gap-2">
          <ReviewStep active icon={<ClipboardCheck className="h-4 w-4" aria-hidden />} label="확정" />
          <ReviewStep active icon={<MessageCircle className="h-4 w-4" aria-hidden />} label="조율" />
          <ReviewStep active icon={<CheckCircle2 className="h-4 w-4" aria-hidden />} label="후기" />
        </section>

        <section className="rounded-lg border border-line bg-white p-4 shadow-soft">
          <p className="text-sm font-semibold text-ink">후기는 평점이 아닙니다.</p>
          <p className="mt-1 text-sm leading-6 text-ink/60">
            만남이 실제로 진행됐는지, 설명과 맞았는지 같은 사실만 남겨 다음 카드 운영에 활용합니다.
          </p>
        </section>

        <ReviewForm roomId={params.id} />
      </section>
    </main>
  );
}

function ReviewStep({ icon, label, active }: { icon: React.ReactNode; label: string; active?: boolean }) {
  return (
    <div className={`rounded-lg border px-3 py-3 text-center shadow-soft ${active ? "border-moss bg-moss/10 text-moss" : "border-line bg-white text-ink/45"}`}>
      <div className="mx-auto flex h-8 w-8 items-center justify-center rounded-full bg-white">{icon}</div>
      <p className="mt-1 text-xs font-semibold">{label}</p>
    </div>
  );
}
