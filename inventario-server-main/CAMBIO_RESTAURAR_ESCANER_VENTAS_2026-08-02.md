# Restaurar escáner en Ventas

## Archivo modificado
`frontend/src/App.jsx`

## Cambio realizado
- Se restauró el botón de cámara dentro de la barra `Buscar productos...` de la vista móvil de Ventas.
- El lector funciona en **Venta libre** y **Venta de productos** porque ambas usan la misma pantalla de productos.
- Cuando el código coincide con un producto, se agrega directamente al carrito.
- Si el código no existe, se escribe en el buscador para facilitar su identificación.

## Motivo
El botón de escaneo desapareció de la interfaz móvil al integrar el nuevo flujo de ventas.

## No modificado
- Backend
- MongoDB
- Stock fuera de una venta confirmada
- Boletas
- Informes
- Vista de escritorio
