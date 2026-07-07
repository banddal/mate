# Mate Codex Handoff R42

> Date: 2026-07-07
> Round: 42
> Author: Claude (백엔드 마감 — 구독 CRUD API)
> Theme: 상황 템플릿 구독 API 완성 → subscription_match 실동작 + 백엔드 베이스 전체 완결

## 이번 라운드에서 한 일

R41에서 `subscription_match` 알림 트리거를 붙였지만, 구독을 저장할 API가 없어 매칭 대상이 항상 0건이었다. 그 마지막 조각인 **구독 CRUD API**를 완성했다. 이제 알림 시스템이 데이터까지 갖춰 완전히 살아 있다.

### 추가된 API

- **`GET /api/subscriptions`** — 내 구독 목록(최신순). 로그인+온보딩 guard.
- **`POST /api/subscriptions`** — 상황 템플릿 구독 생성.
  - body: `{ location, timePattern, category }`
  - 검증: 카테고리 유효성(`getCategoryLevel`), **L3 차단**(카드와 일관), 동일 조건 중복 방지(409), 유저당 **최대 20개** 상한
- **`DELETE /api/subscriptions/:id`** — 자기 소유 구독 삭제.

구독은 장소 × 시간패턴 × 카테고리만 받는다. 사람 구독 필드는 스키마·API 어디에도 없다(원천 차단, PRD §비확장).

## 백엔드 베이스 — 완결 상태

R38~R42로 백엔드 전 구간이 동작한다:

```
[구독 생성] POST /api/subscriptions
      │
[카드 open] 생성/검수통과 ──▶ subscription_match 알림 생성
[승인]     approve ──────────▶ application_resolved
[검수]     admin approve/reject ─▶ card_review_resolved
[마감임박] resolve-cards cron ──▶ card_deadline_imminent
[신고종결] report resolve ──────▶ report_status_change
      │
[발송] dispatch-notifications cron ──▶ Web Push ([구독저장] /api/push/subscribe)
      │                                    └─ 410 죽은 구독 자동 정리
[정리] cleanup-rooms cron ──▶ 종료 48h room messages → retention_archive
[해소] resolve-cards cron ──▶ 마감 카드 closed/cancelled
```

## 검증
- `npm run typecheck` / `lint` / `build` 모두 통과. subscriptions 2개 라우트 정상 빌드.

## 배포 전 설정 (누적 정리 — 한 번만 하면 됨)

Vercel 프로젝트 환경변수:
- `CRON_SECRET` — 랜덤 강문자열. 미설정 시 cron 전부 401.
- `NEXT_PUBLIC_VAPID_PUBLIC_KEY` / `VAPID_PRIVATE_KEY` — `npx web-push generate-vapid-keys`로 생성.
- 기존: `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`, (선택) `KAKAO_*`, `SMS_VENDOR_API_KEY`.

Supabase: migration 4종이 원격 DB에 적용됐는지 확인 필요(Claude가 대시보드 접근 불가 — 코덱스/직접 확인).

## 남은 것 — 전부 프론트(코덱스) 담당

백엔드 API는 모두 준비됐다. 아래는 화면/클라이언트 작업:

- **서비스워커 + Web Push 구독 UI** (R40 계약: `/api/push/config` → `/api/push/subscribe`)
- **PWA manifest**
- **`/alerts` 화면** — `GET/POST/DELETE /api/subscriptions` 호출하는 구독 관리 UI (API는 이번에 완성)
- **messages Realtime 구독** (Supabase Realtime)
- **신고 버튼 sticky 배치**
- **feed pull-to-refresh**
- **알림 표시** — 서비스워커에서 type별 문구 분기(R40/R41 payload 참조)

## QA(P7) — 백엔드 관점 테스트 후보

프론트 진행과 별개로, 다음 백엔드 시나리오는 테스트 가치가 높다:
- L3 카드/구독 차단, 금지어 block/flag 분기
- 정원 도달 시 미승인 일괄 rejected_closed + 카드 closed
- resolve-cards: 승인자 유무에 따른 closed vs cancelled 분기
- cron secret 검증(secret 없이 호출 시 401)
- 신고 resolved 재처리 차단
- 알림 24h dedup
