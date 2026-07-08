# Mate Codex Handoff R62

## 작업 요약

- 관리자 권한의 치명적인 구멍을 MVP 수준에서 막았다.
  - `lib/auth/admin.ts` 추가
  - `requireAdmin()`, `isAdminUser()`, `getVerifiedAdmin()` 공통화
  - `/admin` 페이지에 관리자 가드 적용
  - `/api/admin/cards/:id/approve`, `/reject`, `/reports/:id/resolve`에 누락됐던 admin 검증 적용
  - `admins`, `banned-words` API의 중복 admin 검증 함수 제거
- 관리자 링크 노출을 권한 기준으로 맞췄다.
  - 피드 상단 관리자 버튼은 admin일 때만 표시
  - 하단 네비게이션의 관리자 탭도 admin일 때만 표시
- 디자인 토큰 1차 적용.
  - 다크 배경 `#141a30`
  - Twilight Drift 인증 배경 클래스 추가
  - primary CTA 보정 `#b23b3b`
  - Google/온보딩 버튼 `#00009c`
  - 다크 패널/테두리/그림자 토큰 적용
  - Space Grotesk / Quicksand font 연결
- 로그인/온보딩 화면 1차 리디자인.

## 확인 경로

- 로그인: `/login`
- 온보딩: `/onboarding`
- 피드: `/feed`
- 관리자: `/admin`

## 다음 작업 후보

- dev-login을 운영에서 opt-in 방식으로 뒤집기.
- `phone_verified`를 온보딩 필수 조건에서 제외할지 정책 확정.
- 피드, 카드 상세, 내 활동, 알림의 카드/빈 상태 컴포넌트를 다크 토큰 기준으로 세부 정리.
- 디자인 노트는 참조안이고, 현재 Mate 시스템 구조를 우선한다.
