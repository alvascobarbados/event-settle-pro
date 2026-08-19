create table public.categories (
  id uuid primary key default gen_random_uuid(),
  promoter_id uuid not null references public.promoters(id) on delete cascade,
  parent_id uuid null references public.categories(id) on delete cascade,
  section text not null check (section in ('revenue','expenses')),
  name text not null,
  sort_order int not null default 1,
  archived boolean not null default false,
  created_at timestamptz not null default now()
);

grant select, insert, update, delete on public.categories to authenticated;
grant all on public.categories to service_role;

alter table public.categories enable row level security;
alter table public.categories force row level security;

create policy "categories by membership" on public.categories for all to authenticated
  using (promoter_id in (select public.user_promoter_ids()))
  with check (promoter_id in (select public.user_promoter_ids()));

create or replace function public.categories_two_levels()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.parent_id is not null then
    if exists (select 1 from public.categories c where c.id = new.parent_id and c.parent_id is not null) then
      raise exception 'categories support at most two levels';
    end if;
  end if;
  return new;
end $$;

create trigger categories_two_levels_trg
before insert or update on public.categories
for each row execute function public.categories_two_levels();

alter table public.lines add column category_id uuid references public.categories(id);
alter table public.bills add column category_id uuid references public.categories(id);

/* backfill: one category per distinct parent line name, per promoter + section */
with pl as (
  select ep.promoter_id, l.section, l.name, min(l.sort_order) as so
  from public.lines l
  join public.event_promoters ep on ep.event_id = l.event_id
  where l.parent_id is null
  group by 1,2,3
)
insert into public.categories (promoter_id, parent_id, section, name, sort_order)
select promoter_id, null, section, name,
       row_number() over (partition by promoter_id, section order by so, name)
from pl;

update public.lines l set category_id = c.id
from public.event_promoters ep, public.categories c
where ep.event_id = l.event_id
  and l.parent_id is null
  and c.promoter_id = ep.promoter_id
  and c.parent_id is null
  and c.section = l.section
  and c.name = l.name;

update public.lines ch set category_id = p.category_id
from public.lines p
where p.id = ch.parent_id and ch.parent_id is not null;

update public.bills b set category_id = l.category_id
from public.lines l where l.id = b.line_id;

/* locked Core production subcategory template */
insert into public.categories (promoter_id, parent_id, section, name, sort_order)
select c.promoter_id, c.id, 'expenses', s.name, s.ord
from public.categories c
cross join (values
  ('Venue rental', 1),
  ('Staging, tents & truss', 2),
  ('Sound, lighting & power', 3),
  ('Site services', 4),
  ('Furniture & shade', 5)
) as s(name, ord)
where c.parent_id is null and c.section = 'expenses' and c.name = 'Core production';