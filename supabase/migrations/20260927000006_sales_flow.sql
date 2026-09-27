-- Oferta estructurada (instalación + mensualidad + prueba) y flujo de venta con cadencia

alter table opportunities
  add column if not exists oferta jsonb,
  add column if not exists plan_venta jsonb,
  add column if not exists paso_actual int not null default 0,
  add column if not exists proximo_contacto_at timestamptz,
  add column if not exists ultimo_contacto_at timestamptz,
  add column if not exists prueba_inicio date,
  add column if not exists prueba_fin date;

create index if not exists opportunities_proximo_contacto_idx
  on opportunities (proximo_contacto_at)
  where status in ('pendiente', 'contactado');

-- El producto semilla quedó como si $3,500 fuera mensual; ahora es instalación
update products
set precio_base = 2500,
    descripcion = 'Toma de pedidos automática por WhatsApp. Instalación + mensualidad, con 7 días de prueba.'
where nombre = 'Sistema de pedidos por WhatsApp';
