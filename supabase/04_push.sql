-- ============================================================================
-- EL BECARIO — Migración Fase 3: Web Push (notificaciones)
-- ============================================================================
-- Para REVISIÓN antes de aplicar. Incremental.
--
-- 1) push_subscription: guarda los dispositivos suscritos (endpoint + claves).
--    RLS: cada quien ve/maneja solo los suyos. El emisor (GitHub Action) usa
--    la service role key, que ignora RLS por diseño.
-- 2) bloque.aviso_enviado: evita reenviar el mismo aviso. Se re-arma (false)
--    cuando editás el bloque desde la app.
-- ============================================================================

create table push_subscription (
  id        uuid primary key default gen_random_uuid(),
  user_id   uuid not null default auth.uid() references auth.users (id) on delete cascade,
  endpoint  text not null unique,
  p256dh    text not null,
  auth      text not null,
  creada_en timestamptz not null default now()
);

create index push_subscription_user_idx on push_subscription (user_id);

alter table push_subscription enable row level security;

create policy push_sub_select on push_subscription for select to authenticated
  using (user_id = (select auth.uid()));
create policy push_sub_insert on push_subscription for insert to authenticated
  with check (user_id = (select auth.uid()));
create policy push_sub_delete on push_subscription for delete to authenticated
  using (user_id = (select auth.uid()));

-- Flag para no repetir avisos de un mismo bloque.
alter table bloque add column aviso_enviado boolean not null default false;
