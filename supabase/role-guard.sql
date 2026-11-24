-- Real data protection: the server refuses a save that breaks the role rules.
-- Mirrors src/lib/roleGuard.ts (rule table: tests/unit/roleGuard.test.ts). Keep both in step.
-- Safe to run more than once. Run in the Supabase SQL editor.

-- What a role may do, judged against the chamber's CURRENT saved settings (never the sender's claim).
create or replace function public.role_allows(p_role text, p_action text, p_old jsonb)
returns boolean language plpgsql immutable as $$
declare v_custom jsonb;
begin
  if p_role = 'senior' then return true; end if;
  if p_action in ('chamber.manage', 'studio') then return false; end if;
  v_custom := p_old #> array['settings', '0', 'access', p_role];
  if v_custom is not null and jsonb_typeof(v_custom) = 'array' then
    return v_custom ? p_action;
  end if;
  if p_role = 'junior' then return p_action <> 'billing'; end if;
  if p_role = 'clerk' then return p_action in ('documents.upload', 'diary.write'); end if;
  return false;
end $$;

create or replace function public.json_list(p jsonb)
returns jsonb language sql immutable as $$
  select case when jsonb_typeof(p) = 'array' then p else '[]'::jsonb end
$$;

-- Recording what happened at a hearing: same cases, same order; only the history grows
-- and stage, status, next date and result move.
create or replace function public.cases_outcome_only(p_old jsonb, p_new jsonb)
returns boolean language plpgsql immutable as $$
declare
  o jsonb := public.json_list(p_old);
  n jsonb := public.json_list(p_new);
  i int; oc jsonb; nc jsonb; oh jsonb; nh jsonb;
  skip text[] := array['hearings', 'stage', 'status', 'nextHearing', 'result'];
begin
  if jsonb_array_length(o) <> jsonb_array_length(n) then return false; end if;
  for i in 0 .. jsonb_array_length(o) - 1 loop
    oc := o -> i; nc := n -> i;
    if jsonb_typeof(oc) <> 'object' or jsonb_typeof(nc) <> 'object' then return false; end if;
    if (oc - skip) <> (nc - skip) then return false; end if;
    oh := public.json_list(oc -> 'hearings');
    nh := public.json_list(nc -> 'hearings');
    if jsonb_array_length(nh) < jsonb_array_length(oh) then return false; end if;
    if exists (
      select 1 from jsonb_array_elements(oh) with ordinality e(v, ord)
      where (nh -> (ord::int - 1)) is distinct from e.v
    ) then return false; end if;
  end loop;
  return true;
end $$;

-- The first part of the data this role may not change, or null when every change is allowed.
create or replace function public.data_change_problem(p_role text, p_old jsonb, p_new jsonb)
returns text language plpgsql immutable as $$
declare
  k text; need text; o jsonb; n jsonb;
begin
  if p_role = 'senior' then return null; end if;
  if jsonb_typeof(p_new) <> 'object' then return 'data'; end if;
  p_old := case when jsonb_typeof(p_old) = 'object' then p_old else '{}'::jsonb end;
  for k in
    select key from (select jsonb_object_keys(p_old) as key union select jsonb_object_keys(p_new)) s order by key
  loop
    o := public.json_list(p_old -> k);
    n := public.json_list(p_new -> k);
    if o = n then continue; end if;
    need := case k
      when 'cases' then 'cases.edit'
      when 'clients' then 'cases.edit'
      when 'causeList' then 'cases.edit'
      when 'deadlines' then 'cases.edit'
      when 'diary' then 'diary.write'
      when 'notifications' then 'diary.write'
      when 'docs' then 'documents.upload'
      when 'books' then 'library'
      when 'precedents' then 'precedents'
      when 'tasks' then 'ANY'
      when 'settings' then 'SENIOR'
      else null
    end;
    if need is null or need = 'SENIOR' then return k; end if;
    if need = 'ANY' then continue; end if;
    if public.role_allows(p_role, need, p_old) then continue; end if;
    if k = 'cases' and public.role_allows(p_role, 'diary.write', p_old) and public.cases_outcome_only(o, n) then continue; end if;
    return k;
  end loop;
  return null;
end $$;

-- Save one half of the chamber document if nobody else saved since 'p_expected'.
-- Returns the new version, or -1 on a version conflict (the app then merges and retries).
-- The role rules run only after the version check, so someone else's concurrent change is never blamed on the sender.
create or replace function public.save_chamber_doc(p_chamber uuid, p_kind text, p_data jsonb, p_expected bigint)
returns bigint language plpgsql security definer set search_path = public as $$
declare v_role text; v_new bigint; v_old jsonb; v_ver bigint; v_problem text;
begin
  v_role := public.member_role(p_chamber);
  if v_role is null then raise exception 'not a member of this chamber'; end if;
  if p_kind = 'data' then
    select data, version into v_old, v_ver from public.chamber_data where chamber_id = p_chamber for update;
    if not found or v_ver <> p_expected then return -1; end if;
    v_problem := public.data_change_problem(v_role, v_old, p_data);
    if v_problem is not null then
      raise exception 'forbidden: your role may not change "%"', v_problem using errcode = '42501';
    end if;
    update public.chamber_data set data = p_data, version = version + 1, updated_at = now(), updated_by = auth.uid()
      where chamber_id = p_chamber returning version into v_new;
  elsif p_kind = 'billing' then
    if v_role <> 'senior' then raise exception 'only a senior can change fees'; end if;
    update public.chamber_billing set data = p_data, version = version + 1, updated_at = now(), updated_by = auth.uid()
      where chamber_id = p_chamber and version = p_expected returning version into v_new;
  else
    raise exception 'unknown kind %', p_kind;
  end if;
  return coalesce(v_new, -1);
end $$;

revoke all on function public.save_chamber_doc(uuid, text, jsonb, bigint) from public, anon;
grant execute on function public.save_chamber_doc(uuid, text, jsonb, bigint) to authenticated;

-- Quick self-check (run after applying; each line should return true):
--   select public.data_change_problem('clerk', '{"cases":[]}', '{"cases":[{"id":"a"}]}') = 'cases';
--   select public.data_change_problem('clerk', '{}', '{"diary":[{"id":"d"}]}') is null;
--   select public.data_change_problem('clerk', '{}', '{"settings":[{"id":"m"}]}') = 'settings';
--   select public.data_change_problem('senior', '{}', '{"settings":[{"id":"m"}]}') is null;
--   select public.cases_outcome_only('[{"id":"a","stage":"x","hearings":[1]}]', '[{"id":"a","stage":"y","hearings":[1,2]}]');
--   select not public.cases_outcome_only('[{"id":"a","hearings":[1,2]}]', '[{"id":"a","hearings":[1]}]');
--   select not public.cases_outcome_only('[{"id":"a","title":"t"}]', '[{"id":"a","title":"u"}]');
