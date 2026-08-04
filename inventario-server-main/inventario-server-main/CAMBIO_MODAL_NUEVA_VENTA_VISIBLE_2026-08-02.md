# Corrección del selector Nueva venta en móvil

## Archivo modificado
- `frontend/src/App.jsx`

## Cambio realizado
- El selector **Nueva venta** ahora se posiciona completamente sobre la barra inferior.
- Se agregó altura máxima y desplazamiento interno para teléfonos pequeños.
- El encabezado del selector permanece visible al desplazarse.
- La barra inferior se desactiva mientras el selector está abierto para evitar pulsaciones accidentales.

## Motivo
La segunda opción de venta quedaba oculta detrás de la navegación inferior en la versión móvil.

## Sin cambios en
- Ventas y boletas guardadas.
- Stock de productos o huevos.
- Backend y MongoDB.
- Diseño de escritorio.
