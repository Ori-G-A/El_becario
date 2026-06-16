-- ============================================================================
-- EL BECARIO - Matriz de Eisenhower para la tarea
-- ============================================================================
-- Reencuadra el Top 12: ya no es "las unicas tareas que existen", sino una
-- SELECCION semiautomatica sobre TODAS las tareas pendientes. Para priorizar
-- agregamos los dos ejes de Eisenhower y un override manual.
--
--   importante / urgente -> cuadrante:
--     Q1  importante  + urgente   -> "Hacer ya"
--     Q2  importante  + no urgente-> "Planificar"
--     Q3  no importante + urgente -> "Delegar"
--     Q4  no importante + no urg. -> "Porque si"  (el antojo: no tiene sentido
--                                                   pero igual lo quiero hacer)
--
--   top12_override deja forzar la seleccion automatica:
--     'fijar'   -> siempre dentro del Top 12
--     'excluir' -> nunca dentro del Top 12
--     null      -> lo decide el ranking por cuadrante (Q1>Q2>Q3>Q4)
--
-- es_top12 / orden_top12 se conservan como RESULTADO MATERIALIZADO de esa
-- seleccion (lo recalcula la app). Asi el panel, el calendario y los respaldos
-- siguen leyendo el Top 12 sin cambios.
-- ============================================================================

begin;

alter table tarea
  add column if not exists importante     boolean not null default false,
  add column if not exists urgente        boolean not null default false,
  add column if not exists top12_override text
    check (top12_override in ('fijar', 'excluir'));

-- Migracion de datos: hoy toda tarea creada entraba al Top 12 (es_top12=true).
-- Para no perder esa intencion, las tratamos como importantes (caen en Q1/Q2)
-- y las fijamos para que sigan dentro del Top 12 hasta que las reclasifiques.
update tarea
  set importante = true
  where es_top12 = true and importante = false;

update tarea
  set top12_override = 'fijar'
  where es_top12 = true and top12_override is null;

-- Acelera el ranking por cuadrante sobre las pendientes.
create index if not exists tarea_eisenhower_idx
  on tarea (user_id, importante, urgente)
  where estado <> 'hecha';

commit;
