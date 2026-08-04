# Sincronización de caja entre dispositivos

## frontend/src/App.jsx

**Cambios**
- MongoDB pasa a ser la fuente principal de la caja actual y del historial.
- La aplicación consulta `/api/caja/actual` y `/api/caja/historial`.
- Sincronización automática cada 10 segundos.
- Sincronización al volver a la pestaña, recuperar Internet, enfocar la ventana o abrir el módulo Caja.
- Después de abrir o cerrar una caja, se vuelve a consultar el servidor antes de mostrar el estado.
- localStorage queda únicamente como respaldo temporal sin conexión.

**Motivo**
- Evitar que un dispositivo muestre cajas antiguas o no vea cajas abiertas/cerradas desde otro equipo.

## server/index.js

**Cambios**
- Nuevo endpoint `GET /api/caja/historial`.
- La caja actual y el historial se filtran por empresa.
- Se desactiva caché en las respuestas de caja.
- Se valida que la empresa esté identificada al abrir o consultar una caja.

**Motivo**
- Guardar y consultar el estado real desde MongoDB en todos los dispositivos.

## Datos no eliminados
- No se borran cajas existentes.
- No se borran ventas, boletas, productos, stock, clientes ni gastos.
