-- Medición de los entregables: visitas y clics por canal (Maps, WhatsApp, IG, QR…)

create table if not exists demo_events (
  id bigint generated always as identity primary key,
  deliverable_id uuid not null references demo_deliverables(id) on delete cascade,
  tipo text not null check (tipo in ('view', 'whatsapp', 'llamar', 'mapa')),
  src text,
  referrer text,
  device text,
  visitor text,
  created_at timestamptz not null default now()
);

create index if not exists demo_events_deliverable_idx on demo_events (deliverable_id, created_at);

alter table demo_events enable row level security;

create policy "authenticated_read_demo_events" on demo_events
  for select to authenticated using (true);

create policy "authenticated_delete_demo_events" on demo_events
  for delete to authenticated using (true);

-- Escritura pública SOLO a través de esta función (por slug)
create or replace function public.track_demo_event(
  p_slug text,
  p_tipo text,
  p_src text,
  p_referrer text,
  p_device text,
  p_visitor text
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_id uuid;
begin
  if p_tipo not in ('view', 'whatsapp', 'llamar', 'mapa') then
    return;
  end if;
  select id into v_id from demo_deliverables where public_slug = p_slug;
  if v_id is null then
    return;
  end if;
  insert into demo_events (deliverable_id, tipo, src, referrer, device, visitor)
  values (v_id, p_tipo, left(p_src, 40), left(p_referrer, 200), left(p_device, 20), left(p_visitor, 64));
end;
$$;

grant execute on function public.track_demo_event(text, text, text, text, text, text) to anon, authenticated;

-- Resumen público para el reporte del dueño
create or replace function public.get_public_demo_stats(p_slug text)
returns table (nombre text, tipo text, src text, dia date, eventos bigint, personas bigint)
language sql
security definer
set search_path = public
as $$
  select l.nombre, e.tipo, coalesce(e.src, 'directo'), (e.created_at at time zone 'America/Mazatlan')::date,
         count(*), count(distinct e.visitor)
  from demo_deliverables d
  join opportunities o on o.id = d.opportunity_id
  join leads l on l.id = o.lead_id
  left join demo_events e on e.deliverable_id = d.id
  where d.public_slug = p_slug
  group by 1, 2, 3, 4;
$$;

grant execute on function public.get_public_demo_stats(text) to anon, authenticated;
