// ─── Utilidades compartidas ─────────────────────────────────────────────────
// Usadas tanto por App.jsx como por los módulos separados (HuevosModule, etc.)
// para evitar duplicar lógica y que quede una sola fuente de verdad.

export const API = import.meta.env.VITE_API_URL || "https://inventario-backend-ftw6.onrender.com";

export const fmt = (n) => `$${Number(n || 0).toLocaleString("es-CL")}`;
export const fmtIVA = (n) => `$${Math.round(Number(n || 0)).toLocaleString("es-CL")}`;

export const todayLocalISO = () => {
  const now = new Date();
  const offset = now.getTimezoneOffset();
  return new Date(now.getTime() - offset * 60000).toISOString().slice(0, 10);
};

// fetch con límite de tiempo. Si el celular estuvo bloqueado/dormido un rato,
// el navegador puede dejar una petición "colgada" sin resolver nunca. Este
// helper la aborta a los `ms` y lanza un error claro, para que las pantallas
// de sincronización (caja, ventas, productos) puedan reintentar solas en vez
// de quedar pegadas esperando una respuesta que no va a llegar.
export const fetchConTimeout = (url, options = {}, ms = 12000) => {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), ms);
  return fetch(url, { ...options, signal: controller.signal }).finally(() => clearTimeout(timeoutId));
};


// Incremento/recargo sobre el costo (no margen sobre la venta).
export const calcIncrementPct = (costo, precio) => {
  const c = Number(costo || 0);
  const p = Number(precio || 0);
  if (c <= 0) return 0;
  return ((p - c) / c) * 100;
};

export const priceFromIncrement = (costo, incrementoPct) => {
  const c = Number(costo || 0);
  const i = Number(incrementoPct || 0);
  if (c <= 0) return 0;
  return c * (1 + i / 100);
};


