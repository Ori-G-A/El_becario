# El Becario

> El pasante no remunerado que te ordena la vida.

PWA instalable de gestión de agenda semanal para uso personal. Tres esquemas:
**Top Goal** (las 2 primeras horas del día para lo más importante), **Top 12**
(las 12 tareas críticas priorizadas, cada una con encargado) y **RAG semanal**
(semáforo rojo/ámbar/verde para proyectos y para la gestión personal del tiempo).

## Stack

- **React + Vite + TypeScript**, como **PWA instalable** (`vite-plugin-pwa`).
- **Supabase (Postgres)** como única fuente de verdad. Auth con **magic link**.
- **RLS estricto** en todas las tablas (`user_id = auth.uid()`).
- **App-lock con PIN (SHA-256)** guardado en el dispositivo (IndexedDB) + auto-lock.
- **@dnd-kit** (drag-to-reorder), **Recharts** (gráficos), **Lucide React** (iconos).
- Deploy en **Vercel**. Gestor de paquetes: **pnpm**.

## Puesta en marcha

```bash
pnpm install
cp .env.example .env.local   # completá VITE_SUPABASE_URL y VITE_SUPABASE_ANON_KEY
pnpm dev
```

> La anon key es **pública por diseño**: lo que protege tus datos es el RLS,
> no el secreto de la clave. Nunca comitees `.env.local`.

## Scripts

| Comando | Qué hace |
|---|---|
| `pnpm dev` | Servidor de desarrollo (con SW de PWA activo) |
| `pnpm build` | Typecheck + build de producción |
| `pnpm preview` | Sirve el build localmente |
| `pnpm lint` | ESLint |
| `pnpm typecheck` | Solo chequeo de tipos |

## Base de datos

El esquema completo con políticas RLS está en [`supabase/schema.sql`](supabase/schema.sql).
**Revisalo antes de aplicarlo** en el SQL Editor de Supabase.

## Estructura

```
src/
  lib/        clientes y utilidades (supabase.ts)
  types/      tipos del modelo de datos (database.ts)
  App.tsx     shell de la app
  index.css   sistema de diseño (tokens, componentes base)
supabase/
  schema.sql  esquema + RLS (Fase 1)
```

## Seguridad

- Secrets solo en env vars (Vercel / `.env.local`), nunca en el repo.
- RLS en todas las tablas; el service worker no cachea datos de Supabase.
- Export/backup JSON propio (Supabase Free no tiene backups automáticos).
