-- 1. Clean up throwaway test-account data so numbering starts clean
delete from public.payments where user_id <> '7bd42770-3cc9-4e17-b560-27f0524d6e0e';
delete from public.files where user_id <> '7bd42770-3cc9-4e17-b560-27f0524d6e0e';
delete from public.lines where user_id <> '7bd42770-3cc9-4e17-b560-27f0524d6e0e';
delete from public.money_in where user_id <> '7bd42770-3cc9-4e17-b560-27f0524d6e0e';
delete from public.bills where user_id <> '7bd42770-3cc9-4e17-b560-27f0524d6e0e';
delete from public.events where user_id <> '7bd42770-3cc9-4e17-b560-27f0524d6e0e';

-- 2. Identity tables
create table public.promoters (
  id uuid primary key default gen_random_uuid(),
  name text not null default 'My events',
  currency text not null default 'BBD',
  vat_rate numeric not null default 17.5,
  created_at timestamptz not null default now()
);
grant select, insert, update, delete on public.promoters to authenticated;
grant all on public.promoters to service_role;
alter table public.promoters enable row level security;

create table public.promoter_members (
  promoter_id uuid not null references public.promoters(id) on delete cascade,
  user_id uuid not null,
  role text not null default 'owner' check (role in ('owner','admin','member')),
  created_at timestamptz not null default now(),
  primary key (promoter_id, user_id)
);
grant select, insert, update, delete on public.promoter_members to authenticated;
grant all on public.promoter_members to service_role;
alter table public.promoter_members enable row level security;

create table public.event_promoters (
  event_id text not null references public.events(id) on delete cascade,
  promoter_id uuid not null references public.promoters(id) on delete cascade,
  role text not null default 'owner',
  ownership_share numeric not null default 100,
  created_at timestamptz not null default now(),
  primary key (event_id, promoter_id)
);
grant select, insert, update, delete on public.event_promoters to authenticated;
grant all on public.event_promoters to service_role;
alter table public.event_promoters enable row level security;

-- 3. Permanent event numbers
create sequence public.event_number_seq as bigint start with 100001 increment by 1 no cycle;
alter table public.events add column event_number bigint;
alter table public.events add column created_by_promoter_id uuid references public.promoters(id) on delete set null;

-- 4. Migrate the one real account
do $$
declare v_user uuid := '7bd42770-3cc9-4e17-b560-27f0524d6e0e';
        v_promoter uuid;
        r record;
begin
  insert into public.promoters (name, currency, vat_rate)
  select coalesce(nullif(s.business, ''), 'My events'), s.currency, s.vat_rate
  from public.settings s where s.user_id = v_user
  returning id into v_promoter;

  if v_promoter is null then
    insert into public.promoters (name, currency, vat_rate) values ('UV Vibe', 'BBD', 17.5)
    returning id into v_promoter;
  end if;

  insert into public.promoter_members (promoter_id, user_id, role) values (v_promoter, v_user, 'owner');

  for r in select id from public.events where user_id = v_user order by date asc, id asc loop
    update public.events
       set event_number = nextval('public.event_number_seq'),
           created_by_promoter_id = v_promoter
     where id = r.id;
    insert into public.event_promoters (event_id, promoter_id, role, ownership_share)
    values (r.id, v_promoter, 'owner', 100);
  end loop;
end $$;

alter table public.events alter column event_number set not null;
alter table public.events alter column event_number set default nextval('public.event_number_seq');
create unique index events_event_number_key on public.events (event_number);

-- 5. payments gain event_id; ownership moves to the event everywhere
alter table public.payments add column event_id text references public.events(id) on delete cascade;
update public.payments p set event_id = m.event_id from public.money_in m
  where p.parent_kind = 'in' and p.parent_id = m.id;
update public.payments p set event_id = b.event_id from public.bills b
  where p.parent_kind = 'out' and p.parent_id = b.id;
delete from public.payments where event_id is null;
alter table public.payments alter column event_id set not null;

drop policy if exists "events own" on public.events;
drop policy if exists "lines own" on public.lines;
drop policy if exists "money_in own" on public.money_in;
drop policy if exists "bills own" on public.bills;
drop policy if exists "files own" on public.files;
drop policy if exists "payments own" on public.payments;

alter table public.events drop column user_id;
alter table public.lines drop column user_id;
alter table public.money_in drop column user_id;
alter table public.bills drop column user_id;
alter table public.files drop column user_id;
alter table public.payments drop column user_id;

drop table public.settings;

-- 6. Access helpers
create or replace function public.user_can_access_event(_event_id text)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from public.event_promoters ep
    join public.promoter_members pm on pm.promoter_id = ep.promoter_id
    where ep.event_id = _event_id and pm.user_id = auth.uid()
  )
$$;

