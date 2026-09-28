-- Origen Doctoralia (pegar perfil, sin scrapear el directorio)
alter table public.leads drop constraint if exists leads_origen_check;
alter table public.leads
  add constraint leads_origen_check
  check (origen in ('places_api', 'app_interna', 'redes_sociales', 'manual', 'doctoralia'));
