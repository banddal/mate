-- 평점 지수 / 미팅 성사 지수 (Round 8) — Mate_Backend_Spec.md §5 masked_profile_view가 쓰는 값
--
-- ⚠️ 이 두 함수는 다른 SECURITY DEFINER 헬퍼(is_card_host 등)와 성격이 다르다 — 저 함수들은
-- "나와 이 자원의 관계"만 반환하지만, 이 함수들은 임의의 p_user_id를 받아 그 사람의 행동 이력을
-- 집계해서 돌려준다. `authenticated`에 EXECUTE를 열면 누구나 다른 유저의 지수를 직접 RPC로
-- 조회할 수 있게 되어 "경쟁 발생 시에만 노출"(§5) 규칙을 완전히 우회한다.
-- 그래서 이 두 함수는 **service_role 전용**으로 잠그고(EXECUTE를 PUBLIC/authenticated/anon에서
-- 명시적으로 revoke), Route Handler(§5 masked_profile_view 로직)만 호출한다.

create or replace function meeting_success_index(p_user_id uuid) returns integer
language sql stable security definer set search_path = public as $$
  select case when denom < 2 then null else round(100.0 * numer / denom)::int end
  from (
    select
      (select count(*) from applications where applicant_id = p_user_id and status = 'approved') as denom,
      (select count(*) from reviews r join applications a
         on a.applicant_id = r.user_id
        where r.user_id = p_user_id and r.attended = true) as numer
  ) t;
$$;
comment on function meeting_success_index(uuid) is
  '승인된 신청 대비 실제 참석 비율(%). 표본 2건 미만이면 null("신규"로 표시). 경쟁 발생 시에만 노출(§5) — service_role 전용.';

create or replace function rating_index(p_user_id uuid) returns integer
language sql stable security definer set search_path = public as $$
  select case when denom < 2 then null else round(100.0 * numer / denom)::int end
  from (
    select
      (select count(*) from reviews where user_id = p_user_id and attended = true) as denom,
      (select count(*) from reviews where user_id = p_user_id and attended = true and on_time = true) as numer
  ) t;
$$;
comment on function rating_index(uuid) is
  '실제 참석한 모임 중 시간을 지킨 비율(%). matches_description/would_rejoin은 이 사람이 아니라
   호스트·카드에 대한 평가라 의도적으로 제외(P5: 매력·호감 점수 금지). 표본 2건 미만이면 null.
   경쟁 발생 시에만 노출(§5) — service_role 전용.';

revoke execute on function meeting_success_index(uuid) from public, authenticated, anon;
revoke execute on function rating_index(uuid) from public, authenticated, anon;
