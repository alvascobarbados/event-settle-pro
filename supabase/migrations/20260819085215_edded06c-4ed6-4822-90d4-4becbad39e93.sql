-- 1. Clean up stray promoter/data created by a second account -------------
delete from public.payments where event_id in (select id from public.events where created_by_promoter_id = '9f43eb48-00e7-4728-8acf-e2a178e94974');
delete from public.money_in where event_id in (select id from public.events where created_by_promoter_id = '9f43eb48-00e7-4728-8acf-e2a178e94974');
delete from public.bills where event_id in (select id from public.events where created_by_promoter_id = '9f43eb48-00e7-4728-8acf-e2a178e94974');
delete from public.files where event_id in (select id from public.events where created_by_promoter_id = '9f43eb48-00e7-4728-8acf-e2a178e94974');
delete from public.lines where event_id in (select id from public.events where created_by_promoter_id = '9f43eb48-00e7-4728-8acf-e2a178e94974');
delete from public.event_promoters where promoter_id = '9f43eb48-00e7-4728-8acf-e2a178e94974';
delete from public.events where created_by_promoter_id = '9f43eb48-00e7-4728-8acf-e2a178e94974';
delete from public.promoter_members where promoter_id = '9f43eb48-00e7-4728-8acf-e2a178e94974';
delete from public.promoters where id = '9f43eb48-00e7-4728-8acf-e2a178e94974';

-- UV Vibe keeps exactly one owner membership (the original account)
delete from public.promoter_members
 where promoter_id = 'a4adedb8-0835-42c9-b531-03e5339e31b7'
   and user_id <> (select user_id from public.promoter_members
                    where promoter_id = 'a4adedb8-0835-42c9-b531-03e5339e31b7'
                    order by created_at asc limit 1);
update public.promoter_members set role = 'owner' where promoter_id = 'a4adedb8-0835-42c9-b531-03e5339e31b7';

-- 2. promoters: username + code -------------------------------------------
alter table public.promoters add column if not exists username text;
alter table public.promoters add column if not exists code text;

create or replace function public.generate_promoter_code(_name text)
returns text
language plpgsql
security definer
set search_path = public
as $$
declare
  letters text;
  candidate text;
  i int := 0;
begin
  letters := upper(regexp_replace(coalesce(_name, ''), '[^a-zA-Z]', '', 'g'));
  if length(letters) < 2 then
    letters := rpad(letters, 2, 'X');
  end if;
  letters := substr(letters, 1, 2);
  loop
    candidate := lpad((floor(random() * 10000))::int::text, 4, '0') || letters;
    exit when not exists (select 1 from public.promoters where code = candidate);
    i := i + 1;
    if i > 200 then
      candidate := lpad((floor(random() * 10000))::int::text, 4, '0') ||
                   chr(65 + floor(random() * 26)::int) || chr(65 + floor(random() * 26)::int);
      exit;
    end if;
  end loop;
  return candidate;
end $$;

update public.promoters
   set username = 'avinashlv', code = '1949AL'
 where id = 'a4adedb8-0835-42c9-b531-03e5339e31b7';

update public.promoters set code = public.generate_promoter_code(name) where code is null;

alter table public.promoters alter column code set not null;
create unique index if not exists promoters_username_key on public.promoters (username);
create unique index if not exists promoters_code_key on public.promoters (code);

-- 3. ensure_promoter: empty promoter only, no demo seed -------------------
create or replace function public.ensure_promoter()
returns public.promoters
language plpgsql
security definer
set search_path = public
as $$
declare p public.promoters;
begin
  if auth.uid() is null then raise exception 'not authenticated'; end if;
  select pr.* into p from public.promoters pr
    join public.promoter_members pm on pm.promoter_id = pr.id
   where pm.user_id = auth.uid()
   order by pr.created_at asc limit 1;
  if p.id is null then
    insert into public.promoters (name, code)
    values ('My events', public.generate_promoter_code('My events'))
    returning * into p;
    insert into public.promoter_members (promoter_id, user_id, role)
    values (p.id, auth.uid(), 'owner');
  end if;
  return p;
end $$;

-- 4. Helper functions: confirm definer + search_path + execute grants ------
alter function public.user_can_access_event(text) security definer set search_path = public;
alter function public.user_promoter_ids() security definer set search_path = public;
revoke all on function public.user_can_access_event(text) from anon, public;
revoke all on function public.user_promoter_ids() from anon, public;
revoke all on function public.ensure_promoter() from anon, public;
revoke all on function public.generate_promoter_code(text) from anon, public;
revoke all on function public.create_event(uuid, text, text, date, text, integer, text, jsonb, date, jsonb) from anon, public;
grant execute on function public.user_can_access_event(text) to authenticated;
grant execute on function public.user_promoter_ids() to authenticated;
grant execute on function public.ensure_promoter() to authenticated;
grant execute on function public.create_event(uuid, text, text, date, text, integer, text, jsonb, date, jsonb) to authenticated;

