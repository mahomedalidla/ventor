# Monetización de app existente (`origen = app_interna`)

Espacio reservado desde el día 1. **No implementar todavía** — la prospección local va primero.

## Qué ya está listo en el schema

- `leads.origen` acepta `'app_interna'`
- `leads.app_user_id` guarda el id del usuario en el otro proyecto Supabase (sin FK)
- `signals.tipo_signal` admite valores como `uso_alto_sin_pago`, `solicita_feature`
- El dashboard tiene filtro por origen (incluye "App interna")

## Qué falta (fase 6)

1. Secrets `APP_SUPABASE_URL` + key de solo lectura en el proyecto de ventas
2. Edge Function `detect-signals` rama `app_interna`: queries de sesiones / features / pago
3. UI opcional: import CSV desde la BD de la app (MVP más simple, sin conectar proyectos en vivo)

## Alternativa MVP (recomendada al inicio de fase 6)

Correr SQL en el proyecto de la app → exportar CSV → cargar en `/leads/nuevo` como `origen = app_interna`.
