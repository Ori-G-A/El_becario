-- ============================================================================
-- EL BECARIO — Migración: resúmenes push diarios + cron puntual en Supabase
-- ============================================================================
-- Para REVISIÓN antes de aplicar. Incremental.
--
-- 1) push_digest: registra qué resumen (mañana/cierre) ya se envió cada día,
--    para no repetirlo. Solo la toca el emisor (service role); sin políticas
--    RLS de lectura/escritura para usuarios.
-- 2) pg_cron + pg_net: invocan la Edge Function `avisos` cada 5 minutos.
--    Esto reemplaza el cron de GitHub Actions, que se atrasaba ~2 horas.
-- ============================================================================

begin;

create table if not exists push_digest (
  user_id   uuid not null references auth.users (id) on delete cascade,
  fecha     date not null,
  tipo      text not null check (tipo in ('manana', 'cierre')),
  creada_en timestamptz not null default now(),
  primary key (user_id, fecha, tipo)
);

alter table push_digest enable row level security;
-- Sin políticas a propósito: nadie salvo service_role lee o escribe aquí.

commit;

-- ============================================================================
-- Suscripciones viejas: se firmaron con el par VAPID anterior (rotado el
-- 2026-07-02 porque la clave privada no era recuperable). Con la clave nueva
-- solo producen errores. Se borran; el teléfono se re-suscribe desde la app.
-- ============================================================================

delete from push_subscription;

-- ============================================================================
-- CRON (la Edge Function `avisos` ya está desplegada).
-- La anon key es pública por diseño; solo autentica el paso por el gateway.
-- ============================================================================

create extension if not exists pg_cron;
create extension if not exists pg_net;

select cron.schedule(
  'avisos-el-becario',
  '*/5 * * * *',
  $$
  select net.http_post(
    url     := 'https://tcgwtwtjubmpvhxarrwv.supabase.co/functions/v1/avisos',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InRjZ3d0d3RqdWJtcHZoeGFycnd2Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODEzOTU3MjcsImV4cCI6MjA5Njk3MTcyN30.qf0XAzeF4CO-qDJeIPETRDqmwD6mMuIwcZ0ZycqNyUQ'
    ),
    body    := '{}'::jsonb
  );
  $$
);

-- Para pausarlo algún día: select cron.unschedule('avisos-el-becario');
