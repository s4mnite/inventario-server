# Puente completo entre Gastos y Huevos

## Archivos modificados
- `frontend/src/GastosModule.jsx`
- `frontend/src/HuevosModule.jsx`

## 1. Huevos ahora aparece como "producto" al registrar un gasto
En la sección "Compra de inventario" de Gastos, el selector de producto solo
mostraba productos de la colección de inventario general — no había forma de
comprar huevos desde ahí. Ahora el selector trae también las calidades de
huevos configuradas (Súper, Extra, Primera, Segunda, Tercera) bajo el grupo
"Huevos".

Al elegir una calidad de huevo como ítem del gasto:
- La cantidad se ingresa en **cajas (180 c/u)** y **bandejas (30 c/u)**, no en
  huevos sueltos.
- El costo se ingresa como **precio pagado por caja** (lo que se paga al
  comprar), nunca el precio de venta al cliente. Se precarga con el costo de
  compra configurado actualmente para esa calidad (`costoCaja`).

Al guardar el gasto, además de crearse el registro en Gastos, se suma
automáticamente esa cantidad al stock del módulo Huevos y se recalcula el
costo promedio por caja — el mismo cálculo que usa el módulo Huevos al
registrar una "entrada" ahí directamente — y se agrega un movimiento tipo
"entrada" con el detalle de la compra. Es decir: ingresar huevos desde
Gastos ahora tiene el mismo efecto que ingresarlos desde el módulo Huevos.

Esto solo ocurre al **crear** un gasto nuevo. Si se está **editando** un
gasto ya guardado, la opción de agregar huevos no aparece, para evitar sumar
stock dos veces o descuadrarlo sin poder revertir la entrada original (a
diferencia de los productos normales, editar un gasto con huevos no revierte
ni reaplica el movimiento de stock).

## 2. La otra dirección (Huevos → Gastos) ya existía, se ajustó el texto
Registrar una entrada desde el módulo Huevos ya generaba automáticamente un
gasto en categoría "huevos" (ver `CAMBIO_MARGEN_GASTOS_HUEVOS_2026-08-06.md`).
Se cambió el texto del comercio de "Compra de huevos · {calidad}" a
"Entrada de huevos · {calidad}" para que sea igual de claro en ambas
direcciones y quede identificado como una entrada de huevos en el listado de
Gastos.

## 3. El costo nunca sale del precio de venta
Tanto en el flujo nuevo (Gastos → Huevos) como en el existente
(Huevos → Gastos), el monto que se usa como costo de compra siempre es lo
que se paga por caja (`costoCaja` / precio pagado por caja), nunca
`precioVentaUnitario`, `precioCaja` de venta ni el precio de venta al público
de una manga/bulto. Esto ya estaba corregido para huevos y para productos
con manga (ver changelog anterior); ahora también aplica al nuevo flujo de
huevos-como-producto-en-Gastos.

## No modificado
- Backend (`server/index.js`): se reutilizan los endpoints existentes
  (`GET /api/huevos`, `POST /api/huevos/movimientos`, `POST /api/gastos`)
  sin cambios.
- Lógica de ventas de huevos ni de productos.
- La fusión de lotes por transferencia automática (cuando ya hay un lote
  activo de otra fecha) que hace el módulo Huevos al registrar una entrada
  ahí directamente. Una entrada creada desde Gastos siempre crea/suma su
  propio lote por fecha; no reubica lotes de otras fechas. Si esto se
  necesita, es un ajuste aparte.
