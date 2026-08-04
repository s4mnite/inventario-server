# Cierre seguro de caja antigua sin perder datos

## Archivos modificados

### server/index.js
- Reconoce cajas modernas (`estado: abierta`) y cajas antiguas sin campo `estado`.
- Permite localizar la caja por su ID real aunque venga de otro dispositivo.
- Si la caja solo existía en el respaldo local, crea en MongoDB el mismo registro ya cerrado.
- No elimina cajas, ventas, boletas ni movimientos.
- Marca la caja como cerrada, conserva apertura, monto inicial y resumen del turno.

### frontend/src/App.jsx
- Envía al backend el ID, apertura, monto inicial y usuario de la caja visible.
- Usa el respaldo local únicamente cuando MongoDB no encuentra una caja antigua.
- Confirma el cierre consultando nuevamente el servidor.

## Motivo
Algunas cajas antiguas no tenían `estado: abierta` o quedaron únicamente en localStorage de otro PC. La lógica anterior solo buscaba cajas modernas y por eso el botón no podía cerrarlas.
