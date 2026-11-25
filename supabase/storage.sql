-- Wakeel Pro: shared chamber files (Phase 2b). Run once in the Supabase SQL editor. Safe to re-run.
-- Files live in the private bucket "chamber-files" at <chamber_id>/<file id>.
-- Anything under <chamber_id>/billing/ (fee receipts, invoices) is for seniors only.

insert into storage.buckets (id, name, public, file_size_limit)
values ('chamber-files', 'chamber-files', false, 26214400) -- 25 MB per file
on conflict (id) do update set public = false, file_size_limit = excluded.file_size_limit;

-- First folder of the path is the chamber; a second folder named "billing" marks senior-only files.
create or replace function public.can_use_file(p_name text)
returns boolean language plpgsql stable security definer set search_path = public as $$
declare v_parts text[] := string_to_array(p_name, '/'); v_chamber uuid;
begin
  begin v_chamber := v_parts[1]::uuid; exception when others then return false; end;
  if not public.is_member(v_chamber) then return false; end if;
  if array_length(v_parts, 1) > 2 and v_parts[2] = 'billing' then
    return public.member_role(v_chamber) = 'senior';
  end if;
  return true;
end $$;
grant execute on function public.can_use_file(text) to authenticated;

drop policy if exists chamber_files_read on storage.objects;
create policy chamber_files_read on storage.objects for select to authenticated
  using (bucket_id = 'chamber-files' and public.can_use_file(name));

drop policy if exists chamber_files_insert on storage.objects;
create policy chamber_files_insert on storage.objects for insert to authenticated
  with check (bucket_id = 'chamber-files' and public.can_use_file(name));

drop policy if exists chamber_files_update on storage.objects;
create policy chamber_files_update on storage.objects for update to authenticated
  using (bucket_id = 'chamber-files' and public.can_use_file(name));

drop policy if exists chamber_files_delete on storage.objects;
create policy chamber_files_delete on storage.objects for delete to authenticated
  using (bucket_id = 'chamber-files' and public.can_use_file(name));
