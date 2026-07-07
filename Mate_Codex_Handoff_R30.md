# Mate Codex Handoff R30

> 이번 라운드: 관리자 페이지 진입 경로 보강.

## 배경

- 사용자가 `/admin`으로 들어가려 했지만 메인/피드로 돌아가는 것처럼 보인다고 보고했다.
- 기존 `/dev-login`은 항상 `/feed`로 이동해 관리자 페이지를 바로 확인하기 어려웠다.
- 피드 하단 네비게이션에도 관리자 진입 링크가 없었다.

## 변경 사항

- `app/dev-login/route.ts`
  - `next` query를 지원한다.
  - `/dev-login?next=/admin`으로 접속하면 개발용 쿠키를 심은 뒤 바로 `/admin`으로 이동한다.
- `app/feed/page.tsx`
  - 상단 우측에 관리자 아이콘 버튼 추가.
  - 하단 네비게이션의 `마이` 자리를 `관리자`로 변경.

## 확인 경로

- 관리자 바로 진입: `https://mate-161company.vercel.app/dev-login?next=/admin`
- 피드에서 진입: `https://mate-161company.vercel.app/dev-login` → 하단 `관리자`

## 참고

- Vercel Deployment Protection이 켜져 있으면 앱 코드보다 먼저 Vercel SSO가 개입할 수 있다.
- 그 경우 Vercel 프로젝트 설정에서 Production 보호를 꺼야 한다.
