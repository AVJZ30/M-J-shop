-- M&J Shop: agregar colores a prendas existentes SIN borrar productos ni inventario.
-- Ejecuta una sola vez en Supabase > SQL Editor, proyecto M&J Shop.
ALTER TABLE public.mj_products
  ADD COLUMN IF NOT EXISTS colors jsonb NOT NULL DEFAULT '[]'::jsonb;

-- La respuesta de la función tendrá una columna nueva: Postgres requiere recrearla.
DROP FUNCTION IF EXISTS public.mj_public_catalog(uuid);
CREATE FUNCTION public.mj_public_catalog(p_session uuid DEFAULT NULL)
RETURNS TABLE (
  id uuid, name text, category_id uuid, size text, price numeric,
  description text, image_url text, stock integer, is_sold boolean,
  is_visible boolean, colors jsonb, created_at timestamptz, available integer
)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = '' AS $$
  SELECT p.id, p.name, p.category_id, p.size, p.price, p.description,
         p.image_url, p.stock, p.is_sold, p.is_visible, p.colors,
         p.created_at, p.stock AS available
  FROM public.mj_products AS p
  WHERE p.is_visible = true OR public.mj_is_admin()
  ORDER BY p.created_at DESC;
$$;
REVOKE ALL ON FUNCTION public.mj_public_catalog(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.mj_public_catalog(uuid) TO anon, authenticated;

-- Confirma que la columna y función estén disponibles:
SELECT column_name, data_type FROM information_schema.columns
WHERE table_schema='public' AND table_name='mj_products' AND column_name='colors';
