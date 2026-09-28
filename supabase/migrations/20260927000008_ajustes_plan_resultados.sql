-- Ajustes del dueño (número de WhatsApp, horario, etc.), plan elegido y alcance de cada entregable

alter table opportunities
  add column if not exists ajustes jsonb not null default '{}'::jsonb,
  add column if not exists plan_elegido text
    check (plan_elegido in ('esencial', 'recomendado', 'completo'));

alter table demo_deliverables
  add column if not exists plan_id text not null default 'recomendado',
  add column if not exists html_anterior text,
  add column if not exists ultimo_cambio text,
  add column if not exists updated_at timestamptz not null default now();

create index if not exists demo_events_created_idx on demo_events (created_at);
