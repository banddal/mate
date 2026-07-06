# Mate 백엔드/서버 상세 설계 — v2 (Round 7 간소화 리라이트)

> 담당: Claude (서버/백엔드/구조). 프론트·운영은 코덱스 협업 — 라운드 종료 시 `Mate_Codex_Handoff_R*.md`로 전달.
> 기준 문서: Mate_MVP_PRD_v0.1.md, Mate_MVP_Technical_Design.md
> ⚠️ 이 문서는 전부 **설계 초안(마크다운)** 입니다 — 실제 Supabase 프로젝트나 DB에 아직 적용되지 않았습니다.
>
> **Round 7 = 효율성 검토 후 전면 리라이트.** Round 1~6에서 쌓인 설계 중, "첫 시나리오는 L1만 오픈"이라는 이미 확정된 결정(PRD §8)에 비해 과했던 부분을 잘라냈다. 무엇을 왜 잘랐는지는 §13(결정 로그)과 부록 A 참조 — Round 1~6의 원본 내용은 git 히스토리에 남아있으니 필요하면 언제든 복원 가능.
>
> **실제 SQL화(커밋 전 재검토) 후 발견한 버그 2건, `supabase/migrations/`에 반영 완료:**
> 1. `reviews` insert 정책이 `rooms`를 일반 쿼리로 참조했는데, `rooms`의 RLS가 `status='active'`일 때만 보여주도록 되어 있어(P4 소멸 즉시성) **방이 종료된 후 제출되는 후기가 항상 거부되는** 실질적 버그였음 — `security definer` 헬퍼 함수(`room_status`, `room_card_id`, `is_card_host`, `is_approved_applicant`)로 RLS를 우회해 "과거에 실제 참여했는가"를 확인하도록 수정
> 2. `applications`에 호스트용 update 정책을 direct하게 열어놨었는데, RLS는 컬럼 단위 제한이 안 되어 호스트가 `reason_text` 등 다른 필드까지 고칠 수 있는 여지가 있었음 — `cards`와 동일하게 승인/거절은 API(service_role) 전용으로 좁힘

---

## 1. DB 스키마 (DDL 초안)

