# Mate Codex Handoff R27

> 이번 라운드: Mate Room 메시지, 종료, 후기 제출 루프 구현.

## 변경 사항

- `app/rooms/[id]/RoomMessagePanel.tsx`
  - Room 메시지 목록과 전송 폼 추가.
- `app/api/rooms/[id]/messages/route.ts`
  - 메시지 생성 API 추가.
  - 데모 Room은 DB 없이 성공 응답.
  - 실제 DB 모드는 `messages` insert.
- `app/rooms/[id]/CloseRoomButton.tsx`
  - Room 종료 버튼 추가.
- `app/api/rooms/[id]/close/route.ts`
  - Room 종료 API 추가.
  - 실제 DB 모드는 `rooms.status='closed'`, `closed_at` 기록, 메시지 하드 삭제.
  - 종료 후 `/rooms/:id/review`로 이동.
- `app/rooms/[id]/review/page.tsx`, `ReviewForm.tsx`
  - 후기 화면 추가.
  - 참석/정시/설명 일치/재참여/신고 여부 체크.
- `app/api/rooms/[id]/review/route.ts`
  - 후기 저장 API 추가.
- `lib/demo-data.ts`
  - 데모 메시지 추가.

## 확인 가능한 데모 흐름

1. `/dev-login`
2. `/cards/new`
3. 카드 생성
4. 신청자 보기
5. 신청자 승인
6. Room 진입
7. 메시지 전송
8. 만남 종료하고 후기 쓰기
9. 후기 제출 후 피드 이동

## 남은 작업

- 메시지 Realtime 구독.
- Room 참여자 접근 제어 강화.
- 신고 API와 관리자 처리.
- 실제 Supabase 환경에서 end-to-end 검증.
