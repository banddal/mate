# Mate Codex Handoff R41

> Date: 2026-07-07
> Round: 41
> Author: Claude (백엔드 마감 — 알림 트리거 3종)
> Theme: 알림 생성 트리거 완결 (5종 전부 연결)

## 이번 라운드에서 한 일

R39~R40에서 알림 발송 파이프라인과 구독 API를 만들었고, 이번에 **남은 알림 생성 트리거 3종**을 붙여 알림 시스템을 완결했다. 이제 `notifications` 테이블 CHECK 제약에 정의된 5개 type 전부가 실제로 생성된다.

### 완결된 알림 5종

| type | 생성 트리거 | 대상 | payload |
|---|---|---|---|
| `application_resolved` | `POST /api/cards/:id/approve`, resolve-cards cron | 승인된 신청자 | cardId, roomId, outcome |
| `card_review_resolved` | admin card approve/reject | 호스트 | cardId, outcome(approved\|rejected) |
| `subscription_match` | 카드 생성(open), admin approve | 매칭 구독자 | cardId, category (상대방 식별정보 없음) |
| `card_deadline_imminent` | resolve-cards cron | pending 신청 있는 카드 호스트 | cardId, cardTitle, pendingCount |
| `report_status_change` | admin report resolve | 신고자 | reportId, status |

### 이번에 추가된 3종 상세

1. **`report_status_change`** (`app/api/admin/reports/[id]/resolve/route.ts`)
   - 신고 종결 시 신고자에게 알림. 구체적 처분(정지 등)은 담지 않고 상태 변경만 전달.
   - **부가 안전 개선**: 이미 resolved된 신고의 재처리 방지 guard 추가(§6 — escalated/suspended_perm은 되돌릴 수 없음). status='resolved'면 400 REPORT_ALREADY_RESOLVED.

2. **`subscription_match`** (`lib/notifications/subscription-match.ts`)
   - 카드가 **open으로 공개되는 순간**(생성 시 즉시 공개 or admin 검수 통과) 매칭 구독자에게 fan-out.
   - V0.1 매칭 기준: category 완전 일치 + location 부분 일치. time_pattern은 자유텍스트라 미사용(정형화 시 추가).
   - 호스트 본인 제외, 유저당 카드 1회, payload에 상대방 식별정보 절대 미포함(§9).

3. **`card_deadline_imminent`** (`lib/notifications/deadline-imminent.ts`)
   - resolve-cards cron이 매 실행마다 **마감 1시간 이내 + pending 신청 있는** open 카드의 호스트에게 "곧 마감, 승인하세요" 알림.
   - 대상을 호스트로 정한 이유: 호스트가 승인을 방치하면 카드가 cancelled로 소멸 → 승인 재촉이 승인율↑, 가설1(실제 참석) 검증에 직결.
   - 기준값 `CARD_DEADLINE_IMMINENT_MINUTES=60` (shared/config.ts).
   - 24h+cardId dedup으로 매 cron 주기 중복 발송 방지.

## 검증
- `npm run typecheck` / `lint` / `build` 모두 통과.

## 백엔드 상태 — 알림 시스템 완결

구독 저장(`/api/push/subscribe`) → 이벤트 알림 생성(5종) → dispatch cron 발송 → 죽은 구독 정리까지 전 구간 동작. 배포 시 `CRON_SECRET` + VAPID 키만 설정하면 실동작.

## 프론트(코덱스) 담당 남은 것

- **서비스워커 + Web Push 구독 UI** (R40 계약서 참조: `/api/push/config` → subscribe)
- **PWA manifest**
- **`/alerts` 화면 + `GET/POST /api/subscriptions`** — 상황 템플릿 구독 CRUD. subscriptions 테이블은 존재하나 CRUD API 미구현. 이게 있어야 `subscription_match`가 실제로 매칭할 데이터가 쌓인다. (백엔드 API가 더 자연스러우면 다음 라운드에 Claude가 맡을 수도 있음 — 프론트/백 분담 조율 필요)
- messages Realtime 구독
- 신고 버튼 sticky, feed pull-to-refresh

## 주의 (분담 조율 포인트)

`GET/POST /api/subscriptions`(구독 생성/조회 API)는 순수 백엔드다. 프론트 `/alerts` 화면과 짝을 이루는데, API는 Claude가, 화면은 코덱스가 맡는 게 자연스럽다. 다음 세션에서 이 API를 Claude가 마저 만들지 정해주면 된다 — 만들면 subscription_match가 완전히 살아난다(현재는 구독 데이터를 넣을 경로가 없어 매칭이 항상 0건).
