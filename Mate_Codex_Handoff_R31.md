# Mate Codex Handoff R31

> 이번 라운드: 관리자 대기열에 처리 버튼과 처리 API 추가.

## 변경 사항

- `app/admin/AdminActionButton.tsx`
  - 관리자 처리 버튼 공용 컴포넌트 추가.
  - 신고 해결, 카드 공개 승인, 카드 반려를 지원한다.
- `app/admin/page.tsx`
  - 열린 신고에 `해결 처리` 버튼 추가.
  - 검수 대기 카드에 `공개 승인`, `반려` 버튼 추가.
  - 데모 검수 카드도 표시한다.
- `app/api/admin/reports/[id]/resolve/route.ts`
  - 신고를 `resolved`로 처리하는 API 추가.
- `app/api/admin/cards/[id]/approve/route.ts`
  - 검수 대기 카드를 `open`으로 승인하는 API 추가.
- `app/api/admin/cards/[id]/reject/route.ts`
  - 검수 대기 카드를 `rejected`로 반려하는 API 추가.
- `lib/demo-data.ts`
  - 데모 검수 카드 추가.

## 확인 경로

- `https://mate-161company.vercel.app/dev-login?next=/admin`

## 남은 작업

- 관리자 권한 부여/회수.
- 금지어 관리.
- 신고 동결 보존 처리.
- 관리자 액션 감사 로그.
