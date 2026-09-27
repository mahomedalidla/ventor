-- Sistema de Inteligencia de Ventas — schema inicial
-- Soporta desde el día 1: places_api | redes_sociales | manual | app_interna

create extension if not exists vector;

-- Negocios o usuarios candidatos
create table leads (
  id uuid primary key default gen_random_uuid(),
  origen text not null check (origen in ('places_api', 'app_interna', 'redes_sociales', 'manual')),
  nombre text not null,
  tipo_negocio text,
  zona text,
  perfil_url text,
  red_social text check (red_social is null or red_social in ('instagram', 'facebook', 'tiktok')),
  usuario_red_social text,
  telefono text,
  tiene_sitio_web boolean,
  google_place_id text,
  app_user_id text, -- id en el proyecto Supabase de la app (sin FK cross-project)
  metadata jsonb default '{}'::jsonb,
  created_at timestamptz default now()
);

-- Señales detectadas sobre un lead
create table signals (
  id uuid primary key default gen_random_uuid(),
  lead_id uuid not null references leads(id) on delete cascade,
  tipo_signal text not null,
  detalle text not null,
  detectado_por text default 'sistema' check (detectado_por in ('sistema', 'manual')),
  embedding vector(1536),
  created_at timestamptz default now()
);

-- Catálogo de productos/servicios (crece con propuestas validadas)
create table products (
  id uuid primary key default gen_random_uuid(),
  nombre text not null,
  descripcion text,
  precio_base numeric,
  modelo_precio text check (modelo_precio is null or modelo_precio in ('pago_unico', 'suscripcion', 'freemium')),
  estado text not null default 'propuesto' check (estado in ('propuesto', 'validado', 'descartado')),
  veces_cerrado int default 0,
  veces_rechazado int default 0,
  created_at timestamptz default now()
);

-- Oportunidades: lead + señal + producto sugerido
create table opportunities (
  id uuid primary key default gen_random_uuid(),
  lead_id uuid not null references leads(id) on delete cascade,
  signal_id uuid references signals(id),
  product_id uuid references products(id),
  producto_sugerido_texto text,
  razon text not null,
  canal_sugerido text check (canal_sugerido is null or canal_sugerido in ('whatsapp', 'en_persona', 'email')),
  guion text,
  evitar text,
  precio_sugerido numeric,
  modelo_precio_sugerido text check (
    modelo_precio_sugerido is null
    or modelo_precio_sugerido in ('pago_unico', 'suscripcion')
  ),
  escenario text check (
    escenario is null
    or escenario in ('facil', 'esceptico', 'upsell_cliente_activo')
  ),
  status text not null default 'pendiente' check (
    status in ('pendiente', 'contactado', 'cerrado', 'rechazado', 'sin_respuesta')
  ),
  resultado_notas text,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- Base de precios por zona / tipo / categoría (ancla editable, no precio fijo)
create table pricing_baseline (
  id uuid primary key default gen_random_uuid(),
  zona text not null,
  tipo_negocio text,
  producto_categoria text not null,
  precio_min numeric not null,
  precio_max numeric not null,
  modelo_precio_default text check (
    modelo_precio_default is null
    or modelo_precio_default in ('pago_unico', 'suscripcion')
  ),
  updated_at timestamptz default now()
);

create index idx_leads_origen on leads(origen);
create index idx_leads_zona on leads(zona);
create index idx_leads_google_place on leads(google_place_id);
create index idx_leads_app_user on leads(app_user_id);
create index idx_signals_lead on signals(lead_id);
create index idx_signals_tipo on signals(tipo_signal);
create index idx_opportunities_lead on opportunities(lead_id);
create index idx_opportunities_status on opportunities(status);
create index idx_opportunities_created on opportunities(created_at desc);
create index idx_pricing_zona_cat on pricing_baseline(zona, producto_categoria);

-- pgvector: el índice ivfflat se crea en una migración posterior,
-- cuando haya señales con embedding (necesita datos para entrenar bien).

-- updated_at trigger
create or replace function set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger opportunities_updated_at
  before update on opportunities
  for each row execute function set_updated_at();

-- RLS: fase 1 = cualquier usuario autenticado
alter table leads enable row level security;
alter table signals enable row level security;
alter table products enable row level security;
alter table opportunities enable row level security;
alter table pricing_baseline enable row level security;

create policy "authenticated_all_leads" on leads
  for all to authenticated using (true) with check (true);

create policy "authenticated_all_signals" on signals
  for all to authenticated using (true) with check (true);

create policy "authenticated_all_products" on products
  for all to authenticated using (true) with check (true);

create policy "authenticated_all_opportunities" on opportunities
  for all to authenticated using (true) with check (true);

create policy "authenticated_all_pricing" on pricing_baseline
  for all to authenticated using (true) with check (true);