create or replace function public.user_promoter_ids()
returns setof uuid language sql stable security definer set search_path = public as $$
  select promoter_id from public.promoter_members where user_id = auth.uid()
$$;

-- 7. Policies
create policy "own memberships" on public.promoter_members for select to authenticated
  using (user_id = auth.uid());

create policy "member promoters read" on public.promoters for select to authenticated
  using (id in (select public.user_promoter_ids()));
create policy "member promoters update" on public.promoters for update to authenticated
  using (id in (select public.user_promoter_ids()))
  with check (id in (select public.user_promoter_ids()));

create policy "event links readable by members" on public.event_promoters for select to authenticated
  using (promoter_id in (select public.user_promoter_ids()));

create policy "events by promoter membership" on public.events for all to authenticated
  using (public.user_can_access_event(id)) with check (public.user_can_access_event(id));

create policy "lines by event" on public.lines for all to authenticated
  using (public.user_can_access_event(event_id)) with check (public.user_can_access_event(event_id));

create policy "money_in by event" on public.money_in for all to authenticated
  using (public.user_can_access_event(event_id)) with check (public.user_can_access_event(event_id));

create policy "bills by event" on public.bills for all to authenticated
  using (public.user_can_access_event(event_id)) with check (public.user_can_access_event(event_id));

create policy "files by event" on public.files for all to authenticated
  using (public.user_can_access_event(event_id)) with check (public.user_can_access_event(event_id));

create policy "payments by event" on public.payments for all to authenticated
  using (public.user_can_access_event(event_id)) with check (public.user_can_access_event(event_id));

-- 8. RPCs
create or replace function public.ensure_promoter()
returns public.promoters language plpgsql security definer set search_path = public as $$
declare p public.promoters;
begin
  if auth.uid() is null then raise exception 'not authenticated'; end if;
  select pr.* into p from public.promoters pr
    join public.promoter_members pm on pm.promoter_id = pr.id
   where pm.user_id = auth.uid()
   order by pr.created_at asc limit 1;
  if p.id is null then
    insert into public.promoters (name) values ('My events') returning * into p;
    insert into public.promoter_members (promoter_id, user_id, role) values (p.id, auth.uid(), 'owner');
  end if;
  return p;
end $$;

create or replace function public.create_event(
  _promoter_id uuid,
  _id text,
  _name text,
  _date date,
  _venue text,
  _capacity integer,
  _stage text,
  _accent jsonb,
  _as_of date,
  _planning_rows jsonb
) returns public.events language plpgsql security definer set search_path = public as $$
declare e public.events;
begin
  if not exists (select 1 from public.promoter_members where promoter_id = _promoter_id and user_id = auth.uid()) then
    raise exception 'not a member of this promoter';
  end if;
  insert into public.events (id, name, date, venue, capacity, stage, accent, as_of, planning_rows,
                             event_number, created_by_promoter_id)
  values (_id, _name, _date, coalesce(_venue,''), _capacity, coalesce(_stage,'planning'), _accent,
          coalesce(_as_of, current_date), _planning_rows,
          nextval('public.event_number_seq'), _promoter_id)
  returning * into e;
  insert into public.event_promoters (event_id, promoter_id, role, ownership_share)
  values (e.id, _promoter_id, 'owner', 100);
  return e;
end $$;

grant execute on function public.create_event(uuid, text, text, date, text, integer, text, jsonb, date, jsonb) to authenticated;
grant execute on function public.ensure_promoter() to authenticated;

-- 9. Storage: promoter-scoped paths (legacy per-user prefix stays readable during the move)
drop policy if exists "setlup files select" on storage.objects;
drop policy if exists "setlup files insert" on storage.objects;
drop policy if exists "setlup files update" on storage.objects;
drop policy if exists "setlup files delete" on storage.objects;
create policy "setlup files select" on storage.objects for select to authenticated
  using (bucket_id = 'setlup-files' and (
    (storage.foldername(name))[1] = auth.uid()::text
    or (storage.foldername(name))[1] in (select public.user_promoter_ids()::text)));
create policy "setlup files insert" on storage.objects for insert to authenticated
  with check (bucket_id = 'setlup-files' and (
    (storage.foldername(name))[1] = auth.uid()::text
    or (storage.foldername(name))[1] in (select public.user_promoter_ids()::text)));
create policy "setlup files update" on storage.objects for update to authenticated
  using (bucket_id = 'setlup-files' and (
    (storage.foldername(name))[1] = auth.uid()::text
    or (storage.foldername(name))[1] in (select public.user_promoter_ids()::text)));
create policy "setlup files delete" on storage.objects for delete to authenticated
  using (bucket_id = 'setlup-files' and (
    (storage.foldername(name))[1] = auth.uid()::text
    or (storage.foldername(name))[1] in (select public.user_promoter_ids()::text)));