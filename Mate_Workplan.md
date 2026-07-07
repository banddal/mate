# Mate Workplan

> 기준일: 2026-07-06
> 기준 문서: `Mate_Codex_Onboarding.md`, `Mate_MVP_PRD_v0.1.md`, `Mate_MVP_Technical_Design.md`, `Mate_Backend_Spec.md`

## 0. 현재 상태

- GitHub remote: `https://github.com/banddal/mate.git`
- 기본 브랜치: `main`
- 현재 레포는 Next.js 앱 스캐폴딩 전 단계다.
- 완료된 것:
  - PRD, 기술 설계, 백엔드 상세 설계 정리
  - Supabase migration 4개 작성: schema, RLS, banned words seed, rating functions
  - `shared/config.ts` 공용 상수 작성
  - Codex 온보딩 통합 문서 작성
  - R18 안정화: SMS 벤더 키가 있어도 devOtp 흐름 유지, Supabase 세션 갱신 middleware 추가
  - R19/R21 임시 개발용 진입로: `/dev-login`으로 메일 링크 없이 후속 프로세스 검증 가능
  - R20 안정화: PKCE 매직링크 콜백을 브라우저 confirm 페이지에서 처리
  - R22 데모 모드: Supabase 서버키가 없어도 `/dev-login`, 피드, 카드 생성, 상세, 신청 UI 검증 가능
- 로컬 미추적 파일:
  - `.claude/settings.local.json`

## 1. 절대 지켜야 할 제품 규칙

- 메인 경험은 사람 프로필이 아니라 상황 카드다.
- 카드 리스트와 상세에 프로필 사진을 노출하지 않는다.
- 사람 팔로우, DM, 호스트 구독, 프로필 브라우징을 만들지 않는다.
- L3 카테고리는 V0.1에서 UI에 노출하지 않고 API에서도 생성 차단한다.
- 카드 생성 실패 사유에 금지어 또는 매칭 패턴을 직접 노출하지 않는다.
- 신청 사유 길이는 `shared/config.ts`의 `APPLICATION_REASON_MAX_LENGTH`를 참조한다.
- 카드 생성, 승인, 마감, 신고 처리, 관리자 작업은 Route Handler를 통해 처리한다.
- `profiles`, `subscriptions`, `push_subscriptions` 외 주요 write를 클라이언트 Supabase 직접 호출로 열지 않는다.
- 종료된 Mate Room은 유저 화면에서 재접근할 수 없어야 한다.
- 평점/성사지수는 경쟁 상황에서만 완곡한 문구로 보여주고 정확한 표본수나 산식을 노출하지 않는다.

## 2. 작업 순서

### P0. 프로젝트 뼈대 만들기

- [x] Next.js App Router 프로젝트를 레포 루트에 스캐폴딩한다.
- [ ] TypeScript, Tailwind CSS, ESLint, Prettier를 설정한다.
- [x] `shared/config.ts`를 앱 코드에서 import 가능한 경로로 유지한다.
- [x] Supabase 클라이언트 구조를 만든다.
  - [x] browser client
  - [x] server client
  - [x] service role admin client
- [x] `.env.example`을 작성한다.
  - Supabase URL / anon key / service role key
  - Kakao keys
  - SMS vendor key
  - VAPID keys
  - Cron secret
- [ ] `types/database.types.ts` 생성 절차를 README 또는 스크립트로 남긴다.

### P1. 인증과 온보딩

- [x] `/login` 구현
  - [x] `KAKAO_CLIENT_ID`가 있으면 Kakao OAuth
  - [x] 없으면 Supabase email magic link
- [x] `/onboarding` 구현
  - [x] 닉네임, 연령대, 성별, 관심 카테고리
  - [x] L3 선택지는 표시하지 않는다.
- [x] `POST /api/auth/phone/request-otp` 구현
  - [x] SMS key가 없으면 `{ devOtp }` 반환
  - [x] 실제 OTP row, 만료, 재전송 쿨다운 로직은 그대로 실행
  - [ ] 실제 SMS 벤더 발송 연동
- [x] `POST /api/auth/phone/verify-otp` 구현
  - [x] attempt count, expiry, hash 검증
  - [x] 성공 시 `profiles.phone_verified = true`
- [ ] 온보딩 미완료 유저의 카드 생성/신청 진입을 막는다.
  - [x] 보호된 `/feed` 진입 guard
  - [x] 보호된 `GET /api/cards` guard
  - [x] `/cards/new` guard
  - [x] 신청 API guard (apply·approve 라우트에 `isProfileComplete` 체크 존재 → ONBOARDING_REQUIRED 403)

