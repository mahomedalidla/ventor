-- Entregables reales: landing / demo WhatsApp en HTML, con link público para el cliente

alter table opportunities
  add column if not exists demo_html text,
  add column if not exists demo_tipo text check (demo_tipo is null or demo_tipo in ('landing', 'whatsapp')),
  add column if not exists demo_public_slug text unique,
  add column if not exists demo_assets jsonb,
  add column if not exists demo_generated_at timestamptz;

-- Bucket público para logos / fotos persistidas (los links de Google caducan)
insert into storage.buckets (id, name, public)
values ('demo-assets', 'demo-assets', true)
on conflict (id) do nothing;

create policy "auth_upload_demo_assets" on storage.objects
  for insert to authenticated
  with check (bucket_id = 'demo-assets');

create policy "public_read_demo_assets" on storage.objects
  for select
  using (bucket_id = 'demo-assets');

-- Lectura pública SOLO del HTML por slug (sin exponer el resto de la tabla)
create or replace function public.get_public_demo(p_slug text)
returns table (demo_html text, nombre text)
language sql
security definer
set search_path = public
as $$
  select o.demo_html, l.nombre
  from opportunities o
  join leads l on l.id = o.lead_id
  where o.demo_public_slug = p_slug
    and o.demo_html is not null
  limit 1;
$$;

grant execute on function public.get_public_demo(text) to anon, authenticated;
