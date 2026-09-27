# Vendor — Sistema de Inteligencia de Ventas

Motor de decisión de ventas: **prospección local primero**, con espacio reservado para monetización de usuarios de una app existente (`app_interna`).

Spec completa: [`docs/spec_sistema_ventas.md`](docs/spec_sistema_ventas.md)  
Notas app interna: [`docs/app_interna.md`](docs/app_interna.md)

## Stack

- Next.js (App Router) + TypeScript + Tailwind
- Supabase (proyecto **nuevo**, separado de la app de producción)
- Edge Functions + Claude (fases siguientes)
- Google Places API (Fase 2)

## Fase 1 — qué ya está

- [x] Scaffold Next.js
- [x] Schema SQL (`leads`, `signals`, `products`, `opportunities`, `pricing_baseline`) con `origen` incluyendo `app_interna`
- [x] Seed de precios Tepic / Puerto Vallarta
- [x] Auth (email/password) + middleware
- [x] Shell: dashboard, filtros de origen, stubs de leads / catálogo / ficha

## Setup (haz esto antes de la Fase 2)

1. Crea un proyecto **nuevo** en [Supabase](https://supabase.com) (no reuses el de la app).
2. En el SQL Editor, corre en orden:
   - `supabase/migrations/20260927000001_initial_schema.sql`
   - `supabase/seed.sql`
3. En Auth → Providers, deja Email activo. Para MVP local puedes desactivar "Confirm email".
4. Copia env:

```bash
cp .env.example .env.local
```

Rellena `NEXT_PUBLIC_SUPABASE_URL` y `NEXT_PUBLIC_SUPABASE_ANON_KEY` (Settings → API).

5. Arranca:

```bash
npm run dev
```

6. Abre `/login`, crea tu cuenta (la del dueño del producto).

## Roadmap

| Fase | Estado |
|------|--------|
| 1 Fundación | Hecha |
| 2 Prospección (Places + redes) | Hecha |
| 3 Motor inferencia | Hecha (Gemini preferido → Claude → reglas) |
| 4 Dashboard + ficha + wa.me | Hecha (MVP) |
| 5 Loop catálogo | Parcial (cierre promueve producto) |
| 6 App interna | Reservado |

## Google Places (opcional para Fase 2)

1. Crea un proyecto en [Google Cloud Console](https://console.cloud.google.com/).
2. Habilita **Places API (New)**.
3. Crea una API key y restríngela a Places API.
4. Ponla en `.env.local` como `GOOGLE_PLACES_API_KEY=...` y reinicia `npm run dev`.

Sin key aún puedes usar las pestañas **Redes** y **Manual** en `/leads/nuevo`.

## Scripts

```bash
npm run dev
npm run build
npm run lint
```
# ventor
