# Guardado permanente de ventas y boletas

Esta versión guarda en MongoDB Atlas:

- ventas y productos vendidos;
- boletas asociadas;
- método de pago, dinero recibido y vuelto;
- vendedor, fecha, total y referencias de MercadoPago;
- descuento de stock realizado por el servidor.

## Variables de entorno del backend en Render

En `inventario-backend` > Environment agrega o confirma:

- `MONGO_URI`: conexión completa de MongoDB Atlas.
- `GMAIL_USER`: correo usado por el sistema.
- `GMAIL_APP_PASSWORD`: contraseña de aplicación de Gmail.

No publiques estas claves dentro del código.

## Publicación

1. Reemplaza los archivos del repositorio con esta versión y súbelos a GitHub.
2. Render desplegará el backend automáticamente.
3. Despliega también el frontend con el `src/App.jsx` actualizado.
4. Registra una venta de prueba.
5. Cierra sesión, borra la caché o abre desde otro dispositivo. La venta y la boleta deben volver a cargarse desde MongoDB.

## Importante

Los datos antiguos que solo estaban en `localStorage` no se suben automáticamente. Esta versión asegura las ventas nuevas. Conserva una exportación Excel de los registros anteriores antes de limpiar el navegador.
