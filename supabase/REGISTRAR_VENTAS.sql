-- M&J Shop · Marcar unidades y colores vendidos desde administración.
-- Ejecutar en SQL Editor del MISMO proyecto Supabase de la tienda.
-- No borra productos, no crea historial y no cambia inventario al instalarse.

-- Registra una venta descontando inventario en una transacción.
-- No crea tablas ni historiales. Solo pueden ejecutarlo administradores autenticados.
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

  return jsonb_build_object(
    'remaining_stock', v_remaining,
    'product_sold', v_all_sold,
    'color_sold', v_color_sold
  );
end;
$mj_sale$;

revoke all on function public.mj_register_sale(uuid,text,integer) from public;
grant execute on function public.mj_register_sale(uuid,text,integer) to authenticated;
