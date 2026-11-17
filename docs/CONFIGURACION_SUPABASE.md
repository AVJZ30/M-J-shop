# Activación de M&J Shop con UN archivo SQL

Archivo único: [`supabase/SETUP_MJ_SHOP.sql`](../supabase/SETUP_MJ_SHOP.sql).

1. En **Supabase → Authentication → Users**, crea una cuenta para la administradora con el correo elegido y una **contraseña nueva y segura**. No introduzcas contraseñas en código SQL, ni en GitHub. Supabase Auth gestiona el hash y la recuperación de contraseñas.
2. Ve a **SQL Editor → New Query** y pega **todo el contenido del archivo único**. Haz clic en **Run**.
3. El script crea tablas, políticas, categoría inicial, bucket de imágenes, funciones de consulta/reserva y autoriza automáticamente **la cuenta que coincida con el correo configurado dentro del SQL**, siempre que exista y su email esté confirmado.
4. Abre [panel de administración](https://shopmj.netlify.app/admin.html) e inicia sesión.

Si todavía no existe o no está confirmado el usuario cuando ejecutes el SQL, verás un aviso; el esquema se instala igual y puedes **volver a ejecutar el mismo SQL después de crear/confirmar el usuario**.

Las funciones de reservas transaccionales requieren pruebas de concurrencia antes de vender y protección antiabuso para compradores anónimos. La tienda actual consulta datos cada 8 segundos sin reconstruir el DOM cuando solo cambia el stock.

La conexión Supabase del usuario no autoriza a ChatGPT a ejecutar consultas en ese proyecto: estos pasos deben completarse en SQL Editor.