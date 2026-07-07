# Mate Codex Handoff R37

> Date: 2026-07-07
> Round: 37
> Theme: Mate Room 접근 guard와 종료 후 흐름 차단

## 이번 라운드에서 한 일

- `lib/rooms/access.ts` 공통 Room 접근 검증 헬퍼를 추가했다.
  - 방 존재 확인
  - 카드/호스트 확인
  - 승인된 신청자 확인
  - 현재 유저의 역할을 `host` 또는 `participant`로 반환
- `/rooms/[id]` 화면에 참여자 guard를 적용했다.
  - 호스트 또는 승인된 신청자만 입장 가능
  - 종료된 방은 `/rooms/[id]/review`로 이동
  - 화면에 `호스트` 또는 `확정 참여자` 배지를 표시
- `POST /api/rooms/:id/messages`에 참여자 guard를 적용했다.
  - 승인되지 않은 유저는 메시지 전송 불가
  - 종료된 방에는 메시지 전송 불가
- `POST /api/rooms/:id/close`에 참여자 guard를 적용했다.
  - 승인된 참여자/호스트만 방 종료 가능
  - 종료 시 기존처럼 메시지를 삭제하고 후기 화면으로 이동
- `/rooms/[id]/review` 화면 guard를 추가했다.
  - 비참여자는 접근 불가
  - 아직 active 상태인 방은 Room 화면으로 돌려보냄
- `POST /api/rooms/:id/review`에 참여자 guard를 적용했다.
  - 참여자만 후기 저장 가능
  - closed 상태의 방에서만 후기 저장 가능
- `Mate_Workplan.md`에 Room 접근 guard와 종료 후 접근 차단 완료를 반영했다.

## 확인 경로

- 데모 Mate Room:
  - `https://mate-161company.vercel.app/dev-login?next=/rooms/demo-room`
- 데모 후기:
  - `https://mate-161company.vercel.app/dev-login?next=/rooms/demo-room/review`

## 시연 포인트

1. Mate Room에 들어가면 역할 배지가 보인다.
2. 메시지 전송은 active Room에서만 가능하다.
3. 방 종료 후 후기 화면으로 이동한다.
4. 실제 DB 환경에서는 호스트 또는 승인된 신청자만 Room/메시지/후기에 접근할 수 있다.

## 다음 추천 작업

- 신고 버튼 sticky 배치
- Room 종료 후 재접근 시 별도 완료 안내 화면
- `/api/cards/:id/applicants` 별도 API 구현
- 신청자 완료/노쇼 이력 표시
- Realtime 메시지 구독
