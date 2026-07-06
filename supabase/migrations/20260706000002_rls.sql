-- Mate V0.1 RLS policies
-- Source of truth: Mate_Backend_Spec.md §2 (Round 7). Keep both in sync.
-- Convention: tables with NO policy below are fully locked for `authenticated`/`anon` —
-- all access goes through Route Handlers using the service_role key (which bypasses RLS).
--
-- Helper functions below are all `security definer` + pinned `search_path` (Postgres/Supabase
-- best practice for SECURITY DEFINER — prevents search_path hijacking) so they bypass the
-- referenced table's own RLS. This matters concretely for reviews: a review is submitted
-- AFTER a room closes, but `rooms`' own RLS only shows rows where status='active' (P4 소멸
-- 즉시성). Without a bypass, the review-insert check would query `rooms`, get zero rows back
-- because the room is already closed, and incorrectly reject every legitimate review.

create or replace function is_admin() returns boolean
language sql security definer stable set search_path = public as $$
  select exists (select 1 from admin_users where user_id = auth.uid());
$$;

create or replace function is_card_host(p_card_id uuid) returns boolean
language sql security definer stable set search_path = public as $$
  select exists (select 1 from cards where id = p_card_id and host_id = auth.uid());
$$;

create or replace function is_approved_applicant(p_card_id uuid) returns boolean
language sql security definer stable set search_path = public as $$
  select exists (
    select 1 from applications
    where card_id = p_card_id and applicant_id = auth.uid() and status = 'approved'
  );
$$;

create or replace function room_card_id(p_room_id uuid) returns uuid
language sql security definer stable set search_path = public as $$
  select card_id from rooms where id = p_room_id;
$$;

create or replace function room_status(p_room_id uuid) returns text
language sql security definer stable set search_path = public as $$
  select status from rooms where id = p_room_id;
$$;

grant execute on function is_admin() to authenticated;
grant execute on function is_card_host(uuid) to authenticated;
grant execute on function is_approved_applicant(uuid) to authenticated;
grant execute on function room_card_id(uuid) to authenticated;
grant execute on function room_status(uuid) to authenticated;

-- ---------- profiles ----------
alter table profiles enable row level security;

create policy profiles_select_own on profiles
  for select using (id = auth.uid() or is_admin());

create policy profiles_insert_own on profiles
  for insert with check (id = auth.uid());

create policy profiles_update_own on profiles
  for update using (id = auth.uid()) with check (id = auth.uid());

-- ---------- cards ----------
alter table cards enable row level security;

-- 신청자 수 계산 시 select가 열려있어야 하므로 open 카드는 전체 공개, 본인 카드는 상태 무관 공개
create policy cards_select on cards
  for select using (status = 'open' or host_id = auth.uid() or is_admin());

-- insert/update/delete 정책 없음 — 카드 생성·상태 전이(검수 승인/반려/마감/취소)는
-- 전부 Route Handler가 service_role로 처리한다 (Mate_Backend_Spec.md §7 판정 흐름 우회 방지)

-- ---------- applications ----------
alter table applications enable row level security;

create policy applications_select on applications
  for select using (
    applicant_id = auth.uid() or is_card_host(card_id) or is_admin()
  );

create policy applications_insert_own on applications
  for insert with check (applicant_id = auth.uid());

-- update 정책 없음(Round 7 재검토: 이전 버전은 호스트에게 직접 update를 열어줬는데,
-- reason_text/applicant_id 등 다른 컬럼까지 덩달아 열리는 문제가 있었다 — RLS는 컬럼 단위
-- 제한이 안 되므로, cards와 동일하게 승인/거절은 POST /api/cards/:id/approve(service_role)로만 처리)

-- ---------- rooms / messages ----------
alter table rooms enable row level security;
alter table messages enable row level security;

-- P4: 소멸의 즉시성 — status='active'가 아니면 참여자여도 조회 불가
create policy rooms_select_participant on rooms
  for select using (
    (status = 'active' and (is_card_host(card_id) or is_approved_applicant(card_id)))
    or is_admin()
  );

create policy messages_select_participant on messages
  for select using (
    (room_status(room_id) = 'active'
      and (is_card_host(room_card_id(room_id)) or is_approved_applicant(room_card_id(room_id))))
    or is_admin()
  );

create policy messages_insert_participant on messages
  for insert with check (
    sender_id = auth.uid()
    and room_status(room_id) = 'active'
    and (is_card_host(room_card_id(room_id)) or is_approved_applicant(room_card_id(room_id)))
  );

-- ---------- reviews ----------
alter table reviews enable row level security;

create policy reviews_select_own on reviews
  for select using (user_id = auth.uid() or is_admin());

-- 후기는 방이 '종료(closed)'된 뒤에 제출된다 — rooms_select_participant는 status='active'일 때만
-- 보여주므로, 여기서 room_status()/room_card_id()(둘 다 security definer)로 우회해 확인한다.
create policy reviews_insert_own on reviews
  for insert with check (
    user_id = auth.uid()
    and room_status(room_id) = 'closed'
    and (is_card_host(room_card_id(room_id)) or is_approved_applicant(room_card_id(room_id)))
  );

-- ---------- subscriptions ----------
alter table subscriptions enable row level security;

create policy subscriptions_owner on subscriptions
  for all using (user_id = auth.uid()) with check (user_id = auth.uid());

-- ---------- push_subscriptions ----------
alter table push_subscriptions enable row level security;

create policy push_subscriptions_owner on push_subscriptions
  for all using (user_id = auth.uid()) with check (user_id = auth.uid());

-- ---------- notifications ----------
alter table notifications enable row level security;

create policy notifications_select_own on notifications
  for select using (user_id = auth.uid());
-- insert/update 정책 없음 — 발송 큐는 Vercel Cron + Route Handler(service_role)만 기록한다

-- ---------- reports ----------
alter table reports enable row level security;

create policy reports_select on reports
  for select using (reporter_id = auth.uid() or is_admin());

create policy reports_insert_own on reports
  for insert with check (
    reporter_id = auth.uid()
    and status = 'open'
    and resolution is null
  );
-- update(조사 상태 전환)는 정책 없음 — 반드시 POST /api/admin/reports/:id/resolve(service_role)를 거친다

-- ---------- admin-only tables: RLS enabled, service_role만 접근 (읽기 전용 예외는 is_admin() select) ----------
alter table admin_users enable row level security;
create policy admin_users_select_admin on admin_users for select using (is_admin());
-- insert/update/delete 정책 없음 — 최초 admin은 마이그레이션에서 직접 insert, 이후는 POST/DELETE /api/admin/admins(service_role)

alter table phone_otp_requests enable row level security;
-- 정책 없음 — client 접근 전면 차단, OTP 검증은 Route Handler(service_role)만

alter table banned_words enable row level security;
create policy banned_words_select_admin on banned_words for select using (is_admin());
-- insert/update/delete 정책 없음 — 금지어 관리는 POST /api/admin/*(service_role) 경유, 감사 로그 남기기 위함

alter table admin_actions enable row level security;
create policy admin_actions_select_admin on admin_actions for select using (is_admin());
-- insert 정책 없음 — 감사 로그는 항상 서버가 service_role로 기록

alter table retention_archive enable row level security;
-- 정책 없음 — 법정 보존 데이터는 client 접근 전면 차단
