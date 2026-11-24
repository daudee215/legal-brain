-- Safety nets: nightly restore points + a "who changed what" activity log.
-- Safe to run more than once. Run in the Supabase SQL editor AFTER role-guard.sql (it replaces save_chamber_doc).

-- ── Restore points ───────────────────────────────────────────────────────────
create table if not exists public.chamber_backups (
  id uuid primary key default gen_random_uuid(),
  chamber_id uuid not null references public.chambers (id) on delete cascade,
  kind text not null check (kind in ('data', 'billing')),
  taken_at timestamptz not null default now(),
  version bigint,
  reason text not null default 'nightly',
  summary jsonb not null default '{}'::jsonb,
  data jsonb not null
);
create index if not exists chamber_backups_lookup on public.chamber_backups (chamber_id, kind, taken_at desc);

-- ── Activity log ─────────────────────────────────────────────────────────────
create table if not exists public.chamber_activity (
  id bigint generated always as identity primary key,
  chamber_id uuid not null references public.chambers (id) on delete cascade,
  at timestamptz not null default now(),
  user_id uuid,
  user_name text not null default '',
  role text not null default '',
  kind text not null default 'data',
  lines jsonb not null default '[]'::jsonb
);
create index if not exists chamber_activity_lookup on public.chamber_activity (chamber_id, at desc);

alter table public.chamber_backups enable row level security;
alter table public.chamber_activity enable row level security;
drop policy if exists backups_senior_read on public.chamber_backups;
create policy backups_senior_read on public.chamber_backups for select using (public.member_role(chamber_id) = 'senior');
drop policy if exists activity_senior_read on public.chamber_activity;
create policy activity_senior_read on public.chamber_activity for select using (public.member_role(chamber_id) = 'senior');
grant select on public.chamber_backups, public.chamber_activity to authenticated;

-- ── Helpers ──────────────────────────────────────────────────────────────────
create or replace function public.json_label(j jsonb)
returns text language sql immutable as $$
  select left(coalesce(
    nullif(j ->> 'title', ''), nullif(j ->> 'name', ''), nullif(j ->> 'caseNo', ''), nullif(j ->> 'citation', ''),
    nullif(j ->> 'text', ''), nullif(j ->> 'note', ''), nullif(j ->> 'id', ''), ''), 60)
$$;

-- What changed between two copies of the data: one line per added / removed / changed item (at most 25).
create or replace function public.diff_lines(p_old jsonb, p_new jsonb)
returns jsonb language plpgsql immutable as $$
declare
  k text; o jsonb; n jsonb; out jsonb := '[]'::jsonb; cnt int := 0; r record;
begin
  p_old := case when jsonb_typeof(p_old) = 'object' then p_old else '{}'::jsonb end;
  p_new := case when jsonb_typeof(p_new) = 'object' then p_new else '{}'::jsonb end;
  for k in select key from (select jsonb_object_keys(p_old) as key union select jsonb_object_keys(p_new)) s order by key loop
    o := public.json_list(p_old -> k);
    n := public.json_list(p_new -> k);
    if o = n then continue; end if;
    if k = 'settings' then
      out := out || jsonb_build_array(jsonb_build_object('k', k, 'op', 'changed', 'label', ''));
      cnt := cnt + 1;
      continue;
    end if;
    for r in
      with oi as (select coalesce(e ->> 'id', md5(e::text)) as id, e from jsonb_array_elements(o) e),
           ni as (select coalesce(e ->> 'id', md5(e::text)) as id, e from jsonb_array_elements(n) e)
      select case when oi.id is null then 'added' when ni.id is null then 'removed' else 'changed' end as op,
             public.json_label(coalesce(ni.e, oi.e)) as label
      from oi full join ni on oi.id = ni.id
      where oi.id is null or ni.id is null or oi.e <> ni.e
      order by 1, 2
    loop
      cnt := cnt + 1;
      if cnt <= 25 then
        out := out || jsonb_build_array(jsonb_build_object('k', k, 'op', r.op, 'label', r.label));
      end if;
    end loop;
  end loop;
  if cnt > 25 then
    out := out || jsonb_build_array(jsonb_build_object('k', '', 'op', 'more', 'label', (cnt - 25)::text));
  end if;
  return out;
