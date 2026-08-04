# Corrección total 03-08-2026

## frontend/src/App.jsx
- Cierre de caja consulta primero MongoDB y usa la caja abierta real.
- Confirma que no quede una caja abierta antes de mostrar éxito.
- Escáner USB global en Ventas: captura códigos aunque el foco se haya movido y procesa Enter.
- Productos y categorías se sincronizan cada 10 segundos, al recuperar Internet y al volver a la ventana.
- Ventas y boletas mantienen su sincronización existente.
- localStorage se conserva como respaldo; no se elimina.

## frontend/src/HuevosModule.jsx
- Reportes aceptan movimientos antiguos guardados como cajas, bandejas y unidades aunque no tengan `huevos`.
- Comparación de categorías tolera diferencias de mayúsculas, acentos de datos antiguos e IDs anteriores.
- Se mantiene ingreso unitario para merma, rotos y trizados.

## server/index.js
- Cierre de caja busca por ID o por la última caja abierta del negocio.
- Comparación del nombre del negocio sin diferencias de mayúsculas/minúsculas.
- Actualización atómica para evitar cierres duplicados entre dispositivos.

## Datos
- No se borra ninguna caja, venta, boleta, producto, lote, movimiento ni respaldo local.
