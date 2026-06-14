-- ============================================================================
-- EL BECARIO — Migración Fase 3: cifrado client-side (Capa 2)
-- ============================================================================
-- Para REVISIÓN antes de aplicar. Incremental.
--
-- user_crypto guarda SOLO el salt por usuario (no secreto): permite que
-- cualquier dispositivo con tu PIN derive la MISMA clave (PBKDF2) y descifre.
-- La clave nunca se guarda: vive en memoria mientras la app está desbloqueada.
--
-- Sin policy de UPDATE/DELETE a propósito: el salt no debe cambiar nunca
-- (cambiarlo dejaría ilegible todo lo ya cifrado).
-- ============================================================================

create table user_crypto (
  user_id   uuid primary key default auth.uid() references auth.users (id) on delete cascade,
  salt      text not null,
  creada_en timestamptz not null default now()
);

alter table user_crypto enable row level security;

create policy user_crypto_select on user_crypto for select to authenticated
  using (user_id = (select auth.uid()));
create policy user_crypto_insert on user_crypto for insert to authenticated
  with check (user_id = (select auth.uid()));
