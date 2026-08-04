# Corrección de sincronización y métodos de pago — 2026-08-03

## Archivos modificados

### `frontend/src/App.jsx`
- Se normalizaron los métodos de pago recibidos desde Android, web, PC y ventas antiguas.
- El reporte ahora suma correctamente **Efectivo**, **Débito** y **Transferencia** aunque la venta use campos o textos distintos como `pago`, `metodoPago`, `formaPago`, `Tarjeta`, `debito` o `Redcompra`.
- Se agregó **Total general** visible en la distribución por método de pago.
- Los filtros de fecha de reportes ahora reconocen `timestamp`, `createdAt`, `creadoEn`, `fechaISO` y `fecha`, evitando que ventas guardadas desde otra plataforma queden fuera.
- Los tres métodos se muestran incluso cuando su total es $0.

### `server/index.js`
- Al eliminar una venta con huevos, el servidor devuelve esos huevos al inventario central de MongoDB.
- También elimina el movimiento de huevos vinculado a la venta mediante `ventaId`.
- Esto evita diferencias entre PC, web y Android después de eliminar una venta.

## Datos preservados
No se reinician ni borran cajas, ventas, historial, inventario, lotes ni configuraciones existentes.
