# Mate — 코덱스 핸드오프 (Round 13)

> 이번 라운드: 메일 매직링크 confirm 후 `/auth/callback`에서 서버 오류가 나는 문제 대응.

## 증상

- 이메일은 정상 수신됨.
- 메일의 confirm 링크 클릭 후 Next 서버 오류 화면이 뜸.
- 화면 메시지: `TypeError: __webpack_modules__[moduleId] is not a function`

## 원인 후보

- 기존 `/auth/callback`이 공용 서버 Supabase client helper를 사용했다.
- 매직링크 callback은 인증 코드를 세션으로 교환한 뒤 쿠키를 redirect response에 직접 써야 안전하다.
- 개발 서버 캐시 문제와 겹치면 Next dev overlay가 webpack module 에러처럼 보일 수 있다.

## 코드 변경

- `/auth/callback`을 callback 전용 Supabase server client 구현으로 변경했다.
- `exchangeCodeForSession(code)` 성공 시 세션 쿠키를 `NextResponse.redirect(...)`에 직접 기록한다.
- 콜백 처리 실패 시 서버 오류 화면 대신 `/login?error=...`로 돌려보낸다.
- route를 `force-dynamic`으로 지정했다.

## 시연 페이지

- 로그인: `/login`
- 콜백: `/auth/callback`
- 성공 후 이동: `/onboarding`

## 테스트 방법

1. Vercel 환경변수 확인
   - `NEXT_PUBLIC_SITE_URL`
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - `SUPABASE_SERVICE_ROLE_KEY`
2. Supabase Redirect URL 확인
   - `https://mate-161company.vercel.app/auth/callback`
   - `http://localhost:3000/auth/callback`
3. Vercel redeploy
4. `/login`에서 새 매직링크 요청
5. 메일 confirm 클릭

## 참고

- 이미 발송된 링크는 이전 redirect 설정/코드를 사용할 수 있으니 반드시 새 링크로 테스트한다.
- 로컬 dev에서 같은 webpack overlay가 계속 뜨면 `.next` 캐시 삭제 후 dev server 재시작이 필요할 수 있다.
