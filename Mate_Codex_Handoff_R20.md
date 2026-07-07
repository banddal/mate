# Mate Codex Handoff R20

> 이번 라운드: `PKCE code verifier not found in storage` 오류 대응.

## 배경

- 이메일 매직링크 클릭 후 Supabase가 `PKCE code verifier not found in storage` 오류를 반환했다.
- 이 오류는 매직링크를 요청한 브라우저와 링크를 연 브라우저/기기가 다르거나, 브라우저 저장소가 지워졌을 때 발생한다.
- 기존 `/auth/callback`은 서버 Route Handler에서 바로 `exchangeCodeForSession(code)`를 호출했다. 이 경우 verifier가 브라우저 저장소에 있을 때 서버가 접근하지 못해 실패할 수 있다.

## 변경 사항

- `app/auth/callback/route.ts`
  - `code`가 있으면 서버에서 세션 교환을 시도하지 않는다.
  - `/auth/confirm?code=...&next=...`로 넘긴다.
- `app/auth/confirm/page.tsx`
  - 클라이언트 확인 페이지 추가.
- `app/auth/confirm/AuthConfirmClient.tsx`
  - 브라우저 Supabase client로 `exchangeCodeForSession(code)`를 수행한다.
  - 실패 시 새 매직링크 요청 또는 `/dev-login`으로 후속 검증을 계속할 수 있는 링크를 보여준다.
- `app/login/LoginForm.tsx`
  - 매직링크는 요청한 브라우저에서 열어야 한다는 안내 문구로 변경.

## 사용자가 테스트할 때 지킬 것

- Chrome에서 매직링크를 요청했다면 같은 Chrome에서 이메일 링크를 열어야 한다.
- 모바일 Gmail 앱, 다른 브라우저, 시크릿 창에서 열면 PKCE verifier가 없어 실패할 수 있다.
- 이미 실패한 링크는 재사용하지 말고 새로 요청한다.

## 임시 검증 경로

- 메일 링크가 계속 막히면 `/dev-login`으로 들어가 후속 프로세스를 검증한다.
- Vercel에서는 `ENABLE_DEV_AUTH_BYPASS=1`이 있어야 한다.

## 다음 작업

- Vercel 재배포 후 새 매직링크로 `/auth/confirm` 경유가 되는지 확인.
- 인증 이슈와 별개로 다음 기능 라운드는 승인 API와 Mate Room 생성.