### P2. 카드 피드와 카드 생성

- [x] `/feed` 구현
  - [x] 오늘, 이번주, 마감임박, 카테고리 필터
  - [x] 프로필 사진 없음
  - [ ] 모바일 pull-to-refresh 또는 새로고침 액션
- [x] `GET /api/cards` 구현
  - [x] `status='open'`만 반환
  - [x] 필터 파라미터 검증
- [x] `/cards/new` 멀티스텝 폼 구현
  - [x] 기본 정보
  - [x] 호스트가 건 것
  - [x] 마감 시간
  - [x] 현금 사례비 입력 필드 없음
- [x] `POST /api/cards` 구현
  - [x] L3 하드 차단
  - [x] banned words block/flag 처리
  - [x] 현금성 정규식 flag 처리
  - [x] 즉시 공개 또는 검수 대기 분기

### P3. 신청과 호스트 승인

- [x] `/cards/[id]` 상세 구현
  - [x] 상황 중심 정보 위계
  - [x] 신청 bottom sheet
  - [x] 신청 사유 100자 제한은 `APPLICATION_REASON_MAX_LENGTH` 참조
- [x] `POST /api/cards/:id/apply` 구현
  - [x] 중복 신청 방지 (선제 조회 + unique 제약 위반 409 폴백)
  - [x] 마감/상태 검증
  - [x] 정원 검증 (정원 도달 시 카드가 `closed`로 전환되어 `status='open'` 체크에서 차단됨 — approve 라우트가 소스오브트루스)
- [x] `POST /api/cards/:id/approve` 구현
  - [x] 호스트 전용
  - [x] 승인 신청 `approved`
  - [x] 정원 도달 시 나머지 `rejected_closed`
  - [x] 정원 도달 시 카드 `closed`
  - [x] `rooms` row 생성
- [x] `/cards/[id]/applicants` 구현
  - [x] 호스트 전용
  - [x] 기본 정보: 신청 사유, 인증 여부
  - [x] 승인/대기/남은 자리 요약
  - [x] 승인 후 Mate Room 이동
  - [ ] 완료/노쇼 이력
  - [ ] 경쟁 시에만 블러 프로필, 평점 지수, 성사 지수 표시 (V0.1 미착수)
  - [ ] 지수가 `null`이면 "신규" 배지 (V0.1 미착수)
- [x] 신청자 조회 (별도 `GET /api/cards/:id/applicants` API 없이 applicants 서버 컴포넌트가 service role로 직접 조회 — 동일 목적 달성)
  - [ ] 경쟁 여부 실시간 계산 (V0.1 미착수)
  - [x] rating functions는 service role로만 호출 (경쟁 UI 도입 시 적용 예정)
- [x] 미승인 신청 일괄 해소 로직 (별도 `POST /api/cards/:id/resolve` API 없이 approve 라우트에 통합)
  - [x] 정원 도달 시 미승인 신청 `rejected_closed` 일괄 처리 (개별 거절 통지 없음)
  - [x] 승인자에게만 확정 알림 생성 (approve 라우트 + resolve-cards cron)
  - [x] room 생성

### P4. Mate Room, 후기, 신고

- [ ] `/rooms/[id]` 구현
  - [x] 승인 후 진입용 기본 화면
  - [x] 참여자만 입장
  - [ ] 신고 버튼 sticky
  - [x] 연락처 교환 경고 배너
  - [x] 종료된 방 접근 차단
- [ ] messages Realtime 전송/구독 구현
  - [x] 기본 메시지 조회/전송
  - [ ] Realtime 구독
- [x] `POST /api/rooms/:id/close` 구현
  - room status close
  - review 화면으로 유도
- [x] `/rooms/[id]/review` 구현
  - [x] 참석, 정시, 설명 일치, 재참여 의향 체크
  - [x] 신고 여부
  - [x] 이모지는 로컬 표시만 하고 서버 전송하지 않는다.
- [x] `POST /api/rooms/:id/review` 구현
  - [x] 참여자 전용
  - [x] 종료된 방에서만 작성
- [x] `POST /api/reports` 구현
  - [x] 신고 row 생성
  - 동결 보존 처리
  - admin 알림 생성

### P5. 알림, 구독, PWA

- [x] PWA manifest와 service worker 구성 (프론트 — 코덱스)
- [x] Web Push 구독 등록 UI 구현 (프론트 — 코덱스, `/api/push/*` 호출)
- [x] `POST /api/push/subscribe` 구현 (+ `/api/push/unsubscribe`, `/api/push/config`)
- [x] `/alerts` 구현 (프론트 — 코덱스)
  - [x] 장소, 시간 패턴, 카테고리만
  - [x] 사람 구독 옵션 없음
  - [x] 구독 생성/삭제 UI
