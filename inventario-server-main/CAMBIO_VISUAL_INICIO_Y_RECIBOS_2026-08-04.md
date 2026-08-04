# Rediseño visual de Inicio y Recibos

## Archivos modificados

- `frontend/src/App.jsx`
  - Se reorganizó visualmente cada tarjeta de recibo: número y monto arriba, fecha y vendedor al centro, método de pago y estado abajo.
  - Se agregaron clases CSS específicas para evitar montos cortados y superposición en móvil.
  - No se modificó la creación, carga, eliminación ni persistencia de ventas o recibos.

- `frontend/src/index.css`
  - Se mejoró la jerarquía visual del Inicio móvil: encabezado, resumen, ganancias, accesos rápidos y movimientos.
  - Se añadieron estilos responsive para Recibos en pantallas pequeñas.
  - Se mantuvieron los colores amarillo, blanco y rojo de Rey del Huevo.

## Funcionalidad no modificada

Caja, ventas, MongoDB, API, autenticación, reportes, inventario y backend permanecen sin cambios.
