-- ============================================================================
-- EL BECARIO — Tareas agendadas como checklist del día (sin horario)
-- ============================================================================
-- Para REVISIÓN antes de aplicar. Incremental.
--
-- Una tarea con agendada_para = un día aparece en la franja "Pendientes del día"
-- de la vista Día, sin reservar horario en el calendario. Las tareas con bloque
-- de horario no usan esta columna (viven en el timeline). Nada existente cambia.
-- ============================================================================

begin;

alter table tarea add column if not exists agendada_para date;

create index if not exists tarea_agenda_idx
  on tarea (user_id, agendada_para) where agendada_para is not null;

commit;
