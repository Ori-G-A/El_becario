-- ============================================================================
-- EL BECARIO — Migración 17: el sueño real, desde el teléfono
-- ============================================================================
-- Mismo patrón que la 15 (FitTrack) y por la misma razón: otro dispositivo que
-- no tiene la sesión del becario. Entra por una función con token hasheado en
-- `clave_integracion` — segunda fila, nombre 'telefono'. No hay tabla nueva.
--
-- El sueño no necesita iniciativa: la vista `uso_del_tiempo` deriva
-- `categoria = 'sueno'` directo de `bloque.tipo`, así que basta el bloque.
--
-- Lo que asume, dicho por Oriana: no hay chequeos de madrugada, nunca. La noche
-- es un solo hueco, sin partir. Las siestas se registran a mano y son otra cosa:
-- esta función no las toca, y el macro solo la llama al primer desbloqueo de la
-- mañana.
--
-- El teléfono mide "sin tocar el teléfono", no "dormida": el rato en la cama con
-- el celular antes de dormirse cuenta como despierta, siempre para el mismo lado.
-- El ajuste vive en el macro del teléfono y en un solo lugar — acá llegan dos
-- timestamps y se guardan tal cual. Dos perillas para lo mismo es una de más.
-- ============================================================================

-- Epoch en segundos, no texto: evita toda pelea de formato y de zona horaria
-- entre MacroDroid y Postgres. `to_timestamp` devuelve timestamptz.
create or replace function registrar_sueno(
  p_token     text,
  p_dormido   bigint,
  p_despierto bigint
) returns text
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  clave     clave_integracion%rowtype;
  blq       uuid;
  dormido   timestamptz;
  despierto timestamptz;
  minutos   int;
begin
  dormido   := to_timestamp(p_dormido);
  despierto := to_timestamp(p_despierto);

  if despierto <= dormido then
    raise exception 'despierto tiene que ser posterior a dormido';
  end if;
  minutos := round(extract(epoch from despierto - dormido) / 60);
  -- Una noche. Menos de una hora es un apagón de pantalla suelto; más de 16
  -- es un macro que se disparó mal, no una noche.
  if minutos < 60 or minutos > 960 then
    raise exception 'duración fuera de rango (60..960 min): %', minutos;
  end if;
  if dormido < now() - interval '2 days' or despierto > now() + interval '1 hour' then
    raise exception 'fechas fuera de rango';
  end if;

  select * into clave from clave_integracion
   where token_hash = encode(sha256(convert_to(p_token, 'utf8')), 'hex');
  if clave.user_id is null then
    raise exception 'token inválido' using errcode = '28000';
  end if;
  update clave_integracion set ultimo_uso = now() where id = clave.id;

  -- ponytail: misma ventana de ±6 h que la 15, con el mismo techo. Acá aprieta
  -- menos de lo que parece: sin chequeos de madrugada hay un solo bloque de
  -- sueño por noche, y una siesta anotada a mano a las 15:00 queda a más de 6 h
  -- de la hora de dormir. Si algún día duermes de día y de noche pegado, se
  -- pisan: ahí toca anclar por fecha de la noche en vez de por cercanía.
  select b.id into blq from bloque b
   where b.user_id = clave.user_id
     and b.tipo = 'sueno'
     and b.inicio between dormido - interval '6 hours' and dormido + interval '6 hours'
   order by abs(extract(epoch from (b.inicio - dormido)))
   limit 1;

  if blq is null then
    insert into bloque (user_id, titulo, tipo, inicio, fin, real_inicio, real_fin)
    values (clave.user_id, 'Sueño', 'sueno', dormido, despierto, dormido, despierto);
    return 'bloque creado';
  end if;

  -- Sin coalesce, a diferencia de la 15: FitTrack reenvía su historial completo
  -- y ahí la primera hora manda; el teléfono manda una vez por mañana, así que
  -- un reenvío es una corrección y tiene que pisar.
  update bloque
     set real_inicio = dormido,
         real_fin    = despierto,
         no_cumplido = false
   where id = blq;
  return 'bloque actualizado';
end $$;

revoke all on function registrar_sueno(text, bigint, bigint) from public;
grant execute on function registrar_sueno(text, bigint, bigint) to anon, authenticated;

-- ----------------------------------------------------------------------------
-- Alta del token (una vez, en el SQL Editor). Copia el token del primer select:
-- después solo queda el hash.
--
--   select gen_random_uuid()::text || gen_random_uuid()::text as token_telefono;
--
--   insert into clave_integracion (user_id, nombre, token_hash)
--   values (
--     (select id from auth.users where email = 'tu-correo@ejemplo.com'),
--     'telefono',
--     encode(sha256(convert_to('<pega-el-token-acá>', 'utf8')), 'hex')
--   );
--
-- Prueba (debe responder 'bloque creado' o 'bloque actualizado'):
--   select registrar_sueno(
--     '<token>',
--     extract(epoch from now() - interval '9 hours')::bigint,
--     extract(epoch from now() - interval '1 hour')::bigint
--   );
--
-- Ver si el teléfono está llegando de verdad:
--   select nombre, ultimo_uso from clave_integracion order by nombre;
--
-- Revocar: delete from clave_integracion where nombre = 'telefono';
-- ----------------------------------------------------------------------------

-- ----------------------------------------------------------------------------
-- El lado del teléfono: dos macros de MacroDroid y una variable global.
--
-- Variable global `sueno_dormido`, tipo entero, valor inicial 0.
-- `{system_time}` es el magic text de MacroDroid para epoch en SEGUNDOS, UTC
-- (`{system_time_ms}` sería milisegundos: no es ese).
--
-- Macro 1 — "Sueño: última pantalla apagada"
--   Disparador:   Pantalla apagada
--   Restricción:  Hora del día, 20:00 a 04:00
--   Acción:       Establecer variable  sueno_dormido = {system_time}
--   Cada apagado de la noche pisa al anterior, así que queda el último: el de
--   verdad dormirse. Eso es exactamente el supuesto "no hay chequeos de
--   madrugada" — si un día miras el teléfono a las 3, la noche sale cortada.
--
-- Macro 2 — "Sueño: primer desbloqueo"
--   Disparador:   Dispositivo desbloqueado
--   Restricciones: Hora del día, 04:00 a 12:00
--                  Y  sueno_dormido  >  0
--   Acción 1:     Petición HTTP
--                   POST https://<proyecto>.supabase.co/rest/v1/rpc/registrar_sueno
--                   Content-Type: application/json
--                   apikey: <clave anon>
--                   Authorization: Bearer <clave anon>
--                   Cuerpo:
--                     {"p_token":"<token>","p_dormido":{sueno_dormido},"p_despierto":{system_time}}
--   Acción 2:     Establecer variable  sueno_dormido = 0
--
--   La variable en cero es lo que hace que sea el PRIMER desbloqueo y no todos:
--   la restricción `> 0` apaga el macro hasta la noche siguiente. Las ventanas
--   no se solapan (una termina a las 04:00, la otra empieza ahí) para que un
--   desbloqueo de madrugada no reporte media noche.
--
-- ponytail: sin reintento. Si no hay red en el primer desbloqueo, esa noche se
-- pierde y no se entera nadie. Reintentar de verdad pide guardar también la
-- hora de despertar en su propia variable —si no, el reintento a las 9 reporta
-- que dormiste hasta las 9— y resetear las dos solo con HTTP 200. Dos variables
-- y dos condiciones por una noche cada tanto: se agrega si pasa seguido.
-- ----------------------------------------------------------------------------
