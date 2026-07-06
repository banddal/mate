-- Mate V0.1 schema
-- Source of truth: Mate_Backend_Spec.md (Round 7). Keep both in sync.

create extension if not exists pgcrypto;

-- profiles: auth.users 확장. completed_count/noshow_count는 저장하지 않고 reviews 집계로 계산한다.
create table profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  nickname text not null,
  age_range text not null,
  gender text not null,
  categories text[] not null default '{}',
  phone_verified boolean not null default false,
  created_at timestamptz not null default now()
);

-- cards: 상황 카드. level='L3'는 스키마만 존재 — V0.1은 API 레이어에서 생성 자체를 차단한다.
create table cards (
  id uuid primary key default gen_random_uuid(),
  host_id uuid not null references profiles(id),
  title text not null,
  category text not null,
  level text not null check (level in ('L1','L2','L3')),
  event_datetime timestamptz not null,
  location text not null,
  capacity int not null check (capacity > 0),
  host_offer text not null,
  cost_info text,
  description text not null,
  deadline_at timestamptz not null,
  status text not null default 'pending_review' check (status in ('pending_review','open','closed','cancelled','rejected')),
  rejection_reason text,
  created_at timestamptz not null default now()
);
create index cards_status_idx on cards (status);
create index cards_host_id_idx on cards (host_id);
create index cards_deadline_idx on cards (deadline_at) where status = 'open';

-- applications: 신청
create table applications (
  id uuid primary key default gen_random_uuid(),
  card_id uuid not null references cards(id) on delete cascade,
  applicant_id uuid not null references profiles(id),
  reason_text text not null check (char_length(reason_text) <= 100),
  status text not null default 'pending' check (status in ('pending','approved','rejected_closed')),
  created_at timestamptz not null default now(),
  unique (card_id, applicant_id)
);
create index applications_card_id_idx on applications (card_id);

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
  room_id uuid not null references rooms(id) on delete cascade,
  sender_id uuid not null references profiles(id),
  body text not null,
  created_at timestamptz not null default now()
);
create index messages_room_id_idx on messages (room_id);

-- reviews: 사실 체크 4개. completed_count/noshow_count의 유일한 근거 테이블(자기신고, L1 저마찰 원칙)
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
create index reviews_user_id_idx on reviews (user_id);

-- subscriptions: 상황 템플릿만 (사람 구독 필드 자체가 존재하지 않음 — 원천 차단)
create table subscriptions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references profiles(id) on delete cascade,
  location text not null,
  time_pattern text not null,
  category text not null,
  created_at timestamptz not null default now()
);

-- reports: 신고 조사 상태만 관리. room 동결 여부는 frozen_until로 별도 관리(투 트랙)
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
  user_id uuid not null references profiles(id) on delete cascade,
  endpoint text not null unique,
  p256dh text not null,
  auth_key text not null,
  created_at timestamptz not null default now()
);

-- notifications: 발송 큐
create table notifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references profiles(id) on delete cascade,
  type text not null check (type in (
    'card_deadline_imminent','application_resolved','subscription_match',
    'report_status_change','card_review_resolved'
  )),
  payload jsonb not null,
  status text not null default 'pending' check (status in ('pending','sent','failed')),
  attempts integer not null default 0,
  last_attempt_at timestamptz,
  created_at timestamptz not null default now()
);
create index notifications_pending_idx on notifications (status) where status = 'pending';

-- admin_users: 단일 티어 (V0.1은 role 구분 없음)
create table admin_users (
  user_id uuid primary key references profiles(id),
  granted_by uuid references profiles(id),
  granted_at timestamptz not null default now()
);

-- phone_otp_requests: 카카오 로그인과 별개인 휴대폰 본인확인 절차
create table phone_otp_requests (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references profiles(id) on delete cascade,
  phone_number text not null,
  otp_hash text not null,
  expires_at timestamptz not null,
  verified_at timestamptz,
  attempt_count integer not null default 0,
  created_at timestamptz not null default now()
);

-- banned_words / admin_actions / retention_archive
create table banned_words (
  id uuid primary key default gen_random_uuid(),
  word text not null,
  severity text not null check (severity in ('block','flag')),
  category_hint text
);

create table admin_actions (
  id uuid primary key default gen_random_uuid(),
  admin_id uuid not null references profiles(id),
  action_type text not null,
  target_id uuid,
  notes text,
  created_at timestamptz not null default now()
);

create table retention_archive (
  id uuid primary key default gen_random_uuid(),
  room_id uuid not null,
  archived_payload jsonb not null,
  reason text not null check (reason in ('standard_retention','report_freeze')),
  created_at timestamptz not null default now()
);
