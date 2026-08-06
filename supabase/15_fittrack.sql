-- ============================================================================
-- EL BECARIO — Migración 15: entrada de entrenamientos desde FitTrack
-- ============================================================================
-- FitTrack vive en OTRO proyecto de Supabase, así que no puede usar la sesión
-- de El Becario. Entra por una única función `registrar_entrenamiento`,
-- autenticada con un token largo que se guarda hasheado acá.
--
-- Qué hace con lo que reporta FitTrack:
--   minutos > 0  → si ya había un bloque de ejercicio cerca de esa hora, le
--                  llena el tiempo REAL; si no, crea uno nuevo ya ejecutado.
--   minutos = 0  → "no entrené": marca `no_cumplido` el bloque planeado (si lo
--                  hay). No inventa un bloque para decir que no pasó nada.
-- Reenviar el mismo entrenamiento actualiza el mismo bloque: no duplica.
-- ============================================================================

-- `if not exists` + `create or replace`: el archivo se puede volver a correr
-- entero sin romper nada.
create table if not exists clave_integracion (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null references auth.users (id) on delete cascade,
  nombre     text not null,                       -- 'fittrack'
  token_hash text not null unique,                -- sha256 del token en hex
  creada_en  timestamptz not null default now(),
  ultimo_uso timestamptz
);

-- RLS SIN políticas a propósito: nadie llega a esta tabla por PostgREST.
-- La única lectura es desde la función de abajo, que corre como owner.
alter table clave_integracion enable row level security;

create or replace function registrar_entrenamiento(
  p_token   text,
  p_inicio  timestamptz,
  p_minutos int
) returns text
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  clave clave_integracion%rowtype;
  ini   uuid;
  blq   uuid;
  fin   timestamptz;
begin
  if p_minutos is null or p_minutos < 0 or p_minutos > 600 then
    raise exception 'minutos fuera de rango (0..600)';
  end if;
  if p_inicio is null or p_inicio < now() - interval '1 year' or p_inicio > now() + interval '1 day' then
    raise exception 'inicio fuera de rango';
  end if;

  select * into clave from clave_integracion
   where token_hash = encode(sha256(convert_to(p_token, 'utf8')), 'hex');
  if clave.user_id is null then
    raise exception 'token inválido' using errcode = '28000';
  end if;
  update clave_integracion set ultimo_uso = now() where id = clave.id;

  -- La iniciativa es la que le da la categoría al tiempo (migración 14).
  select id into ini from iniciativa
   where user_id = clave.user_id and categoria = 'ejercicio' and activa
   order by creada_en limit 1;
  if ini is null then
    insert into iniciativa (user_id, nombre, descripcion, categoria)
    values (clave.user_id, 'Ejercicio', 'Se alimenta de FitTrack.', 'ejercicio')
    returning id into ini;
  end if;

  -- ponytail: ventana de ±6 h para reconocer el bloque planeado como el mismo
  -- entrenamiento. Si algún día entrenas dos veces en ese lapso, se pisan:
  -- ahí toca un id externo de FitTrack como clave.
  select b.id into blq from bloque b
   where b.user_id = clave.user_id
     and coalesce((select t.iniciativa_id from tarea t where t.id = b.tarea_id), b.iniciativa_id) = ini
     and b.inicio between p_inicio - interval '6 hours' and p_inicio + interval '6 hours'
   order by abs(extract(epoch from (b.inicio - p_inicio)))
   limit 1;

  if p_minutos = 0 then
    if blq is null then return 'sin bloque planeado que marcar'; end if;
    update bloque set no_cumplido = true, real_inicio = null, real_fin = null
     where id = blq;
    return 'marcado como no cumplido';
  end if;

  fin := p_inicio + make_interval(mins => p_minutos);

  if blq is null then
    insert into bloque (user_id, iniciativa_id, titulo, tipo, inicio, fin, real_inicio, real_fin)
    values (clave.user_id, ini, 'Entrenamiento', 'autocuidado', p_inicio, fin, p_inicio, fin);
    return 'bloque creado';
  end if;

  update bloque set real_inicio = p_inicio, real_fin = fin, no_cumplido = false
   where id = blq;
  return 'bloque actualizado';
end $$;

revoke all on function registrar_entrenamiento(text, timestamptz, int) from public;
grant execute on function registrar_entrenamiento(text, timestamptz, int) to anon, authenticated;

-- ----------------------------------------------------------------------------
-- Verificar que quedó todo aplicado (debe devolver una fila):
--   select p.proname, c.relrowsecurity as rls_en_clave_integracion
--   from pg_proc p, pg_class c
--   where p.proname = 'registrar_entrenamiento' and c.relname = 'clave_integracion';
--
-- Alta del token (correr una vez en el SQL Editor). Copia el token que imprime
-- el primer select: no se puede volver a ver, solo queda el hash.
--
--   select gen_random_uuid()::text || gen_random_uuid()::text as token_fittrack;
--
--   insert into clave_integracion (user_id, nombre, token_hash)
--   values (
--     (select id from auth.users where email = 'tu-correo@ejemplo.com'),
--     'fittrack',
--     encode(sha256(convert_to('<pega-el-token-acá>', 'utf8')), 'hex')
--   );
--
-- Revocarlo: delete from clave_integracion where nombre = 'fittrack';
--
-- Prueba de que quedó vivo (debe responder "bloque creado"):
--   select registrar_entrenamiento('<token>', now() - interval '2 hours', 45);
-- ----------------------------------------------------------------------------
