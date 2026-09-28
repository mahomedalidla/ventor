-- Productos que nacen de la demanda (propuestos por la IA) conservan su línea y complejidad

alter table products
  add column if not exists linea text
    check (linea is null or linea in ('landing', 'whatsapp', 'sitio_completo', 'a_medida')),
  add column if not exists complejidad text
    check (complejidad is null or complejidad in ('simple', 'media', 'alta'));
