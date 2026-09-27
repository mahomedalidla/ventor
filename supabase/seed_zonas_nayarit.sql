-- Precios base: Pueblos Mágicos + costa Nayarit
-- Seguro de re-ejecutar (ignora si ya existe misma zona+categoría)

insert into pricing_baseline (zona, tipo_negocio, producto_categoria, precio_min, precio_max, modelo_precio_default)
select v.zona, null, v.producto_categoria, v.precio_min, v.precio_max, v.modelo_precio_default
from (
  values
    -- Pueblos Mágicos interior (poder adquisitivo local + algo de turismo)
    ('Compostela', 'automatizacion_whatsapp', 2200, 4000, 'suscripcion'),
    ('Compostela', 'sitio_web_simple', 3500, 7000, 'pago_unico'),
    ('Compostela', 'sitio_web_corporativo', 7000, 13000, 'pago_unico'),
    ('Jala', 'automatizacion_whatsapp', 2200, 4000, 'suscripcion'),
    ('Jala', 'sitio_web_simple', 3500, 7000, 'pago_unico'),
    ('Jala', 'sitio_web_corporativo', 7000, 13000, 'pago_unico'),
    ('Ahuacatlán', 'automatizacion_whatsapp', 2200, 3800, 'suscripcion'),
    ('Ahuacatlán', 'sitio_web_simple', 3500, 6500, 'pago_unico'),
    ('Ahuacatlán', 'sitio_web_corporativo', 6500, 12000, 'pago_unico'),
    ('Amatlán de Cañas', 'automatizacion_whatsapp', 2000, 3600, 'suscripcion'),
    ('Amatlán de Cañas', 'sitio_web_simple', 3000, 6000, 'pago_unico'),
    ('Amatlán de Cañas', 'sitio_web_corporativo', 6000, 11000, 'pago_unico'),
    ('Ixtlán del Río', 'automatizacion_whatsapp', 2200, 4000, 'suscripcion'),
    ('Ixtlán del Río', 'sitio_web_simple', 3500, 7000, 'pago_unico'),
    ('Ixtlán del Río', 'sitio_web_corporativo', 7000, 13000, 'pago_unico'),
    ('Mexcaltitán', 'automatizacion_whatsapp', 2200, 4000, 'suscripcion'),
    ('Mexcaltitán', 'sitio_web_simple', 3500, 7000, 'pago_unico'),
    ('Mexcaltitán', 'sitio_web_corporativo', 7000, 13000, 'pago_unico'),
    ('Puerto Balleto', 'automatizacion_whatsapp', 2500, 4500, 'suscripcion'),
    ('Puerto Balleto', 'sitio_web_simple', 4000, 8000, 'pago_unico'),
    ('Puerto Balleto', 'sitio_web_corporativo', 8000, 15000, 'pago_unico'),

    -- Pueblos Mágicos costa / turismo más fuerte
    ('San Blas', 'automatizacion_whatsapp', 2800, 5000, 'suscripcion'),
    ('San Blas', 'sitio_web_simple', 4500, 9000, 'pago_unico'),
    ('San Blas', 'sitio_web_corporativo', 9000, 17000, 'pago_unico'),
    ('Sayulita', 'automatizacion_whatsapp', 3500, 6500, 'suscripcion'),
    ('Sayulita', 'sitio_web_simple', 5500, 11000, 'pago_unico'),
    ('Sayulita', 'sitio_web_corporativo', 11000, 22000, 'pago_unico'),

    -- Costa adicional (no necesariamente Pueblo Mágico)
    ('Nuevo Vallarta', 'automatizacion_whatsapp', 3500, 6000, 'suscripcion'),
    ('Nuevo Vallarta', 'sitio_web_simple', 5000, 10000, 'pago_unico'),
    ('Nuevo Vallarta', 'sitio_web_corporativo', 10000, 20000, 'pago_unico'),
    ('Bucerías', 'automatizacion_whatsapp', 3200, 5500, 'suscripcion'),
    ('Bucerías', 'sitio_web_simple', 4800, 9500, 'pago_unico'),
    ('Bucerías', 'sitio_web_corporativo', 9500, 18000, 'pago_unico'),
    ('Guayabitos', 'automatizacion_whatsapp', 2800, 5000, 'suscripcion'),
    ('Guayabitos', 'sitio_web_simple', 4500, 9000, 'pago_unico'),
    ('Guayabitos', 'sitio_web_corporativo', 9000, 16000, 'pago_unico'),
    ('Rincón de Guayabitos', 'automatizacion_whatsapp', 2800, 5000, 'suscripcion'),
    ('Rincón de Guayabitos', 'sitio_web_simple', 4500, 9000, 'pago_unico'),
    ('Rincón de Guayabitos', 'sitio_web_corporativo', 9000, 16000, 'pago_unico'),
    ('La Peñita de Jaltemba', 'automatizacion_whatsapp', 2600, 4800, 'suscripcion'),
    ('La Peñita de Jaltemba', 'sitio_web_simple', 4000, 8500, 'pago_unico'),
    ('La Peñita de Jaltemba', 'sitio_web_corporativo', 8500, 15000, 'pago_unico'),
    ('La Cruz de Huanacaxtle', 'automatizacion_whatsapp', 3200, 5500, 'suscripcion'),
    ('La Cruz de Huanacaxtle', 'sitio_web_simple', 4800, 9500, 'pago_unico'),
    ('La Cruz de Huanacaxtle', 'sitio_web_corporativo', 9500, 18000, 'pago_unico'),
    ('Punta de Mita', 'automatizacion_whatsapp', 4000, 7000, 'suscripcion'),
    ('Punta de Mita', 'sitio_web_simple', 6000, 12000, 'pago_unico'),
    ('Punta de Mita', 'sitio_web_corporativo', 12000, 25000, 'pago_unico')
) as v(zona, producto_categoria, precio_min, precio_max, modelo_precio_default)
where not exists (
  select 1
  from pricing_baseline pb
  where pb.zona = v.zona
    and pb.producto_categoria = v.producto_categoria
    and pb.tipo_negocio is null
);
