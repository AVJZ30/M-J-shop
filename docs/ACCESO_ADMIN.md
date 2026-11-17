# Configurar el administrador de M&J Shop

**No guardes contraseñas en GitHub.** Supabase Auth administra las credenciales de acceso con protección criptográfica.

1. En el proyecto Supabase de M&J Shop, ejecuta primero [SETUP_MJ_SHOP.sql](../supabase/SETUP_MJ_SHOP.sql).
2. En **Authentication → Users → Add user**, crea la cuenta de administración con el correo que utilizará la encargada. Introduce allí una contraseña segura, preferiblemente distinta de cualquier contraseña compartida en conversaciones.
3. Confirma el correo electrónico según la configuración de Supabase.
4. Abre [ACTIVAR_ADMIN.sql](../supabase/ACTIVAR_ADMIN.sql) en SQL Editor de Supabase, reemplaza `CORREO_ADMIN_AQUI` por ese correo y ejecuta la consulta. El script encuentra automáticamente el UUID del usuario confirmado y lo autoriza. **No hace falta copiar UUID manualmente.**
5. Abre https://shopmj.netlify.app/admin.html y accede con el correo y la contraseña establecidos en Supabase Auth.

## ¿Qué pasa al borrar una prenda?
El botón **Eliminar** solicita confirmación y borra el registro de `public.mj_products` en Supabase. La operación debe devolver el ID borrado; si no, muestra error. Las reservas vinculadas se eliminan con `ON DELETE CASCADE`. Si la imagen está guardada en el bucket `mj-shop-images`, pertenece a la cuenta administradora y no está usada por otra prenda, también se intenta borrar. Las imágenes alojadas en servicios externos no se borran.

## Actualización invisible
El inventario se consulta periódicamente sin recargar la página. Si solo cambia la disponibilidad, se actualiza el texto/estado de las unidades y botones **sin reconstruir las fotografías ni las tarjetas**. Cuando se agregan o eliminan artículos, sí es necesario reconstruir las tarjetas afectadas.

**La base de datos debe estar activada ejecutando el SQL.** El repositorio no crea una cuenta de usuario automáticamente porque no incluye ni debe incluir claves secretas del proyecto.