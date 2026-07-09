"use client";

import { Loader2, UserRound } from "lucide-react";
import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import { createBrowserSupabaseClient } from "@/lib/supabase/browser";
import { getCategoriesByGroup } from "@/lib/cards/categories";
import { hasCashPaymentPattern } from "@/lib/cards/cash-pattern";

const groupedCategories = getCategoriesByGroup();
const CUSTOM_CATEGORY_MAX_LENGTH = 12;

export function OnboardingForm() {
  const router = useRouter();
  const [nickname, setNickname] = useState("");
  const [ageRange, setAgeRange] = useState("20s");
  const [gender, setGender] = useState("prefer_not_to_say");
  const [categories, setCategories] = useState<string[]>([]);
  const [isCustomInputOpen, setIsCustomInputOpen] = useState(false);
  const [customCategory, setCustomCategory] = useState("");
  const [customCategoryError, setCustomCategoryError] = useState("");
  const [isSavingProfile, setIsSavingProfile] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  function toggleCategory(category: string) {
    setCategories((current) =>
      current.includes(category)
        ? current.filter((item) => item !== category)
        : [...current, category]
    );
  }

  function validateCustomCategory(value: string) {
    const trimmed = value.trim();

    if (!trimmed) {
      return "관심사를 입력해주세요.";
    }

    if (trimmed.length > CUSTOM_CATEGORY_MAX_LENGTH) {
      return `최대 ${CUSTOM_CATEGORY_MAX_LENGTH}자까지 입력할 수 있어요.`;
    }

    if (hasCashPaymentPattern(trimmed)) {
      return "사용할 수 없는 표현이 포함되어 있어요.";
    }

    return "";
  }

  async function saveProfile(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setMessage("");

    let finalCategories = categories;

    if (isCustomInputOpen && customCategory.trim()) {
      const validationError = validateCustomCategory(customCategory);

      if (validationError) {
        setCustomCategoryError(validationError);
        return;
      }

      const trimmed = customCategory.trim();

      if (!finalCategories.includes(trimmed)) {
        finalCategories = [...finalCategories, trimmed];
      }
    }

    if (finalCategories.length === 0) {
      setError("관심 카테고리를 1개 이상 선택해주세요.");
      return;
    }

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
        categories: finalCategories
      });

      if (upsertError) {
        setError("프로필을 저장하지 못했어요. 잠시 후 다시 시도해주세요.");
        return;
      }

      setMessage("프로필을 저장했어요. 메인 화면으로 이동합니다.");
      router.replace("/feed");
    } catch {
      setError("환경변수를 확인해주세요. Supabase 연결 정보가 필요합니다.");
    } finally {
      setIsSavingProfile(false);
    }
  }

  return (
    <main className="auth-shell min-h-dvh px-5 pb-[calc(24px+env(safe-area-inset-bottom))] pt-[calc(28px+env(safe-area-inset-top))]">
      <section className="mx-auto w-full max-w-md space-y-6">
        <header className="space-y-3">
          <p className="text-sm font-semibold text-moss">Onboarding</p>
          <h1 className="text-3xl font-bold leading-tight tracking-normal text-ink">
            Mate을 찾기 위한 기본 정보
          </h1>
          <p className="leading-7 text-ink/70">
            새로운 Mate를 찾기 위해 간단한 정보를 알려주세요.
          </p>
        </header>

        <form className="space-y-4 rounded-lg border border-white/30 bg-[#141423]/55 p-4 shadow-soft" onSubmit={saveProfile}>
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
              className="min-h-12 w-full rounded-md border border-line bg-white/5 px-3 text-ink outline-none placeholder:text-ink/35 focus:border-moss"
              placeholder="예: 잠실러"
            />
          </label>

          <div className="grid grid-cols-2 gap-3">
            <label className="block space-y-2">
              <span className="text-sm font-medium text-ink/80">연령대</span>
              <select
                value={ageRange}
                onChange={(event) => setAgeRange(event.target.value)}
                className="min-h-12 w-full rounded-md border border-line bg-white/5 px-3 text-ink outline-none focus:border-moss"
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
                className="min-h-12 w-full rounded-md border border-line bg-white/5 px-3 text-ink outline-none focus:border-moss"
              >
                <option value="female">여성</option>
                <option value="male">남성</option>
                <option value="prefer_not_to_say">선택 안 함</option>
              </select>
            </label>
          </div>

          <fieldset className="space-y-3">
            <legend className="text-sm font-medium text-ink/80">관심 카테고리</legend>
            {groupedCategories.map(({ group, options }) => (
              <div key={group} className="space-y-1.5">
                <p className="text-xs font-medium text-ink/50">{group}</p>
                <div className="grid grid-cols-3 gap-2">
                  {options.map((option) => {
                    const checked = categories.includes(option.label);

                    return (
                      <button
                        key={option.label}
                        type="button"
                        onClick={() => toggleCategory(option.label)}
                        className={`min-h-11 rounded-md border px-2 text-sm font-medium transition ${
                          checked
                            ? "border-moss bg-moss text-white"
                            : "border-line bg-white/5 text-ink/75"
                        }`}
                      >
                        {option.label}
                      </button>
                    );
                  })}
                </div>
              </div>
            ))}
            <button
              type="button"
              onClick={() => {
                setIsCustomInputOpen((open) => !open);
                setCustomCategoryError("");
              }}
              className={`min-h-11 w-full rounded-md border border-dashed px-3 text-sm font-medium transition ${
                isCustomInputOpen
                  ? "border-moss text-moss"
                  : "border-line text-ink/60"
              }`}
            >
              + 직접 입력
            </button>
            {isCustomInputOpen ? (
              <div className="space-y-1.5">
                <input
                  value={customCategory}
                  onChange={(event) => {
                    setCustomCategory(event.target.value);
                    setCustomCategoryError("");
                  }}
                  maxLength={CUSTOM_CATEGORY_MAX_LENGTH}
                  className="min-h-11 w-full rounded-md border border-line bg-white/5 px-3 text-sm text-ink outline-none placeholder:text-ink/35 focus:border-moss"
                  placeholder={`관심사를 입력해주세요 (최대 ${CUSTOM_CATEGORY_MAX_LENGTH}자)`}
                />
                {customCategoryError ? (
                  <p className="text-xs font-medium text-red-400">{customCategoryError}</p>
                ) : null}
              </div>
            ) : null}
          </fieldset>

          <button
            type="submit"
            disabled={isSavingProfile || (categories.length === 0 && !customCategory.trim())}
            className="flex min-h-12 w-full items-center justify-center gap-2 rounded-md bg-google px-4 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:opacity-60"
          >
            {isSavingProfile ? <Loader2 className="h-5 w-5 animate-spin" aria-hidden /> : null}
            프로필 저장하고 시작
          </button>
        </form>

        <section className="rounded-lg border border-white/20 bg-white/10 p-4 text-sm leading-6 text-ink/68 shadow-soft">
          휴대폰 인증은 실제 SMS 연동 전까지 가입 필수 단계에서 제외했습니다. 지금은 Google 로그인과
          프로필 저장만으로 주요 유저 흐름을 테스트합니다.
        </section>

        {message ? <p className="text-sm font-medium text-moss">{message}</p> : null}
        {error ? <p className="text-sm font-medium text-red-700">{error}</p> : null}
      </section>
    </main>
  );
}
