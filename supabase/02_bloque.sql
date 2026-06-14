-- ============================================================================
-- EL BECARIO — Migración Fase 2: tabla `bloque` (calendario propio)
-- ============================================================================
-- Para REVISIÓN antes de aplicar. Es incremental: NO re-ejecuta el schema.sql
-- de Fase 1. Reutiliza la función set_actualizada_en() ya creada allí.
--
-- Un `bloque` es un evento del calendario que enlaza prioridad ↔ tiempo:
--   - inicio/fin       = horario PLANEADO
--   - real_inicio/fin  = horario EJECUTADO (alimenta la métrica de desviación)
--   - tipo             = clasifica el tiempo (Top Goal, profundo, reactivo…)
--   - protegido        = el bloque Top Goal lo es por defecto
--   - importante       = compromiso/fecha clave → dispara alerta anticipada
--   - aviso_min_antes  = minutos de anticipación para el aviso (nullable)
-- ============================================================================

create type tipo_bloque as enum (
  'top_goal',
  'trabajo_profundo',
  'reactivo',
  'reunion',
  'autocuidado'
);

create table bloque (
  id              uuid primary key default gen_random_uuid(),
  user_id         uuid not null default auth.uid() references auth.users (id) on delete cascade,
  tarea_id        uuid references tarea (id) on delete set null,
  titulo          text not null check (char_length(titulo) between 1 and 200),
  inicio          timestamptz not null,                 -- planeado
  fin             timestamptz not null,                 -- planeado
  real_inicio     timestamptz,                          -- ejecutado
  real_fin        timestamptz,                          -- ejecutado
  tipo            tipo_bloque not null default 'trabajo_profundo',
  protegido       boolean not null default false,
  importante      boolean not null default false,
  aviso_min_antes integer check (aviso_min_antes is null or aviso_min_antes >= 0),
  creada_en       timestamptz not null default now(),
  actualizada_en  timestamptz not null default now(),
  check (fin > inicio),
  check (real_fin is null or real_inicio is null or real_fin >= real_inicio)
);

create index bloque_user_inicio_idx on bloque (user_id, inicio);
create index bloque_tarea_idx on bloque (tarea_id);
-- Para el chequeo de avisos al abrir la app (bloques importantes próximos).
create index bloque_importante_idx on bloque (user_id, inicio) where importante;

create trigger bloque_touch before update on bloque
  for each row execute function set_actualizada_en();

alter table bloque enable row level security;

create policy bloque_select on bloque for select to authenticated
  using (user_id = (select auth.uid()));
create policy bloque_insert on bloque for insert to authenticated
  with check (user_id = (select auth.uid()));
create policy bloque_update on bloque for update to authenticated
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));
create policy bloque_delete on bloque for delete to authenticated
  using (user_id = (select auth.uid()));
