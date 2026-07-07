# Mate Codex Handoff R24

> 이번 라운드: 신청자 검토, 승인 API, Mate Room 진입 흐름 구현.

## 배경

- 로그인/카드 확인이 가능해졌으므로 다음 핵심 공백은 "신청 후 성사"였다.
- PRD 가설 1을 검증하려면 호스트가 신청자를 승인하고 Room으로 넘어가는 루프가 필요하다.

## 변경 사항

- `app/cards/[id]/applicants/page.tsx`
  - 호스트 전용 신청자 목록 화면 추가.
  - 신청 사유, 인증 여부, 상태를 표시한다.
  - 데모 카드에서는 샘플 신청자 2명을 표시한다.
- `app/cards/[id]/applicants/ApproveApplicationButton.tsx`
  - 신청자 승인 버튼 추가.
  - 승인 성공 시 `/rooms/:id`로 이동.
- `app/api/cards/[id]/approve/route.ts`
  - 호스트 전용 승인 API 추가.
  - 실제 DB 모드에서는 선택 신청 `approved`, 나머지 pending 신청 `rejected_closed`, 카드 `closed`, `rooms` row upsert를 수행한다.
  - 데모 카드에서는 DB 없이 `demo-room`을 반환한다.
- `app/rooms/[id]/page.tsx`
  - Room 진입 확인용 화면 추가.
  - 메시지 송수신은 다음 라운드 안내 상태로 표시한다.
- `lib/demo-data.ts`
  - 데모 신청자와 `demo-room` 상수 추가.

## 지금 확인할 수 있는 흐름

1. `/dev-login`
2. `/cards/new`
3. 카드 생성
4. 생성된 데모 카드 상세
5. `신청자 보기`
6. `이 신청자 승인`
7. `/rooms/demo-room`

## 남은 작업

- 실제 메시지 송수신 API/UI
- Room 종료
- 후기 제출
- 신고 처리