- [x] `/me` 활동 허브 개선 (프론트 — 코덱스)
  - [x] 지금 할 일 큐
  - [x] Mate Room / 내가 만든 카드 / 내가 신청한 카드 분리
  - [x] 빈 상태별 다음 액션 연결
- [x] `GET/POST /api/subscriptions` 구현 (+ `DELETE /api/subscriptions/:id`, L3 차단·중복 방지·상한 20)
- [x] notification dispatch 로직 구현
  - [x] 410 endpoint 정리
  - [x] 24시간 dedup
  - [x] 1회 재시도
- [x] 알림 생성 트리거 5종 연결
  - [x] `application_resolved` (approve / resolve-cards cron)
  - [x] `card_review_resolved` (admin approve/reject)
  - [x] `subscription_match` (카드 생성 / admin approve, 상대방 식별정보 미포함)
  - [x] `card_deadline_imminent` (resolve-cards cron, pending 신청 있는 카드 호스트)
  - [x] `report_status_change` (admin report resolve)

### P6. 관리자와 Cron

- [ ] `/admin/*` 단일 관리자 화면 구현
  - [x] 탭형 운영 콘솔 구조
  - [x] 카드 검수 대기열 조회
  - [x] 신고 대기열 조회
  - [x] 신고 처리
  - [x] 금지어 관리
  - 유저 정지
  - [x] admin 부여/회수
  - [x] 관리자 작업 이력 조회
- [ ] admin API 구현
  - `/api/admin/cards/review-queue`
  - [x] `/api/admin/cards/:id/approve`
  - [x] `/api/admin/cards/:id/reject`
  - [x] `/api/admin/reports/:id/resolve`
  - [x] `/api/admin/admins`
  - [x] `/api/admin/banned-words`
- [x] 내부 cron endpoint 구현
  - [x] `/api/internal/cron/resolve-cards` (마감 지난 카드 일괄 해소)
  - [x] `/api/internal/cron/dispatch-notifications` (pending 알림 Web Push 발송)
  - [x] `/api/internal/cron/cleanup-rooms` (종료 48h 경과 room 정리 + retention_archive 이관)
- [x] `vercel.json` cron 설정 추가
- [x] Cron secret header 검증 (`CRON_SECRET` Bearer, 미설정 시 거부)

### P7. 품질 보증

- [x] API 입력 검증 유닛 테스트 (구독/푸시 스키마 — vitest)
- [x] 카드 검수 분기 테스트
  - [x] L3 차단 (카테고리 레벨 테스트)
  - [x] 금액+지급 의사 검수 대기 (현금성 패턴 테스트, 스펙 §7 핵심 케이스)
  - [ ] block/flag 단어 분기 (moderation의 DB 조회 부분 — 통합테스트 필요)
- [x] cron secret 검증 테스트 (secret 미설정/오헤더 거부)
- [x] 알림 24h dedup 테스트
- [x] subscription_match 매칭 테스트 (호스트 제외, location 매칭, 유저당 1회, 식별정보 미포함)
- [x] CI 워크플로우 (typecheck/lint/test/build on push·PR)
- [ ] 신청자 목록 2계층 응답 테스트 (통합테스트)
- [ ] Room 종료 후 접근 차단 테스트 (통합테스트)
- [ ] 신고 상태 머신 테스트 (통합테스트 — resolved 재처리 차단은 라우트에 구현됨)
- [ ] Playwright 모바일 흐름 테스트 (프론트 완성 후 — 코덱스와 조율)
  - login fallback
  - onboarding
  - card create
  - apply
  - approve/resolve
  - room/review

## 3. 시작 전 확인할 것

- [ ] Supabase 프로젝트 URL, anon key, service role key 확인
- [ ] Supabase migrations가 실제 원격 DB에 적용되어 있는지 확인
- [ ] VAPID public/private key 확인
- [ ] Kakao key 미발급 상태인지 확인
- [ ] SMS vendor key 미발급 상태인지 확인
- [ ] 최초 admin 계정 부여 방식 확정
- [ ] Vercel 프로젝트 생성 여부 확인

## 4. 첫 개발 세션 추천 범위

첫 세션은 범위를 작게 잡는다.

- [x] Next.js App Router 스캐폴딩
- [x] Tailwind/ESLint 기본 설정
- [x] Supabase client 3종 구조
- [x] `.env.example`
- [x] `/login`의 Kakao/email magic link 자동 분기
- [x] `/api/config`

이 범위까지 끝나면 이후 기능 개발의 기준선이 생긴다.