```sql
-- profiles: auth.users 확장. Round 7: trust_score/age_verified/open_report_count 제거 — 전부 L3 전용이거나 캐시 컬럼이라 V0.1엔 불필요(§13)
create table profiles (
  id uuid primary key references auth.users(id),
  nickname text not null,
  age_range text not null,
  gender text not null,
  categories text[] not null default '{}',
  phone_verified boolean not null default false,
  created_at timestamptz not null default now()
);
-- completed_count/noshow_count는 저장 컬럼이 아니라 reviews 집계 쿼리로 계산한다 (§5 뷰 참고) — V0.1 트래픽 규모에서 캐시가 불필요하고, 캐시는 트리거 동기화 버그 클래스를 연다.

-- cards: 상황 카드
create table cards (
  id uuid primary key default gen_random_uuid(),
  host_id uuid not null references profiles(id),
  title text not null,
  category text not null,
  level text not null check (level in ('L1','L2','L3')),   -- L3는 스키마만 존재, V0.1은 API에서 생성 자체를 차단(§8)
  event_datetime timestamptz not null,
  location text not null,
  capacity int not null check (capacity > 0),
  host_offer text not null,        -- 1급 필드: 호스트가 건 것 (상황의 잉여만, P3)
  cost_info text,
  description text not null,
  deadline_at timestamptz not null,
  status text not null default 'pending_review' check (status in ('pending_review','open','closed','cancelled','rejected')),
  rejection_reason text,
  created_at timestamptz not null default now()
);

-- applications: 신청
create table applications (
  id uuid primary key default gen_random_uuid(),
  card_id uuid not null references cards(id),
  applicant_id uuid not null references profiles(id),
  reason_text text not null check (char_length(reason_text) <= 100),
  status text not null default 'pending' check (status in ('pending','approved','rejected_closed')),
  created_at timestamptz not null default now(),
  unique (card_id, applicant_id)
);

-- rooms: Mate Room
create table rooms (
  id uuid primary key default gen_random_uuid(),
  card_id uuid not null unique references cards(id),
  status text not null default 'active' check (status in ('active','closed')),
  closed_at timestamptz
);

-- messages: 소멸 대상 (종료 시 하드 삭제)
create table messages (
  id uuid primary key default gen_random_uuid(),
  room_id uuid not null references rooms(id),
  sender_id uuid not null references profiles(id),
  body text not null,
  created_at timestamptz not null default now()
);

-- reviews: 사실 체크 4개 (P5). Round 7: completed_count/noshow_count의 유일한 근거 테이블 — 자기신고, L1 원칙("마찰 최소")에 부합
create table reviews (
  id uuid primary key default gen_random_uuid(),
  room_id uuid not null references rooms(id),
  user_id uuid not null references profiles(id),
  attended boolean not null,
  on_time boolean not null,
  matches_description boolean not null,
  would_rejoin boolean not null,
  reported boolean not null default false,
  created_at timestamptz not null default now(),
  unique (room_id, user_id)
);

-- subscriptions: 상황 템플릿만 (사람 구독 필드 자체가 존재하지 않음 — 원천 차단)
create table subscriptions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references profiles(id),
  location text not null,
  time_pattern text not null,
  category text not null,
  created_at timestamptz not null default now()
);

-- reports: 신고 "조사 상태"만 관리. room 동결 여부는 frozen_until로 별도 관리(투 트랙)
create table reports (
  id uuid primary key default gen_random_uuid(),
  reporter_id uuid not null references profiles(id),
  target_room_id uuid references rooms(id),
  target_card_id uuid references cards(id),
  reason text not null,
  status text not null default 'open' check (status in ('open','reviewing','resolved')),
  resolution text check (resolution in ('dismissed','warned','suspended_temp','suspended_perm','escalated')),
  resolved_by uuid references profiles(id),
  resolved_at timestamptz,
  frozen_until timestamptz,
  created_at timestamptz not null default now()
);

-- push_subscriptions: Web Push 구독 정보 (디바이스별)
create table push_subscriptions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references profiles(id),
  endpoint text not null unique,
  p256dh text not null,
  auth_key text not null,
  created_at timestamptz not null default now()
);

-- notifications: 발송 큐. Round 7: attendance_reminder 제거(롤콜 자체가 부록으로 이동)
create table notifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references profiles(id),
  type text not null check (type in (
    'card_deadline_imminent','application_resolved','subscription_match',
    'report_status_change','card_review_resolved'
  )),
  payload jsonb not null,        -- { title, body, link }
  status text not null default 'pending' check (status in ('pending','sent','failed')),
  attempts integer not null default 0,
  last_attempt_at timestamptz,
  created_at timestamptz not null default now()
);

-- admin_users: Round 7: role 컬럼 제거 — V0.1은 단일 admin 티어(§10)
create table admin_users (
  user_id uuid primary key references profiles(id),
  granted_by uuid references profiles(id),
  granted_at timestamptz not null default now()
);

-- phone_otp_requests: 카카오 로그인과 별개인 휴대폰 본인확인 절차
create table phone_otp_requests (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references profiles(id),
  phone_number text not null,
  otp_hash text not null,
  expires_at timestamptz not null,
  verified_at timestamptz,
  attempt_count integer not null default 0,
  created_at timestamptz not null default now()
);

-- banned_words, admin_actions, retention_archive
create table banned_words (
  id uuid primary key default gen_random_uuid(),
  word text not null,
  severity text not null check (severity in ('block','flag')),
  category_hint text
);
create table admin_actions (id uuid primary key default gen_random_uuid(), admin_id uuid not null, action_type text not null, target_id uuid, notes text, created_at timestamptz not null default now());
create table retention_archive (
  id uuid primary key default gen_random_uuid(),
  room_id uuid not null,
  archived_payload jsonb not null,
  reason text not null check (reason in ('standard_retention','report_freeze')),
  created_at timestamptz not null default now()
);
```

