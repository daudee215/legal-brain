-- Client status links: a private, read-only page that tells a client where their case stands.
-- This is the ONLY data in the app that can be read without signing in, so it is deliberately narrow:
--   * nobody (not even members) can read or write the table directly — only the functions below;
--   * the public reader get_case_status() returns a fixed, small set of fields, copied one by one as text;
--   * every failure (unknown, expired, revoked, case deleted, chamber gone) returns the same null.
-- Safe to run more than once. Run in the Supabase SQL editor AFTER schema.sql and role-guard.sql.

-- ── Table ────────────────────────────────────────────────────────────────────
-- token: 32 random bytes (two random UUIDs, ~244 random bits) as url-safe base64 without padding, 43 characters — not guessable.
-- Built from gen_random_uuid(), which is part of Postgres itself (pgcrypto's gen_random_bytes lives in another schema on Supabase
-- and would not be found by functions that pin search_path = public).
create table if not exists public.status_links (
  token text primary key default translate(encode(decode(replace(gen_random_uuid()::text || gen_random_uuid()::text, '-', ''), 'hex'), 'base64'), '+/=', '-_'),
  chamber_id uuid not null references public.chambers (id) on delete cascade,
  case_id text not null check (char_length(case_id) between 1 and 200),
  created_by uuid references auth.users (id) on delete set null,
  created_at timestamptz not null default now(),
  expires_at timestamptz not null,
  revoked_at timestamptz,
  show_last_note boolean not null default false,
  label text not null default '' check (char_length(label) <= 80),
  constraint status_links_token_shape check (token ~ '^[A-Za-z0-9_-]{43}$')
);
create index if not exists status_links_case on public.status_links (chamber_id, case_id, created_at desc);

alter table public.status_links enable row level security;
-- No policies on purpose: with RLS on and no policy, direct table access returns nothing.
-- Supabase grants new tables to anon/authenticated by default, so take that away explicitly too.
revoke all on table public.status_links from public, anon, authenticated;

-- ── Who may manage links ─────────────────────────────────────────────────────
-- A member whose role (or own rights) allows 'cases.edit', judged against the chamber's CURRENT saved
-- settings by the same rule the save guard uses (role-guard.sql). Seniors always may.
create or replace function public.status_link_allowed(p_chamber uuid)
returns boolean language plpgsql stable security definer set search_path = public as $$
declare v_role text; v_data jsonb;
begin
  if auth.uid() is null or p_chamber is null then return false; end if;
  v_role := public.member_role(p_chamber);
  if v_role is null then return false; end if;
  select data into v_data from public.chamber_data where chamber_id = p_chamber;
  return public.role_allows(v_role, 'cases.edit', coalesce(v_data, '{}'::jsonb), auth.uid());
end $$;

-- The case object with this id in the chamber's data, or null.
create or replace function public.status_link_case(p_chamber uuid, p_case_id text)
returns jsonb language sql stable security definer set search_path = public as $$
  select c
  from public.chamber_data d, jsonb_array_elements(public.json_list(d.data -> 'cases')) c
  where d.chamber_id = p_chamber and jsonb_typeof(c) = 'object' and c ->> 'id' = p_case_id
  limit 1
$$;

-- ── Create / revoke / list (signed-in members only) ──────────────────────────
-- Returns the new token. Days are clamped to 1..90. The case must exist in that chamber.
create or replace function public.create_status_link(p_chamber uuid, p_case_id text, p_days int, p_show_last_note boolean, p_label text)
returns text language plpgsql volatile security definer set search_path = public as $$
declare v_token text; v_days int;
begin
  if not public.status_link_allowed(p_chamber) then
    raise exception 'forbidden: you may not share case status' using errcode = '42501';
  end if;
  if p_case_id is null or public.status_link_case(p_chamber, p_case_id) is null then
    raise exception 'case not found';
  end if;
  v_days := least(greatest(coalesce(p_days, 7), 1), 90);
  -- housekeeping: forget links that ended more than 30 days ago
  delete from public.status_links
    where chamber_id = p_chamber and (expires_at < now() - interval '30 days' or revoked_at < now() - interval '30 days');
  -- cheap flood guard: a chamber never needs this many live links
  if (select count(*) from public.status_links where chamber_id = p_chamber and revoked_at is null and expires_at > now()) >= 500 then
    raise exception 'too many active status links — revoke some first';
  end if;
  insert into public.status_links (chamber_id, case_id, created_by, expires_at, show_last_note, label)
    values (p_chamber, p_case_id, auth.uid(), now() + make_interval(days => v_days), coalesce(p_show_last_note, false),
            left(trim(coalesce(p_label, '')), 80))
    returning token into v_token;
  return v_token;
end $$;

-- Stop a link working at once. Unknown tokens and other chambers' tokens give the same answer.
create or replace function public.revoke_status_link(p_token text)
returns void language plpgsql volatile security definer set search_path = public as $$
declare v_chamber uuid;
begin
  select chamber_id into v_chamber from public.status_links where token = p_token;
  if v_chamber is null or not public.status_link_allowed(v_chamber) then
    raise exception 'status link not found';
  end if;
  update public.status_links set revoked_at = now() where token = p_token and revoked_at is null;
end $$;

