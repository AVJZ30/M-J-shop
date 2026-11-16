# M&J Shop — inventario concurrente (preparado, NO activado)

El sitio en GitHub Pages/Netlify estático **no puede** garantizar reservas entre compradores. Actualizar los números en pantalla no constituye una transacción.

Incluidos los archivos:
- \`supabase/migrations/0001_mj_inventory_reservations.sql\`: tablas privadas, bloqueo de filas y reservas transaccionales con vencimiento a los 10 minutos.
- \`supabase/functions/mj-inventory/index.ts\`: **borrador de servidor**, no desplegado, requiere configuración CORS, autenticación/antibots, configuración de esquema privado en API y verificación.
- \`docs/inventario-en-vivo.md\`: instrucciones de integración.

## Antes de activar
1. Crear o identificar un proyecto **exclusivo** de Supabase para M&J Shop.
2. Implementar login del administrador y migrar los productos reales a DB.
3. Proteger la función contra reservas masivas o automatizadas (rate limit/CAPTCHA/verificación de sesiones), y utilizar autenticación robusta.
4. Aplicar migración con revisión de seguridad y pruebas reales con dos compradores a la vez.
5. Implementar confirmación de venta después del pago, liberación y caducidad de reservas.
6. Conectar catálogo, administrador y checkout al backend; usar actualizaciones discretas (polling/realtime).
7. Registrar operaciones y transiciones de pedido para auditoría.

**NUNCA** colocar el service role key dentro de archivos públicos del repo ni en el JavaScript del navegador.

Por ahora el botón «Realizar pedido» envía un WhatsApp para confirmar existencia. No descuenta ni reserva inventario en el servidor.