**Round 7에서 완전히 뺀 테이블**: `attendance_records`, `app_config`. 이유와 원안은 §13·부록 A 참조.

---

## 2. RLS 정책 방향 (Postgres Row Level Security)

| 테이블 | 정책 |
|---|---|
| `profiles` | 본인 행만 select/update. 타인 프로필 직접 select 불가 — 노출은 §5의 `masked_profile_view`(서버 함수)로만 |
| `cards` | select는 `status='open'`(피드, 전체 공개) 또는 `host_id = auth.uid()`(본인 카드는 검수중/반려 상태도 확인) 또는 admin. insert는 본인, **status는 항상 서버가 결정**(클라이언트가 status를 직접 지정해 검수 우회 불가) |
| `applications` | insert는 본인(`applicant_id = auth.uid()`). select는 본인 또는 해당 카드 `host_id = auth.uid()`. **update 정책 없음** — 승인/거절은 `cards`와 동일하게 API(service_role) 전용(SQL화 재검토에서 발견: RLS는 컬럼 단위 제한이 안 돼 호스트가 다른 필드까지 고칠 위험이 있었음) |
| `rooms` / `messages` | select/insert는 **`rooms.status='active'`이고** 해당 room의 승인된 참여자인 경우만 (참여자 = applications.status='approved' ∪ host). `status='closed'` 전환 즉시 접근 차단 — P4 소멸의 즉시성 보장 |
| `reviews` | insert는 room 참여자 본인 건만, 1인 1행, **`rooms.status='closed'`일 때만**(방 종료 후 제출). 이 확인은 `security definer` 헬퍼 함수로 처리 — `rooms`의 RLS 자체가 `status='active'`만 보여주므로 일반 쿼리로는 종료된 방을 확인할 수 없기 때문(SQL화 재검토에서 발견한 버그) |
| `subscriptions` | 완전히 본인 소유 CRUD |
| `reports` | insert는 인증 유저 누구나(단 `status`/`resolution`/`resolved_by`는 서버 기본값만). select/update는 admin만 |
| `push_subscriptions` | 본인 소유만 insert/select/delete |
| `notifications` | select는 본인 행만. insert/update는 service role만 |
| `admin_users` | select/insert/update 전부 service role 또는 기존 admin만 — 자기 자신에게 권한 부여하는 경로 차단 |
| `phone_otp_requests` | 클라이언트 직접 접근 전면 차단 — service role만 |
| `retention_archive`, `admin_actions`, `banned_words` | 클라이언트 접근 전면 차단 — service role만 (moderator는 `/api/admin/*` API를 통해서만 간접 조작) |

**핵심 원칙**: RLS는 "행 단위 접근"만 막는다. 컬럼 단위 마스킹(블러 처리 등)은 RLS로 표현이 어려우므로 Postgres 함수(`security definer`) 또는 Route Handler가 담당한다.

---

## 3. API 계약 (Route Handlers)

