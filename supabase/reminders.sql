-- Morning hearing emails, sent through Resend.
-- Needs: Resend API key stored once in Vault (see the bottom of this file), and the pg_cron + pg_net extensions.
-- Safe to run more than once. Run in the Supabase SQL editor.

create extension if not exists pg_net;
create extension if not exists pg_cron;

create or replace function public.html_escape(p text)
returns text language sql immutable as $$
  select replace(replace(replace(replace(coalesce(p, ''), '&', '&amp;'), '<', '&lt;'), '>', '&gt;'), '"', '&quot;')
$$;

-- The email for one person in one chamber: today's and tomorrow's hearings. Returns no row when there is nothing to say.
create or replace function public.digest_for(p_chamber uuid, p_name text)
returns table (subject text, html text) language plpgsql stable security definer set search_path = public as $$
declare
  v_chamber text;
  v_data jsonb;
  v_today date := (now() at time zone 'Asia/Karachi')::date;
  v_tomorrow date := (now() at time zone 'Asia/Karachi')::date + 1;
  v_rows text := '';
  v_n_today int := 0;
  v_n_tomorrow int := 0;
  r record;
begin
  select c.name, d.data into v_chamber, v_data
    from public.chambers c join public.chamber_data d on d.chamber_id = c.id where c.id = p_chamber;
  if v_data is null then return; end if;

  for r in
    select c ->> 'title' as title, c ->> 'caseNo' as case_no, c ->> 'nextHearing' as nh, c ->> 'courtId' as court
    from jsonb_array_elements(case when jsonb_typeof(v_data -> 'cases') = 'array' then v_data -> 'cases' else '[]'::jsonb end) c
    where coalesce(c ->> 'status', '') not in ('decided', 'disposed')
      and left(coalesce(c ->> 'nextHearing', ''), 10) in (v_today::text, v_tomorrow::text)
    order by c ->> 'nextHearing'
  loop
    if left(r.nh, 10) = v_today::text then v_n_today := v_n_today + 1; else v_n_tomorrow := v_n_tomorrow + 1; end if;
    v_rows := v_rows || format(
      '<tr><td style="padding:8px 10px;border-top:1px solid #e5ded3;white-space:nowrap"><b>%s</b><br><span style="color:#777;font-size:12px">%s</span></td><td style="padding:8px 10px;border-top:1px solid #e5ded3"><b>%s</b><br><span style="color:#777;font-size:12px">%s &middot; %s</span></td></tr>',
      case when length(r.nh) >= 16 then to_char(to_timestamp(substr(r.nh, 12, 5), 'HH24:MI'), 'FMHH12:MI AM') else 'Time not set' end,
      case when left(r.nh, 10) = v_today::text then 'Today' else 'Tomorrow' end,
      public.html_escape(r.title),
      public.html_escape(r.case_no),
      public.html_escape(upper(coalesce(r.court, '')))
    );
  end loop;

  if v_n_today + v_n_tomorrow = 0 then return; end if;

  subject := case
    when v_n_today > 0 then format('%s hearing%s today%s', v_n_today, case when v_n_today = 1 then '' else 's' end,
                                   case when v_n_tomorrow > 0 then format(', %s tomorrow', v_n_tomorrow) else '' end)
    else format('%s hearing%s tomorrow', v_n_tomorrow, case when v_n_tomorrow = 1 then '' else 's' end)
  end;
  html := format(
    '<div style="font-family:Georgia,serif;max-width:560px;margin:0 auto;color:#2a2a2a"><h2 style="margin:0 0 4px">Good morning%s</h2><p style="margin:0 0 14px;color:#555">%s &mdash; your hearings from Wakeel Pro.</p><table style="width:100%%;border-collapse:collapse;font-size:14px">%s</table><p style="margin-top:18px;font-size:12px;color:#888">Open <a href="https://wakeelpropk.com/app/today/">Today</a> to record outcomes. Chamber: %s. The senior advocate can turn these emails off in Chamber Studio.</p></div>',
    case when coalesce(p_name, '') = '' then '' else ', ' || public.html_escape(split_part(p_name, ' ', 1)) end,
    subject, v_rows, public.html_escape(v_chamber)
  );
  return next;
end $$;

create or replace function public.send_resend(p_to text, p_subject text, p_html text)
returns boolean language plpgsql security definer set search_path = public, vault, net as $$
declare v_key text;
begin
  select decrypted_secret into v_key from vault.decrypted_secrets where name = 'resend_api_key' limit 1;
  if v_key is null or p_to is null or p_to = '' then return false; end if;
  perform net.http_post(
    url := 'https://api.resend.com/emails',
    headers := jsonb_build_object('Authorization', 'Bearer ' || v_key, 'Content-Type', 'application/json'),
    body := jsonb_build_object('from', 'Wakeel Pro <reminders@wakeelpropk.com>', 'to', jsonb_build_array(p_to), 'subject', p_subject, 'html', p_html)
  );
  return true;
end $$;

-- Every morning (run by pg_cron): each member of each chamber that switched reminders on gets their hearings.
create or replace function public.send_morning_digests()
returns int language plpgsql security definer set search_path = public as $$
declare m record; d record; n int := 0;
begin
  for m in
    select mem.chamber_id, mem.name, mem.email
    from public.members mem join public.chamber_data cd on cd.chamber_id = mem.chamber_id
    where coalesce(cd.data #>> '{settings,0,emailReminders}', 'false') = 'true' and coalesce(mem.email, '') <> ''
  loop
    select * into d from public.digest_for(m.chamber_id, m.name);
    if d.subject is not null and public.send_resend(m.email, d.subject, d.html) then n := n + 1; end if;
  end loop;
  return n;
end $$;

-- "Send me a test now" in Chamber Studio: only ever emails the signed-in person, only their own chamber.
create or replace function public.send_my_digest(p_chamber uuid)
returns text language plpgsql security definer set search_path = public as $$
declare v_email text; v_name text; d record;
begin
  select email, name into v_email, v_name from public.members where chamber_id = p_chamber and user_id = auth.uid();
  if v_email is null then raise exception 'not a member of this chamber'; end if;
  select * into d from public.digest_for(p_chamber, v_name);
  if d.subject is null then return 'nothing'; end if;
  if not public.send_resend(v_email, d.subject, d.html) then return 'no-key'; end if;
  return 'sent';
end $$;

revoke all on function public.digest_for(uuid, text) from public, anon, authenticated;
revoke all on function public.send_resend(text, text, text) from public, anon, authenticated;
revoke all on function public.send_morning_digests() from public, anon, authenticated;
revoke all on function public.send_my_digest(uuid) from public, anon;
grant execute on function public.send_my_digest(uuid) to authenticated;

-- 07:30 Pakistan time every day (02:30 UTC). Re-running replaces the old schedule.
select cron.unschedule('legal-brain-morning-digest') where exists (select 1 from cron.job where jobname = 'legal-brain-morning-digest');
select cron.schedule('legal-brain-morning-digest', '30 2 * * *', 'select public.send_morning_digests()');

-- ONE-TIME SETUP (do this yourself in the SQL editor; never commit the key):
--   select vault.create_secret('re_xxxxxxxx', 'resend_api_key');
-- To change it later:  select vault.update_secret((select id from vault.secrets where name = 'resend_api_key'), 're_new');
