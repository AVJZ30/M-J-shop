-- Ejecuta este script DESPUÉS de crear y confirmar el usuario en Supabase Auth.
-- No copies contraseñas en SQL ni en GitHub.
-- Se localiza automáticamente el UUID por el correo confirmado.
-- Sustituye el correo del ejemplo directamente en el SQL Editor privado de Supabase.
do $$
declare v_user uuid;
begin
  select id into v_user
  from auth.users
  where lower(email)=lower('CORREO_ADMIN_AQUI')
    and email_confirmed_at is not null
  limit 1;

  if v_user is null then
    raise exception 'No existe un usuario con ese correo confirmado en Supabase Auth';
  end if;

  insert into public.mj_admins(user_id) values (v_user)
  on conflict(user_id) do nothing;
end $$;
