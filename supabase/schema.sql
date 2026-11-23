-- Legal Brain — cloud schema (Phase 2).
-- Run once in Supabase: Dashboard → SQL Editor → New query → paste → Run. Safe to re-run.
--
-- Model: each chamber's practice data is one JSON document, split in two rows so the database itself
-- enforces privacy: 'chamber_data' (cases, clients, diary, tasks…) is readable by every member;
-- 'chamber_billing' (fees, expenses) only by seniors. Writes use optimistic versioning; the app merges.

create extension if not exists pgcrypto;

-- ── Tables ────────────────────────────────────────────────────────────────────
create table if not exists public.chambers (
  id uuid primary key default gen_random_uuid(),
  name text not null check (char_length(name) between 1 and 120),
  created_by uuid not null references auth.users (id),
  created_at timestamptz not null default now()
);

create table if not exists public.members (
  chamber_id uuid not null references public.chambers (id) on delete cascade,
  user_id uuid not null references auth.users (id) on delete cascade,
  role text not null check (role in ('senior', 'junior', 'clerk')),
  name text not null check (char_length(name) between 1 and 120),
  email text not null default '',
  joined_at timestamptz not null default now(),
  primary key (chamber_id, user_id)
);

create table if not exists public.invites (
  code text primary key default encode(gen_random_bytes(12), 'hex'),
  chamber_id uuid not null references public.chambers (id) on delete cascade,
  role text not null check (role in ('senior', 'junior', 'clerk')),
  note text not null default '',
  created_by uuid not null references auth.users (id),
  created_at timestamptz not null default now(),
  expires_at timestamptz not null default now() + interval '14 days',
  used_by uuid references auth.users (id),
  used_at timestamptz
);

create table if not exists public.chamber_data (
  chamber_id uuid primary key references public.chambers (id) on delete cascade,
  data jsonb not null default '{}'::jsonb,
  version bigint not null default 1,
  updated_at timestamptz not null default now(),
  updated_by uuid references auth.users (id)
);

create table if not exists public.chamber_billing (
  chamber_id uuid primary key references public.chambers (id) on delete cascade,
  data jsonb not null default '{}'::jsonb,
  version bigint not null default 1,
  updated_at timestamptz not null default now(),
  updated_by uuid references auth.users (id)
);

-- ── Helpers (security definer so policies can look up membership without recursion) ──
create or replace function public.member_role(p_chamber uuid)
returns text language sql stable security definer set search_path = public as $$
  select role from public.members where chamber_id = p_chamber and user_id = auth.uid()
$$;

create or replace function public.is_member(p_chamber uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.members where chamber_id = p_chamber and user_id = auth.uid())
$$;

-- ── Row-level security ───────────────────────────────────────────────────────
alter table public.chambers enable row level security;
alter table public.members enable row level security;
alter table public.invites enable row level security;
alter table public.chamber_data enable row level security;
alter table public.chamber_billing enable row level security;

drop policy if exists chambers_read on public.chambers;
create policy chambers_read on public.chambers for select using (public.is_member(id));
drop policy if exists chambers_rename on public.chambers;
create policy chambers_rename on public.chambers for update using (public.member_role(id) = 'senior');

drop policy if exists members_read on public.members;
create policy members_read on public.members for select using (public.is_member(chamber_id));
drop policy if exists members_manage on public.members;
create policy members_manage on public.members for update using (public.member_role(chamber_id) = 'senior');
drop policy if exists members_remove on public.members;
create policy members_remove on public.members for delete
  using (public.member_role(chamber_id) = 'senior' or user_id = auth.uid());

drop policy if exists invites_senior on public.invites;
create policy invites_senior on public.invites for all
  using (public.member_role(chamber_id) = 'senior')
  with check (public.member_role(chamber_id) = 'senior' and created_by = auth.uid());

drop policy if exists data_read on public.chamber_data;
create policy data_read on public.chamber_data for select using (public.is_member(chamber_id));
-- writes go through save_chamber_doc() only (no direct insert/update policy)

drop policy if exists billing_read on public.chamber_billing;
create policy billing_read on public.chamber_billing for select using (public.member_role(chamber_id) = 'senior');

