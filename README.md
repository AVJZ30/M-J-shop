# M&J Shop ♡

Tienda de ropa con catálogo adaptable, carrito por unidades, fichas individuales y panel de administración protegido. Identidad beige, rosa empolvado y logo M&J Shop. Diseñada para Netlify.

## Estado de conexión

**Código de frontend configurado para Supabase:** `jqvcsggwnhqjvmbplwhv`.

**Pendiente de ejecución en Supabase:** aplica el SQL `supabase/SETUP_MJ_SHOP.sql` y registra la primera persona administradora. Este proyecto no es accesible desde el conector actual, así que esos dos pasos deben hacerse en el panel de Supabase de la tienda.

[Instrucciones de configuración](docs/CONFIGURACION_SUPABASE.md)

## Páginas

- `index.html` y `shop-live.js`: catálogo público, favoritos y disponibilidad.
- `producto.html` y `producto-live.js`: ficha, zoom y reserva de varias unidades.
- `admin.html` y `admin-live.js`: inicio de sesión de administrador, categorías, productos, imágenes y visibilidad.
- `terminos.html`: condiciones comerciales provisionales.
- `mj-db.js`: cliente Supabase con clave **publishable**; nunca claves secretas.
- `favicon/`: favicons publicados vía GitHub.
- `images/`: imágenes estáticas y logo de marca.

## Seguridad

- Solo usuarios autorizados en `public.mj_admins` pueden añadir, modificar, ocultar o borrar productos.
- El correo y la contraseña los verifica Supabase Auth; las contraseñas no se escriben en tablas de productos ni en el código.
- RLS impide consultar artículos ocultos desde la API pública.
- Las imágenes se suben a `mj-shop-images` exclusivamente por administradores.
- Las existencias son gestionadas manualmente por administración; agregar al carrito no reduce unidades ni crea reservas.
- La tienda consulta disponibilidad de forma discreta cada ocho segundos, sin recargar toda la página.
- La confirmación de pedidos y la actualización del inventario se realizan manualmente.

## WhatsApp

Los pedidos se preparan para **+593 96 264 9242** con cantidades, precio y URL pública de cada imagen. WhatsApp es el canal de confirmación; esta web no procesa pagos.

## Nota de migración

Los datos anteriores guardados en `localStorage` eran una demostración y **no se importan automáticamente** a la base compartida. Añade los productos reales desde el nuevo panel.

Hecha por [AVJ COMUNITY](https://avjcomunity.com/). Made in Guayaquil.