// ============================================================
// Cálculo de lotes de huevos (eggLots) a partir de los movimientos.
// ÚNICA fuente de verdad para el stock de huevos: la usan tanto
// HuevosModule.jsx (pestañas Inventario/Lotes/Resumen) como App.jsx
// (Ventas > Huevos), para que nunca más muestren números distintos
// entre pantallas.
export const computeEggLots = (movements, inventory) => {
      // Se ordena por el momento REAL de registro (id = Date.now() al crear el
      // movimiento), no por la fecha de ingreso elegida a mano.
      const chronological = [...movements].sort((a, b) => Number(a.id || 0) - Number(b.id || 0));
      const queues = {};
      const byId = {};
      const byKey = {}; // `${categoria}::${fechaIngreso}` -> mismo lote si coinciden
      const lots = [];
  
      // Si un movimiento trae un calidadId que ya no existe en el inventario
      // actual (categoría vieja/renombrada), pero su nombre SÍ calza con una
      // categoría vigente, lo tratamos como esa categoría — así "Primera" con
      // un id viejo y "Primera" con el id actual quedan en el mismo balde.
      const normaliza = s => String(s || "").trim().toLowerCase();
      const resolveQualityId = m => {
        const rawId = m.calidadId || "";
        if (rawId && inventory.some(q => q.id === rawId)) return rawId;
        const porNombre = inventory.find(q => normaliza(q.nombre) === normaliza(m.calidad));
        if (porNombre) return porNombre.id;
        return rawId || normaliza(m.calidad) || "sin-calidad";
      };
  
      chronological.forEach(m => {
        const qualityId = resolveQualityId(m);
        if (!queues[qualityId]) queues[qualityId] = [];
        const units = Math.max(0, Number(m.huevos || 0));
  
        if (m.tipo === "entrada" || m.tipo === "ajuste_entrada") {
          // Un "Ajuste de entrada" no pide fecha de lote (solo las entradas
          // normales la piden), así que usa la fecha del día en que se registró.
          // Si ese mismo día ya hay un lote real de esa calidad, se fusiona con
          // él; si no, la consolidación de más abajo lo une al lote vigente.
          const fechaIngreso = m.fechaIngreso || String(m.fecha || "").slice(0, 10);
          const lotKey = `${qualityId}::${fechaIngreso}`;
          const unitCost = Number(m.valorUnitarioCompra || 0) || (units > 0 ? Number(m.totalCompra || m.costo || 0) / units : 0);
          const costoTotal = Number(m.totalCompra || m.costo || unitCost * units);
  
          // Misma categoría + misma fecha de ingreso = el mismo lote: se suma
          // en vez de crear una tarjeta duplicada.
          const existing = byKey[lotKey];
          if (existing) {
            existing.huevosIniciales += units;
            existing.stockRestante += units;
            existing.costoTotal += costoTotal;
            existing.costoUnitario = existing.huevosIniciales > 0 ? existing.costoTotal / existing.huevosIniciales : existing.costoUnitario;
            byId[String(m.id)] = existing;
            return;
          }
  
          const lot = {
            id: String(m.id || `${qualityId}-${lots.length}`),
            calidadId: qualityId, calidad: m.calidad || qualityId,
            fechaIngreso, fechaRegistro: m.fecha || "",
            // "huevosIniciales" representa SOLO la entrada real anotada por el usuario.
            // El stock heredado de otro lote se guarda aparte en "transferidoDesde".
            huevosIniciales: units, stockRestante: units, vendidos: 0, merma: 0, rotos: 0, trizados: 0, ajustes: 0,
            costoUnitario: unitCost, costoTotal, ingreso: 0, costoVendido: 0, ganancia: 0,
            estado: "activo", transferidoDesde: 0,
          };
          lots.push(lot); byId[String(m.id)] = lot; byKey[lotKey] = lot; queues[qualityId].push(lot);
          return;
        }
  
        if (m.tipo === "transferencia") {
          // Un lote nuevo llegó y absorbió lo que quedaba del lote anterior de
          // la misma categoría. El lote origen queda cerrado (no agotado por
          // ventas/merma, sino cerrado por transferencia).
          const source = byId[String(m.loteOrigenId)];
          const dest = byId[String(m.loteDestinoId)];
          if (source && dest) {
            // BUG FIX: antes se usaba Math.max(0, source.stockRestante), que
            // descartaba la deuda si el lote origen había quedado con stock
            // NEGATIVO (sobreventa antes de cerrarse) — esa deuda
            // desaparecía en vez de restarse del lote nuevo, mostrando más
            // stock disponible del real. Ahora se traspasa el saldo real,
            // sea positivo o negativo.
            const taken = Number(source.stockRestante || 0);
            if (taken > 0) {
              dest.costoTotal += taken * source.costoUnitario;
              dest.transferidoDesde += taken;
            }
            dest.stockRestante += taken;
            const totalDisponibleLote = dest.huevosIniciales + dest.transferidoDesde;
            dest.costoUnitario = totalDisponibleLote > 0 ? dest.costoTotal / totalDisponibleLote : dest.costoUnitario;
            source.stockRestante = 0;
            source.estado = "cerrado";
            source.transferidoA = dest.id;
          }
          return;
        }
  
        if (!["venta", "merma", "rotos", "trizados", "ajuste_salida"].includes(m.tipo) || units <= 0) return;
  
        // Regla fija: todo movimiento afecta siempre al ÚLTIMO lote activo de
        // la categoría (el más reciente con stock > 0) — nunca se busca por
        // igualdad de fecha ni se reparte entre varios lotes.
        const lotsForQuality = queues[qualityId] || [];
        let target = null;
        for (let i = lotsForQuality.length - 1; i >= 0; i--) {
          if (lotsForQuality[i].stockRestante > 0) { target = lotsForQuality[i]; break; }
        }
        if (!target) target = lotsForQuality[lotsForQuality.length - 1];
        if (!target) return; // no existe ningún lote todavía para esta categoría
  
        const taken = units;
        const saleUnit = m.tipo === "venta" && units > 0 ? Number(m.ingreso || 0) / units : 0;
        const allocatedCost = taken * target.costoUnitario;
        // "Huevos disponibles" (stockRestante) = lo que ingresó al lote (+ lo
        // traspasado de un lote anterior) menos TODO lo que salió de ahí:
        // ventas, roto, trizados y ajustes de salida. Roto y trizados siguen
        // teniendo su propio contador para mostrarlos aparte en la tarjeta,
        // pero como son huevos que físicamente ya no están, también bajan
        // el disponible — si no, se seguirían mostrando como vendibles.
        target.stockRestante -= taken;
        if (m.tipo === "venta") {
          const allocatedIncome = taken * saleUnit;
          target.vendidos += taken;
          target.ingreso += allocatedIncome;
          target.costoVendido += allocatedCost;
          target.ganancia += allocatedIncome - allocatedCost;
        } else if (m.tipo === "rotos") {
          target.rotos += taken;
        } else if (m.tipo === "trizados") {
          target.trizados += taken;
        } else if (m.tipo === "ajuste_salida") {
          target.ajustes += taken;
        } else {
          target.merma += taken;
        }
      });
  
      // Consolidación final: por regla, solo puede haber UN lote activo por
      // calidad (el más reciente) — el consumo (venta/merma/rotos/trizados)
      // siempre apunta al último lote con stock, nunca a uno más viejo. Si por
      // datos antiguos (previos a esta regla) quedó más de un lote "activo"
      // para la misma calidad, se cierran todos menos el más nuevo y su stock
      // restante se traspasa, igual que hace una transferencia explícita.
      const porCalidad = {};
      lots.forEach(l => {
        if (!porCalidad[l.calidadId]) porCalidad[l.calidadId] = [];
        porCalidad[l.calidadId].push(l);
      });
      Object.values(porCalidad).forEach(grupo => {
        const ordenado = [...grupo].sort((a, b) =>
          String(a.fechaIngreso).localeCompare(String(b.fechaIngreso)) || Number(a.id) - Number(b.id)
        );
        const vigente = ordenado[ordenado.length - 1];
        ordenado.slice(0, -1).forEach(viejo => {
          // Cada lote conserva SU PROPIA historia de consumo (ventas, merma,
          // rotos, trizados, ajustes) tal como ocurrió mientras ese lote
          // estaba activo — ya no se traslada al lote vigente ni se resetea
          // a 0 al cerrarse. Así, la tarjeta de un lote cerrado sigue
          // mostrando, por ejemplo, cuántos trizados salieron específicamente
          // de ESE lote. Los totales de categoría (Reportes/Resumen) no usan
          // estos campos por lote: se calculan aparte sumando directamente
          // los movimientos crudos, así que no hay doble conteo.
          if (viejo.estado === "cerrado") return;
          // BUG FIX: antes solo se traspasaba el stock del lote viejo si era
          // POSITIVO (stockRestante > 0). Si un lote viejo quedaba con
          // deuda negativa (se vendió/mermó más de lo que tenía antes de
          // cerrarse), esa deuda se descartaba en vez de restarse del lote
          // nuevo — el lote nuevo mostraba más stock disponible del que
          // realmente había, porque la sobreventa del lote anterior
          // "desaparecía" en vez de arrastrarse. Ahora se traspasa el saldo
          // siempre que no sea exactamente 0, sea positivo o negativo.
          if (viejo.stockRestante !== 0) {
            if (viejo.stockRestante > 0) {
              vigente.costoTotal += viejo.stockRestante * viejo.costoUnitario;
              vigente.transferidoDesde += viejo.stockRestante;
            }
            vigente.stockRestante += viejo.stockRestante;
            const totalDisponibleLote = vigente.huevosIniciales + vigente.transferidoDesde;
            vigente.costoUnitario = totalDisponibleLote > 0 ? vigente.costoTotal / totalDisponibleLote : vigente.costoUnitario;
            viejo.stockRestante = 0;
          }
          viejo.estado = "cerrado";
          viejo.transferidoA = vigente.id;
        });
      });
  
      return lots.sort((a, b) => {
        const aActivo = a.estado !== "cerrado" && a.stockRestante > 0;
        const bActivo = b.estado !== "cerrado" && b.stockRestante > 0;
        if (aActivo !== bActivo) return aActivo ? -1 : 1;
        const byDate = String(b.fechaIngreso).localeCompare(String(a.fechaIngreso));
        return byDate || Number(b.id) - Number(a.id);
      });
};

// Stock realmente disponible por calidad: SOLO el lote vigente (el
// más nuevo, no cerrado) de cada calidad. No se suma el stock de
// lotes cerrados: cuando un lote viejo se queda sin stock y se le
// sigue registrando venta/merma antes de la siguiente entrada, su
// stockRestante termina negativo y esa deuda nunca se resetea a 0 al
// cerrarse (solo se resetea cuando hay stock positivo para
// traspasar). Sumar esa deuda vieja al lote vigente actual haría ver
// stock negativo aunque el lote activo tenga huevos reales
// disponibles.
export const stockPorCalidadDeLotes = (eggLots) => {
  const map = {};
  eggLots.forEach(l => { if (l.estado !== "cerrado") map[l.calidadId] = Number(l.stockRestante || 0); });
  return map;
};
