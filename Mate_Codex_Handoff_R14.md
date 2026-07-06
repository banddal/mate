# Mate — 코덱스 핸드오프 (Round 14)

> 이번 라운드: 로컬 Next dev 서버 캐시 오류 및 매직링크 root redirect 대응.

## 증상

- 로컬 dev 화면에서 서버 오류:
  - `Cannot find module './682.js'`
  - `.next/server/webpack-runtime.js` require stack
- dev 서버 로그에서 매직링크가 `/auth/callback`이 아니라 `/?code=...`로 들어오는 것이 확인됨.

## 조치

- 로컬 generated cache `.next`를 삭제하고 새로 빌드했다.
- 오래된 Next dev 서버 프로세스(PID 21228)를 종료했다.
- 새 dev 서버를 시작했고 `/login` 200 응답을 확인했다.
- `/` 페이지가 `code`, `error`, `error_description` query를 받으면 `/auth/callback`으로 전달하도록 수정했다.

## 시연 페이지

- 로컬 로그인: `http://localhost:3000/login`
- root로 들어오는 매직링크 fallback: `http://localhost:3000/?code=...`
- 콜백: `http://localhost:3000/auth/callback?code=...`

## 참고

- Supabase Redirect URL은 여전히 `/auth/callback`으로 맞추는 것이 정석이다.
- 다만 Supabase Site URL 또는 오래된 메일 링크가 root로 code를 보내도 이제 앱이 콜백으로 넘긴다.
- `.next`는 generated cache라 git에 포함하지 않는다.

## 다음 확인

1. dev 서버 재시작 후 `/login` 접속
2. 새 매직링크 요청
3. 메일 confirm 클릭
4. `/onboarding`으로 이동하는지 확인