end $$;

create or replace function public.backup_summary(p_data jsonb)
returns jsonb language sql immutable as $$
  select coalesce(jsonb_object_agg(key, jsonb_array_length(public.json_list(value))), '{}'::jsonb)
  from jsonb_each(case when jsonb_typeof(p_data) = 'object' then p_data else '{}'::jsonb end)
$$;

-- Save a restore point of one chamber (or all, with null). Skips a point identical to the latest one unless forced.
create or replace function public.take_backups(p_chamber uuid, p_reason text, p_force boolean default false)
returns int language plpgsql security definer set search_path = public as $$
declare n int := 0; r record; last_data jsonb;
begin
  for r in
    select chamber_id, 'data'::text as kind, data, version from public.chamber_data where p_chamber is null or chamber_id = p_chamber
    union all
    select chamber_id, 'billing', data, version from public.chamber_billing where p_chamber is null or chamber_id = p_chamber
  loop
    select b.data into last_data from public.chamber_backups b
      where b.chamber_id = r.chamber_id and b.kind = r.kind order by b.taken_at desc limit 1;
    if not p_force and last_data is not null and last_data = r.data then continue; end if;
    insert into public.chamber_backups (chamber_id, kind, version, reason, summary, data)
      values (r.chamber_id, r.kind, r.version, p_reason, public.backup_summary(r.data), r.data);
    n := n + 1;
    delete from public.chamber_backups b
      where b.chamber_id = r.chamber_id and b.kind = r.kind
        and b.id not in (select id from public.chamber_backups x where x.chamber_id = r.chamber_id and x.kind = r.kind order by x.taken_at desc limit 40);
  end loop;
  return n;
end $$;

-- Senior button: "Save a restore point now".
create or replace function public.take_backup_now(p_chamber uuid)
returns int language plpgsql security definer set search_path = public as $$
begin
  if public.member_role(p_chamber) is distinct from 'senior' then raise exception 'only the senior advocate can do this'; end if;
  return public.take_backups(p_chamber, 'manual', true);
end $$;

-- Senior button: go back to a restore point. The current state is saved first, so a restore can itself be undone.
create or replace function public.restore_backup(p_backup uuid)
returns bigint language plpgsql security definer set search_path = public as $$
declare b public.chamber_backups; v_new bigint; v_name text;
begin
  select * into b from public.chamber_backups where id = p_backup;
  if not found then raise exception 'restore point not found'; end if;
  if public.member_role(b.chamber_id) is distinct from 'senior' then raise exception 'only the senior advocate can do this'; end if;
  perform public.take_backups(b.chamber_id, 'before-restore', true);
  if b.kind = 'data' then
    update public.chamber_data set data = b.data, version = version + 1, updated_at = now(), updated_by = auth.uid()
      where chamber_id = b.chamber_id returning version into v_new;
  else
    update public.chamber_billing set data = b.data, version = version + 1, updated_at = now(), updated_by = auth.uid()
      where chamber_id = b.chamber_id returning version into v_new;
  end if;
  select name into v_name from public.members where chamber_id = b.chamber_id and user_id = auth.uid();
  insert into public.chamber_activity (chamber_id, user_id, user_name, role, kind, lines)
    values (b.chamber_id, auth.uid(), coalesce(v_name, ''), 'senior', b.kind,
            jsonb_build_array(jsonb_build_object('k', '', 'op', 'restored', 'label', to_char(b.taken_at at time zone 'Asia/Karachi', 'YYYY-MM-DD HH24:MI'))));
  return v_new;
end $$;

