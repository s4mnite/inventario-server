# Corrección del buscador de productos en Ventas

## Archivo modificado
- `frontend/src/App.jsx`

## Cambio
El buscador móvil tenía `inputMode="none"`, lo que impedía que Android mostrara el teclado al tocar el campo. Se cambió a un campo de búsqueda normal con `inputMode="search"`, foco táctil explícito y atributos compatibles con teclado móvil.

## No modificado
- Lógica de ventas
- Inventario y stock
- Caja
- MongoDB
- Escáner de código de barras
