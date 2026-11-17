# M&J Shop — Activación segura de Supabase

Proyecto elegido: `https://jqvcsggwnhqjvmbplwhv.supabase.co`.

## Paso 1: SQL
Abre **Supabase → SQL Editor → New Query**, copia el contenido íntegro de
[`supabase/SETUP_MJ_SHOP.sql`](../supabase/SETUP_MJ_SHOP.sql) y ejecútalo.
La conexión a este proyecto NO está autorizada desde ChatGPT, por lo que debes realizar este paso manualmente.

## Paso 2: crear administrador (contraseña privada)
En **Authentication → Users → Add user**, crea un usuario con correo y contraseña segura.
La contraseña la gestiona Supabase Auth mediante hash. No la escribas en SQL, GitHub ni JavaScript.
Copia el UUID (User ID) que muestra Supabase para esa cuenta.

Ejecuta esta instrucción en SQL Editor, reemplazando el UUID:

```sql
insert into public.mj_admins(user_id)
values ('REEMPLAZA_POR_EL_UUID_DEL_USUARIO')
on conflict (user_id) do nothing;
```

Después entra a `https://shopmj.netlify.app/admin.html` usando ese correo y contraseña.
Si otro usuario inicia sesión pero no aparece en `mj_admins`, el sistema le deniega el acceso.

## Paso 3: subir productos
Desde Administración agrega nombre, categoría, talla, precio, unidades, fotografía y visibilidad.
Los productos marcados **Oculto** no aparecen ni en la tienda ni en la ficha pública.
Puedes subir imágenes JPG, PNG o WebP (máximo 5 MB) a Supabase Storage.

## Inventario en tiempo real (prototipo)
Al añadir unidades, el navegador hace una llamada transaccional a `mj_reserve_cart`.
La función bloquea las filas de productos en PostgreSQL y solo permite reservar el stock libre.
Los visitantes ven cambios de unidades cada ~8 segundos sin recargar la página completa.
Cada selección queda **reservada por 8 minutos**, y luego caduca.
El carrito se recuerda en este navegador, pero debe reservarse de nuevo al recargar.

**Advertencia de producción:** Al ser público y sin cuentas de compradores, el RPC de reserva
puede sufrir abuso (personas o bots pueden bloquear stock temporalmente creando sesiones).
Antes de abrir ventas reales, implementar CAPTCHA y límites por IP/dispositivo mediante una
Edge Function segura, controles para confirmar ventas y cancelar reservas,
registro de pedidos y pruebas simultáneas. El clic de WhatsApp NO procesa un pago.
No subir claves `service_role` ni contraseñas al frontend.

## Si aparece "La tienda aún no está configurada"
Comprueba: SQL ejecutado, usuario asignado a `mj_admins`, políticas RLS activas,
Data API accesible y que Netlify haya publicado el último commit de `main`.

## Claves
La `sb_publishable_...` es una clave **pública**, válida para el navegador con RLS.
Las contraseñas reales pertenecen solo a Supabase Auth y nunca deben escribirse en el repo.
