-- get_public_demo también entrega assets (catálogo) para reinyectar al servir.
-- Postgres no permite cambiar el tipo de retorno con CREATE OR REPLACE.
drop function if exists public.get_public_demo(text);

create function public.get_public_demo(p_slug text)
returns table (demo_html text, nombre text, assets jsonb)
language sql
security definer
set search_path = public
as $$
  select d.html, l.nombre, d.assets
  from demo_deliverables d
  join opportunities o on o.id = d.opportunity_id
  join leads l on l.id = o.lead_id
  where d.public_slug = p_slug
  limit 1;
$$;

grant execute on function public.get_public_demo(text) to anon, authenticated;
