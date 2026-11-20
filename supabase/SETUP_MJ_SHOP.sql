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
 colors jsonb not null default '[]'::jsonb,
 created_at timestamptz not null default now(),
 updated_at timestamptz not null default now()
);
-- Actualización no destructiva para tiendas que ya ejecutaron el SQL.
alter table public.mj_products add column if not exists colors jsonb not null default '[]'::jsonb;
create index if not exists mj_products_visible_created on public.mj_products(is_visible,created_at desc);
alter table public.mj_categories enable row level security;
alter table public.mj_products enable row level security;

grant select on public.mj_categories, public.mj_products to anon,authenticated;
grant insert,update,delete on public.mj_categories,public.mj_products to authenticated;
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
-- Inventario controlado exclusivamente por la administración.
-- El carrito no resta ni reserva stock; los visitantes consultan la cantidad definida por el admin.
-- Postgres exige eliminar la firma anterior antes de agregar la columna colors al resultado.
drop function if exists public.mj_public_catalog(uuid);
create or replace function public.mj_public_catalog(p_session uuid default null)
returns table (
 id uuid,name text,category_id uuid,size text,price numeric,description text,
 image_url text,stock integer,is_sold boolean,is_visible boolean,colors jsonb,
 created_at timestamptz,available integer
) language sql stable security definer set search_path='' as $$
 select p.id,p.name,p.category_id,p.size,p.price,p.description,p.image_url,
 p.stock,p.is_sold,p.is_visible,p.colors,p.created_at,p.stock as available
 from public.mj_products p
 where p.is_visible=true or public.mj_is_admin()
 order by p.created_at desc
$$;
revoke all on function public.mj_public_catalog(uuid) from public;
grant execute on function public.mj_public_catalog(uuid) to anon,authenticated;

-- Si ya se ejecutó una versión anterior, se desactiva su mecanismo de reservas.
drop function if exists public.mj_reserve_cart(uuid,jsonb);
drop table if exists public.mj_holds;

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


-- SECCIÓN ADICIONAL: REGISTRO DE VENTAS DESDE ADMINISTRACIÓN
-- M&J Shop · Registro de ventas desde el panel de administración.
-- Ejecutar en SQL Editor del MISMO proyecto Supabase de la tienda.
-- No borra productos ni ventas existentes. Repetible sin perder datos.

create table if not exists public.mj_sales (
  id uuid primary key default gen_random_uuid(),
  product_id uuid references public.mj_products(id) on delete set null,
  product_name text not null,
  color_name text,
  color_hex text,
  qty integer not null check (qty between 1 and 999999),
  unit_price numeric(10,2) not null check (unit_price >= 0),
  sold_at timestamptz not null default now(),
  recorded_by uuid references auth.users(id) on delete set null
);

create index if not exists mj_sales_sold_at_idx on public.mj_sales(sold_at desc);
alter table public.mj_sales enable row level security;
revoke all on public.mj_sales from anon, authenticated;
grant select on public.mj_sales to authenticated;

drop policy if exists "mj admin reads sales" on public.mj_sales;
create policy "mj admin reads sales"
  on public.mj_sales for select to authenticated
  using ((select public.mj_is_admin()));

-- Descuenta el inventario y registra la venta en UNA transacción.
-- Ninguna venta la registran los clientes; solo un administrador autenticado.
create or replace function public.mj_register_sale(
  p_product_id uuid,
  p_color text,
  p_qty integer
) returns jsonb
language plpgsql security definer set search_path = ''
as $mj_sale$
declare
  v_product public.mj_products%rowtype;
  v_color jsonb;
  v_color_idx bigint;
  v_colors jsonb;
  v_remaining integer;
  v_color_sold boolean := false;
  v_all_sold boolean := false;
  v_sale_id uuid;
  v_color_name text := null;
  v_color_hex text := null;
begin
  if not public.mj_is_admin() then
    raise exception 'Solo la administradora puede registrar ventas' using errcode = '42501';
  end if;

  if p_qty is null or p_qty < 1 or p_qty > 999999 then
    raise exception 'Cantidad de venta no válida';
  end if;

  select * into v_product
  from public.mj_products
  where id = p_product_id
  for update;

  if not found then raise exception 'La prenda ya no existe'; end if;
  if v_product.is_sold then raise exception 'La prenda está marcada como vendida'; end if;

  if jsonb_typeof(v_product.colors) = 'array'
     and jsonb_array_length(v_product.colors) > 0 then

    -- Prendas creadas antes del control por color: primero se deben
    -- distribuir las unidades en Editar producto, sin inventar existencias.
    if exists (
      select 1 from jsonb_array_elements(v_product.colors) as item(value)
      where not (item.value ? 'stock')
        or (item.value->>'stock') !~ '^[0-9]+$'
    ) then
      raise exception 'Distribuye primero las unidades por color desde Editar prenda';
    end if;

    if nullif(btrim(p_color), '') is null then
      raise exception 'Selecciona el color vendido';
    end if;

    select item.value, item.ordinality
      into v_color, v_color_idx
    from jsonb_array_elements(v_product.colors) with ordinality as item(value, ordinality)
    where item.value->>'name' = p_color
    limit 1;

    if not found then raise exception 'Ese color ya no pertenece a esta prenda'; end if;

    v_color_name := v_color->>'name';
    v_color_hex := v_color->>'hex';
    v_remaining := (v_color->>'stock')::integer;

    if coalesce((v_color->>'sold')::boolean, false) then
      raise exception 'El color ya está marcado como vendido';
    end if;
    if p_qty > v_remaining then
      raise exception 'No hay suficientes unidades de ese color: quedan %', v_remaining;
    end if;

    v_remaining := v_remaining - p_qty;
    v_color_sold := (v_remaining = 0);
    v_colors := jsonb_set(
      v_product.colors,
      array[(v_color_idx - 1)::text],
      v_color || jsonb_build_object('stock', v_remaining, 'sold', v_color_sold),
      false
    );

    select coalesce(sum(
        case when item.value->>'sold' = 'true'
          then 0 else (item.value->>'stock')::integer end
      ), 0),
      coalesce(bool_and(item.value->>'sold' = 'true'), false)
      into v_remaining, v_all_sold
    from jsonb_array_elements(v_colors) as item(value);

    update public.mj_products
      set colors = v_colors,
          stock = v_remaining,
          is_sold = v_all_sold,
          updated_at = now()
    where id = v_product.id;

  else
    if p_qty > v_product.stock then
      raise exception 'No hay suficientes unidades: quedan %', v_product.stock;
    end if;

    v_remaining := v_product.stock - p_qty;
    v_all_sold := (v_remaining = 0);

    update public.mj_products
      set stock = v_remaining,
          is_sold = v_all_sold,
          updated_at = now()
    where id = v_product.id;
  end if;

  insert into public.mj_sales(
    product_id, product_name, color_name, color_hex,
    qty, unit_price, recorded_by
  ) values (
    v_product.id, v_product.name, v_color_name, v_color_hex,
    p_qty, v_product.price, auth.uid()
  ) returning id into v_sale_id;

  return jsonb_build_object(
    'sale_id', v_sale_id,
    'remaining_stock', v_remaining,
    'product_sold', v_all_sold,
    'color_sold', v_color_sold
  );
end;
$mj_sale$;

revoke all on function public.mj_register_sale(uuid,text,integer) from public;
grant execute on function public.mj_register_sale(uuid,text,integer) to authenticated;
