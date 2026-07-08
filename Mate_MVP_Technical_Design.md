# Mate MVP 기술 설계 — v0.1

> 전제: 네이티브 앱 없음. 모바일 웹(PWA)에서 완결. PRD(Mate_MVP_PRD_v0.1.md) §4·§9 기준.
> 아키텍처 다이어그램은 대화창 상단 참조.

---

## 1. 전체 구조

- **클라이언트**: Next.js(App Router) 기반 모바일 웹, PWA(설치 가능·홈스크린 추가)
- **호스팅/서버**: Vercel — Next.js SSR + Route Handlers(API) + **Vercel Cron**(시간 기반 작업)
- **백엔드**: Supabase — Auth, Postgres(+RLS), Realtime
- **외부 연동**: Google OAuth, SMS 인증(국내 통신사 대응 필요 — Twilio 계열은 한국 회선 지원이 제한적이라 알리고/NHN Toast 등 국내 SMS API 검토), Web Push(VAPID)

원칙: **클라이언트가 Supabase에 직접 쓰지 못하는 것**을 명확히 분리한다. RLS만으로 막을 수 없는 로직(마감 일괄 해소, 소멸, 금지어 필터)은 반드시 서버(Route Handler)를 거친다.

> Round 7 수정: Supabase Edge Functions/pg_cron을 별도 런타임으로 쓰지 않기로 했다 — 이벤트성 로직은 해당 액션을 처리하는 Route Handler에 이어 쓰고, 시간 기반 작업만 Vercel Cron이 Route Handler를 호출하는 방식으로 통합(런타임 하나 제거, 상세는 `Mate_Backend_Spec.md` §4·§13). L3 게이팅 판정도 V0.1에선 API가 생성 자체를 차단하는 수준으로 단순화됨(L3는 첫 시나리오에서 열지 않음 — `Mate_Backend_Spec.md` 부록 A 참고).

---

## 2. 프론트엔드 설계

### 스택
Next.js App Router · Tailwind CSS(모바일 퍼스트) · PWA(manifest.json + Service Worker, `next-pwa` 혹은 수동 구성)

### 내비게이션 (하단 탭바 — 모바일 표준 패턴)
`피드` · `내 활동`(만든 카드/신청한 카드) · `알림`(구독) · `마이`

### 라우트
| 경로 | 화면 | 비고 |
|---|---|---|
| `/login` | Google 로그인 → 휴대폰 인증 | |
| `/onboarding` | 닉네임·연령대·성별·관심 카테고리 | 최초 1회 |
| `/feed` | 카드 리스트 | 필터 chip: 오늘/이번주/마감임박/카테고리, pull-to-refresh |
| `/cards/new` | 카드 생성 (멀티스텝) | 기본정보 → 호스트가 건 것(1급 필드) → 마감시간 |
| `/cards/[id]` | 카드 상세 + 신청 | 신청은 bottom sheet 모달(100자 사유) |
| `/cards/[id]/applicants` | 호스트 전용 신청자 목록 | 신청메시지·인증여부·완료/노쇼 이력 |
| `/rooms/[id]` | Mate Room 채팅 | 신고 버튼 sticky, 연락처 교환 경고 배너 |
| `/rooms/[id]/review` | 종료 후기 | 이행 체크 3토글 + 신고 + 이모지(비저장) |
| `/alerts` | 상황 템플릿 구독 관리 | 사람 구독 UI 자체를 만들지 않음(원천 차단) |
| `/admin/*` | 관리자 | 모바일에서도 최소 동작하되 데스크탑 우선 |

### 모바일 특화 처리
- `viewport-fit=cover` + `env(safe-area-inset-*)` — iOS 노치/제스처 바 대응
- 터치 타겟 ≥ 44px, 주요 액션(신청·승인)은 화면 하단 고정 버튼
- 신청/필터/후기는 모달보다 **bottom sheet** — 한 손 조작 기준
- 스켈레톤 로딩(피드), 카드에는 프로필 사진 없음 → 이미지 최소화로 모바일 네트워크 부담 감소(P1 원칙과도 부합)
- iOS 웹푸시는 "홈 화면에 추가" 후에만 동작(iOS 16.4+) → 온보딩에서 PWA 설치 유도 필요

---

## 3. 백엔드 설계

### Supabase 구성
- **Auth**: Google OAuth(Supabase 내장 프로바이더) + 휴대폰 인증(자체 SMS OTP, 국내 API 연동)
- **Postgres + RLS**: 아래 §4 스키마. RLS로 "프로필은 경쟁 상황에서만 블러 노출"(P1) 같은 접근 제어를 1차 강제
- **Realtime**: Mate Room 메시지(Broadcast 또는 Postgres Changes)

