# M&J Shop ♡

Tienda de ropa con catálogo responsive, carrito por unidades, reserva temporal de inventario, fichas individuales y panel de administración protegido. Identidad beige, rosa empolvado y logo M&J Shop. Diseñada para Netlify.

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
- Las reservas usan transacciones y bloqueo de filas para evitar sobreventa simultánea.
- Las reservas caducan a los 8 minutos. Se muestra disponibilidad mediante consultas cada 8 segundos sin recargar la página.
- Antes de producción con compradores anónimos, es esencial añadir controles antiabuso (rate-limiting/CAPTCHA), confirmación de pedidos y controles de pago.

## WhatsApp

Los pedidos se preparan para **+593 96 264 9242** con cantidades, precio y URL pública de cada imagen. WhatsApp es el canal de confirmación; esta web no procesa pagos.

## Nota de migración

Los datos anteriores guardados en `localStorage` eran una demostración y **no se importan automáticamente** a la base compartida. Añade los productos reales desde el nuevo panel.

Hecha por [AVJ COMUNITY](https://avjcomunity.com/). Made in Guayaquil.
