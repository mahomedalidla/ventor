-- Acceso interno: solo correos invitados en staff ven y tocan los datos.
-- Si la tabla está vacía, cualquier autenticado sigue pasando (para no
-- bloquearte). En cuanto insertes tu correo, el resto queda fuera.

create table if not exists staff (
  email text primary key,
  user_id uuid unique,
  invited_at timestamptz not null default now()
);

alter table staff enable row level security;

create or replace function public.is_staff()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select
    not exists (select 1 from public.staff)
    or exists (
      select 1 from public.staff
      where lower(email) = lower(coalesce(auth.jwt() ->> 'email', ''))
    );
$$;

revoke all on function public.is_staff() from public;
grant execute on function public.is_staff() to authenticated;

create policy "staff_read" on staff
  for select to authenticated
  using (public.is_staff());

drop policy if exists "authenticated_all_leads" on leads;
drop policy if exists "authenticated_all_signals" on signals;
drop policy if exists "authenticated_all_products" on products;
drop policy if exists "authenticated_all_opportunities" on opportunities;
drop policy if exists "authenticated_all_pricing" on pricing_baseline;
drop policy if exists "authenticated_all_sales_insights" on sales_insights;
drop policy if exists "authenticated_all_demo_deliverables" on demo_deliverables;
drop policy if exists "authenticated_read_demo_events" on demo_events;
drop policy if exists "authenticated_delete_demo_events" on demo_events;
drop policy if exists "auth_upload_demo_assets" on storage.objects;

create policy "staff_all_leads" on leads
  for all to authenticated using (public.is_staff()) with check (public.is_staff());
create policy "staff_all_signals" on signals
  for all to authenticated using (public.is_staff()) with check (public.is_staff());
create policy "staff_all_products" on products
  for all to authenticated using (public.is_staff()) with check (public.is_staff());
create policy "staff_all_opportunities" on opportunities
  for all to authenticated using (public.is_staff()) with check (public.is_staff());
create policy "staff_all_pricing" on pricing_baseline
  for all to authenticated using (public.is_staff()) with check (public.is_staff());
create policy "staff_all_sales_insights" on sales_insights
  for all to authenticated using (public.is_staff()) with check (public.is_staff());
create policy "staff_all_demo_deliverables" on demo_deliverables
  for all to authenticated using (public.is_staff()) with check (public.is_staff());
create policy "staff_read_demo_events" on demo_events
  for select to authenticated using (public.is_staff());
create policy "staff_delete_demo_events" on demo_events
  for delete to authenticated using (public.is_staff());
create policy "staff_upload_demo_assets" on storage.objects
  for insert to authenticated
  with check (bucket_id = 'demo-assets' and public.is_staff());

-- Pon aquí tu correo (y el de quien sí debe entrar). Ejemplo:
-- insert into staff (email) values ('tu@correo.com') on conflict do nothing;
