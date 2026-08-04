# Revisión de persistencia — Rey del Huevo

## Archivos modificados

### `server.cjs`

- **Productos:** se normalizan precio, costo y stock antes de guardar.
  - Motivo: impedir valores vacíos, strings o negativos que luego reaparecían mal.
- **Campos de productos:** se agregaron código de barras, mangas y promociones al esquema de MongoDB.
  - Motivo: esos datos se mostraban en React, pero MongoDB los descartaba al guardar.
- **Stock de productos:** nuevo ajuste atómico con costo de compra y costo promedio ponderado.
  - Motivo: evitar que un ingreso de stock borre el costo anterior o se pierda al recargar.
- **Ventas y boletas:** se guardan juntas; el servidor descuenta stock con validación atómica.
  - Motivo: evitar boletas sin venta, ventas sin boleta, stock negativo y dobles descuentos.
- **Costo histórico de venta:** cada ítem guarda costo unitario, costo total y ganancia en el momento de vender.
  - Motivo: el margen no debe cambiar cuando después cambia el costo del producto.
- **Boletas:** se bloquea el borrado físico y se conserva compatibilidad con el flujo antiguo.
  - Motivo: evitar pérdida accidental de comprobantes.
- **Movimientos de productos:** entradas de stock y mermas quedan guardadas en MongoDB.
  - Motivo: ya no dependen solamente de `localStorage`.
- **Huevos:** se agregó `Tercera` al catálogo del backend.
  - Motivo: el servidor anterior la eliminaba al normalizar el inventario.
- **Huevos:** ventas, merma, rotos, trizados y ajustes se aplican de forma atómica sobre el stock real del servidor.
  - Motivo: impedir mezcla de datos o sobrescritura por una copia antigua del teléfono.
- **Huevos:** se guardan fecha de lote, método de pago, formato bandeja/caja y referencias de transferencia.
  - Motivo: el esquema anterior descartaba esos campos.
- **Huevos:** costo y ganancia se recalculan con el costo real de MongoDB.
  - Motivo: corregir márgenes incorrectos por datos antiguos del frontend.
- **Huevos:** eliminar un movimiento revierte su stock; reset queda limitado a la empresa autenticada.

### `frontend/src/App.jsx`

- Todas las operaciones de productos y categorías envían las credenciales requeridas.
  - Motivo: antes la pantalla podía mostrar un cambio aunque el backend lo rechazara con 401.
- Crear o editar un producto espera confirmación de MongoDB y vuelve a cargarlo desde el servidor.
- Agregar stock permite ingresar el costo total pagado y actualiza el costo promedio.
- Ventas usan el stock devuelto por MongoDB, no una resta local estimada.
- Márgenes usan el costo histórico guardado en cada venta, incluyendo productos vendidos por manga.
- Mermas se guardan en MongoDB y al eliminarlas se devuelve el stock.
- Boletas antiguas usan autenticación y no se crean copias locales falsas si el servidor falla.

### `frontend/src/HuevosModule.jsx`

- MongoDB pasa a ser la fuente de verdad del inventario de huevos.
- El frontend ya no envía un inventario completo potencialmente desactualizado para sobrescribir el servidor.
- Se bloquea el doble guardado mientras una operación está en curso.

## Datos no borrados

Este cambio no contiene ningún restablecimiento automático ni eliminación masiva de productos, ventas, boletas o huevos.
