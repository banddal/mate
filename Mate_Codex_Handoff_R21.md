# Mate Codex Handoff R21

> 이번 라운드: 메일 인증 문제와 무관하게 앱 프로세스/디자인을 바로 검증할 수 있도록 `/dev-login`을 기본 개방.

## 배경

- 사용자는 이메일 매직링크 문제 해결이 아니라, 지금까지 만든 카드 피드/카드 생성/신청 등 후속 프로세스와 디자인을 직접 보고 싶다고 명확히 요청했다.
- R19의 `/dev-login`은 `ENABLE_DEV_AUTH_BYPASS=1`이 필요해서 Vercel 환경변수를 추가하지 않으면 다시 막히는 구조였다.
- 이번 라운드는 검증 속도를 위해 임시 개발용 우회 로그인을 기본 개방한다.

## 변경 사항

- `lib/dev-auth.ts`
  - `isDevAuthBypassEnabled()`를 기본 true로 변경.
  - 닫아야 할 때만 `DISABLE_DEV_AUTH_BYPASS=1`을 사용한다.
- `.env.example`
  - `ENABLE_DEV_AUTH_BYPASS` 대신 `DISABLE_DEV_AUTH_BYPASS=0`으로 변경.
- `app/dev-login/route.ts`
  - 실패 메시지를 Vercel Supabase 서버 환경변수 확인 쪽으로 명확화.
- `Mate_Workplan.md`
  - R21 우회 진입 기본 개방 상태 반영.

## 바로 볼 경로

- 배포: `https://mate-161company.vercel.app/dev-login`
- 로컬: `http://localhost:3000/dev-login`

## 닫는 방법

검증이 끝나면 Vercel 환경변수에 아래 값을 추가하거나 변경 후 재배포한다.

```text
DISABLE_DEV_AUTH_BYPASS=1
```

## 주의

- 이 설정은 임시 검증용이다.
- 공개 운영 전에 반드시 닫아야 한다.
- 다음 기능 개발은 인증 이슈가 아니라 승인 API와 Mate Room 흐름으로 진행한다.
