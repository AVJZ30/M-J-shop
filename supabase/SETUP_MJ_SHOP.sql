-- M&J SHOP - ejecutar UNA VEZ en SQL Editor del proyecto jqvcsggwnhqjvmbplwhv
-- La contraseña se gestiona en Supabase Authentication, NO se guarda en tablas ni JS.
create extension if not exists pgcrypto;

create table if not exists public.mj_admins (
 user_id uuid primary key references auth.users(id) on delete cascade
);
alter table public.mj_admins enable row level security;
revoke all on public.mj_admins from anon, authenticated;
grant select on public.mj_admins to authenticated;
drop policy if exists "admin own membership" on public.mj_admins;
create policy "admin own membership" on public.mj_admins for select to authenticated using (user_id = (select auth.uid()));

create or replace function public.mj_is_admin() returns boolean
language sql stable security definer set search_path = ''
as $$ select exists(select 1 from public.mj_admins where user_id=(select auth.uid())) $$;
revoke all on function public.mj_is_admin() from public;
grant execute on function public.mj_is_admin() to anon, authenticated;

create table if not exists public.mj_categories (
 id uuid primary key default gen_random_uuid(),
 name text not null unique check (length(trim(name)) between 2 and 48),
 sort_order integer not null default 0,
 created_at timestamptz not null default now()
);
create table if not exists public.mj_products (
 id uuid primary key default gen_random_uuid(),
 name text not null check(length(trim(name)) between 1 and 100),
 category_id uuid references public.mj_categories(id) on delete restrict,
 size text not null default 'Única',
 price numeric(10,2) not null check (price > 0),
 description text not null default '',
 image_url text,
 stock integer not null default 0 check(stock between 0 and 999999),
 is_sold boolean not null default false,
 is_visible boolean not null default true,
 created_at timestamptz not null default now(),
 updated_at timestamptz not null default now()
);
create table if not exists public.mj_holds (
 session_id uuid not null,
 product_id uuid not null references public.mj_products(id) on delete cascade,
 qty integer not null check (qty between 1 and 10),
 expires_at timestamptz not null,
 primary key(session_id, product_id)
);
create index if not exists mj_holds_product_exp on public.mj_holds(product_id,expires_at);
create index if not exists mj_products_visible_created on public.mj_products(is_visible,created_at desc);
alter table public.mj_categories enable row level security;
alter table public.mj_products enable row level security;
alter table public.mj_holds enable row level security;

grant select on public.mj_categories, public.mj_products to anon,authenticated;
grant insert,update,delete on public.mj_categories,public.mj_products to authenticated;
revoke all on public.mj_holds from anon,authenticated;
drop policy if exists "read categories" on public.mj_categories;
create policy "read categories" on public.mj_categories for select to anon,authenticated using(true);
drop policy if exists "admin categories insert" on public.mj_categories;
create policy "admin categories insert" on public.mj_categories for insert to authenticated with check((select public.mj_is_admin()));
drop policy if exists "admin categories update" on public.mj_categories;
create policy "admin categories update" on public.mj_categories for update to authenticated using((select public.mj_is_admin())) with check((select public.mj_is_admin()));
drop policy if exists "admin categories delete" on public.mj_categories;
create policy "admin categories delete" on public.mj_categories for delete to authenticated using((select public.mj_is_admin()));

drop policy if exists "visible products or admin" on public.mj_products;
create policy "visible products or admin" on public.mj_products for select to anon,authenticated
 using (is_visible or (select public.mj_is_admin()));
drop policy if exists "admin insert products" on public.mj_products;
create policy "admin insert products" on public.mj_products for insert to authenticated with check ((select public.mj_is_admin()));
drop policy if exists "admin update products" on public.mj_products;
create policy "admin update products" on public.mj_products for update to authenticated using((select public.mj_is_admin())) with check((select public.mj_is_admin()));
drop policy if exists "admin delete products" on public.mj_products;
create policy "admin delete products" on public.mj_products for delete to authenticated using((select public.mj_is_admin()));

-- Catálogo público a través de una función restringida por visibilidad y permisos.
create or replace function public.mj_public_catalog(p_session uuid default null)
returns table (
 id uuid,name text,category_id uuid,size text,price numeric,description text,
 image_url text,stock integer,is_sold boolean,is_visible boolean,
 created_at timestamptz,available integer
) language sql stable security definer set search_path='' as $$
 select p.id,p.name,p.category_id,p.size,p.price,p.description,p.image_url,
 p.stock,p.is_sold,p.is_visible,p.created_at,
 greatest(0,p.stock-coalesce((
    select sum(h.qty)::integer from public.mj_holds h
    where h.product_id=p.id and h.expires_at>now() and (p_session is null or h.session_id<>p_session)
 ),0))::integer as available
 from public.mj_products p
 where p.is_visible=true or public.mj_is_admin()
 order by p.created_at desc
$$;
revoke all on function public.mj_public_catalog(uuid) from public;
grant execute on function public.mj_public_catalog(uuid) to anon,authenticated;

