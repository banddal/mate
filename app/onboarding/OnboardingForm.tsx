"use client";

import { Check, Loader2, Phone, UserRound } from "lucide-react";
import { FormEvent, useState } from "react";
import { createBrowserSupabaseClient } from "@/lib/supabase/browser";
import { PHONE_OTP_EXPIRY_MINUTES } from "@/shared/config";

const categoryOptions = [
  "야구 직관",
  "공연",
  "전시",
  "페스티벌",
  "맛집",
  "카페",
  "러닝",
  "퇴근 후 맥주"
];

type ApiResponse<T> = {
  data: T | null;
  error: { code: string; message: string } | null;
};

export function OnboardingForm() {
  const [nickname, setNickname] = useState("");
  const [ageRange, setAgeRange] = useState("20s");
  const [gender, setGender] = useState("prefer_not_to_say");
  const [categories, setCategories] = useState<string[]>(["야구 직관"]);
  const [phoneNumber, setPhoneNumber] = useState("");
  const [otp, setOtp] = useState("");
  const [devOtp, setDevOtp] = useState("");
  const [isSavingProfile, setIsSavingProfile] = useState(false);
  const [isRequestingOtp, setIsRequestingOtp] = useState(false);
  const [isVerifyingOtp, setIsVerifyingOtp] = useState(false);
  const [profileSaved, setProfileSaved] = useState(false);
  const [phoneVerified, setPhoneVerified] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  function toggleCategory(category: string) {
    setCategories((current) =>
      current.includes(category)
        ? current.filter((item) => item !== category)
        : [...current, category]
    );
  }

  async function saveProfile(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setMessage("");
    setIsSavingProfile(true);

    try {
      const supabase = createBrowserSupabaseClient();
      const {
        data: { user },
        error: userError
      } = await supabase.auth.getUser();

      if (userError || !user) {
        setError("로그인 세션을 찾지 못했어요. 다시 로그인해주세요.");
        return;
      }

      const { error: upsertError } = await supabase.from("profiles").upsert({
        id: user.id,
        nickname,
        age_range: ageRange,
        gender,
        categories
      });

      if (upsertError) {
        setError("프로필을 저장하지 못했어요. 잠시 후 다시 시도해주세요.");
        return;
      }

      setProfileSaved(true);
      setMessage("프로필을 저장했어요. 이제 휴대폰 인증을 진행해주세요.");
    } catch {
      setError("환경변수를 확인해주세요. Supabase 연결 정보가 필요합니다.");
    } finally {
      setIsSavingProfile(false);
    }
  }

  async function requestOtp() {
    setError("");
    setMessage("");
    setDevOtp("");
    setIsRequestingOtp(true);

    try {
      const response = await fetch("/api/auth/phone/request-otp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phoneNumber })
      });
      const payload = (await response.json()) as ApiResponse<{
        devOtp?: string;
        expiresInMinutes: number;
      }>;

      if (!response.ok || payload.error) {
        setError(payload.error?.message ?? "인증번호를 요청하지 못했어요.");
        return;
      }

      if (payload.data?.devOtp) {
        setDevOtp(payload.data.devOtp);
        setOtp(payload.data.devOtp);
      }

      setMessage(`${PHONE_OTP_EXPIRY_MINUTES}분 안에 인증번호를 입력해주세요.`);
    } catch {
      setError("인증번호 요청 중 문제가 생겼어요.");
    } finally {
      setIsRequestingOtp(false);
    }
  }

  async function verifyPhone() {
    setError("");
    setMessage("");
    setIsVerifyingOtp(true);

    try {
      const response = await fetch("/api/auth/phone/verify-otp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phoneNumber, otp })
      });
      const payload = (await response.json()) as ApiResponse<{ phoneVerified: boolean }>;

      if (!response.ok || payload.error) {
        setError(payload.error?.message ?? "인증번호를 확인하지 못했어요.");
        return;
      }

      setPhoneVerified(true);
      setMessage("휴대폰 인증이 완료됐어요.");
    } catch {
      setError("인증번호 확인 중 문제가 생겼어요.");
    } finally {
      setIsVerifyingOtp(false);
    }
  }

  return (
    <main className="min-h-dvh px-5 pb-[calc(24px+env(safe-area-inset-bottom))] pt-[calc(28px+env(safe-area-inset-top))]">
      <section className="mx-auto w-full max-w-md space-y-6">
        <header className="space-y-3">
          <p className="text-sm font-semibold text-moss">온보딩</p>
          <h1 className="text-3xl font-bold leading-tight tracking-normal text-ink">
            오늘의 mate를 위한 기본 정보
          </h1>
          <p className="leading-7 text-ink/70">
            프로필은 사람을 둘러보는 용도가 아니라 약속 이행과 안전한 신청 흐름에만 씁니다.
          </p>
        </header>

        <form className="space-y-4 rounded-lg border border-line bg-white p-4 shadow-soft" onSubmit={saveProfile}>
          <div className="flex items-center gap-2 text-sm font-semibold text-ink">
            <UserRound className="h-5 w-5 text-moss" aria-hidden />
            프로필
          </div>

          <label className="block space-y-2">
            <span className="text-sm font-medium text-ink/80">닉네임</span>
            <input
              value={nickname}
              onChange={(event) => setNickname(event.target.value)}
              required
              maxLength={16}
              className="min-h-12 w-full rounded-md border border-line bg-paper/60 px-3 outline-none focus:border-moss"
              placeholder="예: 잠실러"
            />
          </label>

          <div className="grid grid-cols-2 gap-3">
            <label className="block space-y-2">
              <span className="text-sm font-medium text-ink/80">연령대</span>
              <select
                value={ageRange}
                onChange={(event) => setAgeRange(event.target.value)}
                className="min-h-12 w-full rounded-md border border-line bg-paper/60 px-3 outline-none focus:border-moss"
              >
                <option value="20s">20대</option>
                <option value="30s">30대</option>
                <option value="40s">40대</option>
                <option value="50_plus">50대 이상</option>
              </select>
            </label>

            <label className="block space-y-2">
              <span className="text-sm font-medium text-ink/80">성별</span>
              <select
                value={gender}
                onChange={(event) => setGender(event.target.value)}
                className="min-h-12 w-full rounded-md border border-line bg-paper/60 px-3 outline-none focus:border-moss"
              >
                <option value="female">여성</option>
                <option value="male">남성</option>
                <option value="prefer_not_to_say">선택 안 함</option>
              </select>
            </label>
          </div>

          <fieldset className="space-y-2">
            <legend className="text-sm font-medium text-ink/80">관심 카테고리</legend>
            <div className="grid grid-cols-2 gap-2">
              {categoryOptions.map((category) => {
                const checked = categories.includes(category);

                return (
                  <button
                    key={category}
                    type="button"
                    onClick={() => toggleCategory(category)}
                    className={`min-h-11 rounded-md border px-3 text-sm font-medium transition ${
                      checked
                        ? "border-moss bg-moss text-white"
                        : "border-line bg-paper/60 text-ink/75"
                    }`}
                  >
                    {category}
                  </button>
                );
              })}
            </div>
          </fieldset>

          <button
            type="submit"
            disabled={isSavingProfile || categories.length === 0}
            className="flex min-h-12 w-full items-center justify-center gap-2 rounded-md bg-ink px-4 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:opacity-60"
          >
            {isSavingProfile ? <Loader2 className="h-5 w-5 animate-spin" aria-hidden /> : null}
            프로필 저장
          </button>
        </form>

        <section className="space-y-4 rounded-lg border border-line bg-white p-4 shadow-soft">
          <div className="flex items-center gap-2 text-sm font-semibold text-ink">
            <Phone className="h-5 w-5 text-moss" aria-hidden />
            휴대폰 인증
          </div>

          <label className="block space-y-2">
            <span className="text-sm font-medium text-ink/80">휴대폰 번호</span>
            <input
              value={phoneNumber}
              onChange={(event) => setPhoneNumber(event.target.value)}
              inputMode="tel"
              className="min-h-12 w-full rounded-md border border-line bg-paper/60 px-3 outline-none focus:border-moss"
              placeholder="01012345678"
            />
          </label>

          <button
            type="button"
            onClick={requestOtp}
            disabled={!profileSaved || isRequestingOtp || phoneNumber.length < 8}
            className="flex min-h-12 w-full items-center justify-center gap-2 rounded-md border border-ink px-4 text-sm font-semibold text-ink disabled:cursor-not-allowed disabled:opacity-50"
          >
            {isRequestingOtp ? <Loader2 className="h-5 w-5 animate-spin" aria-hidden /> : null}
            인증번호 받기
          </button>

          {devOtp ? (
            <div className="rounded-md border border-sun/50 bg-sun/10 px-3 py-2 text-sm text-ink">
              개발용 인증번호: <strong>{devOtp}</strong>
            </div>
          ) : null}

          <label className="block space-y-2">
            <span className="text-sm font-medium text-ink/80">인증번호</span>
            <input
              value={otp}
              onChange={(event) => setOtp(event.target.value)}
              inputMode="numeric"
              maxLength={6}
              className="min-h-12 w-full rounded-md border border-line bg-paper/60 px-3 outline-none focus:border-moss"
              placeholder="6자리"
            />
          </label>

          <button
            type="button"
            onClick={verifyPhone}
            disabled={isVerifyingOtp || otp.length !== 6 || phoneVerified}
            className="flex min-h-12 w-full items-center justify-center gap-2 rounded-md bg-moss px-4 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:opacity-60"
          >
            {phoneVerified ? <Check className="h-5 w-5" aria-hidden /> : null}
            {isVerifyingOtp ? <Loader2 className="h-5 w-5 animate-spin" aria-hidden /> : null}
            {phoneVerified ? "인증 완료" : "인증 확인"}
          </button>
        </section>

        {message ? <p className="text-sm font-medium text-moss">{message}</p> : null}
        {error ? <p className="text-sm font-medium text-red-700">{error}</p> : null}
      </section>
    </main>
  );
}
