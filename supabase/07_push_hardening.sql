-- ============================================================================
-- EL BECARIO - Endurecimiento de Web Push
-- ============================================================================
-- 1) El registro de dispositivos pasa por una funcion controlada. Esto permite
--    transferir el mismo navegador a la cuenta activa sin dejar dos propietarios.
-- 2) Un endpoint existente solo se transfiere si presenta las mismas claves.
-- 3) Los avisos se limitan a siete dias para acotar consultas y errores de UI.
-- ============================================================================

begin;

alter table push_subscription
  add constraint push_subscription_endpoint_len
    check (char_length(endpoint) between 1 and 4096),
  add constraint push_subscription_p256dh_len
    check (char_length(p256dh) between 1 and 1024),
  add constraint push_subscription_auth_len
    check (char_length(auth) between 1 and 1024);

alter table bloque
  add constraint bloque_aviso_maximo
    check (aviso_min_antes is null or aviso_min_antes <= 10080);

create or replace function registrar_push_subscription(
  p_endpoint text,
  p_p256dh text,
  p_auth text
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user_id uuid := auth.uid();
  v_existente public.push_subscription%rowtype;
begin
  if v_user_id is null then
    raise exception 'Se requiere una sesion autenticada';
  end if;

  if coalesce(char_length(p_endpoint), 0) not between 1 and 4096
    or coalesce(char_length(p_p256dh), 0) not between 1 and 1024
    or coalesce(char_length(p_auth), 0) not between 1 and 1024 then
    raise exception 'Suscripcion push invalida';
  end if;

  -- Serializa dos intentos concurrentes de registrar el mismo endpoint.
  perform pg_advisory_xact_lock(hashtextextended(p_endpoint, 0));

  select * into v_existente
  from public.push_subscription
  where endpoint = p_endpoint
  for update;

  if found and (v_existente.p256dh <> p_p256dh or v_existente.auth <> p_auth) then
    raise exception 'El endpoint ya existe con claves diferentes';
  end if;

  delete from public.push_subscription where endpoint = p_endpoint;
  insert into public.push_subscription (user_id, endpoint, p256dh, auth)
  values (v_user_id, p_endpoint, p_p256dh, p_auth);
end;
$$;

revoke all on function registrar_push_subscription(text, text, text) from public;
grant execute on function registrar_push_subscription(text, text, text) to authenticated;

-- Las altas se hacen exclusivamente mediante la funcion anterior.
drop policy push_sub_insert on push_subscription;

commit;
