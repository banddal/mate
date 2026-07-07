# Mate — 코덱스 핸드오프 (Round 18)

> 이번 라운드: 외부 리뷰(Claude)에서 발견한 버그 2건 수정. 기능 추가 없음.
> 기준 문서: `Mate_Codex_Onboarding.md`, `Mate_MVP_PRD_v0.1.md`

## 배경

`localhost 연결 거부` 오류를 관리 중 발견해 전체 코드를 외부 리뷰했다. 결론:

- 리다이렉트 버그(R16/R17 대상) 자체는 코드상 이미 고쳐져 있었다. `tsc --noEmit`, `next build` 모두 클린 통과 확인.
- 남은 원인은 코드가 아니라 Supabase Auth 대시보드의 Redirect URL 허용 목록 문제였다. 사용자가 이번에 실제 값을 등록 완료함 — 이 라운드에서 별도 코드 조치 없음.
- 리뷰 중 별개의 버그 2건을 발견해 이번 라운드에서 고쳤다.

## 작업 결과

### 1. `app/api/auth/phone/request-otp/route.ts` — SMS 벤더 키 로직 역전 수정

- 기존 로직: `SMS_VENDOR_API_KEY`가 **없으면** devOtp 응답, **있으면** 501로 요청 자체를 실패시킴.
- 문제: 실제 SMS 발송 연동은 아직 존재하지 않는데, 이 키가 다른 목적(요금 확인, 사전 계약 등)으로 먼저 채워지는 순간 전체 로그인이 막힌다. "키가 있다"는 사실만으로 인증 플로우 전체가 깨지는 구조였음.
- 수정: 실제 벤더 연동 전까지는 **항상** devOtp를 반환. 키가 설정돼 있으면 `console.warn`으로 서버 로그에만 경고를 남기고 요청은 정상 처리.
- 실제 SMS 연동을 붙이는 라운드가 오면, 이 분기를 "벤더 API 실제 호출 → 성공 시 devOtp 생략" 구조로 교체해야 함(지금은 그 라운드가 아니므로 보류만 함).

### 2. `middleware.ts` 신규 추가 — Supabase 세션 자동 갱신

- 문제: `app/feed/page.tsx`, `app/cards/[id]/page.tsx` 등은 Server Component에서 `requireOnboarded()` → `supabase.auth.getUser()`를 호출한다. 액세스 토큰이 만료된 경우 `getUser()`가 내부적으로 세션을 갱신하는데, Server Component는 쿠키를 쓸 수 없는 위치라 갱신된 세션이 브라우저에 반영되지 않는다. 방치하면 토큰 만료 시점(기본 1시간)마다 이유를 특정하기 어려운 로그아웃 증상으로 나타날 수 있음.
- 수정: Supabase 공식 App Router 가이드의 표준 패턴대로 루트에 `middleware.ts` 추가. 모든 요청에서 `supabase.auth.getUser()`를 한 번 호출해 갱신된 세션을 응답 쿠키에 반영.
- `matcher`에서 정적 자산과 `api/config`(공개 상수라 인증 불필요)는 제외.

## 검증

- `npx tsc --noEmit` — 통과
- `npx next build` (더미 env로) — 통과, 미들웨어 번들 생성 확인(`ƒ Middleware 95.6 kB`)
- 빌드 경고 1건은 무해함: `@supabase/supabase-js`가 Edge Runtime에서 `process.version`을 참조한다는 webpack 경고 — Supabase 공식 예제에서도 동일하게 나오는 잘 알려진 컴파일 타임 경고이며 런타임 동작에는 영향 없음. 무시해도 됨.

## 주의점

- 이번 라운드는 버그 수정만 포함. 신청 승인/Mate Room/후기 흐름은 아직 이번 라운드 범위 밖(§ 다음 라운드 추천 참조).
- `middleware.ts`가 모든 요청을 가로채므로, 배포 후 `/login`, `/feed`, `/cards/new` 등 기존 플로우가 전부 그대로 동작하는지 한 번 더 확인 필요(회귀 위험은 낮지만 미들웨어는 전역 영향).
- Vercel 환경변수 확인 필요(기존과 동일):
  - `NEXT_PUBLIC_SUPABASE_URL`
  - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
  - `SUPABASE_SERVICE_ROLE_KEY`
- Supabase Auth 대시보드(Authentication → URL Configuration) 확인 필요(사용자가 이번에 등록함, 재확인만):
  - Site URL: `https://mate-161company.vercel.app`
  - Redirect URLs: `https://mate-161company.vercel.app/auth/callback`, `http://localhost:3000/auth/callback`
- Vercel Deployment Protection이 Production 도메인을 막고 있지 않은지 확인 필요(R17에서 지적된 항목, 재확인 권장).

## 다음 라운드 추천 (우선순위 순)

핵심 루프가 "신청"에서 끊겨 있음 — `rooms`/`messages`/`reviews`/`reports`/`admin_users` 테이블과 RLS는 이미 존재하지만 이를 사용하는 API 라우트가 하나도 없다. PRD의 가설 1(사람들이 상황 카드로 실제 만남에 나오는가)은 지금 상태로는 끝까지 검증 불가능. 다음 세 가지만 이번 다음 라운드의 전부여야 함:

1. `POST /api/cards/:id/approve` — 호스트가 신청자를 승인. 승인 시 `rooms` insert.
2. `GET /api/rooms/:id`, 메시지 송수신, 방 종료 처리(`status: closed`, `messages` 하드 삭제).
3. `POST /api/rooms/:id/review` — 종료 후 사실 체크 4개(참석/시간엄수/설명일치/재참여의향) 제출.

채팅 UI, 신고 처리, 관리자 패널, 알림/Cron은 위 세 가지 다음 순서. 승인 없이는 나머지가 의미 없음.
