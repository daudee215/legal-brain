-- Plans: Solo (1 person), Chamber (up to 10), Firm (up to 20). Same features, different team size.
-- Mirrors src/lib/plans.ts — keep the seat numbers in step.
-- Safe to run more than once. Run in the Supabase SQL editor after schema.sql.

alter table public.chambers add column if not exists plan text not null default 'chamber';
do $$ begin
  alter table public.chambers add constraint chambers_plan_check check (plan in ('solo', 'chamber', 'firm'));
exception when duplicate_object then null; end $$;

create or replace function public.plan_seats(p_plan text)
returns int language sql immutable as $$
  select case p_plan when 'solo' then 1 when 'firm' then 20 else 10 end
$$;

-- Create a chamber (or solo practice, or firm) with the caller as its first senior member.
-- The old two-argument version is dropped so calls are never ambiguous.
drop function if exists public.create_chamber(text, text);
create or replace function public.create_chamber(p_name text, p_my_name text, p_plan text default 'chamber')
returns uuid language plpgsql security definer set search_path = public as $$
declare v_id uuid; v_email text;
begin
  if auth.uid() is null then raise exception 'not signed in'; end if;
  if p_plan not in ('solo', 'chamber', 'firm') then raise exception 'unknown plan %', p_plan; end if;
  select email into v_email from auth.users where id = auth.uid();
  insert into public.chambers (name, created_by, plan) values (trim(p_name), auth.uid(), p_plan) returning id into v_id;
  insert into public.members (chamber_id, user_id, role, name, email) values (v_id, auth.uid(), 'senior', trim(p_my_name), coalesce(v_email, ''));
  insert into public.chamber_data (chamber_id, updated_by) values (v_id, auth.uid());
  insert into public.chamber_billing (chamber_id, updated_by) values (v_id, auth.uid());
  return v_id;
end $$;
revoke all on function public.create_chamber(text, text, text) from public, anon;
grant execute on function public.create_chamber(text, text, text) to authenticated;

-- Nobody joins a full chamber (checked here so no route around it, including accept_invite).
create or replace function public.check_seats()
returns trigger language plpgsql security definer set search_path = public as $$
declare v_plan text; v_count int;
begin
  if exists (select 1 from public.members where chamber_id = new.chamber_id and user_id = new.user_id) then return new; end if;
  select plan into v_plan from public.chambers where id = new.chamber_id for update;
  select count(*) into v_count from public.members where chamber_id = new.chamber_id;
  if v_count >= public.plan_seats(v_plan) then
    raise exception 'chamber is full (% of % places used on the % plan)', v_count, public.plan_seats(v_plan), v_plan;
  end if;
  return new;
end $$;
drop trigger if exists members_seat_limit on public.members;
create trigger members_seat_limit before insert on public.members for each row execute function public.check_seats();

-- A senior can't move to a plan smaller than the team already is.
create or replace function public.check_plan_change()
returns trigger language plpgsql security definer set search_path = public as $$
declare v_count int;
begin
  if new.plan is distinct from old.plan then
    select count(*) into v_count from public.members where chamber_id = new.id;
    if v_count > public.plan_seats(new.plan) then
      raise exception 'too many members for the % plan (% of %)', new.plan, v_count, public.plan_seats(new.plan);
    end if;
  end if;
  return new;
end $$;
drop trigger if exists chambers_plan_change on public.chambers;
create trigger chambers_plan_change before update on public.chambers for each row execute function public.check_plan_change();
