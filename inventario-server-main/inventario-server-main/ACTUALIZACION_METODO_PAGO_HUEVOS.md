# Actualización: método de pago en venta de huevos

Se modificó únicamente `frontend/src/HuevosModule.jsx`.

Cambios:
- Método de pago en el flujo móvil de venta de huevos.
- Opciones: Efectivo, Tarjeta y Transferencia.
- No se agregó Crédito.
- El método queda guardado en cada movimiento de venta.
- Se muestra en el historial de movimientos.
- La confirmación final muestra total, unidades y método de pago.
- También se agregó el selector al formulario manual "Registrar movimiento" cuando el tipo es Venta.

No se reemplazó el diseño general, Inicio, Inventario, navegación ni los otros módulos.
