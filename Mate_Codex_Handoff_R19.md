# Mate Codex Handoff R19

> 이번 라운드: 메일 매직링크 오류가 반복되는 동안 후속 프로세스를 검증할 수 있는 임시 개발용 진입로 추가.

## 배경

- 이메일 매직링크 오류가 계속되어 카드 생성 이후 흐름을 검증하지 못하는 상태였다.
- Google OAuth 연동은 Supabase provider 설정과 외부 콘솔 설정이 필요하므로 즉시 검증용으로는 개발용 우회 진입이 더 빠르다.
- 단, 운영에서 무조건 열리면 위험하므로 기본은 닫고 명시적으로 켤 때만 동작하게 했다.

## 변경 사항

- `lib/dev-auth.ts`
  - 개발용 인증 우회 helper 추가.
  - 로컬 개발(`NODE_ENV=development`)에서는 자동 허용.
  - 배포/운영에서는 `ENABLE_DEV_AUTH_BYPASS=1`일 때만 허용.
  - 서비스 롤로 `dev-mate@local.test` auth user와 완성된 `profiles` row를 보장한다.
- `app/dev-login/route.ts`
  - 개발용 계정/프로필을 준비하고 `mate_dev_user_id` httpOnly cookie를 심은 뒤 `/feed`로 이동한다.
- `app/dev-logout/route.ts`
  - 개발용 쿠키를 제거하고 `/login`으로 이동한다.
- `lib/auth/session.ts`
  - 기존 Supabase 세션보다 먼저 개발용 쿠키를 확인한다.
  - 쿠키가 유효하면 `requireOnboarded()`가 통과한다.
- `app/login/page.tsx`, `app/login/LoginForm.tsx`
  - 개발용 우회가 켜진 경우 로그인 화면에 `개발용 계정으로 바로 들어가기` 버튼을 노출한다.
- `.env.example`
  - `ENABLE_DEV_AUTH_BYPASS=0` 추가.

## 사용법

로컬 개발:

1. `npm install`
2. `.env.local`에 Supabase 환경변수 설정
3. `npm run dev:clean`
4. `http://localhost:3000/dev-login` 접속

Vercel 임시 검증:

1. Vercel 환경변수에 `ENABLE_DEV_AUTH_BYPASS=1` 추가
2. Production redeploy
3. `https://mate-161company.vercel.app/dev-login` 접속
4. 검증 후 반드시 `ENABLE_DEV_AUTH_BYPASS`를 제거하거나 `0`으로 되돌리고 redeploy

## 주의

- 이 기능은 메일 링크 장애 중 후속 프로세스 검증을 위한 임시 장치다.
- 운영 공개 상태로 오래 켜두면 안 된다.
- 실제 로그인 문제는 Supabase Auth URL 설정, SMTP/rate limit, Vercel Deployment Protection 확인으로 별도 해결해야 한다.

## 다음 작업

- `POST /api/cards/:id/approve`
- 승인 시 `rooms` 생성
- `/rooms/:id` 조회/메시지/종료/후기 루프 구현
