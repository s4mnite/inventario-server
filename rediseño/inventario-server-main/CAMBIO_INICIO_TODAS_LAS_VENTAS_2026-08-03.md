# Corrección Inicio: ventas del día

## Problema
Las ventas sí podían quedar guardadas en MongoDB, pero el panel Inicio seguía mostrando `$0` porque calculaba sus indicadores únicamente desde un caché local de movimientos del módulo Huevos.

## Archivo modificado
- `frontend/src/App.jsx`

## Funciones y cálculos modificados
- Cálculo de ventas de hoy y ayer: ahora usa la colección `ventas` sincronizada desde MongoDB.
- Cálculo de ganancias: ahora contempla productos, mangas y huevos.
- Contador de ventas del día: ahora cuenta todas las ventas guardadas, no solo movimientos locales de huevos.

## Datos
No se borran ni reinician ventas, caja, historial ni inventario.
