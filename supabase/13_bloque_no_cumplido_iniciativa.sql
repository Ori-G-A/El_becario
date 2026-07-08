-- ============================================================================
-- EL BECARIO — Migración 13: reporte de no cumplimiento + iniciativa directa
-- ============================================================================
-- Como los bloques se asumen cumplidos por defecto, `no_cumplido` es la vía
-- honesta de reportar la excepción sin borrar el bloque (el plan queda como
-- registro, pero no cuenta tiempo en las métricas).
--
-- `iniciativa_id` permite que un bloque reporte directo a una iniciativa sin
-- pasar por una tarea. Si el bloque tiene tarea, la iniciativa de la tarea
-- manda; este campo es el fallback.
-- ============================================================================

alter table bloque
  add column no_cumplido   boolean not null default false,
  add column iniciativa_id uuid references iniciativa (id) on delete set null;

create index bloque_iniciativa_idx on bloque (iniciativa_id);
