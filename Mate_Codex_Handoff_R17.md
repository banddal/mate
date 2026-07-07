# Mate Codex Handoff R17

> 이번 라운드: 매직링크 콜백 URL 혼동이 반복되지 않도록 로그인 redirect origin을 단순화.

## 배경

- 사용자가 `NEXT_PUBLIC_SITE_URL=https://mate-161company.vercel.app`로 두면 Supabase 연결이 안 된다고 보고했다.
- 실제 Supabase 연결 주소는 `NEXT_PUBLIC_SUPABASE_URL`이고, `NEXT_PUBLIC_SITE_URL`은 앱 콜백 URL을 만들 때 쓰는 보조 값이다.
- 이 이름 혼동 때문에 운영과 로컬 설정이 섞이며 매직링크가 `localhost`로 만들어지는 문제가 반복됐다.

## 변경 사항

- `app/login/LoginForm.tsx`
  - 브라우저에서 매직링크/OAuth redirect URL을 만들 때 `NEXT_PUBLIC_SITE_URL` 대신 `window.location.origin`을 우선 사용하도록 단순화했다.
  - 로컬에서 접속하면 `http://localhost:3000/auth/callback`, 배포에서 접속하면 `https://mate-161company.vercel.app/auth/callback`이 자동으로 만들어진다.
  - `NEXT_PUBLIC_SITE_URL`은 서버 렌더링 fallback으로만 남겼다.
- `.env.example`
  - `NEXT_PUBLIC_SITE_URL`은 Supabase 연결 URL이 아니며 `/auth/callback`을 넣으면 안 된다는 설명을 강화했다.

## 반드시 구분할 환경변수

- `NEXT_PUBLIC_SUPABASE_URL`
  - Supabase 연결 주소
  - 형식: `https://<project-ref>.supabase.co`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
  - Supabase anon public key
- `SUPABASE_SERVICE_ROLE_KEY`
  - 서버 전용 secret key
- `NEXT_PUBLIC_SITE_URL`
  - 앱 주소 fallback
  - 형식: `https://mate-161company.vercel.app`
  - Supabase Project URL이 아니다.

## Vercel Deployment Protection

- 현재 외부에서 `https://mate-161company.vercel.app/login`을 열면 Mate 앱이 아니라 Vercel SSO 화면으로 리다이렉트되는 것이 확인됐다.
- 이 상태에서는 앱 코드가 실행되기 전에 Vercel이 요청을 막으므로 Supabase 매직링크도 정상 검증하기 어렵다.
- Vercel Dashboard에서 해당 프로젝트 선택 후 `Settings > Deployment Protection`으로 들어가 Production 도메인이 공개 접근 가능한 설정인지 확인해야 한다.

권장 상태:

- Production 앱을 공개 테스트하려면 Production domain은 보호하지 않는다.
- Preview URL만 보호하려면 Standard Protection을 사용한다.

## Supabase Auth URL 설정

- Site URL: `https://mate-161company.vercel.app`
- Redirect URLs:
  - `https://mate-161company.vercel.app/auth/callback`
  - `http://localhost:3000/auth/callback`

## 재테스트

1. Vercel Deployment Protection에서 Production 접근 보호를 해제한다.
2. Vercel 환경변수의 `NEXT_PUBLIC_SUPABASE_URL`이 `https://<project-ref>.supabase.co`인지 확인한다.
3. Production Redeploy를 실행한다.
4. 기존 메일 링크는 폐기하고 새 매직링크를 요청한다.
