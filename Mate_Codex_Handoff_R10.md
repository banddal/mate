# Mate — 코덱스 핸드오프 (Round 10)

> 이번 라운드: 카드 상세 조회 + 신청 플로우 연결.
> 기준 문서: `Mate_Codex_Onboarding.md`, `Mate_Workplan.md`

## 작업 결과

- `/cards/[id]`를 임시 placeholder에서 실제 카드 상세 화면으로 교체했다.
- 상세 화면에 제목, 카테고리, 레벨, 일시, 장소, 모집인원, 마감시간, 호스트가 건 것, 비용 안내, 설명을 표시한다.
- 카드 리스트/상세에는 여전히 프로필 사진을 노출하지 않는다.
- 호스트 본인이 연 카드에는 신청 UI를 숨기고 `신청자 보기` 링크를 보여준다.
- 게스트가 열린 카드에 들어오면 하단 신청 bottom sheet를 보여준다.
- `POST /api/cards/:id/apply`를 추가했다.
  - 로그인 필요
  - 온보딩/휴대폰 인증 완료 필요
  - 열린 카드만 신청 가능
  - 호스트 본인 신청 차단
  - 마감 지난 카드 신청 차단
  - 중복 신청 차단
  - 신청 사유는 `APPLICATION_REASON_MAX_LENGTH` 100자 제한
- `lib/cards/applications.ts`에 신청 입력 schema를 추가했다.
- `lib/cards/queries.ts`에 카드 상세 조회 유틸을 추가했다.

## 시연 페이지

- 피드: `/feed`
- 카드 만들기: `/cards/new`
- 카드 상세: `/cards/{cardId}`
- 신청 API: `POST /api/cards/{cardId}/apply`

시연 흐름:

1. `/login`에서 로그인한다.
2. `/onboarding`에서 프로필과 휴대폰 인증을 완료한다.
3. `/cards/new`에서 카드를 만든다.
4. `open` 상태 카드는 `/feed`에 보인다.
5. 다른 계정으로 `/cards/{cardId}`에 들어가 신청 사유를 입력한다.

## 주의점

- 실제 시연에는 Vercel 환경변수가 필요하다.
  - `NEXT_PUBLIC_SUPABASE_URL`
  - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
  - `SUPABASE_SERVICE_ROLE_KEY`
- 같은 계정으로는 본인이 연 카드에 신청할 수 없다.
- `pending_review` 카드는 피드에 보이지 않는다.
- 카드 상세의 `신청자 보기` 링크는 아직 실제 신청자 목록 화면이 아니며 다음 라운드에서 만든다.

## 다음 라운드 추천

- `/cards/[id]/applicants` 호스트 전용 신청자 목록
- `GET /api/cards/:id/applicants`
- 신청자 2계층 응답
  - 항상 노출: 신청 사유, 인증 여부, 완료/노쇼 이력
  - 경쟁 시 추가 노출: 블러 프로필, 평점 지수, 미팅 성사 지수
- 승인 API `POST /api/cards/:id/approve`