-- 5. RLS lockdown ----------------------------------------------------------
do $$
declare r record;
begin
  for r in
    select schemaname, tablename, policyname from pg_policies
     where (schemaname = 'public' and tablename in
             ('promoters','promoter_members','event_promoters','events','lines','money_in','bills','payments','files'))
        or (schemaname = 'storage' and tablename = 'objects' and policyname ilike 'setlup%')
  loop
    execute format('drop policy %I on %I.%I', r.policyname, r.schemaname, r.tablename);
  end loop;
end $$;

do $$
declare t text;
begin
  foreach t in array array['promoters','promoter_members','event_promoters','events','lines','money_in','bills','payments','files']
  loop
    execute format('alter table public.%I enable row level security', t);
    execute format('alter table public.%I force row level security', t);
    execute format('revoke all on public.%I from anon', t);
    execute format('revoke all on public.%I from public', t);
    execute format('grant all on public.%I to service_role', t);
  end loop;
end $$;

grant select on public.promoter_members to authenticated;
grant select, update on public.promoters to authenticated;
grant select on public.event_promoters to authenticated;
grant select, insert, update, delete on public.events to authenticated;
grant select, insert, update, delete on public.lines to authenticated;
grant select, insert, update, delete on public.money_in to authenticated;
grant select, insert, update, delete on public.bills to authenticated;
grant select, insert, update, delete on public.payments to authenticated;
grant select, insert, update, delete on public.files to authenticated;

create policy "promoter_members own select" on public.promoter_members
  for select to authenticated using (user_id = auth.uid());

create policy "promoters member select" on public.promoters
  for select to authenticated using (id in (select public.user_promoter_ids()));
create policy "promoters member update" on public.promoters
  for update to authenticated using (id in (select public.user_promoter_ids()))
  with check (id in (select public.user_promoter_ids()));

create policy "event_promoters member select" on public.event_promoters
  for select to authenticated using (promoter_id in (select public.user_promoter_ids()));

create policy "events by access" on public.events
  for all to authenticated using (public.user_can_access_event(id))
  with check (public.user_can_access_event(id));
create policy "lines by access" on public.lines
  for all to authenticated using (public.user_can_access_event(event_id))
  with check (public.user_can_access_event(event_id));
create policy "money_in by access" on public.money_in
  for all to authenticated using (public.user_can_access_event(event_id))
  with check (public.user_can_access_event(event_id));
create policy "bills by access" on public.bills
  for all to authenticated using (public.user_can_access_event(event_id))
  with check (public.user_can_access_event(event_id));
create policy "payments by access" on public.payments
  for all to authenticated using (public.user_can_access_event(event_id))
  with check (public.user_can_access_event(event_id));
create policy "files by access" on public.files
  for all to authenticated using (public.user_can_access_event(event_id))
  with check (public.user_can_access_event(event_id));

create policy "setlup files select" on storage.objects
  for select to authenticated using (
    bucket_id = 'setlup-files' and (
      (storage.foldername(name))[1] = auth.uid()::text
      or (storage.foldername(name))[1] in (select public.user_promoter_ids()::text)));
create policy "setlup files insert" on storage.objects
  for insert to authenticated with check (
    bucket_id = 'setlup-files' and (
      (storage.foldername(name))[1] = auth.uid()::text
      or (storage.foldername(name))[1] in (select public.user_promoter_ids()::text)));
create policy "setlup files update" on storage.objects
  for update to authenticated using (
    bucket_id = 'setlup-files' and (
      (storage.foldername(name))[1] = auth.uid()::text
      or (storage.foldername(name))[1] in (select public.user_promoter_ids()::text)))
  with check (
    bucket_id = 'setlup-files' and (
      (storage.foldername(name))[1] = auth.uid()::text
      or (storage.foldername(name))[1] in (select public.user_promoter_ids()::text)));
create policy "setlup files delete" on storage.objects
  for delete to authenticated using (
    bucket_id = 'setlup-files' and (
      (storage.foldername(name))[1] = auth.uid()::text
      or (storage.foldername(name))[1] in (select public.user_promoter_ids()::text)));

notify pgrst, 'reload schema';