# Corrección reporte de ventas de huevos

- El reporte diario usa la fecha real de Chile (`America/Santiago`) para movimientos de venta.
- Las ventas ya registradas después de medianoche UTC se reflejan en el día correcto.
- Las nuevas ventas guardan `fechaIngreso` usando la fecha chilena.
- No se modifica ni elimina la venta existente, el stock, la caja ni MongoDB.
