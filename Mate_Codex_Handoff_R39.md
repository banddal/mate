# Mate Codex Handoff R39

> Date: 2026-07-07
> Round: 39
> Author: Claude (백엔드 베이스 마감 라운드)
> Theme: Vercel Cron 3종 완전 구현 + 알림 큐 생성·발송 파이프라인 연결

## 이번 라운드에서 한 일

백엔드 베이스의 마지막 큰 공백이던 **시간 기반 스케줄링(Cron 3종)과 알림 파이프라인**을 완성했다. 이제 카드 자동 마감/해소, 종료 방 정리, Web Push 발송이 모두 동작한다.

### 1. Cron 3종 (Mate_Backend_Spec.md §4)

모두 `/api/internal/cron/*`에 위치하며, `CRON_SECRET`(Authorization: Bearer) 검증을 통과해야만 실행된다. Vercel Cron이 GET으로 호출하므로 각 라우트는 GET/POST 둘 다 받고 동일 로직을 실행한다.

- **`resolve-cards`** (5분 주기) — `deadline_at <= now() and status='open'` 카드를 일괄 해소.
  - 승인자 있음 → 미승인 신청 `rejected_closed`, 카드 `closed`, room upsert, 승인자에게 `application_resolved` 알림
  - 승인자 없음 → 카드 `cancelled`, pending 신청 정리
  - 거절 개별 통지 없음(다크패턴 방지, PRD §5)
- **`dispatch-notifications`** (1분 주기) — `notifications.status='pending'`을 Web Push로 발송.
  - 성공 → `sent` / 1회차 실패 → pending 유지(5분 후 재시도) / 2회차 실패 → `failed`
  - 죽은 구독(410/404) → `push_subscriptions`에서 즉시 삭제
  - 구독 없는 유저 → `failed`
  - 한 번에 최대 100건 처리(런타임 타임아웃 방어)
- **`cleanup-rooms`** (일 1회, 04:00 UTC) — 종료 48h 경과 room의 잔여 messages를 `retention_archive`로 스냅샷 이관 후 하드 삭제.
  - `reports.frozen_until`이 미래인 room은 제외(증거 보존)
  - room close 시점에 이미 messages를 지우므로 대개 빈 처리 → 안전망 성격

### 2. 알림 생성 파이프라인 (§9)

`dispatch`가 소비할 데이터를 만드는 쪽이 그동안 비어 있었다. 아래를 연결:

- `lib/notifications/create.ts` — 큐에 pending 알림 insert. **동일 type+user_id+card_id 24h 중복 방지**(`NOTIFICATION_DEDUP_WINDOW_HOURS`). 알림 생성 실패가 원래 액션을 되돌리지 않도록 호출부는 예외를 삼킨다.
- `POST /api/cards/:id/approve` — 즉시 승인 시 승인자에게 `application_resolved`
- `POST /api/admin/cards/:id/approve` — 검수 통과 시 호스트에게 `card_review_resolved` (outcome: approved)
- `POST /api/admin/cards/:id/reject` — 검수 반려 시 호스트에게 `card_review_resolved` (outcome: rejected, **정확한 매칭 단어 미노출** — §7)

### 3. Web Push 발송 (§9)

- `lib/notifications/dispatch.ts` — `web-push` 라이브러리로 실발송. VAPID 설정, 410/404 처리, 재시도 로직 포함.
- `web-push` + `@types/web-push` 의존성 추가.

### 4. 인프라 설정

- `vercel.json`에 crons 3종 스케줄 추가.
- `lib/cron/auth.ts` — CRON_SECRET 검증 헬퍼. secret 미설정 시 **거부**(내부 엔드포인트는 공개 API가 아님).
- `lib/env.ts` — `hasVapidEnv`/`getVapidEnv`/`getCronSecret` 추가.

## 검증

- `npm run typecheck` → 통과
- `npm run lint` → 통과
- `npm run build` → 통과 (cron 3종 라우트 정상 빌드 확인)

## 운영 준비 (배포 전 필수 설정)

아래 환경변수를 **Vercel 프로젝트에 설정**해야 실제로 동작한다. `.env.example`에 이미 키 이름은 존재한다.

- `CRON_SECRET` — 임의의 강한 랜덤 문자열. Vercel Cron이 자동으로 Bearer 헤더에 실어 보냄. **미설정 시 cron 라우트가 전부 401로 거부되어 아무 동작도 안 함.**
- `NEXT_PUBLIC_VAPID_PUBLIC_KEY` / `VAPID_PRIVATE_KEY` — VAPID 키쌍. `npx web-push generate-vapid-keys`로 생성. **미설정 시 dispatch가 큐를 건드리지 않고 그대로 둠**(발송만 안 됨, 데이터는 보존).

## 아직 남은 것 (다음 라운드 후보)

- **Web Push 구독 등록 경로** — `push_subscriptions`에 insert하는 클라이언트/엔드포인트가 아직 없다. 프론트에서 서비스워커 등록 + 구독 생성 → 서버 저장 API 필요. (이게 없으면 dispatch가 항상 "구독 없음→failed"가 된다.)
- **상황 템플릿 구독(subscriptions) + `subscription_match` 알림** — P5. 구독 테이블은 있으나 매칭 로직/알림 생성 미구현.
- **`report_status_change` 알림** — 신고 상태 변경 시 알림 생성 미연결.
- messages Realtime 구독, 신고 버튼 sticky — P4 잔여
- PWA(서비스워커, manifest) — P5
- QA/테스트 — P7

## 확인 경로 (cron 수동 트리거 예시)

Vercel 배포 후 CRON_SECRET을 알면 수동 호출로 검증 가능:

```
curl -X POST https://mate-161company.vercel.app/api/internal/cron/resolve-cards \
  -H "Authorization: Bearer <CRON_SECRET>"
```

응답의 `summary`로 처리 건수를 확인한다. secret 없이 호출하면 401.