| Method/Path | 설명 | 서버 전담 이유 |
|---|---|---|
| `POST /api/auth/phone/request-otp` | SMS 발송 (자체 OTP) | 외부 SMS API 키 서버에만 존재 |
| `POST /api/auth/phone/verify-otp` | OTP 검증 → `phone_verified=true` | |
| `POST /api/cards` | 카드 생성 | §8 판정 흐름(레벨 차단 → 금지어 → 검수큐/즉시공개) |
| `GET /api/cards` | 피드 조회 (필터: today/week/deadline/category) | `status='open'`만 반환 |
| `POST /api/cards/:id/apply` | 신청 (사유 100자) | |
| `GET /api/cards/:id/applicants` | 호스트용 신청자 목록 | §5 두 계층 응답 |
| `POST /api/cards/:id/approve` | 개별 승인 | |
| `POST /api/cards/:id/resolve` | 마감 일괄 해소 (Vercel Cron 트리거) | 거절 개별 통지 금지 → 서버가 일괄 상태 전환 |
| `POST /api/rooms/:id/close` | 모임 종료 | 소멸 파이프라인 시작점 |
| `POST /api/rooms/:id/review` | 후기 제출 | |
| `POST /api/reports` | 신고 | 처리 로직(동결 등) 이 핸들러 안에서 바로 실행(§6) |
| `POST /api/admin/reports/:id/resolve` | 신고 조사 결과 처리 | admin 전용, §7 상태 머신 |
| `GET/POST /api/subscriptions` | 상황 템플릿 구독 | "사람" 파라미터 자체를 스키마에서 배제 |
| `GET /api/config` | 공개 상수 반환(예: 신청사유 100자) — **코드 상수를 그대로 JSON으로 응답**, DB 조회 없음 | §11 |
| `GET /api/admin/cards/review-queue` | `status='pending_review'` 카드 목록 | moderator 전용 |
| `POST /api/admin/cards/:id/approve` | `status→open`, 호스트 알림 발송 | moderator 전용 |
| `POST /api/admin/cards/:id/reject` | `status→rejected`, 호스트 알림 발송 | moderator 전용 |
| `POST /api/push/subscribe` | Web Push 구독 등록 | |
| `POST /api/admin/admins` / `DELETE /api/admin/admins/:userId` | admin 부여/회수 | admin 전용 |
| `POST /api/admin/*` | 검수·정지·금지어 관리 | admin 검증 |

응답 규약: 모든 엔드포인트는 `{ data, error }` 통일. 실패 시 HTTP status + `error.code`(예: `L3_NOT_AVAILABLE_YET`, `DEADLINE_PASSED`, `CONTENT_BLOCKED`).

---

## 4. 스케줄링 — Vercel Cron으로 통합 (Round 7)

**이전 설계는 Route Handler(Vercel) + Supabase Edge Function(Deno) + pg_cron(Postgres), 세 런타임에 로직이 흩어져 있었다. Round 7에서 정리:**

- **이벤트 기반 로직**(신고 접수 시 동결, 방 종료 시 처리 등)은 **별도 트리거/Edge Function이 아니라, 그 액션을 처리하는 Route Handler 안에 그대로 이어 쓴다.** 예: `POST /api/reports`가 report row를 insert하는 그 요청 안에서 바로 `rooms.frozen` 상태 반영까지 처리 — 별도 인프라 불필요.
- **시간 기반 로직만** 스케줄링이 필요하고, 이건 **Vercel Cron**이 아래 Route Handler들을 주기 호출하는 방식으로 처리한다 (Supabase pg_cron/Edge Function 미사용 — 런타임 하나를 통째로 제거).

