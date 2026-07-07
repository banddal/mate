# Mate Codex Handoff R26

> 이번 라운드: `카드를 검수하지 못했어요.` 원인 설명과 데모 카드 생성 우회 보강.

## 배경

- 사용자가 카드 생성 중 `카드를 검수하지 못했어요.` 메시지를 봤다.
- 이 메시지는 입력값 문제가 아니라 서버 검수 단계 문제다.
- 현재 검수 단계는 `banned_words` 테이블을 service role로 조회한다. Vercel에 Supabase 환경변수가 일부 있거나 service role 권한/테이블 설정이 맞지 않으면 이 단계에서 실패할 수 있다.

## 변경 사항

- `app/api/cards/route.ts`
  - 데모 우회 유저(`DEV_AUTH_FALLBACK_USER_ID`)는 Supabase 환경변수가 있어도 실제 검수/저장 경로를 타지 않고 데모 카드 생성 성공으로 빠지게 했다.
  - 검수 실패 메시지를 구체화했다.
  - 저장 실패 메시지를 구체화했다.
  - 금지어 차단 메시지를 더 명확하게 바꿨다.

## 이제 표시되는 메시지

- 검수 DB/service role 문제:
  - `금지어 검수용 DB 조회 또는 Supabase service role 설정 문제로 카드를 검수하지 못했어요.`
- 저장 문제:
  - `카드 저장에 실패했어요. Supabase service role 권한이나 cards 테이블 설정을 확인해주세요.`
- 금지어 차단:
  - `금지어 기준에 걸려 공개할 수 없어요. 활동 중심으로 다시 작성해주세요.`

## 데모 검증

- `/dev-login`으로 들어온 데모 유저는 카드 생성 시 DB 검수/저장을 하지 않고 `/cards/demo-created-card`로 이동한다.
- 따라서 프로세스와 디자인 검증은 Supabase 설정 상태와 무관하게 진행할 수 있다.