### 서버 전담 로직 (전부 Route Handler 안에서 처리 — 별도 Edge Function 없음)
| 로직 | 이유 |
|---|---|
| 마감 시 일괄 해소 | 개별 거절 통지 없이 정원 마감 처리 — 타이밍 조작 방지, Vercel Cron이 주기 호출 |
| Mate Room 소멸 | 종료 시 유저 화면 데이터 즉시 접근 차단(RLS), 하드 삭제는 유예 후 실행, 법정 최소 로그만 별도 테이블로 이관(P4) |
| L3 카드 생성 차단 | V0.1은 L3 카테고리 자체를 API에서 거부(에러 반환) — 복잡한 게이팅 로직 없이 단순 차단 |
| 금지어/카드 검수 | 카드 생성 시점 서버 필터링(P2 활동 공시 원칙 강제) |
| 신청 시 개인정보 노출 범위 계산 | "허용한 일부만" 노출 로직은 서버가 최종 마스킹, 경쟁률(신청자수>정원) 조건 실시간 판정 |
| 신고 발생 시 동결 보존 | `POST /api/reports` 처리 안에서 바로 실행(별도 트리거 없음) |

### RLS 정책 핵심 방향
- `cards`: 목록/상세는 로그인 유저 전체 공개, 단 호스트 연락처·프로필 필드는 별도 뷰로 분리해 미노출
- `applications`: 본인 신청 건 + 해당 카드 호스트만 조회 가능
- `profiles`: 기본은 비공개. 경쟁 신청 발생 시에도 "블러 처리된 부분 필드"만 뷰로 노출(원본 테이블 직접 select 금지 — 서버가 마스킹된 뷰 반환)
- `rooms`/`messages`: 참여자만 조회, 종료 후 삭제(하드 delete, RLS로 막는 게 아니라 실제 레코드 제거)

---

## 4. 데이터 모델 (핵심 테이블)

- **users / profiles**: id, phone_verified, nickname, age_range, gender, categories[] (OAuth identity는 Supabase auth.users가 관리하므로 profiles에 provider id 컬럼을 두지 않는다) (완료/노쇼 이력은 저장 컬럼이 아니라 reviews 집계로 계산 — 상세는 `Mate_Backend_Spec.md`)
- **cards**: id, host_id, title, category, level(L1/L2/L3), datetime, location, capacity, host_offer(1급 필드), cost, description, deadline_at, status
- **applications**: id, card_id, applicant_id, reason_text(100자), status(pending/approved/closed), created_at
- **rooms**: id, card_id, status(active/closed), closed_at
- **messages**: id, room_id, sender_id, body, created_at *(종료 시 하드 삭제 대상)*
- **reviews**: id, room_id, user_id, attended(bool), on_time(bool), matches_description(bool), would_rejoin(bool), reported(bool)
- **subscriptions**: id, user_id, location, time_pattern, category *(사람 구독 필드 없음 — 스키마 자체로 원천 차단)*
- **reports**: id, room_id/card_id, reporter_id, reason, status, frozen_until
- **admin_logs / banned_words / retention_archive**: 관리자·법정 보존용, 유저 화면과 완전 분리된 스키마

---

## 5. 인증 흐름
1. Google OAuth → Supabase Auth 세션 발급
2. 휴대폰 SMS OTP 검증 (국내 SMS API) → `phone_verified = true`
3. 온보딩(닉네임/연령대/성별/카테고리) 완료 전까지 카드 생성·신청 불가

## 6. Mate Room 라이프사이클
`카드 마감(Vercel Cron)` → `일괄 해소 알림` → `room 생성, 참여자만 입장` → `모임 종료(호스트 또는 시간 트리거) — RLS가 즉시 접근 차단` → `review 화면 강제 노출` → `Vercel Cron이 유예 후 messages/room 하드 삭제, retention_archive에 메타데이터만 이관`

## 7. 알림
- Web Push(VAPID) — 마감임박, 승인 결과, 상황 템플릿(장소×시간×카테고리) 매칭
- iOS는 PWA 설치 필요 → 미설치 유저는 인앱 배지/이메일 대체 고려

## 8. 배포/인프라
- Vercel: 프론트+API, 환경변수로 Supabase 키 관리, HTTPS 필수(PWA·Push 전제조건), **Vercel Cron**으로 마감/소멸/알림 배치 스케줄
- Supabase: 단일 프로젝트로 시작(V0.1), Auth+Postgres+Realtime만 사용(Edge Functions/pg_cron 미사용)
- 도메인 확보 및 HTTPS 설정 선행 작업

---

*이 문서는 PRD의 P1~P5 원칙을 위반하지 않는 한도 내에서만 갱신한다. 기술적 편의를 위해 프로필 노출 범위를 넓히거나 사람 구독을 허용하는 방향의 변경은 금지.*
