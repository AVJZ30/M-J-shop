# Configuración de Supabase — M&J Shop

Ejecuta [supabase/SETUP_MJ_SHOP.sql](../supabase/SETUP_MJ_SHOP.sql) en el SQL Editor del proyecto M&J Shop, aunque ya hubieras ejecutado una versión anterior. Es un único SQL que configura tablas, categorías, administradores, acceso privado, fotografías y catálogo.

**Cambio de inventario:** Solo el administrador modifica el campo **Unidades disponibles** dentro de `admin.html`. Añadir productos al carrito **no reserva ni resta unidades**. La cantidad del catálogo proviene directamente del campo `stock` en Supabase y se actualiza discretamente cada ocho segundos.

La versión actualizada del SQL elimina `mj_reserve_cart` y `mj_holds` de versiones anteriores, de modo que no queden reservas pendientes afectando a las existencias.

Para autorizar a la administradora, crea su usuario en **Authentication → Users** con correo y una contraseña privada y segura; después ejecuta el SQL único. La autorización por correo solo se aplica cuando el usuario existe y su correo está confirmado. La contraseña nunca debe almacenarse en GitHub ni en tablas públicas.

El botón «Realizar pedido» prepara un mensaje de WhatsApp. **No registra una venta ni descuenta stock**; la encargada deberá confirmar la disponibilidad y actualizar manualmente el inventario. Al no existir reserva exclusiva, dos personas pueden solicitar la misma unidad antes de que la encargada actualice el stock.
