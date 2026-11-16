# M&J Shop ♡

Primera versión visual del catálogo, lista para GitHub Pages o hosting estático. Abre index.html para explorar.

## Incluye
- Diseño responsive para móvil y escritorio; identidad crema, café suave y rosa empolvado.
- Catálogo de ejemplo por categorías, buscador y tarjetas de prendas.
- Bolsa con precio total, sin cantidades duplicadas, consulta de disponibilidad por WhatsApp: +593 96 264 9242.
- Sección de prendas vendidas.
- Mascota ilustrada movible con mouse o dedo.
- Panel de DEMOSTRACIÓN: pulsa la flor ✿ del pie de página o abre #gestion-demo. Permite agregar, editar, eliminar y marcar vendidas.
- Imágenes: images/; favicons: favicon/.

## Advertencia importante (antes de vender)
Esta versión NO tiene base de datos, autenticación ni reservas reales. Los cambios del panel se guardan con localStorage y afectan exclusivamente a ese navegador. **No es un panel secreto seguro**: la ruta es solo una comodidad de interfaz. El carrito tampoco reserva stock. El botón de WhatsApp crea una consulta: la tienda debe confirmar disponibilidad.

Para impedir que dos clientes compren la misma unidad, en la fase de backend se debe usar una transacción atómica en base de datos (UPDATE ... WHERE status = 'available' RETURNING *) con una reserva temporal por sesión, vencimiento y confirmación de venta. No es posible garantizar exclusividad con JavaScript localStorage o un sitio solo estático. Añadir autenticación con roles y permisos para el panel.

## Publicación
En GitHub > Settings > Pages, selecciona Deploy from a branch, main y /(root), si tu plan y permisos lo permiten. Si todavía no aparece es posible que la publicación tarde unos instantes.

## Créditos
Fotografías de muestra de Unsplash. Sustituir por imágenes reales antes de abrir la tienda. La mascota incluida es una ilustración original de perrito estilizado, no un recurso oficial de Peanuts.

## Versión 2
- Catálogo: Vestidos largos, Vestidos cortos, Top, Lencería, Ropa interior, Trajes de baño, Accesorios y Maquillajes.
- Gestión en `admin.html`, enlazada desde la flor ✿. Todavía no tiene autenticación.
- Términos y condiciones provisionales en `terminos.html`.
- Mascota Snoopy mediante URL suministrada por el propietario; si falla la carga, se muestra una ilustración alternativa `images/mascota.svg`.
- Para ver en la tienda cambios del panel demo, abre la tienda en el mismo navegador y recarga. No hay sincronización entre dispositivos.


## v3
- `producto.html?id=<id>`: página de detalles individual con zoom de imagen y acceso a carrito/WhatsApp.
- Categorías personalizables desde `admin.html`, guardadas exclusivamente en localStorage.
- Hero dinámico: presenta automáticamente la última prenda disponible subida en el navegador de la demostración; al conectar backend se actualizará para todos los usuarios.
- Panel permite elegir archivos de imagen para previsualización local. No son subidas públicas al hosting; las imágenes deben publicarse en `images/` o en un servicio de almacenamiento para compartirlas.
- Favicon y logo: sección de previsualización de archivos en admin. Para favicon real de todos los visitantes, publicar iconos en `favicon/`.
- Foto original de la marca: `images/logo-original.png` cuando esté disponible; respaldo `images/logo.svg`.
