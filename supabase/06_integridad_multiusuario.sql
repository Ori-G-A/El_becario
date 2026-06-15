-- ============================================================================
-- EL BECARIO - Integridad referencial multiusuario
-- ============================================================================
-- RLS protege las filas visibles, pero una FK simple por `id` no garantiza que
-- una fila hija y su padre pertenezcan al mismo usuario. Estas FK compuestas
-- convierten esa regla en una invariante de la base de datos.
--
-- La migracion se detiene si ya existen relaciones cruzadas. En ese caso hay
-- que revisarlas manualmente antes de volver a ejecutarla.
-- ============================================================================

begin;

do $$
begin
  if exists (
    select 1
    from tarea t
    join iniciativa i on i.id = t.iniciativa_id
    where t.user_id <> i.user_id
  ) then
    raise exception 'Integridad: hay tareas vinculadas a iniciativas de otro usuario';
  end if;

  if exists (
    select 1
    from tarea_area ta
    join tarea t on t.id = ta.tarea_id
    where ta.user_id <> t.user_id
  ) then
    raise exception 'Integridad: hay vinculos tarea_area con tareas de otro usuario';
  end if;

  if exists (
    select 1
    from tarea_area ta
    join area a on a.id = ta.area_id
    where ta.user_id <> a.user_id
  ) then
    raise exception 'Integridad: hay vinculos tarea_area con areas de otro usuario';
  end if;

  if exists (
    select 1
    from bloque b
    join tarea t on t.id = b.tarea_id
    where b.user_id <> t.user_id
  ) then
    raise exception 'Integridad: hay bloques vinculados a tareas de otro usuario';
  end if;
end;
$$;

-- Una FK compuesta necesita una clave unica equivalente en la tabla padre.
alter table area
  add constraint area_id_usuario_uniq unique (id, user_id);
alter table iniciativa
  add constraint iniciativa_id_usuario_uniq unique (id, user_id);
alter table tarea
  add constraint tarea_id_usuario_uniq unique (id, user_id);

-- tarea -> iniciativa. Al borrar la iniciativa solo se limpia iniciativa_id;
-- user_id sigue identificando al propietario de la tarea.
alter table tarea
  drop constraint tarea_iniciativa_id_fkey,
  add constraint tarea_iniciativa_usuario_fkey
    foreign key (iniciativa_id, user_id)
    references iniciativa (id, user_id)
    on delete set null (iniciativa_id);

-- tarea_area debe pertenecer al mismo usuario que ambos extremos.
alter table tarea_area
  drop constraint tarea_area_tarea_id_fkey,
  drop constraint tarea_area_area_id_fkey,
  add constraint tarea_area_tarea_usuario_fkey
    foreign key (tarea_id, user_id)
    references tarea (id, user_id)
    on delete cascade,
  add constraint tarea_area_area_usuario_fkey
    foreign key (area_id, user_id)
    references area (id, user_id)
    on delete cascade;

-- bloque -> tarea, conservando el comportamiento de desvincular al borrar.
alter table bloque
  drop constraint bloque_tarea_id_fkey,
  add constraint bloque_tarea_usuario_fkey
    foreign key (tarea_id, user_id)
    references tarea (id, user_id)
    on delete set null (tarea_id);

commit;