-- ── RPCs ─────────────────────────────────────────────────────────────────────
-- Create a chamber with the caller as its first senior member.
create or replace function public.create_chamber(p_name text, p_my_name text)
returns uuid language plpgsql security definer set search_path = public as $$
declare v_id uuid; v_email text;
begin
  if auth.uid() is null then raise exception 'not signed in'; end if;
  select email into v_email from auth.users where id = auth.uid();
  insert into public.chambers (name, created_by) values (trim(p_name), auth.uid()) returning id into v_id;
  insert into public.members (chamber_id, user_id, role, name, email) values (v_id, auth.uid(), 'senior', trim(p_my_name), coalesce(v_email, ''));
  insert into public.chamber_data (chamber_id, updated_by) values (v_id, auth.uid());
  insert into public.chamber_billing (chamber_id, updated_by) values (v_id, auth.uid());
  return v_id;
end $$;

-- Join a chamber with an invite code. Returns the chamber id.
create or replace function public.accept_invite(p_code text, p_my_name text)
returns uuid language plpgsql security definer set search_path = public as $$
declare v_inv public.invites; v_email text;
begin
  if auth.uid() is null then raise exception 'not signed in'; end if;
  select * into v_inv from public.invites where code = p_code for update;
  if not found then raise exception 'invite not found'; end if;
  if v_inv.used_at is not null then raise exception 'invite already used'; end if;
  if v_inv.expires_at < now() then raise exception 'invite expired'; end if;
  select email into v_email from auth.users where id = auth.uid();
  insert into public.members (chamber_id, user_id, role, name, email)
    values (v_inv.chamber_id, auth.uid(), v_inv.role, trim(p_my_name), coalesce(v_email, ''))
    on conflict (chamber_id, user_id) do update set role = excluded.role;
  update public.invites set used_by = auth.uid(), used_at = now() where code = p_code;
  return v_inv.chamber_id;
end $$;

-- What an invite is for (chamber name + role), readable before joining.
create or replace function public.peek_invite(p_code text)
returns table (chamber_name text, role text, expired boolean, used boolean)
language sql stable security definer set search_path = public as $$
  select c.name, i.role, i.expires_at < now(), i.used_at is not null
  from public.invites i join public.chambers c on c.id = i.chamber_id where i.code = p_code
$$;

-- Save one half of the chamber document if nobody else saved since 'p_expected'.
-- Returns the new version, or -1 on a version conflict (the app then merges and retries).
create or replace function public.save_chamber_doc(p_chamber uuid, p_kind text, p_data jsonb, p_expected bigint)
returns bigint language plpgsql security definer set search_path = public as $$
declare v_role text; v_new bigint;
begin
  v_role := public.member_role(p_chamber);
  if v_role is null then raise exception 'not a member of this chamber'; end if;
  if p_kind = 'data' then
    update public.chamber_data set data = p_data, version = version + 1, updated_at = now(), updated_by = auth.uid()
      where chamber_id = p_chamber and version = p_expected returning version into v_new;
  elsif p_kind = 'billing' then
    if v_role <> 'senior' then raise exception 'only a senior can change fees'; end if;
    update public.chamber_billing set data = p_data, version = version + 1, updated_at = now(), updated_by = auth.uid()
      where chamber_id = p_chamber and version = p_expected returning version into v_new;
  else
    raise exception 'unknown kind %', p_kind;
  end if;
  return coalesce(v_new, -1);
end $$;

revoke all on function public.create_chamber(text, text) from public, anon;
revoke all on function public.accept_invite(text, text) from public, anon;
revoke all on function public.save_chamber_doc(uuid, text, jsonb, bigint) from public, anon;
grant execute on function public.create_chamber(text, text) to authenticated;
grant execute on function public.accept_invite(text, text) to authenticated;
grant execute on function public.save_chamber_doc(uuid, text, jsonb, bigint) to authenticated;
grant execute on function public.peek_invite(text) to anon, authenticated;
grant execute on function public.member_role(uuid) to authenticated;
grant execute on function public.is_member(uuid) to authenticated;

-- Table privileges (new projects may not grant API access automatically; RLS still decides which rows).
grant usage on schema public to anon, authenticated;
grant select, update on public.chambers to authenticated;
grant select, update, delete on public.members to authenticated;
grant select, insert, update, delete on public.invites to authenticated;
grant select on public.chamber_data to authenticated;
grant select on public.chamber_billing to authenticated;

-- ── Realtime: other devices hear about saves ───────────────────────────────────
do $$ begin
  begin alter publication supabase_realtime add table public.chamber_data; exception when duplicate_object then null; end;
  begin alter publication supabase_realtime add table public.chamber_billing; exception when duplicate_object then null; end;
end $$;
