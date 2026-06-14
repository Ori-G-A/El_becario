-- ============================================================================
-- EL BECARIO — Esquema de base de datos (Fase 1)
-- ============================================================================
-- Postgres / Supabase. Para REVISIÓN antes de aplicar.
--
-- Principios:
--   * RLS en TODAS las tablas. Política explícita por acción (select/insert/
--     update/delete), siempre `user_id = auth.uid()`. La anon key es pública;
--     esto es lo único que protege el acceso a tus filas.
--   * `user_id` con default `auth.uid()` → los inserts del cliente no necesitan
--     mandarlo y no se puede falsificar (lo pone el servidor desde el JWT).
--   * `on delete cascade` hacia `auth.users` → si se borra la cuenta, se borra todo.
--
-- DECISIONES QUE QUIERO QUE REVISES (se apartan de la lectura literal del prompt):
--   [D1] N:M tarea↔area como TABLA PUENTE `tarea_area`, en vez de `area_ids[]`.
--        El spec §2 ya describe la relación como N:M. Una tabla puente da
--        integridad referencial (borrar un área limpia sus vínculos) y hace
--        triviales las métricas "tiempo por área" de Fase 2. Si preferís el
--        array uuid[], lo cambio — pero recomiendo esto.
--   [D2] Agregué `tarea.orden_top12` (int, nullable) para PERSISTIR el orden del
--        drag-and-drop del Top 12. El prompt no lo listaba pero el reordenar
--        arrastrando necesita guardarse en algún lado.
--   [D3] Índice único parcial: máximo UN Top Goal por día (user_id, fecha).
--        Refleja la regla "las 2 primeras horas para lo más importante".
--        Si querés permitir varios candidatos, lo quito.
-- ============================================================================

-- ----------------------------------------------------------------------------
-- 0. Extensiones y tipos
-- ----------------------------------------------------------------------------
-- gen_random_uuid() viene en pgcrypto (habilitado por defecto en Supabase).
create extension if not exists pgcrypto;

create type estado_rag as enum ('rojo', 'ambar', 'verde');
create type estado_tarea as enum ('pendiente', 'en_curso', 'hecha');

-- Trigger genérico para mantener `actualizada_en`.
create or replace function set_actualizada_en()
returns trigger
language plpgsql
as $$
begin
  new.actualizada_en = now();
  return new;
end;
$$;

-- ----------------------------------------------------------------------------
-- 1. area  (etiquetas / ámbitos de vida)
-- ----------------------------------------------------------------------------
create table area (
  id        uuid primary key default gen_random_uuid(),
  user_id   uuid not null default auth.uid() references auth.users (id) on delete cascade,
  nombre    text not null check (char_length(nombre) between 1 and 60),
  color     text not null check (color ~ '^#[0-9A-Fa-f]{6}$'),
  icono     text not null default 'tag',
  orden     integer not null default 0,
  creada_en timestamptz not null default now()
);

create index area_user_idx on area (user_id, orden);

alter table area enable row level security;

create policy area_select on area for select to authenticated
  using (user_id = (select auth.uid()));
create policy area_insert on area for insert to authenticated
  with check (user_id = (select auth.uid()));
create policy area_update on area for update to authenticated
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));
create policy area_delete on area for delete to authenticated
  using (user_id = (select auth.uid()));

-- ----------------------------------------------------------------------------
-- 2. iniciativa  (proyecto / línea de trabajo, de equipo o personal)
-- ----------------------------------------------------------------------------
create table iniciativa (
  id              uuid primary key default gen_random_uuid(),
  user_id         uuid not null default auth.uid() references auth.users (id) on delete cascade,
  nombre          text not null check (char_length(nombre) between 1 and 120),
  descripcion     text,
  stl_responsable text not null default 'yo',          -- Single Thread Leader (texto libre)
  es_equipo       boolean not null default false,
  estado_rag      estado_rag not null default 'ambar', -- RAG manual en Fase 1
  orden_prioridad integer not null default 0,
  activa          boolean not null default true,
  creada_en       timestamptz not null default now(),
  actualizada_en  timestamptz not null default now()
);

create index iniciativa_user_idx on iniciativa (user_id, orden_prioridad);

create trigger iniciativa_touch before update on iniciativa
  for each row execute function set_actualizada_en();

alter table iniciativa enable row level security;

create policy iniciativa_select on iniciativa for select to authenticated
  using (user_id = (select auth.uid()));
create policy iniciativa_insert on iniciativa for insert to authenticated
  with check (user_id = (select auth.uid()));
