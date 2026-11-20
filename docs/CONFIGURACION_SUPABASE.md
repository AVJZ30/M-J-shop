# Configuración de Supabase — M&J Shop

Ejecuta [supabase/SETUP_MJ_SHOP.sql](../supabase/SETUP_MJ_SHOP.sql) en el SQL Editor del proyecto M&J Shop, aunque ya hubieras ejecutado una versión anterior. Es un único SQL que configura tablas, categorías, administradores, acceso privado, fotografías y catálogo.

**Cambio de inventario:** Solo el administrador modifica el campo **Unidades disponibles** dentro de `admin.html`. Añadir productos al carrito **no reserva ni resta unidades**. La cantidad del catálogo proviene directamente del campo `stock` en Supabase y se actualiza discretamente cada ocho segundos.

La versión actualizada del SQL elimina `mj_reserve_cart` y `mj_holds` de versiones anteriores, de modo que no queden reservas pendientes afectando a las existencias.

Para autorizar a la administradora, crea su usuario en **Authentication → Users** con correo y una contraseña privada y segura; después ejecuta el SQL único. La autorización por correo solo se aplica cuando el usuario existe y su correo está confirmado. La contraseña nunca debe almacenarse en GitHub ni en tablas públicas.

El botón «Realizar pedido» prepara un mensaje de WhatsApp. **No registra una venta ni descuenta stock**; la encargada deberá confirmar la disponibilidad y actualizar manualmente el inventario. Al no existir reserva exclusiva, dos personas pueden solicitar la misma unidad antes de que la encargada actualice el stock.

## Colores disponibles por prenda

Si la base de datos ya está creada, ejecuta **solo** [supabase/AGREGAR_COLORES.sql](../supabase/AGREGAR_COLORES.sql) en el SQL Editor de Supabase. No borra productos existentes; agrega `mj_products.colors` como arreglo JSONB y recrea la función pública con los colores.

En el panel de administración puedes añadir hasta 20 colores por prenda, indicando nombre y tono hexadecimal mediante el selector visual. También puedes quitarlos o editar las opciones guardadas. En la tienda, las muestras muestran el tono real y el cliente selecciona el color antes de añadir la prenda al carrito. Cada color seleccionado se identifica por separado en el carrito y en el pedido de WhatsApp.

**Inventario:** las unidades siguen siendo el stock **total de la prenda**, no un stock individual por color. Agregar artículos no descuenta existencias; solo el administrador actualiza la cantidad en Supabase.

## Vendido por color

En el panel de administración, cada color tiene **unidades propias** y la casilla **Vendido**. Al marcar un color como vendido, sus unidades pasan a cero; al poner unidades mayores que cero, se reactiva ese color. El total de la prenda se calcula sumando únicamente las unidades disponibles de los colores. El cliente puede elegir otros colores todavía disponibles.

En la tienda, los colores agotados aparecen tachados y deshabilitados. Si solo se vendió un color, se muestra una tarjeta de esa variante en «Ropita vendida de la semana» y el producto continúa disponible en el catálogo con los demás colores. Si se agotan todos, la prenda completa se muestra como vendida. El carrito también impide enviar un pedido con variantes vendidas.

**No hace falta ejecutar un SQL adicional:** la columna `colors jsonb` introducida en la migración anterior permite almacenar los campos `stock` y `sold` de cada color. Si aún no ejecutaste [AGREGAR_COLORES.sql](../supabase/AGREGAR_COLORES.sql), ejecútalo antes de probar esta funcionalidad.

Para colores que existían antes de esta mejora sin unidades individuales, el primer color recibe inicialmente el stock global anterior y los demás comienzan en cero. Revisa y distribuye las cantidades de cada color desde el panel antes de publicar esas prendas.
