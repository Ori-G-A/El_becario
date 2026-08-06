-- ============================================================================
-- EL BECARIO — Migración 14: categoría de vida en la iniciativa + vista `uso_del_tiempo`
-- ============================================================================
-- La iniciativa es la etiqueta más grande, así que es donde vive la taxonomía
-- fija que consume `amiga`. Ocho categorías, dos de ellas DERIVADAS (no se
-- eligen a mano, las pone la vista):
--   * sueno         → lo pone el bloque de tipo 'sueno'
--   * foco_profundo → un bloque top_goal/trabajo_profundo de una iniciativa de trabajo
--
-- Las otras seis se eligen una vez por iniciativa y no cambian:
--   trabajo · ejercicio · cuidado_personal · comida · traslado · libre
--
-- Regla de resolución (una sola, en la vista, para que amiga no la reimplemente):
--   1. tipo = 'sueno'                        → sueno
--   2. la categoría de la iniciativa manda;  'trabajo' + bloque profundo → foco_profundo
--   3. sin iniciativa: el tipo del bloque ya dice si fue trabajo o foco
--   4. autocuidado sin iniciativa            → NULL = sin clasificar (a etiquetar)
-- Los bloques reportados `no_cumplido` no aparecen: ese tiempo no ocurrió.
-- ============================================================================

-- Todo el archivo es re-ejecutable: se puede correr entero sin romper nada.
do $$ begin
  create type categoria_vida as enum (
    'trabajo',
    'sueno',
    'foco_profundo',
    'ejercicio',
    'cuidado_personal',
    'comida',
    'traslado',
    'libre'
  );
exception when duplicate_object then null;
end $$;

alter table iniciativa add column if not exists categoria categoria_vida;

alter table iniciativa drop constraint if exists iniciativa_categoria_check;
alter table iniciativa add constraint iniciativa_categoria_check
  check (categoria is null or categoria not in ('sueno', 'foco_profundo'));

-- Vista de solo lectura para amiga. Sin títulos ni notas: solo cuándo, cuánto y
-- de qué categoría. security_invoker → aplica la RLS de las tablas base.
create or replace view uso_del_tiempo
with (security_invoker = true) as
select
  b.id      as bloque_id,
  b.user_id,
  b.inicio,
  b.fin,
  b.tipo,
  (round(
    extract(epoch from
      case
        when b.real_inicio is not null and b.real_fin is not null
          then b.real_fin - b.real_inicio
        else b.fin - b.inicio
      end
    ) / 60
  ))::int as minutos,
  b.real_inicio is not null and b.real_fin is not null as con_registro_real,
  case
    when b.tipo = 'sueno' then 'sueno'::categoria_vida
    when i.categoria is null then
      case
        when b.tipo in ('top_goal', 'trabajo_profundo') then 'foco_profundo'::categoria_vida
        when b.tipo in ('reactivo', 'reunion') then 'trabajo'::categoria_vida
      end
    when i.categoria = 'trabajo' and b.tipo in ('top_goal', 'trabajo_profundo')
      then 'foco_profundo'::categoria_vida
    else i.categoria
  end as categoria
from bloque b
left join tarea t on t.id = b.tarea_id
-- Migración 13: si el bloque tiene tarea, manda la iniciativa de la tarea.
left join iniciativa i on i.id = coalesce(t.iniciativa_id, b.iniciativa_id)
where not b.no_cumplido;

grant select on uso_del_tiempo to authenticated;

-- ----------------------------------------------------------------------------
-- Backfill de las iniciativas que ya existen (los nombres NO están cifrados;
-- revisa la lista antes de correr):
--   update iniciativa set categoria = 'trabajo'
--    where categoria is null and nombre in ('Colegio', 'Universidad', 'Oulad');
--   update iniciativa set categoria = 'libre'
--    where categoria is null and nombre in ('Familia', 'Esposo');
--
-- Chequeo (correr en el SQL Editor después de aplicar):
--   select coalesce(categoria::text, 'SIN CLASIFICAR') as categoria,
--          count(*), sum(minutos)
--   from uso_del_tiempo group by 1 order by 3 desc;
-- Cada fila 'SIN CLASIFICAR' es un bloque de autocuidado cuya iniciativa no
-- tiene categoría: eso es exactamente lo que hay que etiquetar.
-- ----------------------------------------------------------------------------
