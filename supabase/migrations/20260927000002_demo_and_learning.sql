-- Demo/pitch personalizado + loop de aprendizaje por rechazos/cierres

alter table opportunities
  add column if not exists demo_cliente_busca text,
  add column if not exists demo_experiencia text,
  add column if not exists demo_gustos_deducidos text,
  add column if not exists demo_pitch text,
  add column if not exists motivo_rechazo text;

-- Lecciones acumuladas del motor (qué mejorar / tono / agresividad)
create table if not exists sales_insights (
  id uuid primary key default gen_random_uuid(),
  opportunity_id uuid references opportunities(id) on delete set null,
  lead_id uuid references leads(id) on delete set null,
  origen_evento text not null check (origen_evento in ('rechazado', 'cerrado', 'sin_respuesta', 'sistema')),
  zona text,
  tipo_negocio text,
  producto_texto text,
  precio_sugerido numeric,
  escenario text,
  motivo_rechazo text,
  tono_sugerido text check (
    tono_sugerido is null
    or tono_sugerido in ('mas_agresivo', 'menos_agresivo', 'igual', 'mas_prueba', 'bajar_precio', 'subir_precio')
  ),
  leccion text not null,
  created_at timestamptz default now()
);

create index if not exists idx_sales_insights_created on sales_insights(created_at desc);
create index if not exists idx_sales_insights_zona on sales_insights(zona);
create index if not exists idx_sales_insights_tipo on sales_insights(tipo_negocio);

alter table sales_insights enable row level security;

create policy "authenticated_all_sales_insights" on sales_insights
  for all to authenticated using (true) with check (true);
