-- ============================================================================
-- EL BECARIO — Migración Fase 2: tipo de bloque 'sueno'
-- ============================================================================
-- El sueño es un ESPACIO BLOQUEADO separado: no es trabajo (no suma al techo
-- de horas) ni autocuidado (no entra en esa métrica). Solo se agenda y protege.
--
-- Nota: ADD VALUE no puede ejecutarse dentro de una transacción junto con su
-- primer uso. En el SQL Editor de Supabase corre bien como sentencia suelta.
-- ============================================================================

alter type tipo_bloque add value if not exists 'sueno';
