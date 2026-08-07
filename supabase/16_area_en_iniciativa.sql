-- ============================================================================
-- EL BECARIO — Migración 16: el área baja por la cadena hasta amiga
-- ============================================================================
-- Problema que arregla: el ciclo real es
--     área de vida → iniciativa → tarea → bloque en el calendario
-- pero en la base el área colgaba SOLO de la tarea (`tarea_area`, esquema D1).
-- La vista `uso_del_tiempo` (migración 14) hace bloque → tarea → iniciativa, así
-- que el área nunca entraba al join y amiga recibía únicamente `categoria`: la
-- segunda taxonomía. Todo bloque sin tarea (reactivo, directo a iniciativa,
-- FitTrack) no tenía área ni siquiera en teoría.
--
-- Qué cambia:
--   1. `iniciativa.area_id` — el área se elige UNA vez, en la iniciativa, y baja
--      sola a cada tarea y cada bloque que cuelgue de ella.
--   2. `tarea_area` se queda como override opcional (la flexibilidad de poner un
--      área distinta en una tarea granular). La vista resuelve UNA sola área por
--      bloque con coalesce → nunca dos filas, nunca doble conteo de minutos.
--   3. La vista pasa a llevar la cadena completa: área, iniciativa, tarea.
--      Nombres sí (no están cifrados); títulos de bloque y notas siguen fuera.
-- ============================================================================

-- Re-ejecutable entero.
alter table iniciativa add column if not exists area_id uuid
  references area (id) on delete set null;

create index if not exists iniciativa_area_idx on iniciativa (area_id);

-- ----------------------------------------------------------------------------
-- Backfill: cada iniciativa hereda el área más usada por sus propias tareas.
-- Solo toca las que están en null, así que se puede correr de nuevo sin daño.
-- ----------------------------------------------------------------------------
update iniciativa i
   set area_id = (
     select ta.area_id
       from tarea t
       join tarea_area ta on ta.tarea_id = t.id
      where t.iniciativa_id = i.id
      group by ta.area_id
      order by count(*) desc, ta.area_id
      limit 1
   )
 where i.area_id is null;

-- ----------------------------------------------------------------------------
-- Vista para amiga. Sigue sin títulos ni notas: cuándo, cuánto, y de quién es
-- ese tiempo en las tres etiquetas de la cadena.
-- ----------------------------------------------------------------------------
drop view if exists uso_del_tiempo;

create view uso_del_tiempo
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

  -- La cadena, de arriba abajo. El área de la tarea gana si existe (override);
  -- si no, la de la iniciativa. Una sola, siempre.
  coalesce(ta.area_id, i.area_id)     as area_id,
  coalesce(ta.area_nombre, ar.nombre) as area,
  i.id                                as iniciativa_id,
  i.nombre                            as iniciativa,
  b.tarea_id,

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
left join area ar on ar.id = i.area_id
-- Una sola área de la tarea aunque el puente permita varias: la de menor orden.
-- ponytail: en la práctica las tareas llevan una sola; si algún día importa el
-- resto, esto se vuelve un array agregado y amiga deja de poder sumar minutos.
left join lateral (
  select a.id as area_id, a.nombre as area_nombre
    from tarea_area tx
    join area a on a.id = tx.area_id
   where tx.tarea_id = t.id
   order by a.orden, a.nombre
   limit 1
) ta on true
where not b.no_cumplido;

grant select on uso_del_tiempo to authenticated;

-- ----------------------------------------------------------------------------
-- Chequeos (SQL Editor, después de aplicar):
--
-- 1. Iniciativas que siguen sin área — cada una es tiempo que amiga recibirá
--    sin la etiqueta de arriba. Etiquétalas desde la pestaña Iniciativas:
--      select nombre, categoria from iniciativa
--       where area_id is null and activa order by nombre;
--
-- 2. Cuánto tiempo llega completo vs. cojo:
--      select coalesce(area, 'SIN ÁREA') as area,
--             coalesce(categoria::text, 'SIN CATEGORÍA') as categoria,
--             count(*), sum(minutos)
--        from uso_del_tiempo group by 1, 2 order by 4 desc;
--
-- 3. Los minutos no se duplicaron al agregar los joins (deben coincidir):
--      select count(*), sum(minutos) from uso_del_tiempo;
--      select count(*), sum(round(extract(epoch from
--               coalesce(real_fin - real_inicio, fin - inicio)) / 60))
--        from bloque where not no_cumplido;
--
-- 'SIN CATEGORÍA' = bloque de autocuidado suelto, sin tarea ni iniciativa: la
-- libertad de crear bloques sin protocolo se paga ahí. La vista ya no lo pierde
-- (llega con tipo, minutos y, si la hay, área), pero la categoría hay que darla
-- vinculándolo a una iniciativa permanente (Ejercicio, Comida, Traslado…).
-- ----------------------------------------------------------------------------
