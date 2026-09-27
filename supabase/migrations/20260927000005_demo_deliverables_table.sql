-- Un entregable por tipo (landing / whatsapp) por oportunidad; ya no se pisan.

create table if not exists demo_deliverables (
  id uuid primary key default gen_random_uuid(),
  opportunity_id uuid not null references opportunities(id) on delete cascade,
  tipo text not null check (tipo in ('landing', 'whatsapp')),
  html text not null,
  public_slug text not null unique,
  assets jsonb,
  engine text,
  generated_at timestamptz not null default now(),
  unique (opportunity_id, tipo)
);

create index if not exists demo_deliverables_opp_idx on demo_deliverables (opportunity_id);

alter table demo_deliverables enable row level security;

create policy "authenticated_all_demo_deliverables" on demo_deliverables
  for all to authenticated using (true) with check (true);

-- Rescatar lo ya generado en opportunities
insert into demo_deliverables (opportunity_id, tipo, html, public_slug, assets, generated_at)
select id, demo_tipo, demo_html, demo_public_slug, demo_assets, coalesce(demo_generated_at, now())
from opportunities
where demo_html is not null and demo_tipo is not null and demo_public_slug is not null
on conflict do nothing;

create or replace function public.get_public_demo(p_slug text)
returns table (demo_html text, nombre text)
language sql
security definer
set search_path = public
as $$
  select d.html, l.nombre
  from demo_deliverables d
  join opportunities o on o.id = d.opportunity_id
  join leads l on l.id = o.lead_id
  where d.public_slug = p_slug
  limit 1;
$$;

grant execute on function public.get_public_demo(text) to anon, authenticated;
