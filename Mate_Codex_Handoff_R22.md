# Mate Codex Handoff R22

> 이번 라운드: `/dev-login`이 Supabase 서버 환경변수 부족으로 실패하는 문제를 제거하고, 메일/DB 저장 없이 프로세스 화면을 볼 수 있는 데모 fallback 추가.

## 배경

- 사용자가 `/dev-login`을 눌렀지만 `DEV_LOGIN_FAILED`가 발생했다.
- 원인은 R19/R21의 우회 로그인도 `SUPABASE_SERVICE_ROLE_KEY`를 요구했기 때문이다.
- 사용자의 실제 요구는 인증 문제 해결이 아니라 지금까지 만든 화면과 흐름을 바로 보는 것이다.

## 변경 사항

- `lib/dev-auth.ts`
  - Supabase service env가 없어도 fallback 개발 세션을 반환한다.
  - 개발용 cookie가 있으면 `requireOnboarded()`가 통과한다.
- `lib/demo-data.ts`
  - 데모 피드 카드 2개와 데모 생성 카드 상세 데이터를 추가했다.
- `lib/cards/queries.ts`
  - Supabase public env가 없거나 피드가 비어 있거나 쿼리가 실패하면 데모 카드를 반환한다.
  - `demo-*` 상세 페이지는 DB 없이 렌더링한다.
- `app/api/cards/route.ts`
  - service role env가 없을 때도 카드 생성 요청을 데모 성공 응답으로 처리한다.
  - 생성 후 `/cards/demo-created-card`로 이동 가능하다.
- `app/api/cards/[id]/apply/route.ts`
  - 데모 카드 신청은 DB 없이 성공 응답을 반환한다.

## 바로 볼 수 있는 흐름

1. `https://mate-161company.vercel.app/dev-login`
2. `/feed`
3. 데모 카드 상세
4. 신청 bottom sheet 입력/접수 메시지
5. `/cards/new`
6. 카드 생성 폼 작성
7. 생성 후 데모 상세 화면

## 주의

- 이 라운드는 화면/프로세스 검증용 데모 fallback이다.
- 실제 데이터 저장은 Supabase 환경변수와 service role이 정상 설정된 뒤 다시 확인해야 한다.
- 공개 운영 전에는 `DISABLE_DEV_AUTH_BYPASS=1`로 닫아야 한다.
