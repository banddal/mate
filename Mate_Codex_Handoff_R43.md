## R43 — 백엔드 QA 테스트 + CI (Claude)

> Date: 2026-07-07 · Round: 43 · Theme: Vitest 단위테스트 도입 + GitHub Actions CI

### 한 일

배포 전 회귀 방지를 위해 백엔드 핵심 로직에 단위테스트를 붙이고, 매 푸시마다 자동 검증되도록 CI를 추가했다.

**테스트 러너**: Vitest (Next/TS/ESM 스택에 가장 가벼움). `npm run test`(1회), `npm run test:watch`.

**테스트 커버리지 (34 tests, 6 files)**
- `cash-pattern.test.ts` — 현금성 패턴 판정. 스펙 §7 핵심 케이스("5만원 드립니다"처럼 키워드 없이 금액+지급의사만) 포함, 오탐 방지(더치페이 비용 안내는 통과) 검증.
- `categories.test.ts` — 카테고리 레벨 판정, **L3가 옵션에 노출되지 않음** 검증.
- `cron-auth.test.ts` — CRON_SECRET 검증. 오헤더/무헤더/secret 미설정 시 전부 거부.
- `notification-dedup.test.ts` — 24h+cardId dedup, cardId 없는 알림은 항상 insert.
- `subscription-schema.test.ts` — 구독/푸시 구독 zod 스키마 입력 검증.
- `subscription-match.test.ts` — 매칭 규칙: 호스트 제외, location 부분일치, 유저당 1회, **payload에 식별정보 미포함(§9)**.

**리팩토링 (테스트 가능성)**
- `lib/cards/moderation.ts`의 비공개 현금패턴 함수를 순수 모듈 `lib/cards/cash-pattern.ts`로 분리 export. moderation은 이를 재사용(동작 동일).

**CI**: `.github/workflows/ci.yml` — push/PR(main)에서 typecheck → lint → test → build 순차 실행.

### 검증
- `npm run test` → 34 passed
- `npm run typecheck` / `lint` / `build` 모두 통과.

### 주의 (푸시 관련) — CI 파일은 보류 상태

CI 워크플로우는 GitHub 토큰에 `workflow` 권한이 없어 이번 푸시에서 거부됐다. 그래서 워크플로우 내용을 `ci-workflow-pending/ci.yml.txt`에 텍스트로 보관해뒀다.

**활성화 방법**: `workflow` 권한 있는 토큰(또는 GitHub 웹UI)으로 이 파일을 `.github/workflows/ci.yml`로 옮기면 CI가 켜진다. 내용은 그대로 쓰면 된다.

### 남은 테스트 (통합테스트 — 실 DB 또는 Supabase 모킹 필요)
- moderation의 block/flag 단어 분기(DB 조회 부분)
- approve 정원 도달 시 상태전이(미승인 rejected_closed + 카드 closed)
- resolve-cards의 closed vs cancelled 분기
- Room 접근 guard(호스트/참여자/비참여자)
- 신고 resolved 재처리 차단

이들은 순수 단위테스트로는 한계가 있어, Supabase 로컬 인스턴스나 클라이언트 모킹 레이어를 세우는 별도 작업이 필요하다. 시딩 규모에서는 현재 커버리지로 핵심 회귀는 잡힌다.

### 프론트 완성 후
Playwright 모바일 E2E(login→onboarding→card create→apply→approve)는 프론트가 붙은 뒤 코덱스와 조율해 추가.
