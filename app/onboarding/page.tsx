export default function OnboardingPage() {
  return (
    <main className="min-h-dvh px-5 py-[calc(28px+env(safe-area-inset-top))]">
      <section className="mx-auto w-full max-w-md space-y-4">
        <p className="text-sm font-semibold text-moss">온보딩</p>
        <h1 className="text-3xl font-bold tracking-normal text-ink">프로필 준비가 필요해요</h1>
        <p className="leading-7 text-ink/70">
          다음 단계에서 닉네임, 연령대, 성별, 관심 카테고리와 휴대폰 인증을 연결합니다.
        </p>
      </section>
    </main>
  );
}
