# Cambio: buscador con lector integrado en Ventas

## Archivo modificado
`frontend/src/App.jsx`

## Cambio realizado
- Se agregó el botón de lector de código de barras dentro del buscador móvil de Ventas.
- Al escanear un código existente, el producto se agrega automáticamente al carrito.
- Si el código no existe, se escribe en el buscador y se muestra un aviso.
- El lector de escritorio conserva su comportamiento anterior.

## Motivo
Agilizar las ventas sin agregar otra pantalla o botón separado y mantener exactamente la barra acordada: buscar a la izquierda y escanear a la derecha.

## No modificado
- Backend y MongoDB.
- Stock, boletas, márgenes o lógica de huevos.
- Diseño de escritorio.