-- ── save_chamber_doc: same rules as role-guard.sql, now also writing the activity log ──
create or replace function public.save_chamber_doc(p_chamber uuid, p_kind text, p_data jsonb, p_expected bigint)
returns bigint language plpgsql security definer set search_path = public as $$
declare v_role text; v_new bigint; v_old jsonb; v_ver bigint; v_problem text; v_name text; v_lines jsonb;
begin
  v_role := public.member_role(p_chamber);
  if v_role is null then raise exception 'not a member of this chamber'; end if;
  select name into v_name from public.members where chamber_id = p_chamber and user_id = auth.uid();
  if p_kind = 'data' then
    select data, version into v_old, v_ver from public.chamber_data where chamber_id = p_chamber for update;
    if not found or v_ver <> p_expected then return -1; end if;
    v_problem := public.data_change_problem(v_role, v_old, p_data, auth.uid());
    if v_problem is not null then
      raise exception 'forbidden: your role may not change "%"', v_problem using errcode = '42501';
    end if;
    update public.chamber_data set data = p_data, version = version + 1, updated_at = now(), updated_by = auth.uid()
      where chamber_id = p_chamber returning version into v_new;
  elsif p_kind = 'billing' then
    if v_role <> 'senior' then raise exception 'only a senior can change fees'; end if;
    select data, version into v_old, v_ver from public.chamber_billing where chamber_id = p_chamber for update;
    if not found or v_ver <> p_expected then return -1; end if;
    update public.chamber_billing set data = p_data, version = version + 1, updated_at = now(), updated_by = auth.uid()
      where chamber_id = p_chamber returning version into v_new;
  else
    raise exception 'unknown kind %', p_kind;
  end if;
  v_lines := public.diff_lines(v_old, p_data);
  if v_lines <> '[]'::jsonb then
    insert into public.chamber_activity (chamber_id, user_id, user_name, role, kind, lines)
      values (p_chamber, auth.uid(), coalesce(v_name, ''), v_role, p_kind, v_lines);
  end if;
  return coalesce(v_new, -1);
end $$;

revoke all on function public.take_backups(uuid, text, boolean) from public, anon, authenticated;
revoke all on function public.take_backup_now(uuid) from public, anon;
revoke all on function public.restore_backup(uuid) from public, anon;
revoke all on function public.save_chamber_doc(uuid, text, jsonb, bigint) from public, anon;
grant execute on function public.take_backup_now(uuid) to authenticated;
grant execute on function public.restore_backup(uuid) to authenticated;
grant execute on function public.save_chamber_doc(uuid, text, jsonb, bigint) to authenticated;

-- 02:00 Pakistan time every night (21:00 UTC): a restore point per chamber, and tidy the old activity (kept 120 days).
select cron.unschedule('legal-brain-nightly-backup') where exists (select 1 from cron.job where jobname = 'legal-brain-nightly-backup');
select cron.schedule('legal-brain-nightly-backup', '0 21 * * *',
  $$select public.take_backups(null, 'nightly'); delete from public.chamber_activity where at < now() - interval '120 days';$$);

-- First restore point right away, so there is one from day one.
select public.take_backups(null, 'first');

-- Quick self-check (each should return true):
--   select public.diff_lines('{"cases":[{"id":"a","title":"A v B"}]}', '{"cases":[{"id":"a","title":"A v B"},{"id":"b","title":"C v D"}]}') = '[{"k":"cases","op":"added","label":"C v D"}]'::jsonb;
--   select public.diff_lines('{"cases":[{"id":"a","title":"A"}]}', '{"cases":[]}') = '[{"k":"cases","op":"removed","label":"A"}]'::jsonb;
--   select public.diff_lines('{"diary":[{"id":"d","text":"x"}]}', '{"diary":[{"id":"d","text":"y"}]}') = '[{"k":"diary","op":"changed","label":"y"}]'::jsonb;
--   select public.diff_lines('{"cases":[]}', '{"cases":[]}') = '[]'::jsonb;
--   select public.backup_summary('{"cases":[1,2],"clients":[1]}') = '{"cases":2,"clients":1}'::jsonb;
