# Mate Codex Handoff R23

> 이번 라운드: `/dev-login`에서 Supabase 관련 준비 로직을 완전히 제거.

## 배경

- 사용자가 `/dev-login`을 눌렀는데도 `DEV_LOGIN_FAILED`가 반복됐다.
- R22에서 fallback 세션을 추가했지만, `/dev-login` route 자체가 여전히 `ensureDevAuthProfile()`을 호출하고 있어 Vercel 환경에 따라 실패 가능성이 남아 있었다.

## 변경 사항

- `app/dev-login/route.ts`
  - Supabase user/profile 생성 또는 조회를 전혀 하지 않는다.
  - 고정 fallback user id를 `mate_dev_user_id` 쿠키에 심고 바로 `/feed`로 redirect한다.
  - JSON 에러 응답 경로를 제거했다.

## 결과

- `/dev-login`은 Supabase 환경변수, service role, 메일 링크와 무관하게 동작한다.
- 후속 화면 검증은 데모 세션/데모 카드 fallback으로 진행된다.

## 바로 볼 경로

- `https://mate-161company.vercel.app/dev-login`
