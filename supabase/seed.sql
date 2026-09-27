-- Precios base iniciales (Tepic / Puerto Vallarta) — anclas editables
insert into pricing_baseline (zona, tipo_negocio, producto_categoria, precio_min, precio_max, modelo_precio_default)
values
  ('Tepic', null, 'automatizacion_whatsapp', 2500, 4500, 'suscripcion'),
  ('Tepic', null, 'sitio_web_simple', 4000, 8000, 'pago_unico'),
  ('Tepic', null, 'sitio_web_corporativo', 8000, 15000, 'pago_unico'),
  ('Puerto Vallarta', null, 'automatizacion_whatsapp', 3500, 6000, 'suscripcion'),
  ('Puerto Vallarta', null, 'sitio_web_simple', 5000, 10000, 'pago_unico'),
  ('Puerto Vallarta', null, 'sitio_web_corporativo', 10000, 20000, 'pago_unico');

-- Producto semilla: el más probable de cerrar en prospección local
insert into products (nombre, descripcion, precio_base, modelo_precio, estado)
values (
  'Sistema de pedidos por WhatsApp',
  'Catálogo + toma de pedidos por WhatsApp sin comisión de apps de delivery.',
  3500,
  'suscripcion',
  'propuesto'
);

-- Después corre también: seed_zonas_nayarit.sql (Pueblos Mágicos + costa)
