# Mate Codex Handoff R36

> Date: 2026-07-07
> Round: 36
> Theme: 신청자 검토/승인 UX와 정원 기반 마감

## 이번 라운드에서 한 일

- 유저 사이드 매칭 흐름으로 전환했다.
- `/cards/[id]/applicants` 화면을 개선했다.
  - 승인 수
  - 대기 수
  - 남은 자리
  - 열린 Mate Room 이동 버튼
  - 정원 안내 문구
- 카드 상세의 호스트 CTA를 `신청자 검토하기`로 정리했다.
- `POST /api/cards/:id/approve` 로직을 정원 기반으로 바꿨다.
  - 기존: 한 명 승인하면 즉시 카드 마감
  - 변경: `capacity`까지 승인 가능
  - 정원이 차면 남은 pending 신청을 `rejected_closed`로 마감
  - 정원이 차면 카드 상태를 `closed`로 변경
  - 첫 승인부터 Mate Room은 생성/유지
- 승인 버튼은 정원이 찼을 때 비활성화되도록 했다.
- 데모 카드에서도 신청자 화면에서 Mate Room 이동 버튼을 볼 수 있게 했다.
- `Mate_Workplan.md`에 신청자 검토/승인 흐름 진행 상황을 반영했다.

## 확인 경로

- 카드 생성:
  - `https://mate-161company.vercel.app/dev-login?next=/cards/new`
- 데모 신청자 검토:
  - `https://mate-161company.vercel.app/dev-login?next=/cards/demo-created-card/applicants`
- 데모 Mate Room:
  - `https://mate-161company.vercel.app/dev-login?next=/rooms/demo-room`

## 시연 포인트

1. 호스트 카드 상세에서 `신청자 검토하기`로 이동한다.
2. 신청자 화면에서 승인/대기/남은 자리 요약을 확인한다.
3. 신청자를 승인하면 Mate Room으로 이동한다.
4. 실제 DB 카드에서는 정원이 차기 전까지 추가 승인이 가능하고, 정원이 차면 카드가 마감된다.

## 다음 추천 작업

- `/api/cards/:id/applicants` 별도 API 구현
- 신청자 완료/노쇼 이력 표시
- 경쟁 상황에서만 신규/지수 정보 노출
- Room 참여자 접근 guard 강화
- Room 종료 후 재접근 차단
