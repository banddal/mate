# Mate Codex Handoff R38

> Date: 2026-07-07
> Round: 38
> Author: Claude (전체 코드 리뷰 + 안전 픽스 라운드)
> Theme: 코드베이스 건강 점검, 문서-코드 정합성 회복, 신청/후기 중복 처리 강화

## 이번 라운드의 성격

이번 라운드는 신규 기능 개발이 아니라 **Claude가 전체 코드베이스를 리뷰하고, 로직 충돌 없는 안전한 픽스만 적용**한 점검 라운드다. 코덱스가 이어받아 다음 기능(Realtime, cron 등)을 진행할 수 있도록 현재 상태를 정확히 정리했다.

## 1. 코드베이스 건강 점검 결과

전체 검사 통과. 배포 관문에 문제 없음.

- `npm run typecheck` → 통과 (에러 0)
- `npm run lint` → 통과 (경고/에러 0)
- `npm run build` → 통과 (13개 라우트 정상 빌드)

리뷰 결과 신청→승인→Room→후기의 핵심 흐름 로직은 견고하다. 온보딩 guard, 호스트 자기신청 차단, 마감 검증, 정원 검증(카드 상태 전환 방식), Room 생성, 참여자 접근 guard(R37)가 모두 정상 동작한다.

## 2. 이번 라운드에서 적용한 픽스

### 2-1. 후기 중복 제출 처리 (`app/api/rooms/[id]/review/route.ts`)

- `reviews` 테이블에는 이미 `unique (room_id, user_id)` 제약이 있으나, 위반 시 무조건 500 `REVIEW_CREATE_FAILED`로 뭉뚱그려 반환하고 있었다.
- Postgres unique 위반 코드 `23505`를 감지해 **409 `REVIEW_ALREADY_SUBMITTED` "이미 후기를 남겼어요."** 로 명확히 응답하도록 수정.
- 프론트(`ReviewForm.tsx`)는 이미 `payload.error.message`를 그대로 노출하므로 별도 UI 수정 없이 사용자 안내가 개선된다.

### 2-2. 동시 신청 race 처리 (`app/api/cards/[id]/apply/route.ts`)

- 기존에는 `existingApplication` 선제 조회로만 중복을 막아, 동시 요청 시 둘 다 통과 후 insert 단계에서 unique 위반이 날 수 있었다.
- `applications`의 `unique (card_id, applicant_id)` 위반(`23505`)을 감지해 **409 `ALREADY_APPLIED` "이미 신청한 카드입니다."** 로 폴백 처리하도록 수정.

> 두 픽스 모두 기존 로직 흐름을 바꾸지 않고 에러 처리 경로만 견고하게 만든 것이라, 코덱스가 진행 중인 다른 작업과 충돌하지 않는다.

## 3. 문서-코드 정합성 회복 (`Mate_Workplan.md`)

리뷰 중 Workplan이 실제 코드보다 뒤처져 있음을 확인하고 아래 항목을 실제 상태에 맞게 갱신했다. **코드를 문서에 맞춘 게 아니라, 문서를 코드에 맞췄다.**

- `POST /api/cards/:id/apply` 정원 검증: `[ ]` → `[x]`
  - 정원 도달 시 approve 라우트가 카드를 `closed`로 전환하고, apply는 `status='open'`만 허용하므로 정원 초과 신청이 차단됨. approve 라우트가 소스오브트루스.
- `/cards/[id]/applicants` 페이지: `[ ]` → `[x]`
  - 실제로 완전히 구현되어 있음(호스트 전용 guard, 신청 사유·인증 여부, 승인/대기/남은자리 요약, Room 이동).
- `GET /api/cards/:id/applicants` 별도 API: 서버 컴포넌트가 service role로 직접 조회하는 방식으로 동일 목적을 이미 달성. 별도 REST 엔드포인트는 아키텍처상 불필요.
- `POST /api/cards/:id/resolve` 별도 API: 미승인 신청 일괄 `rejected_closed` + 카드 마감 + Room 생성이 **approve 라우트에 통합**되어 있음. 별도 엔드포인트 불필요.
- 신청 API 온보딩 guard: `[ ]` → `[x]` (apply·approve 라우트에 `isProfileComplete` 체크 존재)

## 4. 리뷰 중 발견한 확인 필요 항목 (판단 유보, 미수정)

로직 판단이 필요해 임의로 바꾸지 않고 남긴다. 코덱스/기획 확인 요망.

1. **방 종료 권한 범위** — `POST /api/rooms/:id/close`는 `getRoomAccess`를 통과하는 호스트/참여자 **누구나** 방을 종료할 수 있다. 소멸 UX상 종료를 호스트 전용으로 제한할지, 현재처럼 참여자도 가능하게 둘지 결정 필요.
2. **approve 정원 카운트의 원자성** — `approvedCount` 조회 후 update 사이에 동시 승인이 들어오면 이론상 정원 초과 가능. 시딩 규모에선 발생 확률이 낮으나, 규모 확대 시 DB 함수/트랜잭션으로 원자화 검토 필요.

## 5. 여전히 미착수인 실제 공백 (문서 정확, 다음 작업 후보)

- **P5 전체**: 알림 시스템, 상황 템플릿 구독, Web Push/PWA — 미착수
- **P6 Cron**: `resolve-cards` / `dispatch-notifications` / `cleanup-rooms` 엔드포인트, `vercel.json` cron 설정, Cron secret 검증 — 미착수 (vercel.json 자체는 존재하나 cron 섹션 없음)
- **P4 잔여**: messages Realtime 구독, 신고 버튼 sticky 배치 — 미착수
- **P7 전체**: QA/테스트 — 미착수
- 실제 SMS 벤더 발송 연동, DB 타입 생성 절차 문서화, Prettier 설정 — 미착수

## 6. 다음 추천 작업 (우선순위 순)

1. **P6 Cron 3종 + vercel.json cron 설정** — 카드 자동 마감/해소, 종료 방 정리(소멸 UX의 백엔드 축). 승인자 확정 알림도 여기에 의존.
2. **messages Realtime 구독** — 실제 만남 직전 소통 품질 직결.
3. **방 종료 권한 범위 결정** (§4-1) 후 반영.
4. **P5 알림/구독/PWA** — 재방문(가설 2) 검증용.

## 확인 경로

- 데모 신청자 화면: `https://mate-161company.vercel.app/dev-login?next=/cards/demo-created/applicants`
- 데모 Mate Room: `https://mate-161company.vercel.app/dev-login?next=/rooms/demo-room`
- 데모 후기: `https://mate-161company.vercel.app/dev-login?next=/rooms/demo-room/review`
