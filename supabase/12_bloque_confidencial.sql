-- ============================================================================
-- EL BECARIO — Migración: confidencial opcional en bloques (no siempre)
-- ============================================================================
-- Para REVISIÓN antes de aplicar. Incremental.
--
-- Hasta ahora TODO título de bloque se cifraba siempre (sin excepción), lo
-- que impedía que las notificaciones push mostraran el título real de
-- cualquier bloque, y hacía que el aviso genérico "Un bloque confidencial"
-- apareciera incluso para bloques comunes. Se agrega `confidencial` (default
-- false, igual que en `tarea`): los bloques nuevos se guardan en claro salvo
-- que se marquen explícitamente. Los bloques ya existentes quedan tal cual
-- (siguen cifrados; no se tocan retroactivamente).
-- ============================================================================

begin;

alter table bloque add column if not exists confidencial boolean not null default false;

commit;
