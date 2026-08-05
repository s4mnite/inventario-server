import { useState, useMemo, useEffect } from "react";
import { BarChart, Bar, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { DollarSign, Pencil, Plus, Trash2, TrendingDown, ChevronRight, Filter, ShoppingCart, Check, X, ArrowLeft, Info, Minus, Banknote, CreditCard, Landmark } from "lucide-react";
import { API, fmt, todayLocalISO, calcIncrementPct, priceFromIncrement } from "./lib/utils";

// ─── Módulo independiente: Huevos ────────────────────────────────────────────
const EGG_BOX_UNITS = 180;
const EGG_TRAY_UNITS = 30;
const EGG_STORAGE_KEY = "inv_huevos_v1";
const EGG_MOVEMENTS_KEY = "inv_huevos_movimientos_v1";

const defaultEggInventory = [
  { id: "super", nombre: "Súper", stockHuevos: 0, costoCaja: 0, precioCaja: 0, precioBandeja: 0, precioVentaUnitario: 0, incrementoPct: 0, stockMinimoCajas: 5 },
  { id: "extra", nombre: "Extra", stockHuevos: 0, costoCaja: 0, precioCaja: 0, precioBandeja: 0, precioVentaUnitario: 0, incrementoPct: 0, stockMinimoCajas: 5 },
  { id: "primera", nombre: "Primera", stockHuevos: 0, costoCaja: 0, precioCaja: 0, precioBandeja: 0, precioVentaUnitario: 0, incrementoPct: 0, stockMinimoCajas: 5 },
  { id: "segunda", nombre: "Segunda", stockHuevos: 0, costoCaja: 0, precioCaja: 0, precioBandeja: 0, precioVentaUnitario: 0, incrementoPct: 0, stockMinimoCajas: 5 },
  { id: "tercera", nombre: "Tercera", stockHuevos: 0, costoCaja: 0, precioCaja: 0, precioBandeja: 0, precioVentaUnitario: 0, incrementoPct: 0, stockMinimoCajas: 5 },
];

const loadEggInventory = () => {
  try {
    const saved = JSON.parse(localStorage.getItem(EGG_STORAGE_KEY) || "null");
    return Array.isArray(saved) && saved.length ? saved : defaultEggInventory;
  } catch { return defaultEggInventory; }
};
const saveEggInventory = data => localStorage.setItem(EGG_STORAGE_KEY, JSON.stringify(data));
const loadEggMovements = () => {
  try { return JSON.parse(localStorage.getItem(EGG_MOVEMENTS_KEY) || "[]"); }
  catch { return []; }
};
const saveEggMovements = data => localStorage.setItem(EGG_MOVEMENTS_KEY, JSON.stringify(data));

const eggBreakdown = total => {
  const safe = Math.max(0, Number(total || 0));
  const cajas = Math.floor(safe / EGG_BOX_UNITS);
  const restoCaja = safe % EGG_BOX_UNITS;
  const bandejas = Math.floor(restoCaja / EGG_TRAY_UNITS);
  const unidades = restoCaja % EGG_TRAY_UNITS;
  return { cajas, bandejas, unidades };
};

export default function EggModule({ D, card, inp, textPrimary, textSecondary, textMuted, bgCard2, borderColor, borderColor2, currentUser, saleMode = false }) {
  const [tab, setTab] = useState("dashboard");
  const [inventory, setInventory] = useState(defaultEggInventory);
  const [movements, setMovements] = useState([]);
  const [loadingEggs, setLoadingEggs] = useState(true);
  const [showMovement, setShowMovement] = useState(false);
  const [showEdit, setShowEdit] = useState(null);
  const [error, setError] = useState("");
  const [form, setForm] = useState({
    tipo: "entrada", calidadId: "super", cantidad: "",
    motivo: "Compra de mercadería", observaciones: "", descuento: "",
    precioUnitarioVenta: "", metodoPago: "efectivo",
    fechaIngreso: todayLocalISO(),
  });
  const [editForm, setEditForm] = useState({});
  const [loteFiltro, setLoteFiltro] = useState(null); // id de calidad, o null = todas
  const [movFiltroPeriodo, setMovFiltroPeriodo] = useState("todos"); // todos | hoy | semana | mes
  const [movFiltroTipo, setMovFiltroTipo] = useState("todos");
  const [showReset, setShowReset] = useState(false);
  const [resetText, setResetText] = useState("");
  const [resetting, setResetting] = useState(false);
  const [resetOk, setResetOk] = useState(false);
  const [saleStep, setSaleStep] = useState("select");
  const [saleCart, setSaleCart] = useState({});
  const [saleSaving, setSaleSaving] = useState(false);
  const [saleFlowError, setSaleFlowError] = useState("");
  const [saleFlowDismissed, setSaleFlowDismissed] = useState(false);
  const [salePaymentMethod, setSalePaymentMethod] = useState("efectivo");
  const [lastSaleSummary, setLastSaleSummary] = useState(null);
  const [reportDate, setReportDate] = useState(todayLocalISO());
  const [reportPeriod, setReportPeriod] = useState("dia");

  // El acceso “Vender huevos” de la barra móvil abre directamente
  // las categorías con sus botones de venta.
  useEffect(() => {
    if (saleMode) {
      setTab("inventario");
      setShowMovement(false);
      setLoteFiltro(null);
      setSaleStep("select");
      setSaleCart({});
      setSaleFlowError("");
      setSaleFlowDismissed(false);
      setSalePaymentMethod("efectivo");
      setLastSaleSummary(null);
    }
  }, [saleMode]);

  const eggHeaders = {
    "Content-Type": "application/json",
    "x-usuario": currentUser?.usuario || "",
    "x-clave": currentUser?._clave || "",
  };

  const syncEggState = async (nextInventory, movementOrList = null) => {
    const list = Array.isArray(movementOrList) ? movementOrList : (movementOrList ? [movementOrList] : []);
    // Enviamos ambos formatos para ser compatibles con cualquier versión del backend:
    // - "movement" (singular): el primer movimiento (backends que esperan objeto único)
    // - "movements" (plural):  el array completo (backends actualizados que aceptan lista)
    const body = {
      inventory: nextInventory,
      movement:  list[0] || null,   // singular — compatibilidad backend original
      movements: list,               // plural  — backends actualizados
    };
    const res = await fetch(`${API}/api/huevos/movimientos`, {
      method: "POST", headers: eggHeaders,
      body: JSON.stringify(body),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || "No se pudieron guardar los huevos en el servidor.");
    const nextMovements = data.movements || (list.length ? [...list, ...movements] : movements);
    setInventory(data.inventory || nextInventory);
    setMovements(nextMovements);
    saveEggInventory(data.inventory || nextInventory);
    saveEggMovements(nextMovements);
    return data;
  };

  const resetEggModule = async () => {
    // Intenta primero el endpoint dedicado de reset.
    // Si no existe (404) o falla, usa el método alternativo:
    // elimina todos los movimientos uno a uno y resetea el inventario.
    try {
      const res = await fetch(`${API}/api/huevos/reset`, {
        method: "POST", headers: eggHeaders,
        body: JSON.stringify({ inventory: defaultEggInventory }),
      });
      if (res.ok) {
        const data = await res.json();
        setInventory(data.inventory || defaultEggInventory);
        setMovements(data.movements || []);
        saveEggInventory(data.inventory || defaultEggInventory);
        saveEggMovements(data.movements || []);
        return data;
      }
      // Si el servidor devuelve 404 (endpoint no existe) caemos al fallback.
      // Cualquier otro error (500, etc.) lo relanzamos directamente.
      const errData = await res.json().catch(() => ({}));
      if (res.status !== 404) throw new Error(errData.error || `Error ${res.status} al restablecer.`);
    } catch (e) {
      // Solo propagamos errores que no sean de red/404 — los de red caen al fallback.
      if (e.message && !e.message.includes("fetch")) throw e;
    }

    // ── Fallback: eliminar movimientos uno a uno + resetear inventario ──────
    const resetInv = defaultEggInventory.map(q => ({
      ...q, stockHuevos: 0, costoCaja: 0, precioCaja: 0, precioBandeja: 0, precioVentaUnitario: 0,
    }));
    // Eliminar cada movimiento usando el endpoint existente
    for (const m of [...movements]) {
      try {
        await fetch(`${API}/api/huevos/movimientos/${m.id}`, {
          method: "DELETE", headers: eggHeaders,
          body: JSON.stringify({ inventory: resetInv }),
        });
      } catch { /* continuar aunque uno falle */ }
    }
    // Resetear inventario con el endpoint existente
    const invRes = await fetch(`${API}/api/huevos/inventario`, {
      method: "PUT", headers: eggHeaders,
      body: JSON.stringify({ inventory: resetInv }),
    });
    if (!invRes.ok) {
      const d = await invRes.json().catch(() => ({}));
      throw new Error(d.error || "No se pudo restablecer el inventario.");
    }
    setInventory(resetInv);
    setMovements([]);
    saveEggInventory(resetInv);
    saveEggMovements([]);
  };

  useEffect(() => {
    if (!currentUser?.usuario || !currentUser?._clave) return;
    let cancelled = false;
    let syncing = false;

    const loadFromServer = async ({ silent = false } = {}) => {
      if (syncing) return;
      syncing = true;
      if (!silent) setLoadingEggs(true);
      try {
        const res = await fetch(`${API}/api/huevos?_=${Date.now()}`, {
          headers: eggHeaders,
          cache: "no-store",
        });
        const contentType = res.headers.get("content-type") || "";
        const data = contentType.includes("application/json") ? await res.json() : {};
        if (!res.ok) throw new Error(data.error || "No se pudo cargar el inventario de huevos.");
        if (cancelled) return;

        let serverInventory = Array.isArray(data.inventory) ? data.inventory : defaultEggInventory;
        let serverMovements = Array.isArray(data.movements) ? data.movements : [];

        // localStorage se conserva como respaldo. Solo se migra automáticamente
        // cuando el servidor está completamente vacío; nunca sobreescribe datos
        // ya confirmados en MongoDB.
        const localInventory = loadEggInventory();
        const localMovements = loadEggMovements();
        const serverHasData = serverInventory.some(q => Number(q.stockHuevos || 0) > 0) || serverMovements.length > 0;
        const localHasData = localInventory.some(q => Number(q.stockHuevos || 0) > 0) || localMovements.length > 0;
        if (!serverHasData && localHasData) {
          const migration = await fetch(`${API}/api/huevos/migrar`, {
            method: "POST", headers: eggHeaders,
            body: JSON.stringify({ inventory: localInventory, movements: localMovements }),
          });
          const migrated = await migration.json();
          if (!migration.ok) throw new Error(migrated.error || "No se pudo migrar el inventario local.");
          serverInventory = migrated.inventory || localInventory;
          serverMovements = migrated.movements || localMovements;
        }

        const faltantes = defaultEggInventory.filter(d => !serverInventory.some(q => q.id === d.id));
        if (faltantes.length) {
          serverInventory = [...serverInventory, ...faltantes];
          fetch(`${API}/api/huevos/inventario`, {
            method: "PUT", headers: eggHeaders,
            body: JSON.stringify({ inventory: serverInventory }),
          }).catch(() => {});
        }

        setInventory(serverInventory);
        setMovements(serverMovements);
        saveEggInventory(serverInventory);
        saveEggMovements(serverMovements);
        setError(prev => prev === "Sin conexión: mostrando copia local." ? "" : prev);
      } catch (e) {
        if (!cancelled && !silent) {
          setInventory(loadEggInventory());
          setMovements(loadEggMovements());
          setError(e.message || "Sin conexión: mostrando copia local.");
        }
      } finally {
        syncing = false;
        if (!cancelled && !silent) setLoadingEggs(false);
      }
    };

    const refresh = () => loadFromServer({ silent: true });
    const onVisibility = () => { if (document.visibilityState === "visible") refresh(); };
    const onFocus = () => refresh();
    const onOnline = () => refresh();

    loadFromServer();
    const timer = window.setInterval(refresh, 8000);
    document.addEventListener("visibilitychange", onVisibility);
    window.addEventListener("focus", onFocus);
    window.addEventListener("online", onOnline);

    return () => {
      cancelled = true;
      window.clearInterval(timer);
      document.removeEventListener("visibilitychange", onVisibility);
      window.removeEventListener("focus", onFocus);
      window.removeEventListener("online", onOnline);
    };
  }, [currentUser?.usuario, currentUser?._clave]);

  const selectedQuality = inventory.find(q => q.id === form.calidadId) || inventory[0];
  const formUnits = Math.max(0, Number(form.cantidad || 0));
  // El costo y el precio de venta ya NO se piden en cada movimiento: se usan
  // directamente los valores configurados para la categoría (botón ✎ en
  // Inventario). Así registrar una entrada o una venta es solo: calidad + cantidad.
  const purchaseUnitValue = Math.max(0, Number(selectedQuality?.costoCaja || 0)) / EGG_BOX_UNITS;
  const purchaseTotal = formUnits * purchaseUnitValue;
  const saleUnitValue = Math.max(0, Number(selectedQuality?.precioVentaUnitario || 0));
  // En venta, el precio unitario es editable por el usuario (se prellena con el
  // precio configurado, pero puede ajustarse para esa venta puntual).
  const ventaUnitPrice = form.tipo === "venta" ? Math.max(0, Number(form.precioUnitarioVenta || 0)) : saleUnitValue;
  const saleGross = form.tipo === "venta" ? formUnits * ventaUnitPrice : 0;
  const saleDiscount = Math.max(0, Number(form.descuento || 0));
  const saleTotal = Math.max(0, saleGross - saleDiscount);
  const expectedSaleTotal = formUnits * saleUnitValue;
  const expectedProfit = expectedSaleTotal - purchaseTotal;
  const expectedMargin = purchaseTotal > 0 ? (expectedProfit / purchaseTotal) * 100 : 0;

  const isUnitLoss = ["merma", "rotos", "trizados"].includes(form.tipo);
  const quantityStep = isUnitLoss ? 1 : EGG_TRAY_UNITS;
  const updateEggQuantity = value => {
    setForm(f => ({ ...f, cantidad: String(Math.max(0, Math.floor(Number(value || 0)))) }));
  };

  // Estilo Treinta: tocar una acción rápida en la tarjeta ya deja todo listo
  // (tipo y calidad) — solo falta la cantidad y confirmar.
  const openQuickAction = (tipo, quality) => {
    setError("");
    setForm(f => ({
      ...f,
      tipo,
      calidadId: quality.id,
      cantidad: "",
      motivo: tipo === "venta" ? "Venta" : tipo === "entrada" ? "Compra de mercadería" : f.motivo,
      precioUnitarioVenta: tipo === "venta" ? String(quality.precioVentaUnitario || "") : f.precioUnitarioVenta,
      descuento: "",
      metodoPago: tipo === "venta" ? "efectivo" : f.metodoPago,
      fechaIngreso: todayLocalISO(),
    }));
    setShowMovement(true);
  };

  const registerMovement = async () => {
    setError("");
    const movementType = String(form.tipo || "").toLowerCase().trim();
    const allowedTypes = ["entrada", "venta", "merma", "rotos", "trizados", "ajuste_entrada", "ajuste_salida"];
    if (!allowedTypes.includes(movementType)) { setError("Tipo de movimiento inválido."); return; }
    if (!selectedQuality || formUnits <= 0) { setError("Ingresa una cantidad válida."); return; }
    if (form.tipo === "venta" && formUnits % EGG_TRAY_UNITS !== 0) { setError("Los huevos solo se venden por bandeja de 30 o caja de 180. La cantidad debe ser múltiplo de 30."); return; }
    if (["venta", "merma", "rotos", "trizados", "ajuste_salida"].includes(form.tipo) && formUnits > selectedQuality.stockHuevos) {
      setError(`Stock insuficiente. Disponible: ${selectedQuality.stockHuevos.toLocaleString("es-CL")} huevos.`); return;
    }
    // Todo movimiento que no sea entrada debe ir siempre al último lote
    // activo de la categoría. Si no hay ninguno, no se registra a ciegas.
    const activeLot = eggLots.find(l => l.calidadId === selectedQuality.id && l.stockRestante > 0);
    // BUG FIX: antes exigía que el lote calculado tuviera stockRestante > 0,
    // pero ese stock se recalcula aparte del stock real (inventory.stockHuevos).
    // Si ambos se desincronizan (ajustes viejos, migraciones, etc.), esto
    // bloqueaba el guardado aunque sí hubiera stock real disponible — el
    // movimiento nunca llegaba a enviarse al servidor. Ahora solo exigimos
    // que exista ALGÚN lote de esa categoría; la disponibilidad real ya se
    // validó arriba contra selectedQuality.stockHuevos, y el reductor de
    // eggLots ya sabe atribuir el movimiento al último lote aunque su
    // stockRestante calculado esté en 0.
    const anyLotForQuality = eggLots.some(l => l.calidadId === selectedQuality.id);
    if (["venta", "merma", "rotos", "trizados", "ajuste_salida"].includes(form.tipo) && !anyLotForQuality) {
      setError("No existe ningún lote registrado para esta categoría todavía."); return;
    }

    if (form.tipo === "entrada" && !form.fechaIngreso) {
      setError("Selecciona la fecha de ingreso del lote."); return;
    }
    if (form.tipo === "entrada" && purchaseUnitValue <= 0) {
      setError(`Configura el costo por caja de "${selectedQuality.nombre}" antes de registrar una entrada (botón ✎ en Inventario).`); return;
    }
    if (form.tipo === "entrada" && saleUnitValue <= 0) {
      setError(`Configura el precio de venta unitario de "${selectedQuality.nombre}" antes de registrar una entrada (botón ✎ en Inventario).`); return;
    }
    if (form.tipo === "venta" && ventaUnitPrice <= 0) {
      setError("Ingresa el precio unitario de venta."); return;
    }

    const sign = ["entrada", "ajuste_entrada"].includes(form.tipo) ? 1 : -1;
    let ingreso = 0;
    let costo = 0;
    if (form.tipo === "entrada") {
      costo = purchaseTotal;
    } else if (form.tipo === "venta") {
      if (saleTotal <= 0) { setError("Ingresa precios válidos para registrar la venta."); return; }
      ingreso = saleTotal;
      costo = (formUnits / EGG_BOX_UNITS) * Number(selectedQuality.costoCaja || 0);
    } else if (["merma", "rotos", "trizados"].includes(form.tipo)) {
      costo = (formUnits / EGG_BOX_UNITS) * Number(selectedQuality.costoCaja || 0);
    }

    const updatedInventory = inventory.map(q => {
      if (q.id !== selectedQuality.id) return q;

      const nextStock = Math.max(0, q.stockHuevos + sign * formUnits);
      if (form.tipo !== "entrada") return { ...q, stockHuevos: nextStock };

      const oldStock = Math.max(0, Number(q.stockHuevos || 0));
      const oldUnitCost = Number(q.costoCaja || 0) / EGG_BOX_UNITS;
      const totalCostBefore = oldStock * oldUnitCost;
      const totalCostAfter = totalCostBefore + purchaseTotal;
      const averageUnitCost = nextStock > 0 ? totalCostAfter / nextStock : purchaseUnitValue;

      return {
        ...q,
        stockHuevos: nextStock,
        costoCaja: Math.round(averageUnitCost * EGG_BOX_UNITS),
        precioVentaUnitario: saleUnitValue,
        precioBandeja: Math.round(saleUnitValue * EGG_TRAY_UNITS),
        precioCaja: Math.round(saleUnitValue * EGG_BOX_UNITS),
      };
    });
    const movement = {
      id: Date.now(),
      fechaIngreso: ["entrada", "venta", "merma", "rotos", "trizados"].includes(form.tipo) ? form.fechaIngreso : "",
      fecha: ["venta", "merma", "rotos", "trizados"].includes(form.tipo) && form.fechaIngreso
        ? new Date(`${form.fechaIngreso}T${new Date().toTimeString().slice(0,8)}`).toISOString()
        : new Date().toISOString(),
      tipo: movementType,
      calidadId: selectedQuality.id, calidad: selectedQuality.nombre,
      cajas: 0, bandejas: 0, unidades: formUnits,
      huevos: formUnits, motivo: form.motivo || "Sin motivo", observaciones: form.observaciones || "",
      usuario: currentUser?.nombre || "Usuario", ingreso, costo, ganancia: ingreso - costo,
      precioCaja: form.tipo === "venta" ? Number(selectedQuality.precioCaja || 0) : 0,
      precioBandeja: form.tipo === "venta" ? Number(selectedQuality.precioBandeja || 0) : 0,
      precioUnidad: form.tipo === "venta" ? ventaUnitPrice : 0,
      valorUnitarioCompra: form.tipo === "entrada" ? purchaseUnitValue : 0,
      totalCompra: form.tipo === "entrada" ? purchaseTotal : 0,
      precioVentaUnitario: form.tipo === "entrada" ? saleUnitValue : 0,
      ventaEsperada: form.tipo === "entrada" ? expectedSaleTotal : 0,
      gananciaEstimada: form.tipo === "entrada" ? expectedProfit : 0,
      descuento: form.tipo === "venta" ? saleDiscount : 0,
      metodoPago: form.tipo === "venta" ? (form.metodoPago || "efectivo") : "",
    };

    // Transferencia automática entre lotes: si ya había un lote activo de
    // esta categoría con OTRA fecha, se cierra y su stock pasa al lote nuevo.
    // Si la fecha coincide, no hace falta transferir — el mismo cálculo de
    // lotes ya fusiona ambas entradas en un solo lote.
    const movementsToSend = [movement];
    if (form.tipo === "entrada" && activeLot && activeLot.fechaIngreso !== form.fechaIngreso) {
      movementsToSend.push({
        id: movement.id + 1,
        tipo: "transferencia",
        calidadId: selectedQuality.id, calidad: selectedQuality.nombre,
        huevos: activeLot.stockRestante,
        motivo: "Transferencia de stock desde lote anterior",
        observaciones: `Se cerró el lote del ${activeLot.fechaIngreso} y sus ${activeLot.stockRestante.toLocaleString("es-CL")} huevos restantes pasaron al nuevo lote.`,
        fecha: new Date().toISOString(), fechaIngreso: form.fechaIngreso,
        usuario: currentUser?.nombre || "Usuario",
        loteOrigenId: activeLot.id, loteDestinoId: String(movement.id),
        ingreso: 0, costo: 0, ganancia: 0,
      });
    }

    try {
      await syncEggState(updatedInventory, movementsToSend);
      setShowMovement(false);
    } catch (e) {
      setError(e.message || "No se pudo guardar el movimiento.");
      return;
    }
    setForm({
      tipo: "entrada", calidadId: selectedQuality.id, cantidad: "",
      motivo: "Compra de mercadería", observaciones: "", descuento: "", metodoPago: "efectivo",
      fechaIngreso: todayLocalISO(),
    });
  };

  const deleteMovement = async (m) => {
    if (!window.confirm(`¿Eliminar este movimiento de "${m.calidad}" (${Number(m.huevos || 0).toLocaleString("es-CL")} huevos)? Esta acción no se puede deshacer.`)) return;
    setError("");
    // Revierte el efecto que tuvo este movimiento sobre el stock: las entradas
    // y ajustes de entrada sumaron, todo lo demás (venta/merma/rotos/trizados/
    // ajuste de salida) restó, así que aplicamos el signo contrario.
    const sign = ["entrada", "ajuste_entrada"].includes(m.tipo) ? 1 : -1;
    const reversedInventory = inventory.map(q => q.id === m.calidadId
      ? { ...q, stockHuevos: Math.max(0, Number(q.stockHuevos || 0) - sign * Number(m.huevos || 0)) }
      : q);
    try {
      const res = await fetch(`${API}/api/huevos/movimientos/${m.id}`, {
        method: "DELETE", headers: eggHeaders,
        body: JSON.stringify({ inventory: reversedInventory }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "No se pudo eliminar el movimiento.");
      const nextMovements = data.movements || movements.filter(x => x.id !== m.id);
      const nextInventory = data.inventory || reversedInventory;
      setInventory(nextInventory);
      setMovements(nextMovements);
      saveEggInventory(nextInventory);
      saveEggMovements(nextMovements);
    } catch (e) {
      setError(e.message || "No se pudo eliminar el movimiento.");
    }
  };

  const openEditQuality = q => {
    setEditForm({ ...q, incrementoPct: q.incrementoPct ?? calcIncrementPct(Number(q.costoCaja || 0) / EGG_BOX_UNITS, q.precioVentaUnitario).toFixed(2) });
    setShowEdit(q.id);
  };
  const saveQuality = async () => {
    const unitSale = Math.max(0, Number(editForm.precioVentaUnitario || 0));
    const next = inventory.map(q => q.id === showEdit ? {
      ...q,
      costoCaja: Math.max(0, Number(editForm.costoCaja || 0)),
      precioVentaUnitario: unitSale,
      incrementoPct: Number(editForm.incrementoPct || calcIncrementPct(Number(editForm.costoCaja || 0) / EGG_BOX_UNITS, unitSale) || 0),
      precioCaja: Math.round(unitSale * EGG_BOX_UNITS),
      precioBandeja: Math.round(unitSale * EGG_TRAY_UNITS),
      stockMinimoCajas: Math.max(0, Number(editForm.stockMinimoCajas || 0)),
    } : q);
    try {
      const res = await fetch(`${API}/api/huevos/inventario`, {
        method: "PUT", headers: eggHeaders, body: JSON.stringify({ inventory: next }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "No se pudo actualizar la calidad.");
      setInventory(data.inventory || next);
      saveEggInventory(data.inventory || next);
      setShowEdit(null);
    } catch (e) { setError(e.message || "No se pudo actualizar la calidad."); }
  };

  const totalEggs = inventory.reduce((s, q) => s + Number(q.stockHuevos || 0), 0);
  const totalBreakdown = eggBreakdown(totalEggs);
  const sales = movements.filter(m => m.tipo === "venta");
  const wastes = movements.filter(m => ["merma", "rotos", "trizados"].includes(m.tipo));
  const revenue = sales.reduce((s, m) => s + Number(m.ingreso || 0), 0);
  const profit = sales.reduce((s, m) => s + Number(m.ganancia || 0), 0);
  const wasteUnits = wastes.reduce((s, m) => s + Number(m.huevos || 0), 0);
  const wasteCost = wastes.reduce((s, m) => s + Number(m.costo || 0), 0);
  const inventoryCost = inventory.reduce((s, q) => s + (q.stockHuevos / EGG_BOX_UNITS) * Number(q.costoCaja || 0), 0);
  const inventorySaleValue = inventory.reduce((s, q) => s + (q.stockHuevos / EGG_BOX_UNITS) * Number(q.precioCaja || 0), 0);

  const eggLots = useMemo(() => {
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
          const taken = Math.max(0, source.stockRestante);
          if (taken > 0) {
            dest.costoTotal += taken * source.costoUnitario;
            dest.stockRestante += taken;
            dest.transferidoDesde += taken;
            const totalDisponibleLote = dest.huevosIniciales + dest.transferidoDesde;
            dest.costoUnitario = totalDisponibleLote > 0 ? dest.costoTotal / totalDisponibleLote : dest.costoUnitario;
          }
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
      target.stockRestante -= taken;
      const allocatedCost = taken * target.costoUnitario;
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
        // BUG FIX: antes, si un lote viejo ya estaba "cerrado" (por una
        // transferencia explícita), se saltaba por completo con este return
        // — y sus estadísticas de consumo (ventas, merma, rotos, trizados,
        // ajustes) que había acumulado ANTES de cerrarse se perdían para
        // siempre, porque solo se traspasaba stock y costo. Ahora las
        // estadísticas de consumo siempre se suman al lote vigente, esté
        // cerrado o no; solo el traspaso de stock se salta si ya se hizo.
        vigente.vendidos += viejo.vendidos;
        vigente.ingreso += viejo.ingreso;
        vigente.costoVendido += viejo.costoVendido;
        vigente.ganancia += viejo.ganancia;
        vigente.merma += viejo.merma;
        vigente.rotos += viejo.rotos;
        vigente.trizados += viejo.trizados;
        vigente.ajustes += viejo.ajustes;
        // Se dejan en 0 en el lote viejo para que su propia tarjeta (que
        // sigue mostrándose, marcada como "cerrado") no duplique visualmente
        // los mismos números que ahora también aparecen en el lote vigente.
        viejo.vendidos = 0; viejo.ingreso = 0; viejo.costoVendido = 0; viejo.ganancia = 0;
        viejo.merma = 0; viejo.rotos = 0; viejo.trizados = 0; viejo.ajustes = 0;
        if (viejo.estado === "cerrado") return;
        if (viejo.stockRestante > 0) {
          vigente.costoTotal += viejo.stockRestante * viejo.costoUnitario;
          vigente.stockRestante += viejo.stockRestante;
          vigente.transferidoDesde += viejo.stockRestante;
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
  }, [movements, inventory]);

  const saleItems = inventory
    .map(q => {
      const formato = saleCart[q.id]?.formato === "caja" ? "caja" : "bandeja";
      const cantidadFormatos = Math.max(0, Number(saleCart[q.id]?.cantidadFormatos || 0));
      const unidadesPorFormato = formato === "caja" ? EGG_BOX_UNITS : EGG_TRAY_UNITS;
      const precioFormato = Math.max(0, Number(formato === "caja" ? q.precioCaja : q.precioBandeja));
      return {
        ...q,
        formato,
        cantidadFormatos,
        unidadesPorFormato,
        cantidadVenta: cantidadFormatos * unidadesPorFormato,
        precioFormato,
        precioVenta: unidadesPorFormato > 0 ? precioFormato / unidadesPorFormato : 0,
      };
    })
    .filter(q => q.cantidadFormatos > 0);

  const saleCartUnits = saleItems.reduce((sum, q) => sum + q.cantidadVenta, 0);
  const saleCartPackages = saleItems.reduce((sum, q) => sum + q.cantidadFormatos, 0);
  const saleCartTotal = saleItems.reduce((sum, q) => sum + q.cantidadFormatos * q.precioFormato, 0);

  const changeSaleQuantity = (quality, delta) => {
    setSaleFlowError("");
    setSaleCart(prev => {
      const formato = prev[quality.id]?.formato === "caja" ? "caja" : "bandeja";
      const unidadesPorFormato = formato === "caja" ? EGG_BOX_UNITS : EGG_TRAY_UNITS;
      const current = Math.max(0, Number(prev[quality.id]?.cantidadFormatos || 0));
      const max = Math.floor(Math.max(0, Number(quality.stockHuevos || 0)) / unidadesPorFormato);
      const next = Math.min(max, Math.max(0, current + delta));
      return { ...prev, [quality.id]: { formato, cantidadFormatos: next } };
    });
  };

  const updateSaleFormat = (quality, formato) => {
    setSaleFlowError("");
    setSaleCart(prev => {
      const unidadesPorFormato = formato === "caja" ? EGG_BOX_UNITS : EGG_TRAY_UNITS;
      const max = Math.floor(Math.max(0, Number(quality.stockHuevos || 0)) / unidadesPorFormato);
      const current = Math.max(0, Number(prev[quality.id]?.cantidadFormatos || 0));
      return { ...prev, [quality.id]: { formato, cantidadFormatos: Math.min(current, max) } };
    });
  };

  const confirmSaleFlow = async () => {
    setSaleFlowError("");
    if (!saleItems.length) {
      setSaleFlowError("Selecciona al menos una categoría.");
      return;
    }

    for (const item of saleItems) {
      if (item.cantidadVenta > Number(item.stockHuevos || 0)) {
        setSaleFlowError(`Stock insuficiente en ${item.nombre}.`);
        return;
      }
      if (item.precioFormato <= 0) {
        setSaleFlowError(`Configura el precio por ${item.formato} de ${item.nombre}.`);
        return;
      }
      const hasLot = eggLots.some(l => l.calidadId === item.id);
      if (!hasLot) {
        setSaleFlowError(`No existe un lote registrado para ${item.nombre}.`);
        return;
      }
    }

    const now = new Date();
    const movementDate = todayLocalISO();
    const nextInventory = inventory.map(q => {
      const selected = saleItems.find(item => item.id === q.id);
      if (!selected) return q;
      return {
        ...q,
        stockHuevos: Math.max(0, Number(q.stockHuevos || 0) - selected.cantidadVenta),
      };
    });

    const saleMovements = saleItems.map((item, index) => {
      const ingreso = item.cantidadFormatos * item.precioFormato;
      const costo = (item.cantidadVenta / EGG_BOX_UNITS) * Number(item.costoCaja || 0);
      return {
        id: Date.now() + index,
        fechaIngreso: movementDate,
        fecha: now.toISOString(),
        tipo: "venta",
        calidadId: item.id,
        calidad: item.nombre,
        formato: item.formato,
        cantidadFormatos: item.cantidadFormatos,
        cajas: item.formato === "caja" ? item.cantidadFormatos : 0,
        bandejas: item.formato === "bandeja" ? item.cantidadFormatos : 0,
        unidades: item.cantidadVenta,
        huevos: item.cantidadVenta,
        motivo: "Venta",
        observaciones: `Venta de ${item.cantidadFormatos} ${item.formato}${item.cantidadFormatos === 1 ? "" : "s"} (${item.cantidadVenta} huevos)`,
        usuario: currentUser?.nombre || "Usuario",
        ingreso,
        costo,
        ganancia: ingreso - costo,
        precioCaja: Number(item.precioCaja || 0),
        precioBandeja: Number(item.precioBandeja || 0),
        precioUnidad: item.precioVenta,
        descuento: 0,
        metodoPago: salePaymentMethod,
      };
    });

    try {
      setSaleSaving(true);
      await syncEggState(nextInventory, saleMovements);
      setLastSaleSummary({ total: saleCartTotal, unidades: saleCartUnits, formatos: saleCartPackages, metodoPago: salePaymentMethod });
      setSaleCart({});
      setSaleStep("done");
    } catch (e) {
      setSaleFlowError(e.message || "No se pudo registrar la venta.");
    } finally {
      setSaleSaving(false);
    }
  };

  const movementUnits = movement => {
    const direct = Number(movement?.huevos);
    if (Number.isFinite(direct) && direct > 0) return direct;
    return Math.max(0,
      Number(movement?.cajas || 0) * EGG_BOX_UNITS +
      Number(movement?.bandejas || 0) * EGG_TRAY_UNITS +
      Number(movement?.unidades || 0)
    );
  };

  const movementDay = movement => {
    // Las ventas creadas por el backend pueden guardarse después de medianoche
    // en UTC aunque todavía sea el día anterior en Chile. Para reportes usamos
    // la fecha real de la venta en America/Santiago, incluso para movimientos
    // ya existentes que quedaron con fechaIngreso UTC adelantada.
    if (movement?.tipo === "venta" && movement?.fecha) {
      const saleDate = new Date(movement.fecha);
      if (!Number.isNaN(saleDate.getTime())) {
        const parts = new Intl.DateTimeFormat("en-US", {
          timeZone: "America/Santiago", year: "numeric", month: "2-digit", day: "2-digit"
        }).formatToParts(saleDate).reduce((acc, p) => ({ ...acc, [p.type]: p.value }), {});
        if (parts.year && parts.month && parts.day) return `${parts.year}-${parts.month}-${parts.day}`;
      }
    }
    const raw = movement?.fechaIngreso || movement?.fechaMovimiento || movement?.fecha;
    if (!raw) return "";
    const text = String(raw).trim();
    // Las fechas elegidas en un <input type="date"> ya vienen como YYYY-MM-DD.
    // Se conservan literalmente para evitar que la zona horaria de Chile las
    // retroceda al día anterior al convertirlas con new Date("YYYY-MM-DD").
    const dateOnly = text.match(/^(\d{4}-\d{2}-\d{2})$/);
    if (dateOnly) return dateOnly[1];
    const isoPrefix = text.match(/^(\d{4}-\d{2}-\d{2})T/);
    if (isoPrefix) return isoPrefix[1];
    const d = new Date(text);
    if (Number.isNaN(d.getTime())) return text.slice(0, 10);
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, "0");
    const day = String(d.getDate()).padStart(2, "0");
    return `${year}-${month}-${day}`;
  };

  const reportRange = useMemo(() => {
    const base = new Date(`${reportDate}T12:00:00`);
    let start = new Date(base);
    let end = new Date(base);
    if (reportPeriod === "semana") {
      const day = (base.getDay() + 6) % 7;
      start.setDate(base.getDate() - day);
      end.setDate(start.getDate() + 6);
    } else if (reportPeriod === "mes") {
      start = new Date(base.getFullYear(), base.getMonth(), 1, 12);
      end = new Date(base.getFullYear(), base.getMonth() + 1, 0, 12);
    }
    const iso = d => new Date(d.getTime() - d.getTimezoneOffset() * 60000).toISOString().slice(0, 10);
    return { start: iso(start), end: iso(end) };
  }, [reportDate, reportPeriod]);

  const reportMovements = useMemo(() => movements.filter(m => {
    const day = movementDay(m);
    return day && day >= reportRange.start && day <= reportRange.end;
  }), [movements, reportRange.start, reportRange.end]);

  const eggReport = useMemo(() => {
    const movementEffect = m => {
      const units = movementUnits(m);
      if (["entrada", "ajuste_entrada"].includes(m.tipo)) return units;
      if (["venta", "merma", "rotos", "trizados", "ajuste_salida"].includes(m.tipo)) return -units;
      // Una transferencia cambia de lote, pero no cambia el stock total de la categoría.
      return 0;
    };
    const categories = inventory.map(q => {
      const sameQuality = m => String(m.calidadId || "").toLowerCase() === String(q.id || "").toLowerCase() || String(m.calidad || "").trim().toLowerCase() === String(q.nombre || "").trim().toLowerCase();
      const list = reportMovements.filter(sameQuality);
      const allUntilEnd = movements.filter(m => sameQuality(m) && movementDay(m) && movementDay(m) <= reportRange.end);
      const beforeStart = movements.filter(m => sameQuality(m) && movementDay(m) && movementDay(m) < reportRange.start);
      const sold = list.filter(m => m.tipo === "venta");
      const entries = list.filter(m => m.tipo === "entrada");
      const transfers = list.filter(m => m.tipo === "transferencia");
      const lost = list.filter(m => ["merma", "rotos", "trizados"].includes(m.tipo));
      const sum = (arr, key) => arr.reduce((acc, item) => acc + Number(item?.[key] || 0), 0);
      const sumEntryValue = arr => arr.reduce((acc, m) => acc + Number(m.totalCompra ?? m.costo ?? ((Number(m.valorUnitarioCompra || 0) * Number(m.huevos || 0)) || 0)), 0);
      const sumUnits = arr => arr.reduce((acc, item) => acc + movementUnits(item), 0);
      const vendidos = sumUnits(sold);
      const ingreso = sum(sold, "ingreso");
      const costo = sum(sold, "costo");
      const ganancia = sold.reduce((acc,m)=>acc + Number(m.ganancia ?? (Number(m.ingreso||0)-Number(m.costo||0))),0);
      const entradas = sumUnits(entries);
      const valorEntradas = sumEntryValue(entries);
      const traspasos = sumUnits(transfers);
      const merma = sumUnits(lost.filter(m=>m.tipo==="merma"));
      const rotos = sumUnits(lost.filter(m=>m.tipo==="rotos"));
      const trizados = sumUnits(lost.filter(m=>m.tipo==="trizados"));
      const valorPerdido = sum(lost, "costo");
      const stockInicial = Math.max(0, beforeStart.reduce((acc,m)=>acc + movementEffect(m), 0));
      const stockFinal = Math.max(0, allUntilEnd.reduce((acc,m)=>acc + movementEffect(m), 0));
      return { id:q.id, nombre:q.nombre, stockInicial, entradas, valorEntradas, traspasos, vendidos, ingreso, costo, ganancia, merma, rotos, trizados, totalPerdido:merma+rotos+trizados, valorPerdido, stockFinal };
    });
    const totals = categories.reduce((a,c)=>({
      stockInicial:a.stockInicial+c.stockInicial, entradas:a.entradas+c.entradas, valorEntradas:a.valorEntradas+c.valorEntradas, traspasos:a.traspasos+c.traspasos,
      vendidos:a.vendidos+c.vendidos, ingreso:a.ingreso+c.ingreso, costo:a.costo+c.costo, ganancia:a.ganancia+c.ganancia,
      merma:a.merma+c.merma, rotos:a.rotos+c.rotos, trizados:a.trizados+c.trizados, totalPerdido:a.totalPerdido+c.totalPerdido, valorPerdido:a.valorPerdido+c.valorPerdido,
      stockFinal:a.stockFinal+c.stockFinal
    }),{stockInicial:0,entradas:0,valorEntradas:0,traspasos:0,vendidos:0,ingreso:0,costo:0,ganancia:0,merma:0,rotos:0,trizados:0,totalPerdido:0,valorPerdido:0,stockFinal:0});
    // Desglose de ventas de huevos por método de pago (no altera ningún cálculo existente).
    const normalizePago = m => String(m?.metodoPago || "efectivo").trim().toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
    const soldMovements = reportMovements.filter(m => m.tipo === "venta");
    const sumBy = pred => soldMovements.filter(pred).reduce((acc, m) => acc + Number(m.ingreso || 0), 0);
    const paymentBreakdown = {
      efectivo: sumBy(m => normalizePago(m) === "efectivo"),
      debito: sumBy(m => ["tarjeta", "debito", "tarjeta debito"].includes(normalizePago(m))),
      transferencia: sumBy(m => normalizePago(m) === "transferencia"),
    };
    paymentBreakdown.total = paymentBreakdown.efectivo + paymentBreakdown.debito + paymentBreakdown.transferencia;
    return { categories, totals, paymentBreakdown };
  }, [inventory, reportMovements, movements, reportRange.start, reportRange.end]);

  const exportEggReport = () => {
    const rows = [
      ["Categoría","Stock inicial","Entradas reales","Valor entradas","Traspasos","Vendidos","Ingreso ventas","Costo vendido","Ganancia","Merma","Rotos","Trizados","Total perdido","Valor perdido","Stock final"],
      ...eggReport.categories.map(c=>[c.nombre,c.stockInicial,c.entradas,c.valorEntradas,c.traspasos,c.vendidos,c.ingreso,c.costo,c.ganancia,c.merma,c.rotos,c.trizados,c.totalPerdido,c.valorPerdido,c.stockFinal]),
      ["TOTAL",eggReport.totals.stockInicial,eggReport.totals.entradas,eggReport.totals.valorEntradas,eggReport.totals.traspasos,eggReport.totals.vendidos,eggReport.totals.ingreso,eggReport.totals.costo,eggReport.totals.ganancia,eggReport.totals.merma,eggReport.totals.rotos,eggReport.totals.trizados,eggReport.totals.totalPerdido,eggReport.totals.valorPerdido,eggReport.totals.stockFinal],
      [],
      ["Ventas de huevos por método de pago"],
      ["Efectivo","Débito","Transferencia","Total"],
      [eggReport.paymentBreakdown.efectivo,eggReport.paymentBreakdown.debito,eggReport.paymentBreakdown.transferencia,eggReport.paymentBreakdown.total]
    ];
    const csv = "\ufeff" + rows.map(r=>r.map(v=>`"${String(v).replace(/"/g,'""')}"`).join(";")).join("\n");
    const blob = new Blob([csv], { type:"text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href=url; a.download=`reporte-huevos-${reportRange.start}-${reportRange.end}.csv`; a.click();
    URL.revokeObjectURL(url);
  };

  const chartData = inventory.map(q => ({ calidad: q.nombre, stock: q.stockHuevos, ventas: sales.filter(m => m.calidadId === q.id).reduce((s, m) => s + m.huevos, 0), merma: wastes.filter(m => m.calidadId === q.id).reduce((s, m) => s + m.huevos, 0) }));
  const typeLabels = { entrada: "Entrada", venta: "Venta", merma: "Merma", rotos: "Rotos", trizados: "Trizados", ajuste_entrada: "Ajuste +", ajuste_salida: "Ajuste -", transferencia: "Transferencia" };
  const typeColors = { entrada: D?"#4fae93":"#2f6f5e", venta: D?"#63c2a6":"#245a4c", merma: D?"#d97757":"#b3452f", rotos: D?"#e08a68":"#a83d2a", trizados: D?"#d9a857":"#b9852f", ajuste_entrada: D?"#8fb8ac":"#4a7a6b", ajuste_salida: D?"#d9a857":"#b9852f", transferencia: D?"#93998f":"#5b6660" };

  const tabs = [
    { id: "dashboard", label: "Resumen" }, { id: "inventario", label: "Inventario" },
    { id: "lotes", label: "Lotes por fecha" }, { id: "movimientos", label: "Movimientos" }, { id: "merma", label: "Merma" }, { id: "reportes", label: "Reportes" }, { id: "estadisticas", label: "Estadísticas" },
  ];

  if (saleMode && !saleFlowDismissed) {
    const shell = {
      minHeight: "calc(100vh - 132px)",
      margin: "-20px -24px",
      paddingBottom: 96,
      background: D ? "#111522" : "#f5f6f8",
      color: textPrimary,
    };
    const headerStyle = {
      minHeight: 76,
      padding: "14px 18px",
      display: "flex",
      alignItems: "center",
      gap: 12,
      background: "linear-gradient(135deg,#ffd84d,#ffc400)",
      color: "#17212b",
      position: "sticky",
      top: 0,
      zIndex: 30,
      boxShadow: "0 4px 14px rgba(50,40,0,.12)",
    };
    const backButton = {
      width: 44,
      height: 44,
      borderRadius: 14,
      border: "none",
      background: "rgba(255,255,255,.62)",
      color: "#17212b",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      cursor: "pointer",
      flexShrink: 0,
    };
    const bottomBar = {
      position: "fixed",
      left: 0,
      right: 0,
      bottom: 74,
      zIndex: 45,
      padding: "12px 16px max(12px, env(safe-area-inset-bottom))",
      background: D ? "rgba(17,21,34,.96)" : "rgba(255,255,255,.97)",
      borderTop: `1px solid ${borderColor}`,
      backdropFilter: "blur(14px)",
    };

    if (saleStep === "done") {
      return <div style={shell}>
        <div style={headerStyle}>
          <button style={backButton} onClick={() => setSaleFlowDismissed(true)}><ArrowLeft size={24}/></button>
          <div><div style={{fontWeight:900,fontSize:19}}>Venta de huevos</div><div style={{fontSize:12,opacity:.72}}>Venta registrada correctamente</div></div>
        </div>
        <div style={{padding:"34px 18px",display:"flex",justifyContent:"center"}}>
          <div style={{...card,maxWidth:470,width:"100%",borderRadius:24,textAlign:"center",padding:"34px 22px"}}>
            <div style={{width:78,height:78,borderRadius:"50%",margin:"0 auto 18px",background:D?"rgba(79,174,147,.18)":"#e3f5ec",display:"flex",alignItems:"center",justifyContent:"center",color:D?"#63c2a6":"#168a4a"}}><Check size={38} strokeWidth={2.5}/></div>
            <h2 style={{margin:"0 0 8px",fontSize:25,color:textPrimary}}>Venta registrada</h2>
            <p style={{margin:"0 0 18px",color:textMuted,lineHeight:1.5}}>El stock y los movimientos de huevos ya fueron actualizados.</p>
            {lastSaleSummary && <div style={{margin:"0 0 22px",padding:16,borderRadius:16,background:bgCard2,textAlign:"left",display:"grid",gap:10}}>
              <div style={{display:"flex",justifyContent:"space-between",gap:12}}><span style={{color:textMuted,fontSize:13}}>Total</span><strong style={{color:textPrimary,fontSize:20}}>{fmt(lastSaleSummary.total)}</strong></div>
              <div style={{display:"flex",justifyContent:"space-between",gap:12}}><span style={{color:textMuted,fontSize:13}}>Huevos vendidos</span><strong style={{color:textPrimary}}>{lastSaleSummary.unidades.toLocaleString("es-CL")}</strong></div>
              <div style={{display:"flex",justifyContent:"space-between",gap:12}}><span style={{color:textMuted,fontSize:13}}>Método de pago</span><strong style={{color:textPrimary,textTransform:"capitalize"}}>{lastSaleSummary.metodoPago === "tarjeta" ? "Tarjeta" : lastSaleSummary.metodoPago === "transferencia" ? "Transferencia" : "Efectivo"}</strong></div>
            </div>}
            <button className="btn-primary" onClick={()=>setSaleStep("select")} style={{width:"100%",padding:14,borderRadius:14,marginBottom:10}}>Hacer otra venta</button>
            <button onClick={()=>setSaleFlowDismissed(true)} style={{width:"100%",padding:13,borderRadius:14,border:`1.5px solid ${borderColor2}`,background:bgCard2,color:textPrimary,fontWeight:800,cursor:"pointer"}}>Volver a Huevos</button>
          </div>
        </div>
      </div>;
    }

    if (saleStep === "confirm") {
      return <div style={shell}>
        <div style={headerStyle}>
          <button style={backButton} onClick={() => { setSaleStep("select"); setSaleFlowError(""); }}><ArrowLeft size={24}/></button>
          <div><div style={{fontWeight:900,fontSize:18}}>Confirma precios y cantidades</div><div style={{fontSize:12,opacity:.72}}>Paso 2 de 2</div></div>
        </div>
        <div className="egg-sale-content egg-sale-confirm-content" style={{padding:"18px 16px 24px",maxWidth:680,margin:"0 auto"}}>
          <div className="egg-sale-info egg-sale-confirm-info" style={{padding:15,borderRadius:16,background:D?"rgba(55,139,230,.16)":"#dcebff",border:`2px solid ${D?"#397dc2":"#2786d8"}`,display:"flex",gap:12,alignItems:"flex-start",marginBottom:16,color:D?"#b9dcff":"#225b8d"}}>
            <Info size={22} style={{flexShrink:0,marginTop:1}}/><div style={{fontSize:14,lineHeight:1.5}}>Al crear la venta se descontarán bandejas de 30 o cajas de 180 huevos del inventario.</div>
          </div>
          <div style={{display:"flex",flexDirection:"column",gap:12}}>
            {saleItems.map(item => <div key={item.id} className="egg-confirm-card" style={{...card,borderRadius:20,padding:16}}>
              <div style={{display:"flex",alignItems:"center",gap:12,marginBottom:15}}>
                <div style={{width:50,height:50,borderRadius:15,background:D?"rgba(255,196,0,.13)":"#fff4bf",display:"flex",alignItems:"center",justifyContent:"center",fontSize:25}}>🥚</div>
                <div style={{flex:1}}><div style={{fontWeight:900,fontSize:17,color:textPrimary}}>{item.nombre}</div><div style={{fontSize:12,color:textMuted}}>{Number(item.stockHuevos).toLocaleString("es-CL")} disponibles</div></div>
                <button onClick={()=>setSaleCart(prev=>{const next={...prev};delete next[item.id];return next;})} style={{width:42,height:42,borderRadius:13,border:"2px solid #d64545",background:"transparent",color:"#d64545",display:"flex",alignItems:"center",justifyContent:"center",cursor:"pointer"}}><Trash2 size={20}/></button>
              </div>
              <div style={{display:"grid",gridTemplateColumns:"minmax(0,1fr) minmax(0,1fr)",gap:12}}>
                <div><label style={{display:"block",fontSize:12,fontWeight:800,color:textSecondary,marginBottom:7}}>Cantidad de {item.formato}s</label><div style={{height:52,border:`2px solid ${borderColor2}`,borderRadius:15,display:"flex",alignItems:"center",justifyContent:"space-between",padding:"0 8px",background:bgCard2}}><button onClick={()=>changeSaleQuantity(item,-1)} style={{width:36,height:36,borderRadius:"50%",border:`2px solid ${textSecondary}`,background:"transparent",color:textPrimary,display:"flex",alignItems:"center",justifyContent:"center",cursor:"pointer"}}><Minus size={18}/></button><strong style={{fontSize:18}}>{item.cantidadFormatos}</strong><button onClick={()=>changeSaleQuantity(item,1)} style={{width:36,height:36,borderRadius:"50%",border:`2px solid ${textSecondary}`,background:"transparent",color:textPrimary,display:"flex",alignItems:"center",justifyContent:"center",cursor:"pointer"}}><Plus size={18}/></button></div></div>
                <div><label style={{display:"block",fontSize:12,fontWeight:800,color:textSecondary,marginBottom:7}}>Formato</label><div style={{height:52,border:`2px solid ${borderColor2}`,borderRadius:15,display:"flex",alignItems:"center",padding:"0 13px",background:bgCard2}}><strong style={{fontSize:15,color:textPrimary,textTransform:"capitalize"}}>{item.formato} · {item.unidadesPorFormato} huevos</strong></div></div>
              </div>
              <div style={{marginTop:13,color:textSecondary,fontSize:13}}>{item.cantidadFormatos} {item.formato}{item.cantidadFormatos===1?"":"s"} · {item.cantidadVenta.toLocaleString("es-CL")} huevos: <strong style={{color:textPrimary}}>{fmt(item.cantidadFormatos*item.precioFormato)}</strong></div>
            </div>)}
          </div>
          <div className="egg-payment-card" style={{...card,borderRadius:20,padding:16,marginTop:14}}>
            <div style={{fontWeight:900,fontSize:16,color:textPrimary,marginBottom:12}}>Método de pago</div>
            <div style={{display:"grid",gridTemplateColumns:"repeat(3,minmax(0,1fr))",gap:9}}>
              {[
                {id:"efectivo",label:"Efectivo",Icon:Banknote},
                {id:"tarjeta",label:"Tarjeta",Icon:CreditCard},
                {id:"transferencia",label:"Transferencia",Icon:Landmark},
              ].map(({id,label,Icon})=>{const active=salePaymentMethod===id;return <button key={id} type="button" onClick={()=>setSalePaymentMethod(id)} style={{minHeight:78,padding:"10px 6px",borderRadius:15,border:`2px solid ${active?(D?"#63c2a6":"#245a4c"):borderColor2}`,background:active?(D?"rgba(99,194,166,.16)":"#e3f3ed"):bgCard2,color:active?(D?"#63c2a6":"#245a4c"):textSecondary,fontFamily:"inherit",fontWeight:800,cursor:"pointer",display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",gap:7}}><Icon size={22}/><span style={{fontSize:11,lineHeight:1.15,textAlign:"center"}}>{label}</span></button>})}
            </div>
          </div>
          {saleFlowError && <div style={{marginTop:13,padding:12,borderRadius:12,background:D?"rgba(217,65,65,.15)":"#fde7e7",color:D?"#ff9b9b":"#bd2525",fontWeight:800,fontSize:13}}>{saleFlowError}</div>}
        </div>
        <div className="egg-sale-bottom" style={bottomBar}>
          <button className="egg-sale-continue" disabled={saleSaving || !saleItems.length} onClick={confirmSaleFlow} style={{width:"100%",maxWidth:680,margin:"0 auto",minHeight:62,border:"none",borderRadius:17,background:saleSaving||!saleItems.length?(D?"#303746":"#dce2ea"):"#172838",color:saleSaving||!saleItems.length?textMuted:"#fff",display:"flex",alignItems:"center",justifyContent:"space-between",padding:"0 20px",fontFamily:"inherit",cursor:saleSaving?"wait":"pointer"}}><span style={{display:"flex",alignItems:"center",gap:12}}><span style={{width:38,height:38,borderRadius:11,background:"rgba(255,255,255,.13)",display:"flex",alignItems:"center",justifyContent:"center",fontWeight:900}}>{saleCartPackages}</span><strong style={{fontSize:16}}>{saleSaving?"Guardando…":"Confirmar"}</strong></span><span style={{display:"flex",alignItems:"center",gap:8,fontSize:18,fontWeight:900}}>{fmt(saleCartTotal)} <ChevronRight size={25}/></span></button>
        </div>
      </div>;
    }

    return <div style={shell}>
      <div style={headerStyle}>
        <button style={backButton} onClick={() => setSaleFlowDismissed(true)}><ArrowLeft size={24}/></button>
        <div style={{flex:1}}><div style={{fontWeight:900,fontSize:19}}>Seleccionar huevos</div><div style={{fontSize:12,opacity:.72}}>Paso 1 de 2 · Elige bandejas o cajas</div></div>
      </div>
      <div className="egg-sale-content egg-sale-select-content" style={{padding:"18px 16px 24px",maxWidth:680,margin:"0 auto"}}>
        <div className="egg-sale-info" style={{padding:"13px 15px",borderRadius:16,background:D?"rgba(255,196,0,.1)":"#fff6cd",border:`1.5px solid ${D?"rgba(255,196,0,.28)":"#f0d76c"}`,marginBottom:14,color:textSecondary,fontSize:13,lineHeight:1.45}}>Selecciona una o más categorías y vende únicamente por bandeja de 30 o caja de 180 huevos.</div>
        <div style={{display:"flex",flexDirection:"column",gap:12}}>
          {inventory.map(q=>{
            const formato=saleCart[q.id]?.formato === "caja" ? "caja" : "bandeja";
            const qty=Math.max(0,Number(saleCart[q.id]?.cantidadFormatos||0));
            const stock=Number(q.stockHuevos||0);
            const unitsPerFormat=formato === "caja" ? EGG_BOX_UNITS : EGG_TRAY_UNITS;
            const maxQty=Math.floor(stock/unitsPerFormat);
            const price=formato === "caja" ? Number(q.precioCaja||0) : Number(q.precioBandeja||0);
            const disabled=maxQty<=0;
            return <div key={q.id} className="egg-sale-card" style={{...card,padding:15,borderRadius:20,border:`2px solid ${qty>0?(D?"#4fae93":"#2f6f5e"):borderColor2}`,opacity:disabled ? .68 : 1}}>
              <div className="egg-sale-card-row" style={{display:"flex",alignItems:"center",gap:13}}>
                <div className="egg-sale-icon" style={{width:62,height:62,borderRadius:18,background:D?"rgba(255,196,0,.12)":"#fff1b3",display:"flex",alignItems:"center",justifyContent:"center",fontSize:30}}>🥚</div>
                <div className="egg-sale-card-info" style={{flex:1,minWidth:0}}><div style={{fontSize:18,fontWeight:900,color:textPrimary}}>H.{q.nombre}</div><span style={{display:"inline-block",marginTop:5,padding:"4px 9px",borderRadius:20,background:stock>0?(D?"rgba(79,174,147,.16)":"#dff4e9"):(D?"rgba(217,65,65,.16)":"#fde2e2"),color:stock>0?(D?"#63c2a6":"#16754a"):(D?"#ff9b9b":"#b82b2b"),fontWeight:800,fontSize:11}}>{stock.toLocaleString("es-CL")} huevos disponibles</span><div style={{display:"flex",gap:6,marginTop:9}}>{[{id:"bandeja",label:"Bandeja 30"},{id:"caja",label:"Caja 180"}].map(opt=><button key={opt.id} type="button" onClick={()=>updateSaleFormat(q,opt.id)} style={{padding:"6px 9px",borderRadius:10,border:`1.5px solid ${formato===opt.id?(D?"#63c2a6":"#245a4c"):borderColor2}`,background:formato===opt.id?(D?"rgba(99,194,166,.16)":"#e3f3ed"):bgCard2,color:formato===opt.id?(D?"#63c2a6":"#245a4c"):textSecondary,fontSize:10,fontWeight:800,cursor:"pointer"}}>{opt.label}</button>)}</div><div style={{marginTop:8,fontSize:17,fontWeight:900,color:textPrimary}}>{fmt(price)} <span style={{fontSize:11,color:textMuted,fontWeight:700}}>por {formato}</span></div></div>
                <div className="egg-sale-stepper" style={{height:52,minWidth:142,border:`2px solid ${borderColor2}`,borderRadius:16,display:"flex",alignItems:"center",justifyContent:"space-between",padding:"0 8px",background:bgCard2}}><button disabled={qty<=0} onClick={()=>changeSaleQuantity(q,-1)} style={{width:36,height:36,borderRadius:"50%",border:`2px solid ${textSecondary}`,background:"transparent",color:textPrimary,display:"flex",alignItems:"center",justifyContent:"center",cursor:qty>0?"pointer":"default",opacity:qty>0?1:.35}}><Minus size={18}/></button><div style={{textAlign:"center"}}><strong style={{fontSize:18,display:"block"}}>{qty}</strong><span style={{fontSize:9,color:textMuted}}>{formato}{qty===1?"":"s"}</span></div><button disabled={disabled||qty>=maxQty} onClick={()=>changeSaleQuantity(q,1)} style={{width:36,height:36,borderRadius:"50%",border:`2px solid ${textSecondary}`,background:"transparent",color:textPrimary,display:"flex",alignItems:"center",justifyContent:"center",cursor:!disabled&&qty<maxQty?"pointer":"default",opacity:!disabled&&qty<maxQty?1:.35}}><Plus size={18}/></button></div>
              </div>
            </div>;
          })}
        </div>
        {saleFlowError && <div style={{marginTop:13,padding:12,borderRadius:12,background:D?"rgba(217,65,65,.15)":"#fde7e7",color:D?"#ff9b9b":"#bd2525",fontWeight:800,fontSize:13}}>{saleFlowError}</div>}
      </div>
      <div className="egg-sale-bottom" style={bottomBar}>
        <button className="egg-sale-continue" disabled={!saleItems.length} onClick={()=>{setSaleFlowError("");setSaleStep("confirm");}} style={{width:"100%",maxWidth:680,margin:"0 auto",minHeight:62,border:"none",borderRadius:17,background:saleItems.length?"#172838":(D?"#303746":"#dce2ea"),color:saleItems.length?"#fff":textMuted,display:"flex",alignItems:"center",justifyContent:"space-between",padding:"0 20px",fontFamily:"inherit",cursor:saleItems.length?"pointer":"default"}}><span style={{display:"flex",alignItems:"center",gap:12}}><span style={{width:38,height:38,borderRadius:11,background:saleItems.length?"rgba(255,255,255,.13)":"rgba(100,110,120,.08)",display:"flex",alignItems:"center",justifyContent:"center",fontWeight:900}}>{saleCartPackages}</span><strong style={{fontSize:16}}>Continuar</strong></span><span style={{display:"flex",alignItems:"center",gap:8,fontSize:18,fontWeight:900}}>{fmt(saleCartTotal)} <ChevronRight size={25}/></span></button>
      </div>
    </div>;
  }

  return <div>
    <div className="page-header" style={{ display:"flex", alignItems:"center", justifyContent:"space-between", marginBottom:16 }}>
      <div>
        <div style={{ display:"flex", alignItems:"center", gap:10 }}><span style={{ fontSize:28 }}>🥚</span><h2 style={{ margin:0, fontSize:22, color:textPrimary }}>Control de Huevos</h2>{loadingEggs && <span style={{ fontSize:11, fontWeight:700, color:textMuted, padding:"3px 9px", borderRadius:20, background:bgCard2 }}>Cargando…</span>}</div>
        <p style={{ margin:"4px 0 0", fontSize:13, color:textMuted }}>Stock, ventas, ganancias y merma separados del resto de productos</p>
      </div>
      <button onClick={() => { setShowMovement(true); setError(""); }} className="btn-primary" style={{ padding:"11px 18px", borderRadius:12, display:"flex", alignItems:"center", gap:7 }}><Plus size={15}/> Registrar movimiento</button>
    </div>

    <div className="egg-tabs-mobile" style={{ ...card, padding:8, display:"flex", gap:6, marginBottom:18, overflowX:"auto", borderRadius:16 }}>
      {tabs.map(t => <button key={t.id} onClick={() => setTab(t.id)} className="egg-tab-mobile" style={{ padding:"10px 16px", borderRadius:11, border:"none", cursor:"pointer", whiteSpace:"nowrap", fontWeight:600, fontSize:13, fontFamily:"inherit", background:tab===t.id?(D?"#4fae93":"#2f6f5e"):"transparent", color:tab===t.id?"#fff":textSecondary, transition:"all .15s" }}>{t.label}</button>)}
    </div>

    {tab === "dashboard" && <>
      <div className="dashboard-grid" style={{ display:"grid", gridTemplateColumns:"repeat(4,1fr)", gap:14, marginBottom:16 }}>
        {[
          ["Cajas completas", totalBreakdown.cajas, "📦", D?"#4fae93":"#2f6f5e"],
          ["Bandejas sueltas", totalBreakdown.bandejas, "🥚", D?"#d9a857":"#b9852f"],
          ["Huevos totales", totalEggs.toLocaleString("es-CL"), "◯", D?"#63c2a6":"#245a4c"],
          ["Merma acumulada", `${wasteUnits.toLocaleString("es-CL")} huevos`, "⚠️", D?"#d97757":"#b3452f"],
        ].map(([label,value,icon,color]) => <div key={label} style={card} className="card-hover"><div style={{ fontSize:23, marginBottom:10 }}>{icon}</div><p style={{ margin:0, color:textMuted, fontSize:12 }}>{label}</p><p style={{ margin:"5px 0 0", color:textPrimary, fontSize:23, fontWeight:800 }}>{value}</p><div style={{ width:34, height:3, borderRadius:4, background:color, marginTop:12 }}/></div>)}
      </div>
      <div className="dashboard-grid" style={{ display:"grid", gridTemplateColumns:"repeat(4,1fr)", gap:14, marginBottom:18 }}>
        {[
          ["Ventas huevos", fmt(revenue), "Ingresos exclusivos de huevos", D?"#4fae93":"#2f6f5e"],
          ["Ganancia huevos", fmt(profit), "Sin mezclar otros productos", D?"#63c2a6":"#245a4c"],
          ["Costo de merma", fmt(wasteCost), "Pérdida al costo", D?"#d97757":"#b3452f"],
          ["Valor inventario", fmt(inventorySaleValue), `Costo: ${fmt(inventoryCost)}`, textPrimary],
        ].map(([label,value,sub,color]) => <div key={label} style={card}><p style={{ margin:0, color:textMuted, fontSize:12 }}>{label}</p><p style={{ margin:"6px 0 2px", color, fontSize:21, fontWeight:800 }}>{value}</p><p style={{ margin:0, color:textMuted, fontSize:11 }}>{sub}</p></div>)}
      </div>
      <div className="dashboard-charts" style={{ display:"grid", gridTemplateColumns:"1.5fr 1fr", gap:16 }}>
        <div style={card}><h3 style={{ margin:"0 0 16px", color:textPrimary, fontSize:14 }}>Stock por calidad (huevos)</h3><ResponsiveContainer width="100%" height={250}><BarChart data={chartData}><CartesianGrid strokeDasharray="3 3" stroke={borderColor}/><XAxis dataKey="calidad" tick={{ fill:textMuted, fontSize:11 }}/><YAxis tick={{ fill:textMuted, fontSize:11 }}/><Tooltip contentStyle={{ background:D?"#1d211d":"#fff", border:`1px solid ${borderColor}`, borderRadius:10 }}/><Bar dataKey="stock" fill={D?"#4fae93":"#2f6f5e"} radius={[6,6,0,0]}/></BarChart></ResponsiveContainer></div>
        <div style={card}><h3 style={{ margin:"0 0 14px", color:textPrimary, fontSize:14 }}>Estado por calidad</h3>{inventory.map(q => { const b=eggBreakdown(q.stockHuevos); const low=b.cajas<q.stockMinimoCajas; return <div key={q.id} style={{ display:"flex", alignItems:"center", justifyContent:"space-between", padding:"11px 0", borderBottom:`1px solid ${borderColor}` }}><div><p style={{ margin:0, color:textPrimary, fontWeight:700, fontSize:13 }}>{q.nombre}</p><p style={{ margin:"3px 0 0", color:textMuted, fontSize:11 }}>{b.cajas} cajas · {b.bandejas} bandejas · {b.unidades} huevos</p></div><span className="badge" style={{ background:low?(D?"rgba(217,119,87,.16)":"#fbeae4"):(D?"rgba(79,174,147,.16)":"#e4f0ec"), color:low?(D?"#d97757":"#b3452f"):(D?"#4fae93":"#2f6f5e") }}>{low?"Stock bajo":"Disponible"}</span></div>})}</div>
      </div>
    </>}

    {tab === "inventario" && <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fit,minmax(260px,1fr))", gap:14 }}>{inventory.map(q => { const b=eggBreakdown(q.stockHuevos); return <div key={q.id} style={{...card, borderRadius:20}} className="card-hover"><div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:14 }}><div><p style={{ margin:0, color:textPrimary, fontSize:17, fontWeight:800 }}>{q.nombre}</p><p style={{ margin:"3px 0 0", color:textMuted, fontSize:11 }}>Stock mínimo: {q.stockMinimoCajas} cajas</p></div><button onClick={() => openEditQuality(q)} style={{ width:34,height:34,borderRadius:10,border:`1px solid ${borderColor2}`,background:bgCard2,cursor:"pointer",color:textSecondary }}><Pencil size={14}/></button></div><div style={{ display:"grid", gridTemplateColumns:"repeat(3,1fr)", gap:8, marginBottom:14 }}>{[["Cajas",b.cajas],["Bandejas",b.bandejas],["Sueltos",b.unidades]].map(([l,v])=><div key={l} style={{ background:bgCard2,borderRadius:12,padding:"10px 8px",textAlign:"center" }}><p style={{ margin:0,color:textMuted,fontSize:10 }}>{l}</p><p style={{ margin:"4px 0 0",color:textPrimary,fontWeight:800,fontSize:18 }}>{v}</p></div>)}</div><div style={{ borderTop:`1px solid ${borderColor}`, paddingTop:12, marginBottom:12 }}><p style={{ margin:"0 0 5px", color:textSecondary,fontSize:12 }}>Costo caja: <strong style={{color:textPrimary}}>{fmt(q.costoCaja)}</strong></p><p style={{ margin:"0 0 5px", color:textSecondary,fontSize:12 }}>Venta caja: <strong style={{color:D?"#4fae93":"#2f6f5e"}}>{fmt(q.precioCaja)}</strong></p><p style={{ margin:0, color:textSecondary,fontSize:12 }}>Venta bandeja: <strong style={{color:D?"#4fae93":"#2f6f5e"}}>{fmt(q.precioBandeja)}</strong></p></div><div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:8,marginBottom:8}}><button onClick={()=>openQuickAction("venta",q)} className="btn-primary" style={{padding:"10px",borderRadius:11,fontSize:12,display:"flex",alignItems:"center",justifyContent:"center",gap:6}}><ShoppingCart size={14}/> Vender</button><button onClick={()=>openQuickAction("entrada",q)} style={{padding:"10px",borderRadius:11,border:`1.5px solid ${borderColor2}`,background:bgCard2,color:textSecondary,cursor:"pointer",fontSize:12,fontWeight:700,display:"flex",alignItems:"center",justifyContent:"center",gap:6}}><Plus size={14}/> Entrada</button></div><button onClick={() => { setTab("lotes"); setLoteFiltro(q.id); }} style={{ width:"100%", padding:"9px", borderRadius:10, border:`1px solid ${borderColor2}`, background:"transparent", color:textMuted, cursor:"pointer", fontSize:12, fontWeight:700, display:"flex", alignItems:"center", justifyContent:"center", gap:6 }}>Ver detalle <ChevronRight size={13}/></button></div>})}</div>}

    {tab === "lotes" && <div style={{display:"grid",gap:14}}>
      {loteFiltro && <div style={{display:"flex",alignItems:"center",gap:8}}><span className="badge" style={{background:D?"rgba(79,174,147,.16)":"#e4f0ec",color:D?"#4fae93":"#2f6f5e"}}>Filtrando por: {inventory.find(q=>q.id===loteFiltro)?.nombre || loteFiltro}</span><button onClick={()=>setLoteFiltro(null)} style={{background:"none",border:"none",color:textMuted,cursor:"pointer",fontSize:12,fontWeight:700}}>Quitar filtro</button></div>}
      {eggLots.filter(lot=>!loteFiltro || lot.calidadId===loteFiltro).length===0 ? <div style={card}><div style={{textAlign:"center",padding:36,color:textMuted}}>Todavía no hay lotes registrados. Las nuevas entradas aparecerán separadas por fecha.</div></div> : eggLots.filter(lot=>!loteFiltro || lot.calidadId===loteFiltro).map(lot=>{
        const initial=eggBreakdown(lot.huevosIniciales);
        const remaining=eggBreakdown(lot.stockRestante);
        return <div key={lot.id} style={{...card, borderRadius:20}} className="card-hover">
          <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",gap:12,marginBottom:14}}>
            <div><p style={{margin:0,color:textPrimary,fontSize:17,fontWeight:800}}>{lot.calidad}</p><p style={{margin:"4px 0 0",color:textMuted,fontSize:12}}>Ingreso: {lot.fechaIngreso ? new Date(`${lot.fechaIngreso}T12:00:00`).toLocaleDateString("es-CL") : "Sin fecha"}</p></div>
            <span className="badge" style={{background:lot.estado==="cerrado"?(D?"rgba(147,153,143,.18)":"#f2f1ec"):lot.stockRestante>0?(D?"rgba(79,174,147,.16)":"#e4f0ec"):(D?"rgba(107,113,106,.16)":"#f2f1ec"),color:lot.estado==="cerrado"?textMuted:lot.stockRestante>0?(D?"#4fae93":"#2f6f5e"):textMuted}}>{lot.estado==="cerrado"?"Lote cerrado (transferido)":lot.stockRestante>0?"Lote activo":"Lote agotado"}</span>
          </div>
          <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(125px,1fr))",gap:9}}>
            {[
              ["Entrada anotada",`${initial.cajas}c · ${initial.bandejas}b · ${initial.unidades}u`],
              ...(Number(lot.transferidoDesde || 0) > 0 ? [["Traspaso anterior",`${eggBreakdown(lot.transferidoDesde).cajas}c · ${eggBreakdown(lot.transferidoDesde).bandejas}b · ${eggBreakdown(lot.transferidoDesde).unidades}u`]] : []),
              ["Huevos disponibles",`${remaining.cajas}c · ${remaining.bandejas}b · ${remaining.unidades}u`],
              ["Huevos vendidos",Number(lot.vendidos).toLocaleString("es-CL")],
              ["Merma",Number(lot.merma).toLocaleString("es-CL")],
              ["Rotos",Number(lot.rotos).toLocaleString("es-CL")],
              ["Trizados",Number(lot.trizados).toLocaleString("es-CL")],
              ["Costo del lote",fmt(lot.costoTotal)],
              ["Ingresos",fmt(lot.ingreso)],
              ["Ganancia",fmt(lot.ganancia)],
            ].map(([label,value])=><div key={label} style={{background:bgCard2,borderRadius:12,padding:"11px 10px"}}><p style={{margin:0,color:textMuted,fontSize:10}}>{label}</p><p style={{margin:"5px 0 0",color:label==="Ganancia"?(lot.ganancia>=0?(D?"#4fae93":"#2f6f5e"):(D?"#d97757":"#b3452f")):(label==="Rotos"||label==="Trizados"||label==="Merma")?(D?"#d97757":"#b3452f"):textPrimary,fontWeight:800,fontSize:14}}>{value}</p></div>)}
          </div>
        </div>;
      })}
    </div>}

    {tab === "movimientos" && (() => {
      const now = new Date();
      const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      const startOfWeek = new Date(startOfDay); startOfWeek.setDate(startOfDay.getDate() - startOfDay.getDay());
      const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
      const filtered = movements.filter(m => {
        // BUG 4 FIX: m.fecha puede ser null/undefined en movimientos antiguos.
        // Usamos fechaIngreso como fallback para que nunca sea Invalid Date.
        const fechaStr = m.fecha || (m.fechaIngreso ? `${m.fechaIngreso}T12:00:00` : null);
        const f = fechaStr ? new Date(fechaStr) : null;
        if (movFiltroPeriodo === "hoy"    && (!f || f < startOfDay))   return false;
        if (movFiltroPeriodo === "semana" && (!f || f < startOfWeek))  return false;
        if (movFiltroPeriodo === "mes"    && (!f || f < startOfMonth)) return false;
        if (movFiltroTipo !== "todos" && m.tipo !== movFiltroTipo) return false;
        return true;
      });
      return <div style={{display:"flex",flexDirection:"column",gap:14}}>
        <div style={{display:"flex",gap:8,flexWrap:"wrap",alignItems:"center"}}>
          <Filter size={14} color={textMuted}/>
          {[["todos","Todos"],["hoy","Hoy"],["semana","Semana"],["mes","Mes"]].map(([id,label])=>
            <button key={id} onClick={()=>setMovFiltroPeriodo(id)} style={{padding:"7px 13px",borderRadius:20,border:`1.5px solid ${movFiltroPeriodo===id?(D?"#4fae93":"#2f6f5e"):borderColor2}`,background:movFiltroPeriodo===id?(D?"rgba(79,174,147,.16)":"#e4f0ec"):bgCard2,color:movFiltroPeriodo===id?(D?"#4fae93":"#2f6f5e"):textSecondary,fontSize:12,fontWeight:700,cursor:"pointer"}}>{label}</button>)}
          <select value={movFiltroTipo} onChange={e=>setMovFiltroTipo(e.target.value)} style={{...inp,width:"auto",padding:"7px 12px",fontSize:12,borderRadius:20}}>
            <option value="todos">Todos los tipos</option>
            {Object.entries(typeLabels).map(([id,label])=><option key={id} value={id}>{label}</option>)}
          </select>
        </div>
        {filtered.length===0 ? <div style={card}><div style={{textAlign:"center",padding:36,color:textMuted}}>No hay movimientos para este filtro.</div></div> :
        <div style={{...card, padding:"20px 22px"}}>
          {filtered.map((m,i)=>{ const b=eggBreakdown(m.huevos); return (
            <div key={m.id} style={{display:"flex",gap:14}}>
              <div style={{display:"flex",flexDirection:"column",alignItems:"center",flexShrink:0}}>
                <div style={{width:11,height:11,borderRadius:"50%",background:typeColors[m.tipo],flexShrink:0,marginTop:4}}/>
                {i<filtered.length-1 && <div style={{width:2,flex:1,background:borderColor,marginTop:2}}/>}
              </div>
              <div style={{paddingBottom:i<filtered.length-1?18:0,flex:1,minWidth:0}}>
                <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",gap:8,flexWrap:"wrap"}}>
                  <div style={{display:"flex",alignItems:"center",gap:8,flexWrap:"wrap"}}>
                    <span className="badge" style={{background:`${typeColors[m.tipo]}22`,color:typeColors[m.tipo]}}>{typeLabels[m.tipo]}</span>
                    <strong style={{color:textPrimary,fontSize:13}}>{m.calidad}</strong>
                    <span style={{color:textMuted,fontSize:12}}>{b.cajas}c · {b.bandejas}b · {b.unidades}u</span>
                  </div>
                  <button onClick={()=>deleteMovement(m)} style={{background:"none",border:"none",cursor:"pointer",padding:4,color:D?"#d97757":"#b3452f",display:"flex",flexShrink:0}} title="Eliminar movimiento"><Trash2 size={14}/></button>
                </div>
                <p style={{margin:"4px 0 0",color:textMuted,fontSize:11}}>{new Date(m.fecha).toLocaleString("es-CL",{weekday:"short",day:"numeric",month:"short",hour:"2-digit",minute:"2-digit"})} · {m.motivo} · {m.usuario}{m.tipo==="venta"&&m.metodoPago?` · Pago: ${m.metodoPago==="tarjeta"?"Tarjeta":m.metodoPago==="transferencia"?"Transferencia":"Efectivo"}`:""}</p>
                {(m.ingreso>0 || m.tipo==="venta") && <p style={{margin:"4px 0 0",fontSize:12}}><span style={{color:D?"#4fae93":"#2f6f5e",fontWeight:700}}>{m.ingreso?fmt(m.ingreso):"—"}</span>{m.tipo==="venta" && <span style={{color:m.ganancia>=0?(D?"#63c2a6":"#245a4c"):(D?"#d97757":"#b3452f"),fontWeight:700,marginLeft:10}}>Ganancia: {fmt(m.ganancia)}</span>}</p>}
              </div>
            </div>
          );})}
        </div>}
      </div>;
    })()}

    {tab === "merma" && <><div className="dashboard-grid" style={{ display:"grid",gridTemplateColumns:"repeat(3,1fr)",gap:14,marginBottom:16 }}>{[["Huevos perdidos",wasteUnits.toLocaleString("es-CL")],["Costo perdido",fmt(wasteCost)],["% sobre salidas",`${((wasteUnits/(wasteUnits+sales.reduce((s,m)=>s+m.huevos,0)||1))*100).toFixed(1)}%`]].map(([l,v])=><div key={l} style={card}><p style={{margin:0,color:textMuted,fontSize:12}}>{l}</p><p style={{margin:"6px 0 0",color:D?"#d97757":"#b3452f",fontWeight:800,fontSize:22}}>{v}</p></div>)}</div><div style={card}>{wastes.length===0?<p style={{margin:0,textAlign:"center",padding:28,color:textMuted}}>No hay merma registrada.</p>:wastes.map((m,i)=><div key={m.id} style={{display:"flex",alignItems:"center",gap:12,padding:"12px 0",borderBottom:i<wastes.length-1?`1px solid ${borderColor}`:"none"}}><div style={{width:38,height:38,borderRadius:12,background:D?"rgba(217,119,87,.16)":"#fbeae4",display:"flex",alignItems:"center",justifyContent:"center"}}><TrendingDown size={17} color={D?"#d97757":"#b3452f"}/></div><div style={{flex:1}}><p style={{margin:0,color:textPrimary,fontWeight:700,fontSize:13}}>{m.calidad} · {m.huevos} huevos</p><p style={{margin:"3px 0 0",color:textMuted,fontSize:11}}>{m.motivo} · {new Date(m.fecha).toLocaleString("es-CL")}</p></div><strong style={{color:D?"#d97757":"#b3452f",fontSize:13}}>{fmt(m.costo)}</strong></div>)}</div></>}

    {tab === "reportes" && <div className="egg-report-page" style={{display:"grid",gap:16}}>
      <div style={{...card,borderRadius:18,padding:16}}>
        <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",gap:12,flexWrap:"wrap"}}>
          <div><h2 style={{margin:0,color:textPrimary,fontSize:22}}>Reportes de huevos</h2><p style={{margin:"5px 0 0",color:textMuted,fontSize:12}}>Ventas, ganancia y pérdidas separadas del inventario general.</p></div>
          <button onClick={exportEggReport} className="btn-primary" style={{padding:"10px 14px",borderRadius:12,fontSize:12}}>Exportar Excel</button>
        </div>
        <div className="egg-report-filters" style={{display:"grid",gridTemplateColumns:"minmax(170px,1fr) minmax(120px,180px)",gap:10,marginTop:15}}>
          <input type="date" value={reportDate} onChange={e=>setReportDate(e.target.value)} style={inp}/>
          <select value={reportPeriod} onChange={e=>setReportPeriod(e.target.value)} style={inp}><option value="dia">Día</option><option value="semana">Semana</option><option value="mes">Mes</option></select>
        </div>
      </div>
      <div className="egg-report-kpis" style={{display:"grid",gridTemplateColumns:"repeat(4,minmax(0,1fr))",gap:12}}>
        {[
          ["Ventas de huevos",fmt(eggReport.totals.ingreso),`${eggReport.totals.vendidos.toLocaleString("es-CL")} huevos`,"💵"],
          ["Costo de lo vendido",fmt(eggReport.totals.costo),"Costo real de los lotes","🧾"],
          ["Ganancia estimada",fmt(eggReport.totals.ganancia),eggReport.totals.ingreso>0?`${((eggReport.totals.ganancia/eggReport.totals.ingreso)*100).toFixed(1)}% margen`:"Sin ventas","📈"],
          ["Total perdido",`${eggReport.totals.totalPerdido.toLocaleString("es-CL")} huevos`,fmt(eggReport.totals.valorPerdido),"⚠️"]
        ].map(([label,value,sub,icon])=><div key={label} style={{...card,borderRadius:17,padding:15}}><div style={{fontSize:22}}>{icon}</div><p style={{margin:"8px 0 4px",fontSize:12,color:textMuted}}>{label}</p><strong style={{display:"block",fontSize:20,color:label==="Total perdido"?(D?"#d97757":"#c7362f"):textPrimary}}>{value}</strong><span style={{fontSize:11,color:textSecondary}}>{sub}</span></div>)}
      </div>
      <div className="egg-report-payment-methods" style={{...card,borderRadius:18,padding:16}}>
        <h3 style={{margin:"0 0 14px",fontSize:16,color:textPrimary}}>Ventas de huevos por método de pago</h3>
        <div style={{display:"grid",gridTemplateColumns:"repeat(4,minmax(0,1fr))",gap:12}}>
          {[
            ["Efectivo",eggReport.paymentBreakdown.efectivo,"💵"],
            ["Débito",eggReport.paymentBreakdown.debito,"💳"],
            ["Transferencia",eggReport.paymentBreakdown.transferencia,"🏦"],
            ["Total",eggReport.paymentBreakdown.total,"Σ"]
          ].map(([label,value,icon])=><div key={label} style={{padding:14,borderRadius:14,background:bgCard2,textAlign:"center"}}><div style={{fontSize:18}}>{icon}</div><strong style={{display:"block",fontSize:18,marginTop:6,color:label==="Total"?(D?"#4fae93":"#2f6f5e"):textPrimary}}>{fmt(value)}</strong><span style={{fontSize:11,color:textMuted}}>{label}</span></div>)}
        </div>
      </div>
      <div className="egg-report-kpis egg-report-inventory-kpis" style={{display:"grid",gridTemplateColumns:"repeat(4,minmax(0,1fr))",gap:12}}>
        {[
          ["Stock inicial",`${eggReport.totals.stockInicial.toLocaleString("es-CL")} huevos`,"Antes del período","📦"],
          ["Entradas reales",`${eggReport.totals.entradas.toLocaleString("es-CL")} huevos`,fmt(eggReport.totals.valorEntradas),"➕"],
          ["Traspasos de lotes",`${eggReport.totals.traspasos.toLocaleString("es-CL")} huevos`,"No cuentan como compra nueva","🔄"],
          ["Stock final",`${eggReport.totals.stockFinal.toLocaleString("es-CL")} huevos`,"Después de ventas y pérdidas","✅"]
        ].map(([label,value,sub,icon])=><div key={label} style={{...card,borderRadius:17,padding:15}}><div style={{fontSize:22}}>{icon}</div><p style={{margin:"8px 0 4px",fontSize:12,color:textMuted}}>{label}</p><strong style={{display:"block",fontSize:20,color:textPrimary}}>{value}</strong><span style={{fontSize:11,color:textSecondary}}>{sub}</span></div>)}
      </div>
      <div style={{...card,borderRadius:18,padding:16}}>
        <h3 style={{margin:"0 0 14px",fontSize:16,color:textPrimary}}>Pérdidas del período</h3>
        <div className="egg-report-losses" style={{display:"grid",gridTemplateColumns:"repeat(4,minmax(0,1fr))",gap:10}}>
          {[
            ["Merma",eggReport.totals.merma,"#e5a22b"], ["Rotos",eggReport.totals.rotos,"#d9483f"], ["Trizados",eggReport.totals.trizados,"#f3c122"], ["Total",eggReport.totals.totalPerdido,"#c7362f"]
          ].map(([label,value,color])=><div key={label} style={{padding:14,borderRadius:14,background:bgCard2,textAlign:"center"}}><div style={{width:38,height:38,borderRadius:"50%",background:`${color}22`,color,display:"flex",alignItems:"center",justifyContent:"center",margin:"0 auto 8px",fontWeight:900}}>🥚</div><strong style={{display:"block",fontSize:21,color:textPrimary}}>{Number(value).toLocaleString("es-CL")}</strong><span style={{fontSize:11,color:textMuted}}>{label}</span></div>)}
        </div>
        <p style={{margin:"13px 0 0",fontSize:11,color:textMuted}}>Valor perdido al costo real del lote: <strong style={{color:D?"#d97757":"#c7362f"}}>{fmt(eggReport.totals.valorPerdido)}</strong></p>
      </div>
      <div style={{...card,borderRadius:18,padding:0,overflow:"hidden"}}>
        <div style={{padding:"15px 16px",borderBottom:`1px solid ${borderColor}`}}><h3 style={{margin:0,fontSize:16,color:textPrimary}}>Detalle por categoría</h3></div>
        <div style={{overflowX:"auto"}}><table style={{width:"100%",borderCollapse:"collapse",minWidth:1350,fontSize:12}}>
          <thead><tr>{["Categoría","Stock inicial","Entradas","Valor entradas","Traspasos","Vendidos","Ingreso","Costo","Ganancia","Merma","Rotos","Trizados","Total perdido","Valor perdido","Stock final"].map(h=><th key={h} style={{padding:"11px 10px",textAlign:"left",color:textMuted,background:bgCard2,borderBottom:`1px solid ${borderColor}`}}>{h}</th>)}</tr></thead>
          <tbody>{eggReport.categories.map(c=><tr key={c.id}><td style={{padding:11,borderBottom:`1px solid ${borderColor}`,fontWeight:800,color:textPrimary}}>{c.nombre}</td>{[c.stockInicial,c.entradas,fmt(c.valorEntradas),c.traspasos,c.vendidos,fmt(c.ingreso),fmt(c.costo),fmt(c.ganancia),c.merma,c.rotos,c.trizados,c.totalPerdido,fmt(c.valorPerdido),c.stockFinal].map((v,j)=><td key={j} style={{padding:11,borderBottom:`1px solid ${borderColor}`,color:j===7?(D?"#4fae93":"#18824b"):j===12?(D?"#d97757":"#c7362f"):textSecondary}}>{typeof v==="number"?v.toLocaleString("es-CL"):v}</td>)}</tr>)}
          <tr style={{background:bgCard2,fontWeight:900}}><td style={{padding:11,color:textPrimary}}>TOTAL</td>{[eggReport.totals.stockInicial,eggReport.totals.entradas,fmt(eggReport.totals.valorEntradas),eggReport.totals.traspasos,eggReport.totals.vendidos,fmt(eggReport.totals.ingreso),fmt(eggReport.totals.costo),fmt(eggReport.totals.ganancia),eggReport.totals.merma,eggReport.totals.rotos,eggReport.totals.trizados,eggReport.totals.totalPerdido,fmt(eggReport.totals.valorPerdido),eggReport.totals.stockFinal].map((v,j)=><td key={j} style={{padding:11,color:textPrimary}}>{typeof v==="number"?v.toLocaleString("es-CL"):v}</td>)}</tr>
          </tbody></table></div>
      </div>
    </div>}

    {tab === "estadisticas" && <><div className="dashboard-charts" style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:16}}><div style={card}><h3 style={{margin:"0 0 16px",color:textPrimary,fontSize:14}}>Ventas y merma por calidad</h3><ResponsiveContainer width="100%" height={280}><BarChart data={chartData}><CartesianGrid strokeDasharray="3 3" stroke={borderColor}/><XAxis dataKey="calidad" tick={{fill:textMuted,fontSize:11}}/><YAxis tick={{fill:textMuted,fontSize:11}}/><Tooltip contentStyle={{background:D?"#1d211d":"#fff",border:`1px solid ${borderColor}`,borderRadius:10}}/><Bar dataKey="ventas" fill={D?"#4fae93":"#2f6f5e"} radius={[5,5,0,0]}/><Bar dataKey="merma" fill={D?"#d97757":"#b3452f"} radius={[5,5,0,0]}/></BarChart></ResponsiveContainer></div><div style={card}><h3 style={{margin:"0 0 16px",color:textPrimary,fontSize:14}}>Rentabilidad por calidad</h3>{inventory.map(q=>{const qSales=sales.filter(m=>m.calidadId===q.id);const qRev=qSales.reduce((s,m)=>s+m.ingreso,0);const qProfit=qSales.reduce((s,m)=>s+m.ganancia,0);return <div key={q.id} style={{padding:"12px 0",borderBottom:`1px solid ${borderColor}`}}><div style={{display:"flex",justifyContent:"space-between"}}><strong style={{color:textPrimary,fontSize:13}}>{q.nombre}</strong><strong style={{color:D?"#4fae93":"#2f6f5e",fontSize:13}}>{fmt(qProfit)}</strong></div><div style={{display:"flex",justifyContent:"space-between",marginTop:4}}><span style={{color:textMuted,fontSize:11}}>Ventas {fmt(qRev)}</span><span style={{color:textMuted,fontSize:11}}>{qRev>0?`${((qProfit/qRev)*100).toFixed(1)}% margen`:"Sin ventas"}</span></div></div>})}</div></div>
      <div style={{...card,marginTop:16,border:`1.5px solid ${D?"#4fae9355":"#bcdccf"}`}}>
        <h3 style={{margin:"0 0 4px",color:textPrimary,fontSize:14}}>Datos crudos (debug)</h3>
        <p style={{margin:"0 0 14px",color:textMuted,fontSize:12}}>Solo para diagnóstico: muestra tal cual quedaron guardados los movimientos de tipo "entrada". Cópialo y pégalo si algo no calza.</p>
        <pre style={{margin:0,padding:12,borderRadius:10,background:bgCard2,color:textSecondary,fontSize:10.5,overflowX:"auto",maxHeight:280,overflowY:"auto",whiteSpace:"pre-wrap",wordBreak:"break-word"}}>{JSON.stringify(movements.filter(m=>m.tipo==="entrada"||m.tipo==="transferencia").map(m=>({id:m.id,tipo:m.tipo,calidad:m.calidad,calidadId:m.calidadId,fechaIngreso:m.fechaIngreso,fecha:m.fecha,huevos:m.huevos})),null,2)}</pre>
      </div>

      <div style={{...card,marginTop:16,border:`1.5px solid ${D?"#d9775755":"#f0d3c7"}`}}>
        <h3 style={{margin:"0 0 4px",color:D?"#d97757":"#b3452f",fontSize:14}}>Zona de riesgo</h3>
        <p style={{margin:"0 0 14px",color:textMuted,fontSize:12}}>Solo afecta al módulo de Huevos: lotes, stock, ventas, mermas, rotos, trizados, costos y ganancias. El inventario general, productos, categorías, usuarios y configuración no se ven afectados.</p>
        <button onClick={()=>{setResetText("");setResetOk(false);setShowReset(true);}} style={{padding:"10px 16px",borderRadius:11,border:`1.5px solid ${D?"#d97757":"#b3452f"}`,background:"transparent",color:D?"#d97757":"#b3452f",cursor:"pointer",fontSize:13,fontWeight:700}}>Restablecer inventario de huevos</button>
      </div>
    </>}

    {showMovement && <div style={{position:"fixed",inset:0,background:"rgba(0,0,0,.65)",display:"flex",alignItems:"center",justifyContent:"center",zIndex:250,backdropFilter:"blur(5px)"}}><div className="mobile-modal" style={{...card,width:520,maxHeight:"90vh",overflowY:"auto"}}><div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:18}}><div><h3 style={{margin:0,color:textPrimary,fontSize:18}}>Registrar movimiento de huevos</h3><p style={{margin:"4px 0 0",color:textMuted,fontSize:12}}>Las cantidades se convierten automáticamente</p></div><button onClick={()=>setShowMovement(false)} style={{border:"none",background:bgCard2,color:textMuted,width:32,height:32,borderRadius:8,cursor:"pointer"}}><X size={15}/></button></div><div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:12}}><label style={{fontSize:12,color:textSecondary,fontWeight:700}}>Tipo<select value={form.tipo} onChange={e=>{
  const tipo=e.target.value;
  setForm(f=>({
    ...f,
    tipo,
    motivo:tipo==="merma"?"Merma":tipo==="rotos"?"Huevos rotos":tipo==="trizados"?"Huevos trizados":tipo==="venta"?"Venta":"Compra de mercadería",
    precioUnitarioVenta:tipo==="venta"?String(selectedQuality?.precioVentaUnitario||""):f.precioUnitarioVenta,
    descuento:"",
    fechaIngreso:f.fechaIngreso||todayLocalISO(),
  }));
}} style={{...inp,marginTop:6}}><option value="entrada">Entrada</option><option value="venta">Venta</option><option value="merma">Merma</option><option value="rotos">Rotos</option><option value="trizados">Trizados</option><option value="ajuste_entrada">Ajuste de entrada</option><option value="ajuste_salida">Ajuste de salida</option></select></label><label style={{fontSize:12,color:textSecondary,fontWeight:700}}>Calidad<select value={form.calidadId} onChange={e=>{
  const calidadId=e.target.value;
  const calidad=inventory.find(q=>q.id===calidadId);
  setForm(f=>({ ...f, calidadId, precioUnitarioVenta:f.tipo==="venta"?String(calidad?.precioVentaUnitario||""):f.precioUnitarioVenta }));
}} style={{...inp,marginTop:6}}>{inventory.map(q=><option key={q.id} value={q.id}>{q.nombre}</option>)}</select></label></div>{form.tipo!=="venta"&&<><div style={{marginTop:12}}><label style={{fontSize:12,color:textSecondary,fontWeight:700}}>{isUnitLoss?"Cantidad de huevos unitarios":"Cantidad de huevos"}</label><div style={{display:"flex",alignItems:"center",gap:8,marginTop:6}}><button type="button" onClick={()=>updateEggQuantity(Number(form.cantidad||0)-quantityStep)} style={{width:40,height:40,borderRadius:10,border:`1px solid ${borderColor2}`,background:bgCard2,color:textPrimary,fontSize:20,fontWeight:700,cursor:"pointer",flexShrink:0}}>−</button><input type="number" min="0" step={quantityStep} value={form.cantidad} onChange={e=>updateEggQuantity(e.target.value)} style={{...inp,textAlign:"center",padding:"10px 4px",flex:1,minWidth:0,fontSize:18,fontWeight:800}}/><button type="button" onClick={()=>updateEggQuantity(Number(form.cantidad||0)+quantityStep)} style={{width:40,height:40,borderRadius:10,border:"none",background:D?"#4fae93":"#2f6f5e",color:"#fff",fontSize:20,fontWeight:700,cursor:"pointer",flexShrink:0}}>+</button></div><div style={{display:"flex",gap:8,marginTop:8,flexWrap:"wrap"}}>{[...(isUnitLoss?[["+1 huevo",1]]:[]),["+1 bandeja",30],["+1 caja",180]].map(([l,q])=><button key={l} type="button" onClick={()=>updateEggQuantity(Number(form.cantidad||0)+q)} style={{padding:"6px 12px",borderRadius:20,border:`1.5px solid ${borderColor2}`,background:bgCard2,color:textSecondary,fontSize:12,fontWeight:700,cursor:"pointer"}}>{l}</button>)}</div></div><div style={{marginTop:12,padding:12,borderRadius:10,background:bgCard2,color:textSecondary,fontSize:12}}>Total del movimiento: <strong style={{color:textPrimary}}>{formUnits.toLocaleString("es-CL")} huevos</strong> · Stock actual: {selectedQuality?.stockHuevos.toLocaleString("es-CL")}</div></>}{form.tipo==="entrada"&&<div style={{marginTop:12,padding:14,borderRadius:12,background:D?"rgba(79,174,147,.12)":"#e4f0ec",border:`1.5px solid ${D?"#4fae9355":"#bcdccf"}`}}><div style={{display:"flex",alignItems:"center",gap:8,marginBottom:4}}><DollarSign size={16} color={D?"#4fae93":"#2f6f5e"}/><strong style={{color:textPrimary,fontSize:13}}>Costo y venta (según configuración)</strong></div><p style={{margin:"0 0 12px",color:textMuted,fontSize:11}}>El costo y el precio de venta se toman de la configuración de "{selectedQuality?.nombre}" (botón ✎ en Inventario). Si ya hay un lote activo con la misma fecha, se suma a él; si es de otra fecha, ese lote se cierra y su stock pasa al nuevo.</p><label style={{display:"block",marginBottom:12,fontSize:11,color:textSecondary,fontWeight:700}}>Fecha de ingreso del lote<input type="date" value={form.fechaIngreso} onChange={e=>setForm({...form,fechaIngreso:e.target.value})} style={{...inp,marginTop:6}}/></label>{purchaseUnitValue<=0||saleUnitValue<=0?<p style={{margin:0,color:D?"#d97757":"#b3452f",fontSize:12,fontWeight:700}}>Falta configurar el costo por caja y/o el precio de venta de esta categoría (botón ✎ en Inventario).</p>:formUnits>0&&<div style={{padding:"10px 12px",borderRadius:10,background:D?"#242923":"#fff",display:"grid",gridTemplateColumns:"repeat(3,minmax(0,1fr))",gap:12,color:textSecondary,fontSize:11}}><div><span>{formUnits.toLocaleString("es-CL")} huevos × {fmt(purchaseUnitValue)}</span><strong style={{display:"block",marginTop:4,color:textPrimary}}>{fmt(purchaseTotal)} (Costo)</strong></div><div><span>{formUnits.toLocaleString("es-CL")} huevos × {fmt(saleUnitValue)}</span><strong style={{display:"block",marginTop:4,color:textPrimary}}>{fmt(expectedSaleTotal)} (Venta esperada)</strong></div><div><span>Ganancia por huevo: <strong>{fmt(saleUnitValue-purchaseUnitValue)}</strong></span><strong style={{display:"block",marginTop:4,color:expectedProfit>=0?(D?"#4fae93":"#2f6f5e"):(D?"#d97757":"#b3452f")}}>Ganancia estimada: {fmt(expectedProfit)}</strong><span style={{display:"block",marginTop:4,color:D?"#63c2a6":"#245a4c"}}>Incremento: {expectedMargin.toFixed(2)}%</span></div></div>}</div>}{form.tipo==="venta"&&<div style={{marginTop:12}}><div style={{padding:14,borderRadius:12,background:D?"rgba(87,150,217,.12)":"#e4eefb",border:`1.5px solid ${D?"#5796d955":"#c7dcf5"}`,display:"flex",gap:10,alignItems:"flex-start",marginBottom:14}}><DollarSign size={16} color={D?"#5796d9":"#2f5f8f"} style={{marginTop:1,flexShrink:0}}/><p style={{margin:0,color:textPrimary,fontSize:12.5,lineHeight:1.5}}>Al crear la venta se descontarán las unidades seleccionadas de tu inventario.</p></div><label style={{display:"block",marginBottom:12,fontSize:11,color:textSecondary,fontWeight:700}}>Fecha del movimiento<input type="date" value={form.fechaIngreso} onChange={e=>setForm({...form,fechaIngreso:e.target.value})} style={{...inp,marginTop:6}}/></label><div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10}}><div><label style={{fontSize:12,color:textSecondary,fontWeight:700}}>Cantidad de huevos (30 o 180) *</label><div style={{display:"flex",alignItems:"center",gap:8,marginTop:6}}><button type="button" onClick={()=>updateEggQuantity(Number(form.cantidad||0)-30)} style={{width:40,height:40,borderRadius:10,border:`1px solid ${borderColor2}`,background:bgCard2,color:textPrimary,fontSize:20,fontWeight:700,cursor:"pointer",flexShrink:0}}>−</button><input type="number" min="0" step="30" value={form.cantidad} readOnly style={{...inp,textAlign:"center",padding:"10px 4px",flex:1,minWidth:0,fontSize:18,fontWeight:800,cursor:"default"}}/><button type="button" onClick={()=>updateEggQuantity(Number(form.cantidad||0)+30)} style={{width:40,height:40,borderRadius:10,border:"none",background:D?"#4fae93":"#2f6f5e",color:"#fff",fontSize:20,fontWeight:700,cursor:"pointer",flexShrink:0}}>+</button></div></div><div><label style={{fontSize:12,color:textSecondary,fontWeight:700}}>Precio unitario *</label><div style={{marginTop:6,display:"flex",alignItems:"center",gap:4,...inp,padding:"4px 10px"}}><span style={{color:textMuted,fontSize:14}}>$</span><input type="number" min="0" value={form.precioUnitarioVenta} onChange={e=>setForm({...form,precioUnitarioVenta:e.target.value})} style={{border:"none",outline:"none",background:"transparent",color:textPrimary,fontSize:16,fontWeight:700,width:"100%",padding:"8px 0",fontFamily:"inherit"}}/></div></div></div><div style={{display:"flex",gap:8,marginTop:8,flexWrap:"wrap"}}>{[["+1 bandeja",30],["+1 caja",180]].map(([l,q])=><button key={q} type="button" onClick={()=>updateEggQuantity(Number(form.cantidad||0)+q)} style={{padding:"6px 12px",borderRadius:20,border:`1.5px solid ${borderColor2}`,background:bgCard2,color:textSecondary,fontSize:12,fontWeight:700,cursor:"pointer"}}>{l}</button>)}</div>{formUnits>0&&<p style={{margin:"14px 0 0",color:textSecondary,fontSize:13}}>Precio por {formUnits.toLocaleString("es-CL")} unidades: <strong style={{color:textPrimary}}>{fmt(saleGross)}</strong></p>}<div style={{marginTop:14}}><label style={{display:"block",fontSize:12,color:textSecondary,fontWeight:800,marginBottom:8}}>Método de pago</label><div style={{display:"grid",gridTemplateColumns:"repeat(3,minmax(0,1fr))",gap:8}}>{[{id:"efectivo",label:"Efectivo",Icon:Banknote},{id:"tarjeta",label:"Tarjeta",Icon:CreditCard},{id:"transferencia",label:"Transferencia",Icon:Landmark}].map(({id,label,Icon})=>{const active=form.metodoPago===id;return <button key={id} type="button" onClick={()=>setForm({...form,metodoPago:id})} style={{padding:"10px 5px",borderRadius:11,border:`1.5px solid ${active?(D?"#63c2a6":"#245a4c"):borderColor2}`,background:active?(D?"rgba(99,194,166,.14)":"#e3f3ed"):bgCard2,color:active?(D?"#63c2a6":"#245a4c"):textSecondary,cursor:"pointer",fontFamily:"inherit",fontSize:10,fontWeight:800,display:"flex",flexDirection:"column",alignItems:"center",gap:5}}><Icon size={18}/>{label}</button>})}</div></div><label style={{display:"block",marginTop:12,fontSize:11,color:textSecondary,fontWeight:700}}>Descuento (opcional)<input type="number" min="0" value={form.descuento} onChange={e=>setForm({...form,descuento:e.target.value})} style={{...inp,marginTop:6}}/></label>{ventaUnitPrice<=0?<p style={{margin:"12px 0 0",color:D?"#d97757":"#b3452f",fontSize:12,fontWeight:700}}>Ingresa un precio unitario para continuar.</p>:<div style={{marginTop:12,padding:"12px 14px",borderRadius:10,background:D?"#242923":"#fff",display:"flex",alignItems:"center",justifyContent:"space-between"}}><div><p style={{margin:0,color:textMuted,fontSize:11}}>{formUnits.toLocaleString("es-CL")} huevos × {fmt(ventaUnitPrice)}{saleDiscount>0?` · Descuento: -${fmt(saleDiscount)}`:""}</p><p style={{margin:"4px 0 0",color:textPrimary,fontSize:13,fontWeight:700}}>Total de la venta</p></div><strong style={{fontSize:22,color:D?"#4fae93":"#2f6f5e"}}>{fmt(saleTotal)}</strong></div>}</div>}{["merma","rotos","trizados"].includes(form.tipo)&&<div style={{marginTop:12,padding:14,borderRadius:12,background:D?"rgba(217,119,87,.12)":"#fbeae4",border:`1.5px solid ${D?"#d9775755":"#f0d3c7"}`}}><div style={{display:"flex",alignItems:"center",gap:8,marginBottom:12}}><TrendingDown size={16} color={D?"#d97757":"#b3452f"}/><strong style={{color:textPrimary,fontSize:13}}>{form.tipo==="rotos"?"Datos de huevos rotos":form.tipo==="trizados"?"Datos de huevos trizados":"Datos de la merma"}</strong></div><label style={{display:"block",marginBottom:12,fontSize:11,color:textSecondary,fontWeight:700}}>Fecha del movimiento<input type="date" value={form.fechaIngreso} onChange={e=>setForm({...form,fechaIngreso:e.target.value})} style={{...inp,marginTop:6}}/></label><label style={{display:"block",fontSize:11,color:textSecondary,fontWeight:700,marginBottom:6}}>Motivo rápido</label><div style={{display:"flex",flexWrap:"wrap",gap:8}}>{[form.tipo==="rotos"?"Huevos rotos":form.tipo==="trizados"?"Huevos trizados":"Merma","Otro"].map(op=><button key={op} type="button" onClick={()=>setForm(f=>({...f,motivo:op}))} style={{padding:"6px 12px",borderRadius:20,border:`1.5px solid ${form.motivo===op?(D?"#d97757":"#b3452f"):borderColor2}`,background:form.motivo===op?(D?"rgba(217,119,87,.16)":"#fbeae4"):bgCard2,color:form.motivo===op?(D?"#d97757":"#b3452f"):textSecondary,fontSize:12,fontWeight:700,cursor:"pointer"}}>{op}</button>)}</div></div>}<label style={{display:"block",marginTop:12,fontSize:12,color:textSecondary,fontWeight:700}}>Motivo<input value={form.motivo} onChange={e=>setForm({...form,motivo:e.target.value})} style={{...inp,marginTop:6}}/></label><label style={{display:"block",marginTop:12,fontSize:12,color:textSecondary,fontWeight:700}}>Observaciones<textarea value={form.observaciones} onChange={e=>setForm({...form,observaciones:e.target.value})} style={{...inp,marginTop:6,minHeight:70,resize:"vertical"}}/></label>{error&&<p style={{margin:"10px 0 0",color:D?"#d97757":"#b3452f",fontSize:12,fontWeight:700}}>{error}</p>}<div style={{display:"flex",gap:10,marginTop:18}}><button onClick={()=>setShowMovement(false)} style={{flex:1,padding:11,borderRadius:10,border:`1px solid ${borderColor2}`,background:bgCard2,color:textSecondary,cursor:"pointer",fontWeight:700}}>Cancelar</button><button onClick={registerMovement} className="btn-primary" style={{flex:1,padding:11,borderRadius:10}}>{form.tipo==="venta"?"Registrar venta":"Guardar movimiento"}</button></div></div></div>}

    {showEdit && <div style={{position:"fixed",inset:0,background:"rgba(0,0,0,.65)",display:"flex",alignItems:"center",justifyContent:"center",zIndex:250}}><div className="mobile-modal" style={{...card,width:430}}><div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:16}}><h3 style={{margin:0,color:textPrimary}}>Configurar {editForm.nombre}</h3><button onClick={()=>setShowEdit(null)} style={{border:"none",background:bgCard2,color:textMuted,width:32,height:32,borderRadius:8,cursor:"pointer"}}><X size={15}/></button></div>{[["Costo por caja","costoCaja"],["Precio venta unitario (por huevo)","precioVentaUnitario"],["Incremento sobre costo (%)","incrementoPct"],["Stock mínimo (cajas)","stockMinimoCajas"]].map(([l,k])=><label key={k} style={{display:"block",marginBottom:12,fontSize:12,color:textSecondary,fontWeight:700}}>{l}<input type="number" min="0" value={editForm[k] ?? 0} onChange={e=>setEditForm({...editForm,[k]:e.target.value})} style={{...inp,marginTop:6}}/></label>)}<button onClick={saveQuality} className="btn-primary" style={{width:"100%",padding:11,borderRadius:10}}>Guardar configuración</button></div></div>}

    {showReset && <div style={{position:"fixed",inset:0,background:"rgba(0,0,0,.65)",display:"flex",alignItems:"center",justifyContent:"center",zIndex:260,backdropFilter:"blur(5px)"}}><div className="mobile-modal" style={{...card,width:440}}>
      {resetOk ? <>
        <div style={{display:"flex",alignItems:"center",gap:10,marginBottom:6}}><div style={{width:36,height:36,borderRadius:10,background:D?"rgba(79,174,147,.16)":"#e4f0ec",display:"flex",alignItems:"center",justifyContent:"center"}}><Check size={18} color={D?"#4fae93":"#2f6f5e"}/></div><h3 style={{margin:0,color:textPrimary,fontSize:16}}>Listo</h3></div>
        <p style={{margin:"0 0 18px",color:textSecondary,fontSize:13}}>El módulo de Huevos fue restablecido correctamente.</p>
        <button onClick={()=>setShowReset(false)} className="btn-primary" style={{width:"100%",padding:11,borderRadius:10}}>Cerrar</button>
      </> : <>
        <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:14}}><h3 style={{margin:0,color:D?"#d97757":"#b3452f",fontSize:16}}>Restablecer inventario de huevos</h3><button onClick={()=>setShowReset(false)} style={{border:"none",background:bgCard2,color:textMuted,width:32,height:32,borderRadius:8,cursor:"pointer"}}><X size={15}/></button></div>
        <p style={{margin:"0 0 14px",padding:12,borderRadius:10,background:D?"rgba(217,119,87,.12)":"#fbeae4",color:textPrimary,fontSize:12.5,lineHeight:1.5}}>Esta acción eliminará permanentemente todos los registros del módulo Huevos. El inventario general no será afectado.</p>
        <label style={{display:"block",fontSize:12,color:textSecondary,fontWeight:700,marginBottom:6}}>Escribe <strong style={{color:textPrimary}}>RESTABLECER HUEVOS</strong> para confirmar</label>
        <input value={resetText} onChange={e=>setResetText(e.target.value)} style={{...inp,marginBottom:16}} placeholder="RESTABLECER HUEVOS"/>
        {error && <p style={{margin:"0 0 12px",color:D?"#d97757":"#b3452f",fontSize:12,fontWeight:700}}>{error}</p>}
        <div style={{display:"flex",gap:10}}>
          <button onClick={()=>setShowReset(false)} style={{flex:1,padding:11,borderRadius:10,border:`1px solid ${borderColor2}`,background:bgCard2,color:textSecondary,cursor:"pointer",fontWeight:700}}>Cancelar</button>
          <button
            disabled={resetText!=="RESTABLECER HUEVOS"||resetting}
            onClick={async ()=>{
              setError(""); setResetting(true);
              try { await resetEggModule(); setResetOk(true); }
              catch (e) { setError(e.message || "No se pudo restablecer el módulo de huevos."); }
              finally { setResetting(false); }
            }}
            style={{flex:1,padding:11,borderRadius:10,border:"none",cursor:resetText!=="RESTABLECER HUEVOS"?"not-allowed":"pointer",fontWeight:700,color:"#fff",background:resetText!=="RESTABLECER HUEVOS"?(D?"#343a32":"#dedcd3"):(D?"#d97757":"#b3452f")}}>
            {resetting?"Restableciendo…":"Restablecer"}
          </button>
        </div>
      </>}
    </div></div>}

    <button
      onClick={() => openQuickAction("entrada", selectedQuality || inventory[0])}
      title="Agregar huevos"
      style={{
        position:"fixed", bottom:26, right:26, width:58, height:58, borderRadius:29,
        border:"none", background:D?"#4fae93":"#2f6f5e", color:"#fff",
        boxShadow:"0 6px 18px rgba(0,0,0,.28)", display:"flex", alignItems:"center",
        justifyContent:"center", cursor:"pointer", zIndex:120,
      }}
    ><Plus size={26}/></button>
  </div>;
}

