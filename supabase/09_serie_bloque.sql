-- ============================================================================
-- EL BECARIO — Agrupar bloques recurrentes en una "serie"
-- ============================================================================
-- Para REVISIÓN antes de aplicar. Incremental.
--
-- Los bloques creados juntos por una recurrencia comparten un serie_id, así se
-- puede editar o borrar "toda la serie" además de uno por uno. Los bloques
-- existentes quedan con serie_id nulo (sueltos), sin cambios.
-- ============================================================================

begin;

alter table bloque add column if not exists serie_id uuid;

create index if not exists bloque_serie_idx
  on bloque (user_id, serie_id) where serie_id is not null;

commit;
