# Gastos + lector automático de boletas

## Archivos modificados

### `frontend/src/GastosModule.jsx` (nuevo)
**Cambio:** se creó el módulo completo de Gastos.

Incluye:
- resumen de gastos de hoy, mes, mercadería y gastos operacionales;
- registro manual de gastos;
- cámara/subida de foto de boleta;
- OCR automático en el navegador para intentar leer comercio, fecha, total, IVA y número de documento;
- pantalla de confirmación antes de guardar;
- categorías: Mercadería, Combustible, Servicios, Arriendo, Aseo y Otros;
- métodos de pago: Efectivo, Tarjeta y Transferencia;
- imagen de la boleta guardada como respaldo;
- historial y búsqueda;
- asociación opcional de productos para aumentar stock y actualizar costo promedio.

**Motivo:** centralizar todas las compras y egresos del local y reducir el ingreso manual de boletas.

### `frontend/src/App.jsx`
**Cambio:** se reemplazó la pantalla vacía de Gastos por `GastosModule`.

También se modificaron las funciones de ingreso de stock:
- al usar `+ Stock` se solicita el costo total pagado;
- se crea automáticamente un gasto de categoría Mercadería;
- el stock y costo promedio se actualizan desde el backend;
- los ajustes de salida siguen siendo ajustes y no se registran como compras.

**Motivo:** lograr que las compras de inventario también aparezcan en Gastos y no queden como entradas de stock sin respaldo económico.

### `server.cjs`
**Cambio:** se agregó el modelo MongoDB `Gasto` y las rutas:
- `GET /api/gastos`
- `POST /api/gastos`
- `DELETE /api/gastos/:id`
- `POST /api/gastos/upload-boleta`

Al guardar una compra vinculada a inventario:
- aumenta el stock;
- calcula costo promedio ponderado;
- guarda qué productos se actualizaron;
- devuelve la lista actualizada de productos.

**Motivo:** persistir gastos, imágenes y compras en MongoDB, evitando datos solo locales.

## Datos no eliminados
- No se borran boletas de venta.
- No se borran ventas.
- No se reinicia stock.
- No se modifican lotes ni movimientos de huevos.

## Nota del lector
El OCR se ejecuta en el navegador con Tesseract.js cargado desde CDN. La primera lectura requiere conexión a internet y puede demorar. Los datos siempre se muestran para revisión antes de guardar.

## Verificación
- `server.cjs` pasó `node --check`.
- No fue posible ejecutar `npm ci`/`npm run build` porque el registro npm del entorno devolvió 404 para `yallist@3.1.1`.
