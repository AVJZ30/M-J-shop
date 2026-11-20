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