| Vercel Cron 주기 | 호출 대상 | 동작 |
|---|---|---|
| 1~5분 | `POST /internal/cron/resolve-cards` | `deadline_at <= now() and status='open'` 카드 일괄 해소(§PRD #5) |
| 1분 | `POST /internal/cron/dispatch-notifications` | `notifications.status='pending'` 발송 (§9) |
| 일 1회 | `POST /internal/cron/cleanup-rooms` | 종료 48h 경과 room의 `messages` 하드 삭제 → `retention_archive` 이관(단 `reports.frozen_until` 걸린 room 제외) |

내부 cron 엔드포인트는 Vercel Cron의 secret header로만 호출 허용(공개 API 아님).

---

## 5. `masked_profile_view` — 프로필 간접 노출 로직 (P1 핵심)

`GET /api/cards/:id/applicants` 응답은 두 계층:

### 항상 노출 (경쟁 여부 무관)
신청 사유(`reason_text`), `phone_verified`, 완료/노쇼 이력 — **`reviews` 테이블에서 실시간 집계**(`count(attended=true)` / `count(attended=false)`, 캐시 컬럼 없음). 외모·매력이 아니라 약속 이행 사실이라 P1 제약 대상이 아님.

### 경쟁 시에만 추가 노출 (조건: `count(applications where card_id=X) > cards.capacity`)
- 블러 처리된 프로필 사진(원본 URL 미노출)
- 평점 지수·미팅 성사 지수(review 집계 기반, 산출식은 §12 다음 라운드 후보)
- 신청자가 사전에 공개 허용한 필드만 추가

조건 미충족 시 이 3개 필드는 응답에서 `null`. 경쟁 여부는 매 요청 실시간 계산(캐시하지 않음 — 신청 취소 시 즉시 반영).

---

## 6. 신고 상태 머신

```
open ──(admin 접수)──▶ reviewing ──(조사 완료)──▶ resolved
                                                    ├─ dismissed        (무혐의: 동결 해제)
                                                    ├─ warned           (경고: 동결 해제, admin_actions 기록)
                                                    ├─ suspended_temp   (일시정지 N일)
                                                    ├─ suspended_perm   (영구정지)
                                                    └─ escalated        (수사기관 협조 대상: 원본 데이터 전량 보존)
```

- `POST /api/reports` 요청 처리 안에서 즉시 해당 room `frozen_until` 설정(별도 트리거 아님, §4).
- SLA: `open → reviewing` 24h 이내 admin 픽업 목표(알림만, 강제 로직 아님).
- `escalated`/`suspended_perm`은 되돌릴 수 없음 — `resolved_at` 이후 update 차단.
- **유저 정지 실제 집행**: `suspended_temp`/`suspended_perm` 처리 시 서버가 **Supabase Auth Admin API**(`updateUserById`, `ban_duration`)를 호출해 `auth.users.banned_until`을 설정 — 로그인 자체가 막힘(별도 정지 플래그/미들웨어 불필요, 기존 Auth 기능 재사용).

---

## 7. 카드 검수 (Round 7: L3 하드 차단이 0순위로 이동)

### 판정 흐름 (`POST /api/cards`)
```
0. level = 'L3' → 카드 미생성, error.code='L3_NOT_AVAILABLE_YET' (V0.1은 L1만 오픈 — PRD §8)
1. banned_words severity='block' 매칭 (title/description/host_offer/cost_info 전체)
     → 카드 미생성, error.code='CONTENT_BLOCKED' (admin_actions에 시도만 기록)
2. banned_words severity='flag' 매칭 OR 현금성 패턴(전체 텍스트 필드) 매칭
     → status='pending_review' (검수 큐 대기, 피드 미노출)
3. 위 어느 것도 아니면 → status='open' 즉시 (L1/L2 대다수 — 공급 마찰 최소)
```

### banned_words 초기 시드
| severity | category_hint | 예시 |
|---|---|---|
| `block` | `emotional_vulnerability` | 실연, 우울, 외로움, 위로해줄 사람 등 (PRD P2 금지 목록) |
| `flag` | `cash_compensation` | 사례비, 페이, 용돈, 보상 |

### 검수 큐 처리
- `GET /api/admin/cards/review-queue` — moderator가 오래된 순 처리, `deadline_at` 임박 카드는 상단 고정
- 승인/반려 시 호스트에게 `notifications`(`type='card_review_resolved'`) 발송
- 반려 사유는 유저에게 일반화된 문구만(정확한 매칭 단어 비노출 — 필터 회피 방지)

---

## 8. 인증 프로바이더

- **카카오 로그인**: Supabase Auth 내장 Kakao Provider. 운영 작업: 카카오 디벨로퍼스 앱 등록.
- **휴대폰 인증**: 카카오와 분리된 자체 OTP(`phone_otp_requests` + 국내 SMS API). Supabase 내장 Phone Auth는 미사용(국내 통신사 지원 제한).
- Rate limit은 §11 코드 상수로 관리: OTP 만료 5분, 최대 시도 5회, 재전송 쿨다운 60초.

---

## 9. 알림 발송 — Web Push (Round 7: 재시도 단순화)

1. 이벤트 발생 → `notifications` insert (`status='pending'`)
2. Vercel Cron(1분 간격) → `pending` 행을 `push_subscriptions` endpoint로 발송
3. 성공 → `status='sent'`. 실패 → 5분 후 1회만 재시도, 그래도 실패 시 `status='failed'` 확정(admin 모니터링 큐 노출)

**Round 7 단순화**: 이전 3단계 재시도(즉시→5분→20분)를 1회 재시도로 축소 — V0.1 트래픽 규모에서 다단계 백오프의 실익이 낮고, 필요해지면 그때 늘린다.

- 죽은 구독(410 응답)은 즉시 `push_subscriptions`에서 삭제
- 동일 `type`+`user_id`+`card_id` 조합 24h 내 중복 발송 방지
- `subscription_match` payload에 상대방 식별 정보 절대 미포함 (호스트 구독 기각 원칙 연장)

---

## 10. 설정값 관리 — 코드 상수 (Round 7: DB 테이블에서 전환)

**이전 설계(`app_config` DB 테이블, admin API로 수정, 사후 로그)를 폐기하고 코드 상수로 전환.**

이유: PRD가 우려하는 건 "성장 압박으로 임계치를 몰래 낮추는 것"인데, DB row는 admin API 호출 한 번으로 조용히 바뀌고 사후 로그만 남는다. **코드 상수는 변경에 PR·코드리뷰가 강제되므로 오히려 더 강한 방어**이고, git 히스토리가 이미 완전한 감사 기록이다. V0.1 규모에서 "배포 없이 실시간으로 값을 바꿔야 하는" 실제 필요도 없다.

```ts
// shared/config.ts — FE/BE 공용, 값 변경은 반드시 PR을 거친다
export const APPLICATION_REASON_MAX_LENGTH = 100;
export const PHONE_OTP_EXPIRY_MINUTES = 5;
export const PHONE_OTP_MAX_ATTEMPTS = 5;
export const PHONE_OTP_RESEND_COOLDOWN_SECONDS = 60;
export const REPORT_SLA_HOURS = 24;
export const REPORT_SUSPENSION_DAYS = 7;
export const NOTIFICATION_DEDUP_WINDOW_HOURS = 24;
```

`GET /api/config`는 이 중 프론트에 필요한 값만 그대로 JSON으로 반환(DB 조회 없음, 그냥 상수 re-export).

V0.2에서 실제로 "배포 없이 조정" 필요성이 데이터로 확인되면, 그때 `app_config` 같은 테이블을 다시 검토한다(원안은 부록 A).

---

## 11. Admin 권한 — 단일 티어 (Round 7: 역할 분리 제거)

**이전 설계의 moderator/superadmin 2단계 분리는 "app_config 변경 권한을 좁히기 위해서"가 유일한 이유였는데, §10에서 config가 코드로 이동하면서 그 이유가 없어졌다.** PRD #9도 관리자 기능을 역할 구분 없이 요구한다 — V0.1은 `admin_users` 단일 티어.

- 최초 admin은 배포 마이그레이션에서 직접 insert (API로 "관리자 되기" 플로우 없음 — 권한 상승 공격면 차단)
- 이후 기존 admin이 `POST /api/admin/admins`로 추가/회수
- 역할 세분화(moderator/superadmin)는 실제로 관리자가 여러 명이 되고 권한 차등이 필요해질 때 재도입 — 지금은 YAGNI

---

## 12. 다음 라운드 후보 (백엔드)
- 법정 최소 로그 보존 기간 — 법무 검토 필요
- 평점 지수·미팅 성사 지수의 정확한 산출식 (지금은 개념만 존재)
- 현금성 패턴 정규식의 실제 규칙 목록 (운영 데이터 쌓이기 전엔 추정치)
- L3 오픈을 실제로 결정하는 시점 — 부록 A 원안 재검토

---

## 13. Round 7 결정 로그 — 무엇을 왜 잘랐는가

| 잘라낸 것 | 이유 |
|---|---|
| `attendance_records`(호스트 롤콜) + `system_inferred` 로직 | PRD §5가 "상대측 완료 확인 필수(파밍 방어)"를 **L3 행에만** 명시. L1은 "마찰 최소"가 원칙. L3는 V0.1에서 안 열리므로 지금 만들 이유가 없음 — 부록 A로 보존 |
| `profiles.trust_score` + 일 1회 재계산 | L3 게이팅에만 쓰이는 값. L3 자체가 없으니 필요 없음 |
| `profiles.age_verified` | L3 성인 KYC 전제 조건. 동일 이유로 보류(Round 4에서 이미 한 번 지적했던 것을 이번에 완전히 제거) |
| `profiles.open_report_count`/`completed_count`/`noshow_count` 캐시 컬럼 | V0.1 트래픽 규모에서 실시간 집계 쿼리로 충분. 캐시는 트리거 동기화가 깨지는 순간 조용히 틀린 값을 보여주는 버그 클래스를 연다 |
| `app_config` DB 테이블 (14개 키, public/internal 스코프, admin API, 감사로그) | 코드 상수 + PR 리뷰가 "몰래 임계치 낮추기"를 더 강하게 막는다. DB 기반 실시간 튜닝이 필요하다는 근거가 아직 없음 |
| `admin_users.role`(moderator/superadmin 분리) | 유일한 존재 이유(config 변경 권한 제한)가 위 항목 제거로 사라짐 |
| Supabase Edge Function / pg_cron을 별도 런타임으로 사용 | 대부분의 "트리거"는 이미 존재하는 Route Handler 안에 이어 쓰면 되는 코드였음. 시간 기반 작업만 Vercel Cron으로 통합해 런타임 하나를 제거 |
| 알림 재시도 3단계(즉시/5분/20분) | V0.1 트래픽에서 다단계 백오프의 실익이 낮음. 1회 재시도로 축소 |

---

## 부록 A — L3 준비 패키지 (보류, 원안 보존)

L3를 실제로 열기로 결정하는 시점에 아래를 다시 설계에 포함한다. Round 2·6에서 이미 한 번 구체화했던 내용이므로 완전히 새로 시작하지 않아도 됨.

- `attendance_records` 테이블(호스트 롤콜, 참여자별 attended/confirmed_by/confirmed_at) — 참여자 자기신고만으론 완료 카운트 불가, 호스트 확인 필수
- 호스트 본인 완료 이력: 참여자 중 1명 이상이 상호 확인(attendance_records + review 일치)되면 호스트 자신도 `system_inferred`로 자동 완료 인정
- `trust_score` 수식: `completed_count*15 + on_time_rate*20 + would_rejoin_rate*15 - noshow_count*25 - open_report_count*40`, 0~100 clamp, 최근 10건 기준
- L3 자격 조건: 성인 실제 인증 + 계정 3주 경과 + 상호확인 완료 2건(서로 다른 상대) + 진행 중 신고 없음 + trust_score≥60
- L3 카드 소그룹 강제: capacity 3~6명 CHECK 제약
- L3 카드 신고 임계치는 L1/L2보다 낮게(모니터링 강화)

---

*이 문서는 PRD P1~P5를 어기는 방향(프로필 원본 노출, 사람 구독, 개별 거절 통지 등)으로 절대 수정하지 않는다.*