create policy iniciativa_update on iniciativa for update to authenticated
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));
create policy iniciativa_delete on iniciativa for delete to authenticated
  using (user_id = (select auth.uid()));

-- ----------------------------------------------------------------------------
-- 3. tarea
-- ----------------------------------------------------------------------------
create table tarea (
  id             uuid primary key default gen_random_uuid(),
  user_id        uuid not null default auth.uid() references auth.users (id) on delete cascade,
  iniciativa_id  uuid references iniciativa (id) on delete set null,
  titulo         text not null check (char_length(titulo) between 1 and 200),
  responsable    text not null default 'yo',            -- texto libre
  estimacion_min integer check (estimacion_min is null or estimacion_min >= 0),
  estado         estado_tarea not null default 'pendiente',
  es_top12       boolean not null default false,
  es_top_goal    boolean not null default false,
  orden_top12    integer,                               -- [D2] orden del drag-and-drop
  confidencial   boolean not null default false,        -- marca Nivel 1; cifrado en Fase 3
  fecha          date,
  creada_en      timestamptz not null default now(),
  actualizada_en timestamptz not null default now()
);

create index tarea_user_idx on tarea (user_id);
create index tarea_top12_idx on tarea (user_id, orden_top12) where es_top12;
create index tarea_iniciativa_idx on tarea (iniciativa_id);

-- [D3] Un solo Top Goal por día.
create unique index tarea_un_top_goal_por_dia
  on tarea (user_id, fecha) where es_top_goal;

create trigger tarea_touch before update on tarea
  for each row execute function set_actualizada_en();

alter table tarea enable row level security;

create policy tarea_select on tarea for select to authenticated
  using (user_id = (select auth.uid()));
create policy tarea_insert on tarea for insert to authenticated
  with check (user_id = (select auth.uid()));
create policy tarea_update on tarea for update to authenticated
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));
create policy tarea_delete on tarea for delete to authenticated
  using (user_id = (select auth.uid()));

-- ----------------------------------------------------------------------------
-- 4. tarea_area  (tabla puente N:M — [D1])
-- ----------------------------------------------------------------------------
create table tarea_area (
  tarea_id uuid not null references tarea (id) on delete cascade,
  area_id  uuid not null references area (id)  on delete cascade,
  user_id  uuid not null default auth.uid() references auth.users (id) on delete cascade,
  primary key (tarea_id, area_id)
);

create index tarea_area_area_idx on tarea_area (area_id);
create index tarea_area_user_idx on tarea_area (user_id);

alter table tarea_area enable row level security;

create policy tarea_area_select on tarea_area for select to authenticated
  using (user_id = (select auth.uid()));
create policy tarea_area_insert on tarea_area for insert to authenticated
  with check (user_id = (select auth.uid()));
create policy tarea_area_delete on tarea_area for delete to authenticated
  using (user_id = (select auth.uid()));
-- (sin update: un vínculo se crea o se borra, no se "edita")

-- ----------------------------------------------------------------------------
-- 5. revision_semanal  (versión básica de Fase 1)
-- ----------------------------------------------------------------------------
create table revision_semanal (
  id             uuid primary key default gen_random_uuid(),
  user_id        uuid not null default auth.uid() references auth.users (id) on delete cascade,
  semana         date not null,                  -- fecha de inicio (lunes) de la semana
  rag_global     estado_rag,                     -- asignado a mano en Fase 1
  notas          text,
  creada_en      timestamptz not null default now(),
  actualizada_en timestamptz not null default now(),
  unique (user_id, semana)                        -- una revisión por semana
);

create index revision_user_idx on revision_semanal (user_id, semana desc);

create trigger revision_touch before update on revision_semanal
  for each row execute function set_actualizada_en();

alter table revision_semanal enable row level security;

create policy revision_select on revision_semanal for select to authenticated
  using (user_id = (select auth.uid()));
create policy revision_insert on revision_semanal for insert to authenticated
  with check (user_id = (select auth.uid()));
create policy revision_update on revision_semanal for update to authenticated
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));
create policy revision_delete on revision_semanal for delete to authenticated
  using (user_id = (select auth.uid()));

-- ----------------------------------------------------------------------------
-- 6. Áreas iniciales (semilla)
-- ----------------------------------------------------------------------------
-- NOTA: se ejecuta en el contexto de un usuario autenticado para que
-- `auth.uid()` resuelva su user_id. Mejor sembrarlas desde la app en el primer
-- login (así cada usuario obtiene las suyas). Dejo el listado como referencia:
--   Personal · Colegio · Universidad · Familia · Esposo · Oulad
-- ============================================================================
