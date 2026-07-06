# Mate Codex Handoff R16

> 이번 라운드: 배포 환경의 매직링크가 `localhost`로 열리는 문제 대응.

## 배경

- 사용자가 Vercel 배포 앱에서 이메일 매직링크를 눌렀을 때 `localhost` 접속 실패 화면이 뜨는 문제를 공유했다.
- 배포 앱에서 로그인했다면 콜백은 온라인 앱 주소로 돌아와야 한다.

## 원인 판단

- 로그인 폼은 `NEXT_PUBLIC_SITE_URL`을 우선 사용해 `emailRedirectTo`를 만든다.
- Vercel 환경변수 `NEXT_PUBLIC_SITE_URL`이 `http://localhost:3000`으로 남아 있거나, Supabase Auth 설정의 Site URL/Redirect URL이 로컬 기준이면 이메일 링크가 로컬로 생성될 수 있다.

## 변경 사항

- `app/login/LoginForm.tsx`
  - `getSiteUrl()` helper를 추가했다.
  - 브라우저가 Vercel 같은 온라인 origin에서 실행 중인데 설정값이 `localhost` 또는 `127.0.0.1`이면 현재 브라우저 origin을 우선 사용한다.
  - 로컬 개발 중에는 기존처럼 `http://localhost:3000`을 유지한다.
- `.env.example`
  - `NEXT_PUBLIC_SITE_URL`은 로컬과 운영 값이 다르다는 주석을 더 명확히 했다.

## 사용자가 확인해야 할 외부 설정

Vercel 환경변수:

- `NEXT_PUBLIC_SITE_URL=https://mate-161company.vercel.app`
- `NEXT_PUBLIC_SUPABASE_URL=https://<project-ref>.supabase.co`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY=<anon public key>`
- `SUPABASE_SERVICE_ROLE_KEY=<service_role key>`

Supabase Authentication URL 설정:

- Site URL: `https://mate-161company.vercel.app`
- Redirect URLs:
  - `https://mate-161company.vercel.app/auth/callback`
  - `http://localhost:3000/auth/callback`

## 재배포 후 테스트

1. Vercel에서 Production Redeploy를 실행한다.
2. `https://mate-161company.vercel.app/login`에 접속한다.
3. 새 이메일 매직링크를 요청한다.
4. 메일 링크가 `localhost`가 아니라 `mate-161company.vercel.app`으로 시작하는지 확인한다.

## 주의

- 이미 받은 기존 메일 링크는 예전 설정으로 만들어졌을 수 있으므로 새로 발송해야 한다.
- Supabase rate limit이 걸렸다면 잠시 기다린 뒤 재시도해야 한다.
