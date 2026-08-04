# Confirmación de venta guardada

## frontend/src/App.jsx
- La app mantiene el carrito mientras el servidor no confirme la persistencia.
- Después del POST, consulta `/api/ventas/:id/verificar`.
- Solo muestra “Venta guardada correctamente” cuando MongoDB devuelve venta y boleta.
- Agrega un modal con total, número de boleta, sincronización, stock y hora de confirmación.
- Si falla la verificación, muestra error y conserva el carrito para reintentar.

## server.cjs
- Nuevo endpoint `GET /api/ventas/:id/verificar`.
- Comprueba que existan la venta y su boleta para la misma empresa.

## Motivo
Dar una confirmación real y visible de que la venta quedó subida, la boleta fue creada y el servidor puede volver a leerla.