-- Links still working for one case (or the whole chamber when p_case_id is null), newest first.
create or replace function public.list_status_links(p_chamber uuid, p_case_id text)
returns table (token text, case_id text, label text, created_at timestamptz, expires_at timestamptz, show_last_note boolean)
language plpgsql stable security definer set search_path = public as $$
begin
  if not public.status_link_allowed(p_chamber) then
    raise exception 'forbidden: you may not share case status' using errcode = '42501';
  end if;
  return query
    select l.token, l.case_id, l.label, l.created_at, l.expires_at, l.show_last_note
    from public.status_links l
    where l.chamber_id = p_chamber
      and (p_case_id is null or l.case_id = p_case_id)
      and l.revoked_at is null and l.expires_at > now()
    order by l.created_at desc
    limit 100;
end $$;

-- ── The public reader ────────────────────────────────────────────────────────
-- Anyone holding a live token gets ONLY: chamberName, caseTitle, caseNo, courtId, stage, status, nextHearing,
-- and — only when the advocate ticked it — lastHearing {date, proceedings}. Every value is read as text and
-- length-capped, so nothing else stored on the case (client, fees, notes, people, documents) can ride along.
-- Every kind of failure returns the same null.
create or replace function public.get_case_status(p_token text)
returns jsonb language plpgsql stable security definer set search_path = public as $$
declare
  v_link public.status_links;
  v_case jsonb;
  v_name text;
  v_status text;
  v_last jsonb;
  v_out jsonb;
begin
  if p_token is null or p_token !~ '^[A-Za-z0-9_-]{43}$' then return null; end if;
  select * into v_link from public.status_links
    where token = p_token and revoked_at is null and expires_at > now();
  if not found then return null; end if;
  -- the case must still exist (a deleted case kills its links)
  v_case := public.status_link_case(v_link.chamber_id, v_link.case_id);
  if v_case is null then return null; end if;
  select name into v_name from public.chambers where id = v_link.chamber_id;
  if v_name is null then return null; end if;

  v_status := v_case ->> 'status';
  if v_status not in ('pending', 'adjourned', 'reserved', 'decided', 'disposed') then v_status := null; end if;

  v_out := jsonb_build_object(
    'chamberName', left(v_name, 120),
    'caseTitle', left(coalesce(v_case ->> 'title', ''), 300),
    'caseNo', left(coalesce(v_case ->> 'caseNo', ''), 120),
    'courtId', left(coalesce(v_case ->> 'courtId', ''), 60),
    'stage', left(coalesce(v_case ->> 'stage', ''), 120),
    'status', v_status,
    'nextHearing', left(nullif(v_case ->> 'nextHearing', ''), 40)
  );

  if v_link.show_last_note then
    select jsonb_build_object('date', left(h ->> 'date', 40), 'proceedings', left(coalesce(h ->> 'proceedings', ''), 1500))
      into v_last
      from jsonb_array_elements(public.json_list(v_case -> 'hearings')) h
      where jsonb_typeof(h) = 'object' and coalesce(h ->> 'date', '') <> ''
      order by h ->> 'date' desc
      limit 1;
    if v_last is not null then v_out := v_out || jsonb_build_object('lastHearing', v_last); end if;
  end if;
  return v_out;
end $$;

-- ── Who may call what ────────────────────────────────────────────────────────
-- Supabase grants new functions to anon by default; take everything away, then give back only what is meant.
revoke all on function public.status_link_allowed(uuid) from public, anon, authenticated;
revoke all on function public.status_link_case(uuid, text) from public, anon, authenticated;
revoke all on function public.create_status_link(uuid, text, int, boolean, text) from public, anon;
revoke all on function public.revoke_status_link(text) from public, anon;
revoke all on function public.list_status_links(uuid, text) from public, anon;
revoke all on function public.get_case_status(text) from public;
grant execute on function public.create_status_link(uuid, text, int, boolean, text) to authenticated;
grant execute on function public.revoke_status_link(text) to authenticated;
grant execute on function public.list_status_links(uuid, text) to authenticated;
grant execute on function public.get_case_status(text) to anon, authenticated;

-- Quick self-check (run after applying):
--   -- nobody reads the table directly (both should fail with "permission denied"):
--   set role anon; select * from public.status_links; reset role;
--   set role authenticated; select * from public.status_links; reset role;
--   -- the public reader answers null for anything that is not a live token (each should return true):
--   select public.get_case_status(null) is null;
--   select public.get_case_status('short') is null;
--   select public.get_case_status(repeat('A', 43)) is null;
--   -- anon may call only the reader (has_function_privilege should be true, then false, false, false):
--   select has_function_privilege('anon', 'public.get_case_status(text)', 'execute');
--   select has_function_privilege('anon', 'public.create_status_link(uuid, text, integer, boolean, text)', 'execute');
--   select has_function_privilege('anon', 'public.list_status_links(uuid, text)', 'execute');
--   select has_function_privilege('anon', 'public.status_link_allowed(uuid)', 'execute');
--   -- a fresh token is 43 url-safe characters:
--   select translate(encode(decode(replace(gen_random_uuid()::text || gen_random_uuid()::text, '-', ''), 'hex'), 'base64'), '+/=', '-_') ~ '^[A-Za-z0-9_-]{43}
--   -- after creating a link in the app, check what the client would see (no phone, fees or notes):
--   select public.get_case_status(token) from public.status_links order by created_at desc limit 1;
;
--   -- after creating a link in the app, check what the client would see (no phone, fees or notes):
--   select public.get_case_status(token) from public.status_links order by created_at desc limit 1;
