# Cambio: eliminar Crédito y agregar reportes por día

## Archivo modificado
`frontend/src/App.jsx`

## Cambios realizados

### Métodos de pago
- Se eliminó la opción visible **Crédito** de estadísticas, caja y configuración.
- Los métodos disponibles quedan como:
  - Efectivo
  - Tarjeta
  - Transferencia
- Las ventas históricas guardadas como `Crédito` o `Débito` no se borran: se muestran y contabilizan como **Tarjeta**.
- Las exportaciones Excel también normalizan esos registros antiguos como **Tarjeta**.

### Reportes
- Se agregó el filtro **Hoy** a la sección Reportes.
- El reporte diario muestra únicamente las ventas registradas durante la fecha actual.
- Se mantienen los filtros de 7 días, mes y todo.

## Datos no modificados
- No se eliminaron ventas históricas.
- No se eliminaron boletas.
- No se modificó stock, productos, huevos, gastos ni MongoDB.

## Verificación
Se intentó ejecutar el build, pero el registro npm del entorno no entregó la dependencia `yallist@3.1.1` (404). El cambio fue revisado directamente en el código fuente.
