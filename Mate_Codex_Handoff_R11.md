# Mate — 코덱스 핸드오프 (Round 11)

> 이번 라운드: 이메일 매직링크가 열리지 않는 문제 대응.

## 증상

- `/login`에서 이메일 매직링크를 요청한 뒤, 메일의 링크가 앱으로 정상 진입하지 않음.
- Vercel/Supabase 조합에서 흔한 원인은 Supabase Auth Redirect URL 설정 누락이다.

## 코드 변경

- 로그인 redirect URL을 브라우저 origin만 쓰지 않고 `NEXT_PUBLIC_SITE_URL`을 우선 사용하도록 수정했다.
- `/auth/callback`이 Supabase error query를 받으면 `/login?error=...`로 돌려보내게 했다.
- `/login` 화면에서 callback error 메시지를 표시하게 했다.

## 반드시 설정할 Supabase 값

Supabase Dashboard → Authentication → URL Configuration:

- Site URL
  - `https://mate-161company.vercel.app`
  - 실제 Vercel production URL 또는 커스텀 도메인으로 맞춘다.
- Redirect URLs
  - `https://mate-161company.vercel.app/auth/callback`
  - `http://localhost:3000/auth/callback`
  - Vercel preview를 쓸 경우 `https://*.vercel.app/auth/callback` 또는 해당 preview URL

Vercel Project Settings → Environment Variables:

- `NEXT_PUBLIC_SITE_URL=https://mate-161company.vercel.app`
- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY`

## 시연 페이지

- 로그인: `/login`
- 콜백: `/auth/callback`
- 로그인 성공 후: `/onboarding`

## 다음 확인

1. Vercel에 위 환경변수를 넣는다.
2. Vercel에서 redeploy한다.
3. Supabase Redirect URL에 production URL의 `/auth/callback`을 추가한다.
4. `/login`에서 새 매직링크를 요청한다.

이미 발송된 예전 매직링크는 기존 설정을 담고 있을 수 있으니 새로 요청해야 한다.
