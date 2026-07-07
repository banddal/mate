# Mate Codex Handoff R29

> 이번 라운드: 신고 접수와 최소 관리자 대기열 구현.

## 변경 사항

- `app/rooms/[id]/ReportRoomForm.tsx`
  - Room 안에서 신고 사유를 제출하는 폼 추가.
- `app/api/reports/route.ts`
  - 신고 생성 API 추가.
  - 데모 Room은 DB 없이 접수 성공.
  - 실제 DB 모드는 `reports` row insert.
- `app/admin/page.tsx`
  - 운영 대기열 화면 추가.
  - 열린 신고 목록과 검수 대기 카드 목록을 표시.
  - 데모 모드는 샘플 신고 표시.
- `lib/demo-data.ts`
  - 데모 신고 데이터 추가.

## 확인 경로

- Room: `/rooms/demo-room`
- Admin: `/admin`

## 남은 작업

- `POST /api/admin/reports/:id/resolve`
- 카드 검수 승인/거절 API
- 관리자 권한 부여/회수
- 신고 동결 보존 처리
