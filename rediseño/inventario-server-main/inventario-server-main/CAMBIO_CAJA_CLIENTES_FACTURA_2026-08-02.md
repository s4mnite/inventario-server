# Caja obligatoria, clientes y facturación

## frontend/src/App.jsx

### Cambios
- Ventas queda bloqueado mientras la caja esté cerrada.
- El botón de abrir caja guarda la apertura en MongoDB mediante `/api/caja/abrir`.
- El cierre se registra mediante `/api/caja/cerrar`.
- En Ventas se agregó selector de cliente y la casilla `Esta venta requiere factura`.
- Cuando la venta requiere factura exige RUT, razón social, giro, dirección y comuna.
- La venta y su documento quedan vinculados al cliente y a la apertura de caja.
- Clientes incorpora razón social, RUT, giro, comuna y la marca `Solicita factura habitualmente`.
- Al seleccionar un cliente habitual de factura, la casilla se activa automáticamente.
- Después de vender se actualizan compras y total gastado del cliente.

### Motivo
Evitar ventas fuera de un turno de caja y poder identificar correctamente a los clientes que requieren factura.

## server/index.js

### Cambios
- Se agregaron las rutas:
  - `GET /api/caja/actual`
  - `POST /api/caja/abrir`
  - `POST /api/caja/cerrar`
- El servidor rechaza una venta cuando no existe una caja abierta para la empresa.
- El servidor valida los datos obligatorios cuando la venta requiere factura.
- Cada venta queda asociada al `cajaId` correspondiente.

### Motivo
La restricción de caja no debe depender únicamente del navegador; también debe validarse en el backend y persistir en MongoDB.

## frontend/src/GastosModule.jsx

### Cambio
- Se reparó una cadena de texto del OCR que estaba partida y podía bloquear la compilación con `Unterminated string literal`.

### Motivo
Mantener compilable el proyecto base al incorporar esta actualización.

## Datos no eliminados
- No se borran ventas, boletas, productos, stock, lotes, huevos, gastos ni clientes existentes.