-- Reserva transaccional para evitar que dos compras aparten la misma unidad.
-- Las reservas se reemplazan por carrito y vencen tras 8 minutos.
create or replace function public.mj_reserve_cart(p_session uuid,p_items jsonb)
returns jsonb language plpgsql security definer set search_path='' as $$
declare it record; prod record; already integer; total integer;
begin
 if p_session is null or p_items is null or jsonb_typeof(p_items)<>'array'
    or jsonb_array_length(p_items)>8 then raise exception 'invalid_cart'; end if;
 if exists(select 1 from jsonb_array_elements(p_items) as e(value)
   where jsonb_typeof(e.value->'id')<>'string' or jsonb_typeof(e.value->'qty')<>'number'
   or (e.value->>'qty') !~ '^[1-9][0-9]?) then raise exception 'invalid_item'; end if;
 if (select coalesce(sum((e.value->>'qty')::integer),0)
     from jsonb_array_elements(p_items) as e(value))>10 then raise exception 'cart_limit'; end if;
 if (select count(distinct e.value->>'id') from jsonb_array_elements(p_items) as e(value))
     <>jsonb_array_length(p_items) then raise exception 'duplicate_items'; end if;
 perform pg_advisory_xact_lock(hashtextextended(p_session::text,42));
 -- Lock each product deterministically, including those previously held by this session.
 perform 1 from public.mj_products
 where id in (
   select (e.value->>'id')::uuid from jsonb_array_elements(p_items) as e(value)
   union select product_id from public.mj_holds where session_id=p_session
 ) order by id for update;
 delete from public.mj_holds where session_id=p_session;
 for it in select (e.value->>'id')::uuid as id,(e.value->>'qty')::integer as qty
           from jsonb_array_elements(p_items) as e(value) order by 1 loop
   select * into prod from public.mj_products
    where id=it.id and is_visible and not is_sold;
   if not found then raise exception 'not_available'; end if;
   select coalesce(sum(qty),0)::integer into already from public.mj_holds
      where product_id=it.id and expires_at>now();
   if it.qty > prod.stock-already then
     raise exception 'insufficient_stock_for_product';
   end if;
   insert into public.mj_holds(session_id,product_id,qty,expires_at)
    values(p_session,it.id,it.qty,now()+interval '8 minutes');
 end loop;
 return jsonb_build_object('reserved',true,'expires_in_seconds',480);
end $$;
revoke all on function public.mj_reserve_cart(uuid,jsonb) from public;
grant execute on function public.mj_reserve_cart(uuid,jsonb) to anon,authenticated;

-- Imágenes públicas; subir/borrar únicamente para administradores autenticados.
insert into storage.buckets(id,name,public,file_size_limit,allowed_mime_types)
 values ('mj-shop-images','mj-shop-images',true,5242880,array['image/jpeg','image/png','image/webp'])
 on conflict(id) do update set public=true,file_size_limit=5242880,allowed_mime_types=array['image/jpeg','image/png','image/webp'];
drop policy if exists "mj public read images" on storage.objects;
create policy "mj public read images" on storage.objects for select to anon,authenticated
 using(bucket_id='mj-shop-images');
drop policy if exists "mj admin upload images" on storage.objects;
create policy "mj admin upload images" on storage.objects for insert to authenticated
 with check(bucket_id='mj-shop-images' and (select public.mj_is_admin()));
drop policy if exists "mj admin delete images" on storage.objects;
create policy "mj admin delete images" on storage.objects for delete to authenticated
 using(bucket_id='mj-shop-images' and (select public.mj_is_admin()));

-- Categorías de inicio, sin artículos falsos:
insert into public.mj_categories(name,sort_order) values
 ('Vestidos largos',1),('Vestidos cortos',2),('Top',3),('Lencería',4),
 ('Ropa interior',5),('Trajes de baño',6),('Accesorios',7),('Maquillajes',8)
on conflict(name) do nothing;

-- AUTORIZACIÓN AUTOMÁTICA DE LA CUENTA ADMINISTRADORA EXISTENTE
-- Debes crear el usuario primero en Supabase > Authentication > Users.
-- No introduzcas la contraseña en esta consulta ni en archivos públicos.
do $mj_admin$
declare
 v_user uuid;
begin
 select id into v_user
 from auth.users
 where lower(email)=lower('Mariajveraa2005@gmail.com')
   and email_confirmed_at is not null
 limit 1;
 if v_user is null then
   raise notice 'Cuenta administradora no encontrada o sin confirmar. Crea/confirma el usuario en Authentication y vuelve a ejecutar este mismo SQL.';
 else
   insert into public.mj_admins(user_id) values(v_user)
   on conflict(user_id) do nothing;
   raise notice 'Cuenta administradora autorizada.';
 end if;
end
$mj_admin$;

-- Verificación de configuración:
select 'mj_categories' as recurso,count(*) as registros from public.mj_categories
union all
select 'mj_products',count(*) from public.mj_products
union all
select 'mj_admins',count(*) from public.mj_admins;
