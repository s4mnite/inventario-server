import { useState, useMemo, useEffect } from "react";
import { BarChart, Bar, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { DollarSign, Pencil, Plus, Trash2, TrendingDown, ChevronRight, Filter, ShoppingCart, Check, X, ArrowLeft, Info, Minus, Banknote, CreditCard, Landmark } from "lucide-react";
import { API, fmt, todayLocalISO, calcIncrementPct, priceFromIncrement, fetchConTimeout, computeEggLots, stockPorCalidadDeLotes } from "./lib/utils";

// ─── Módulo independiente: Huevos ────────────────────────────────────────────
const EGG_BOX_UNITS = 180;
const EGG_TRAY_UNITS = 30;
const EGG_STORAGE_KEY = "inv_huevos_v1";
const EGG_MOVEMENTS_KEY = "inv_huevos_movimientos_v1";

const defaultEggInventory = [
  { id: "super", nombre: "Súper", stockHuevos: 0, costoCaja: 0, precioCaja: 0, precioBandeja: 0, precioVentaUnitario: 0, precioPromocionUnitario: 0, precioPromocionCaja: 0, precioPromocionBandeja: 0, incrementoPct: 0, stockMinimoCajas: 5 },
  { id: "extra", nombre: "Extra", stockHuevos: 0, costoCaja: 0, precioCaja: 0, precioBandeja: 0, precioVentaUnitario: 0, precioPromocionUnitario: 0, precioPromocionCaja: 0, precioPromocionBandeja: 0, incrementoPct: 0, stockMinimoCajas: 5 },
  { id: "primera", nombre: "Primera", stockHuevos: 0, costoCaja: 0, precioCaja: 0, precioBandeja: 0, precioVentaUnitario: 0, precioPromocionUnitario: 0, precioPromocionCaja: 0, precioPromocionBandeja: 0, incrementoPct: 0, stockMinimoCajas: 5 },
  { id: "segunda", nombre: "Segunda", stockHuevos: 0, costoCaja: 0, precioCaja: 0, precioBandeja: 0, precioVentaUnitario: 0, precioPromocionUnitario: 0, precioPromocionCaja: 0, precioPromocionBandeja: 0, incrementoPct: 0, stockMinimoCajas: 5 },
  { id: "tercera", nombre: "Tercera", stockHuevos: 0, costoCaja: 0, precioCaja: 0, precioBandeja: 0, precioVentaUnitario: 0, precioPromocionUnitario: 0, precioPromocionCaja: 0, precioPromocionBandeja: 0, incrementoPct: 0, stockMinimoCajas: 5 },
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
  const value = Number(total || 0);
  const negativo = value < 0;
  const safe = Math.abs(value);
  const cajas = Math.floor(safe / EGG_BOX_UNITS);
  const restoCaja = safe % EGG_BOX_UNITS;
  const bandejas = Math.floor(restoCaja / EGG_TRAY_UNITS);
  const unidades = restoCaja % EGG_TRAY_UNITS;
  // Cuando el stock es negativo (se vendió más de lo disponible), se
  // conserva el signo para que la UI pueda mostrarlo en rojo en vez de
  // aplanarlo a 0.
  return negativo
    ? { cajas: -cajas, bandejas: -bandejas, unidades: -unidades, negativo: true }
    : { cajas, bandejas, unidades, negativo: false };
};

export default function EggModule({ D, card, inp, textPrimary, textSecondary, textMuted, bgCard2, borderColor, borderColor2, currentUser, saleMode = false }) {
  const [tab, setTab] = useState("dashboard");
  const [inventory, setInventory] = useState(defaultEggInventory);
  const [movements, setMovements] = useState([]);
  const [loadingEggs, setLoadingEggs] = useState(true);
  const [showMovement, setShowMovement] = useState(false);
  const [showEdit, setShowEdit] = useState(null);
  const [error, setError] = useState("");
  const [guardandoMov, setGuardandoMov] = useState(false); // evita doble envío (doble tap) mientras se guarda el movimiento
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
  const [movFiltroCalidad, setMovFiltroCalidad] = useState("todas"); // "todas" o el id de una categoría de huevo
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

  // Registra en el módulo Gastos (categoría "huevos") el costo real de una
  // compra de huevos, para que aparezca en Gastos y en los egresos de
  // Reportes. Es un intento aparte del guardado de la entrada: si falla no
  // revierte ni bloquea la entrada ya guardada, solo avisa que hay que
  // agregarla a mano en Gastos.
  const registrarGastoDeCompraHuevos = async ({ calidad, total, unidades, fechaIngreso }) => {
    try {
      const res = await fetch(`${API}/api/gastos`, {
        method: "POST", headers: eggHeaders,
        body: JSON.stringify({
          comercio: `Entrada de huevos · ${calidad}`,
          fecha: fechaIngreso,
          total,
          categoria: "huevos",
          metodoPago: "Efectivo",
          notas: `Registrado automáticamente desde el módulo Huevos: ${Number(unidades || 0).toLocaleString("es-CL")} huevos de ${calidad}.`,
        }),
      });
      if (!res.ok) {
        const d = await res.json().catch(() => ({}));
        throw new Error(d.error || `Error ${res.status}`);
      }
    } catch (e) {
      setError(`La entrada se guardó, pero no se pudo registrar el gasto asociado en el módulo Gastos: ${e.message}. Puedes agregarlo manualmente.`);
    }
  };

  // inventoryDelta: { calidadId, stockDelta, costoCaja?, precioVentaUnitario?, ... }
  // Ya NO se manda el array "inventory" completo recalculado en el cliente:
  // eso es lo que permitía que dos guardadas casi simultáneas (de la misma
  // categoría o de categorías distintas) se pisaran entre sí. Ahora solo se
  // manda "qué cambió" y el backend aplica ese cambio de forma atómica
  // ($inc/$set sobre un único elemento del array, vía arrayFilters) — nunca
  // reescribe el array completo.
  const syncEggState = async (inventoryDelta, movementOrList = null) => {
    const list = Array.isArray(movementOrList) ? movementOrList : (movementOrList ? [movementOrList] : []);
    const body = {
      inventoryDelta: inventoryDelta || null,
      movement:  list[0] || null,   // singular — compatibilidad backend original
      movements: list,               // plural  — backends actualizados
    };
    const res = await fetchConTimeout(`${API}/api/huevos/movimientos`, {
      method: "POST", headers: eggHeaders,
      body: JSON.stringify(body),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || "No se pudieron guardar los huevos en el servidor.");
    const nextMovements = data.movements || (list.length ? [...list, ...movements] : movements);
    const nextInventory = data.inventory || inventory;
    setInventory(nextInventory);
    setMovements(nextMovements);
    saveEggInventory(nextInventory);
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
      precioPromocionUnitario: 0, precioPromocionCaja: 0, precioPromocionBandeja: 0,
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
        const res = await fetchConTimeout(`${API}/api/huevos?_=${Date.now()}`, {
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
          const migration = await fetchConTimeout(`${API}/api/huevos/migrar`, {
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
    const timer = window.setInterval(refresh, 25000);
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

  const isUnitLoss = ["rotos", "trizados"].includes(form.tipo);
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
    // Protección contra doble tap/doble clic: si ya hay un guardado en curso
    // (por ejemplo mientras el backend de Render está "despertando"), ignora
    // los intentos siguientes hasta que termine — evita duplicar el stock.
    if (guardandoMov) return;
    setError("");
    const movementType = String(form.tipo || "").toLowerCase().trim();
    const allowedTypes = ["entrada", "venta", "rotos", "trizados", "ajuste_entrada", "ajuste_salida"];
    if (!allowedTypes.includes(movementType)) { setError("Tipo de movimiento inválido."); return; }
    if (!selectedQuality || formUnits <= 0) { setError("Ingresa una cantidad válida."); return; }
    if (form.tipo === "venta" && formUnits % EGG_TRAY_UNITS !== 0) { setError("Los huevos solo se venden por bandeja de 30 o caja de 180. La cantidad debe ser múltiplo de 30."); return; }
    // Ningún egreso (venta, rotos, trizados, ajuste de salida) se bloquea por
    // falta de stock: si no alcanza, el inventario queda en negativo y se
    // regulariza con una entrada posterior.
    // Se usa para decidir si una entrada nueva debe disparar un traspaso
    // automático desde el lote vigente (el que no está cerrado), sea cual
    // sea su stock. BUG FIX: antes exigía stockRestante > 0 para considerar
    // un lote "activo" — si el lote vigente había quedado con stock
    // NEGATIVO (sobreventa), esta búsqueda no lo encontraba, así que la
    // entrada nueva NUNCA disparaba el traspaso y creaba un lote totalmente
    // desconectado, dejando la deuda del lote viejo sin arrastrarse al
    // nuevo (el nuevo lote se veía con más stock disponible del real).
    const activeLot = eggLots.find(l => l.calidadId === selectedQuality.id && l.estado !== "cerrado");
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
    if (["venta", "rotos", "trizados", "ajuste_salida"].includes(form.tipo) && !anyLotForQuality) {
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
    } else if (["rotos", "trizados"].includes(form.tipo)) {
      costo = (formUnits / EGG_BOX_UNITS) * Number(selectedQuality.costoCaja || 0);
    }

    // BUG FIX (concurrencia): antes se recalculaba el inventario completo de
    // la categoría en JS (updatedInventory) y se mandaba entero al backend,
    // que lo pisaba con $set — igual que pasaba con "movements" antes del
    // fix. Ahora solo se manda el DELTA (cuánto cambia el stock) y el
    // backend lo aplica de forma atómica con $inc, sin depender de una copia
    // local que puede estar desactualizada si hubo otra guardada reciente.
    //
    // CAMBIO DE COMPORTAMIENTO: antes, para movimientos de salida que no
    // fueran "venta" (rotos, trizados, ajuste_salida), el stock se topaba en
    // 0 (Math.max(0, ...)) en vez de quedar negativo. Ese tope no se puede
    // aplicar de forma atómica con $inc (requeriría leer el valor actual
    // antes de decidir el tope, reintroduciendo la misma condición de
    // carrera). Ahora estas categorías se comportan igual que "venta": si se
    // registra más de lo que hay, el stock queda negativo y se ve como
    // "faltante" en la UI — igual que ya pasa con eggLots (stockRestante
    // negativo). Es preferible mostrar la deuda real a esconderla con un
    // tope que además era la fuente del problema.
    const stockDelta = sign * formUnits;
    const inventoryDelta = { calidadId: selectedQuality.id, nombre: selectedQuality.nombre, stockDelta };
    if (form.tipo === "entrada") {
      // El costo promedio ponderado SÍ se calcula a partir del stock local
      // conocido (no 100% atómico) — es una decisión deliberada: si dos
      // entradas casi simultáneas de la MISMA categoría chocan, en el peor
      // caso el costo promedio queda levemente desactualizado (impacto
      // cosmético/contable menor), pero el stock (lo que causaba pérdidas
      // reales) siempre queda correcto porque su delta se aplica con $inc.
      const oldStock = Math.max(0, Number(selectedQuality.stockHuevos || 0));
      const oldUnitCost = Number(selectedQuality.costoCaja || 0) / EGG_BOX_UNITS;
      const totalCostBefore = oldStock * oldUnitCost;
      const totalCostAfter = totalCostBefore + purchaseTotal;
      const nextStockEstimado = oldStock + formUnits;
      const averageUnitCost = nextStockEstimado > 0 ? totalCostAfter / nextStockEstimado : purchaseUnitValue;
      inventoryDelta.costoCaja = Math.round(averageUnitCost * EGG_BOX_UNITS);
      inventoryDelta.precioVentaUnitario = saleUnitValue;
      inventoryDelta.precioBandeja = Math.round(saleUnitValue * EGG_TRAY_UNITS);
      inventoryDelta.precioCaja = Math.round(saleUnitValue * EGG_BOX_UNITS);
    }
    const movement = {
      id: Date.now(),
      fechaIngreso: ["entrada", "venta", "rotos", "trizados"].includes(form.tipo) ? form.fechaIngreso : "",
      fecha: ["venta", "rotos", "trizados"].includes(form.tipo) && form.fechaIngreso
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

    setGuardandoMov(true);
    try {
      await syncEggState(inventoryDelta, movementsToSend);
      setShowMovement(false);
    } catch (e) {
      setError(e.message || "No se pudo guardar el movimiento.");
      setGuardandoMov(false);
      return;
    }

    // BUG FIX: una compra de huevos (entrada) nunca aparecía en el módulo
    // Gastos ni en los egresos de Reportes, porque huevos vive en su propia
    // colección separada de "gastos". Ahora cada entrada registra también un
    // gasto en categoría "huevos". El monto SIEMPRE es lo que se pagó al
    // comprar (purchaseTotal = cantidad × costo por unidad de compra) y
    // nunca algo derivado del precio o del monto de venta.
    if (form.tipo === "entrada" && purchaseTotal > 0) {
      registrarGastoDeCompraHuevos({
        calidad: selectedQuality.nombre,
        total: purchaseTotal,
        unidades: formUnits,
        fechaIngreso: form.fechaIngreso,
      });
    }

    setForm({
      tipo: "entrada", calidadId: selectedQuality.id, cantidad: "",
      motivo: "Compra de mercadería", observaciones: "", descuento: "", metodoPago: "efectivo",
      fechaIngreso: todayLocalISO(),
    });
    setGuardandoMov(false);
  };

  const deleteMovement = async (m) => {
    if (!window.confirm(`¿Eliminar este movimiento de "${m.calidad}" (${Number(m.huevos || 0).toLocaleString("es-CL")} huevos)? Esta acción no se puede deshacer.`)) return;
    setError("");
    // Revierte el efecto que tuvo este movimiento sobre el stock: las entradas
    // y ajustes de entrada sumaron, todo lo demás (venta/merma/rotos/trizados/
    // ajuste de salida) restó, así que aplicamos el signo contrario.
    // Se manda como delta (no como array completo) para que el backend lo
    // aplique atómicamente con $inc, igual que en registerMovement.
    const sign = ["entrada", "ajuste_entrada"].includes(m.tipo) ? 1 : -1;
    const inventoryDelta = { calidadId: m.calidadId, stockDelta: -sign * Number(m.huevos || 0) };
    try {
      const res = await fetch(`${API}/api/huevos/movimientos/${m.id}`, {
        method: "DELETE", headers: eggHeaders,
        body: JSON.stringify({ inventoryDelta }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "No se pudo eliminar el movimiento.");
      const nextMovements = data.movements || movements.filter(x => x.id !== m.id);
      const nextInventory = data.inventory || inventory;
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
    const unitPromo = Math.max(0, Number(editForm.precioPromocionUnitario || 0));
    const costoCaja = Math.max(0, Number(editForm.costoCaja || 0));
    // Se manda como delta de una sola categoría (no el array completo), para
    // que editar la configuración de "Súper" no pueda pisar, por ejemplo,
    // una venta de "Extra" guardada casi al mismo tiempo desde otra pantalla.
    const inventoryDelta = {
      calidadId: showEdit,
      costoCaja,
      precioVentaUnitario: unitSale,
      incrementoPct: Number(editForm.incrementoPct || calcIncrementPct(costoCaja / EGG_BOX_UNITS, unitSale) || 0),
      precioCaja: Math.round(unitSale * EGG_BOX_UNITS),
      precioBandeja: Math.round(unitSale * EGG_TRAY_UNITS),
      precioPromocionUnitario: unitPromo,
      precioPromocionCaja: Math.round(unitPromo * EGG_BOX_UNITS),
      precioPromocionBandeja: Math.round(unitPromo * EGG_TRAY_UNITS),
      stockMinimoCajas: Math.max(0, Number(editForm.stockMinimoCajas || 0)),
    };
    try {
      const res = await fetch(`${API}/api/huevos/inventario`, {
        method: "PUT", headers: eggHeaders, body: JSON.stringify({ inventoryDelta }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "No se pudo actualizar la calidad.");
      const next = data.inventory || inventory;
      setInventory(next);
      saveEggInventory(next);
      setShowEdit(null);
    } catch (e) { setError(e.message || "No se pudo actualizar la calidad."); }
  };

  const sales = movements.filter(m => m.tipo === "venta");
  const wastes = movements.filter(m => ["merma", "rotos", "trizados"].includes(m.tipo));
  const revenue = sales.reduce((s, m) => s + Number(m.ingreso || 0), 0);
  const profit = sales.reduce((s, m) => s + Number(m.ganancia || 0), 0);
  const wasteUnits = wastes.reduce((s, m) => s + Number(m.huevos || 0), 0);
  const wasteCost = wastes.reduce((s, m) => s + Number(m.costo || 0), 0);

  const eggLots = useMemo(() => computeEggLots(movements, inventory), [movements, inventory]);

  // El stock que se muestra y se usa para vender/gatillar alertas SIEMPRE
  // sale del lote VIGENTE de cada calidad (el mismo que "Lotes por fecha"
  // marca como "Lote activo"), no de la suma de todos los lotes ni del
  // contador aparte inventory.stockHuevos.
  //
  // Por qué NO usar inventory.stockHuevos: es un contador que se actualiza
  // a mano en cada movimiento y puede desincronizarse de los movimientos
  // reales guardados (por ejemplo si una sincronización con el backend
  // queda a medias). Cuando eso pasa, la tarjeta mostraba stock viejo o
  // negativo aunque el lote de huevos ya tuviera la entrada registrada.
  // Al derivar el stock de eggLots (que se recalcula siempre a partir de
  // los movimientos guardados) queda conectado a la misma fuente de verdad
  // que "Lotes por fecha".
  const stockPorCalidad = useMemo(() => stockPorCalidadDeLotes(eggLots), [eggLots]);
  const stockDe = q => q ? Number(stockPorCalidad[q.id] ?? q.stockHuevos ?? 0) : 0;

  const totalEggs = inventory.reduce((s, q) => s + stockDe(q), 0);
  const totalBreakdown = eggBreakdown(totalEggs);
  const inventoryCost = inventory.reduce((s, q) => s + (stockDe(q) / EGG_BOX_UNITS) * Number(q.costoCaja || 0), 0);
  const inventorySaleValue = inventory.reduce((s, q) => s + (stockDe(q) / EGG_BOX_UNITS) * Number(q.precioCaja || 0), 0);

  const saleItems = inventory
    .map(q => {
      const formato = saleCart[q.id]?.formato === "caja" ? "caja" : "bandeja";
      const cantidadFormatos = Math.max(0, Number(saleCart[q.id]?.cantidadFormatos || 0));
      const unidadesPorFormato = formato === "caja" ? EGG_BOX_UNITS : EGG_TRAY_UNITS;
      const precioFormato = Math.max(0, Number(formato === "caja" ? q.precioCaja : q.precioBandeja));
      return {
        ...q,
        stockHuevos: stockDe(q),
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

  // La cantidad seleccionable ya no está limitada por el stock disponible:
  // se puede vender más de lo que hay y el inventario queda en negativo.
  const changeSaleQuantity = (quality, delta) => {
    setSaleFlowError("");
    setSaleCart(prev => {
      const formato = prev[quality.id]?.formato === "caja" ? "caja" : "bandeja";
      const current = Math.max(0, Number(prev[quality.id]?.cantidadFormatos || 0));
      const next = Math.max(0, current + delta);
      return { ...prev, [quality.id]: { formato, cantidadFormatos: next } };
    });
  };

  const updateSaleFormat = (quality, formato) => {
    setSaleFlowError("");
    setSaleCart(prev => {
      const current = Math.max(0, Number(prev[quality.id]?.cantidadFormatos || 0));
      return { ...prev, [quality.id]: { formato, cantidadFormatos: current } };
    });
  };

  const confirmSaleFlow = async () => {
    setSaleFlowError("");
    if (!saleItems.length) {
      setSaleFlowError("Selecciona al menos una categoría.");
      return;
    }

    for (const item of saleItems) {
      // El stock no bloquea la venta; puede quedar negativo.
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
        stockHuevos: Number(q.stockHuevos || 0) - selected.cantidadVenta,
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
      const merma = sumUnits(lost.filter(m=>["merma","rotos"].includes(m.tipo)));
      const trizados = sumUnits(lost.filter(m=>m.tipo==="trizados"));
      const valorPerdido = sum(lost, "costo");
      const stockInicial = Math.max(0, beforeStart.reduce((acc,m)=>acc + movementEffect(m), 0));
      const stockFinal = Math.max(0, allUntilEnd.reduce((acc,m)=>acc + movementEffect(m), 0));
      return { id:q.id, nombre:q.nombre, stockInicial, entradas, valorEntradas, traspasos, vendidos, ingreso, costo, ganancia, roto:merma, trizados, totalPerdido:merma+trizados, valorPerdido, stockFinal };
    });
    const totals = categories.reduce((a,c)=>({
      stockInicial:a.stockInicial+c.stockInicial, entradas:a.entradas+c.entradas, valorEntradas:a.valorEntradas+c.valorEntradas, traspasos:a.traspasos+c.traspasos,
      vendidos:a.vendidos+c.vendidos, ingreso:a.ingreso+c.ingreso, costo:a.costo+c.costo, ganancia:a.ganancia+c.ganancia,
      roto:a.roto+c.roto, trizados:a.trizados+c.trizados, totalPerdido:a.totalPerdido+c.totalPerdido, valorPerdido:a.valorPerdido+c.valorPerdido,
      stockFinal:a.stockFinal+c.stockFinal
    }),{stockInicial:0,entradas:0,valorEntradas:0,traspasos:0,vendidos:0,ingreso:0,costo:0,ganancia:0,roto:0,trizados:0,totalPerdido:0,valorPerdido:0,stockFinal:0});
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
      ["Categoría","Stock inicial","Entradas reales","Valor entradas","Traspasos","Vendidos","Ingreso ventas","Costo vendido","Ganancia","Roto","Trizados","Total perdido","Valor perdido","Stock final"],
      ...eggReport.categories.map(c=>[c.nombre,c.stockInicial,c.entradas,c.valorEntradas,c.traspasos,c.vendidos,c.ingreso,c.costo,c.ganancia,c.roto,c.trizados,c.totalPerdido,c.valorPerdido,c.stockFinal]),
      ["TOTAL",eggReport.totals.stockInicial,eggReport.totals.entradas,eggReport.totals.valorEntradas,eggReport.totals.traspasos,eggReport.totals.vendidos,eggReport.totals.ingreso,eggReport.totals.costo,eggReport.totals.ganancia,eggReport.totals.roto,eggReport.totals.trizados,eggReport.totals.totalPerdido,eggReport.totals.valorPerdido,eggReport.totals.stockFinal],
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

  const chartData = inventory.map(q => ({ calidad: q.nombre, stock: stockDe(q), ventas: sales.filter(m => m.calidadId === q.id).reduce((s, m) => s + m.huevos, 0), roto: wastes.filter(m => m.calidadId === q.id).reduce((s, m) => s + m.huevos, 0) }));
  const typeLabels = { entrada: "Entrada", venta: "Venta", merma: "Roto", rotos: "Roto", trizados: "Trizados", ajuste_entrada: "Ajuste +", ajuste_salida: "Ajuste -", transferencia: "Transferencia" };
  const typeColors = { entrada: D?"#2EC4B6":"#2EC4B6", venta: D?"#2EC4B6":"#2EC4B6", merma: D?"#E63946":"#E63946", rotos: D?"#E63946":"#E63946", trizados: D?"#FF9F1C":"#FF9F1C", ajuste_entrada: D?"#2EC4B6":"#2EC4B6", ajuste_salida: D?"#FF9F1C":"#FF9F1C", transferencia: D?"#8C8678":"#8C8678" };

  const tabs = [
    { id: "dashboard", label: "Resumen" }, { id: "inventario", label: "Inventario" },
    { id: "lotes", label: "Lotes por fecha" }, { id: "movimientos", label: "Movimientos" }, { id: "merma", label: "Merma" }, { id: "reportes", label: "Reportes" }, { id: "estadisticas", label: "Estadísticas" },
  ];

  if (saleMode && !saleFlowDismissed) {
    const shell = {
      minHeight: "calc(100vh - 132px)",
      margin: "-20px -24px",
      paddingBottom: 96,
      background: D ? "#121110" : "#E9E6DB",
      color: textPrimary,
    };
    const headerStyle = {
      minHeight: 76,
      padding: "14px 18px",
      display: "flex",
      alignItems: "center",
      gap: 12,
      background: "linear-gradient(135deg,#FF9F1C,#FF9F1C)",
      color: "#1C1A17",
      position: "sticky",
      top: 0,
      zIndex: 30,
      boxShadow: "0 4px 14px rgba(50,40,0,.12)",
    };
    const backButton = {
      width: 44,
      height: 44,
      borderRadius:0,
      border: "none",
      background: "rgba(255,255,255,.62)",
      color: "#1C1A17",
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
          <div style={{...card,maxWidth:470,width:"100%",borderRadius:0,textAlign:"center",padding:"34px 22px"}}>
            <div style={{width:78,height:78,borderRadius:"50%",margin:"0 auto 18px",background:D?"rgba(46,196,182,.18)":"rgba(46,196,182,0.10)",display:"flex",alignItems:"center",justifyContent:"center",color:D?"#2EC4B6":"#2EC4B6"}}><Check size={38} strokeWidth={2.5}/></div>
            <h2 style={{margin:"0 0 8px",fontSize:25,color:textPrimary}}>Venta registrada</h2>
            <p style={{margin:"0 0 18px",color:textMuted,lineHeight:1.5}}>El stock y los movimientos de huevos ya fueron actualizados.</p>
            {lastSaleSummary && <div style={{margin:"0 0 22px",padding:16,borderRadius:0,background:bgCard2,textAlign:"left",display:"grid",gap:10}}>
              <div style={{display:"flex",justifyContent:"space-between",gap:12}}><span style={{color:textMuted,fontSize:13}}>Total</span><strong style={{color:textPrimary,fontSize:20}}>{fmt(lastSaleSummary.total)}</strong></div>
              <div style={{display:"flex",justifyContent:"space-between",gap:12}}><span style={{color:textMuted,fontSize:13}}>Huevos vendidos</span><strong style={{color:textPrimary}}>{lastSaleSummary.unidades.toLocaleString("es-CL")}</strong></div>
              <div style={{display:"flex",justifyContent:"space-between",gap:12}}><span style={{color:textMuted,fontSize:13}}>Método de pago</span><strong style={{color:textPrimary,textTransform:"capitalize"}}>{lastSaleSummary.metodoPago === "tarjeta" ? "Tarjeta" : lastSaleSummary.metodoPago === "transferencia" ? "Transferencia" : "Efectivo"}</strong></div>
            </div>}
            <button className="btn-primary" onClick={()=>setSaleStep("select")} style={{width:"100%",padding:14,borderRadius:0,marginBottom:10}}>Hacer otra venta</button>
            <button onClick={()=>setSaleFlowDismissed(true)} style={{width:"100%",padding:13,borderRadius:0,border:`1.5px solid ${borderColor2}`,background:bgCard2,color:textPrimary,fontWeight:800,cursor:"pointer"}}>Volver a Huevos</button>
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
          <div className="egg-sale-info egg-sale-confirm-info" style={{padding:15,borderRadius:0,background:D?"rgba(142,124,195,.16)":"rgba(142,124,195,0.12)",border:`2px solid ${D?"#8E7CC3":"#8E7CC3"}`,display:"flex",gap:12,alignItems:"flex-start",marginBottom:16,color:D?"rgba(142,124,195,0.30)":"#8E7CC3"}}>
            <Info size={22} style={{flexShrink:0,marginTop:1}}/><div style={{fontSize:14,lineHeight:1.5}}>Al crear la venta se descontarán bandejas de 30 o cajas de 180 huevos del inventario.</div>
          </div>
          <div style={{display:"flex",flexDirection:"column",gap:12}}>
            {saleItems.map(item => <div key={item.id} className="egg-confirm-card" style={{...card,borderRadius:0,padding:16}}>
              <div style={{display:"flex",alignItems:"center",gap:12,marginBottom:15}}>
                <div style={{width:50,height:50,borderRadius:0,background:D?"rgba(255,159,28,.13)":"rgba(255,159,28,0.20)",display:"flex",alignItems:"center",justifyContent:"center",fontSize:25}}>🥚</div>
                <div style={{flex:1}}><div style={{fontWeight:900,fontSize:17,color:textPrimary}}>{item.nombre}</div><div style={{fontSize:12,color:textMuted}}>{Number(item.stockHuevos).toLocaleString("es-CL")} disponibles</div></div>
                <button onClick={()=>setSaleCart(prev=>{const next={...prev};delete next[item.id];return next;})} style={{width:42,height:42,borderRadius:0,border:"2px solid #E63946",background:"transparent",color:"#E63946",display:"flex",alignItems:"center",justifyContent:"center",cursor:"pointer"}}><Trash2 size={20}/></button>
              </div>
              <div style={{display:"grid",gridTemplateColumns:"minmax(0,1fr) minmax(0,1fr)",gap:12}}>
                <div><label style={{display:"block",fontSize:12,fontWeight:800,color:textSecondary,marginBottom:7}}>Cantidad de {item.formato}s</label><div style={{height:52,border:`2px solid ${borderColor2}`,borderRadius:0,display:"flex",alignItems:"center",justifyContent:"space-between",padding:"0 8px",background:bgCard2}}><button onClick={()=>changeSaleQuantity(item,-1)} style={{width:36,height:36,borderRadius:"50%",border:`2px solid ${textSecondary}`,background:"transparent",color:textPrimary,display:"flex",alignItems:"center",justifyContent:"center",cursor:"pointer"}}><Minus size={18}/></button><strong style={{fontSize:18}}>{item.cantidadFormatos}</strong><button onClick={()=>changeSaleQuantity(item,1)} style={{width:36,height:36,borderRadius:"50%",border:`2px solid ${textSecondary}`,background:"transparent",color:textPrimary,display:"flex",alignItems:"center",justifyContent:"center",cursor:"pointer"}}><Plus size={18}/></button></div></div>
                <div><label style={{display:"block",fontSize:12,fontWeight:800,color:textSecondary,marginBottom:7}}>Formato</label><div style={{height:52,border:`2px solid ${borderColor2}`,borderRadius:0,display:"flex",alignItems:"center",padding:"0 13px",background:bgCard2}}><strong style={{fontSize:15,color:textPrimary,textTransform:"capitalize"}}>{item.formato} · {item.unidadesPorFormato} huevos</strong></div></div>
              </div>
              <div style={{marginTop:13,color:textSecondary,fontSize:13}}>{item.cantidadFormatos} {item.formato}{item.cantidadFormatos===1?"":"s"} · {item.cantidadVenta.toLocaleString("es-CL")} huevos: <strong style={{color:textPrimary}}>{fmt(item.cantidadFormatos*item.precioFormato)}</strong></div>
            </div>)}
          </div>
          <div className="egg-payment-card" style={{...card,borderRadius:0,padding:16,marginTop:14}}>
            <div style={{fontWeight:900,fontSize:16,color:textPrimary,marginBottom:12}}>Método de pago</div>
            <div style={{display:"grid",gridTemplateColumns:"repeat(3,minmax(0,1fr))",gap:9}}>
              {[
                {id:"efectivo",label:"Efectivo",Icon:Banknote},
                {id:"tarjeta",label:"Tarjeta",Icon:CreditCard},
                {id:"transferencia",label:"Transferencia",Icon:Landmark},
              ].map(({id,label,Icon})=>{const active=salePaymentMethod===id;return <button key={id} type="button" onClick={()=>setSalePaymentMethod(id)} style={{minHeight:78,padding:"10px 6px",borderRadius:0,border:`2px solid ${active?(D?"#2EC4B6":"#2EC4B6"):borderColor2}`,background:active?(D?"rgba(46,196,182,.16)":"rgba(46,196,182,0.12)"):bgCard2,color:active?(D?"#2EC4B6":"#2EC4B6"):textSecondary,fontFamily:"inherit",fontWeight:800,cursor:"pointer",display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",gap:7}}><Icon size={22}/><span style={{fontSize:11,lineHeight:1.15,textAlign:"center"}}>{label}</span></button>})}
            </div>
          </div>
          {saleFlowError && <div style={{marginTop:13,padding:12,borderRadius:0,background:D?"rgba(230,57,70,.15)":"rgba(230,57,70,0.10)",color:D?"#E63946":"#E63946",fontWeight:800,fontSize:13}}>{saleFlowError}</div>}
        </div>
        <div className="egg-sale-bottom" style={bottomBar}>
          <button className="egg-sale-continue" disabled={saleSaving || !saleItems.length} onClick={confirmSaleFlow} style={{width:"100%",maxWidth:680,margin:"0 auto",minHeight:62,border:"none",borderRadius:0,background:saleSaving||!saleItems.length?(D?"#2A2723":"#E4E1D6"):"#1C1A17",color:saleSaving||!saleItems.length?textMuted:"#fff",display:"flex",alignItems:"center",justifyContent:"space-between",padding:"0 20px",fontFamily:"inherit",cursor:saleSaving?"wait":"pointer"}}><span style={{display:"flex",alignItems:"center",gap:12}}><span style={{width:38,height:38,borderRadius:0,background:"rgba(255,255,255,.13)",display:"flex",alignItems:"center",justifyContent:"center",fontWeight:900}}>{saleCartPackages}</span><strong style={{fontSize:16}}>{saleSaving?"Guardando…":"Confirmar"}</strong></span><span style={{display:"flex",alignItems:"center",gap:8,fontSize:18,fontWeight:900}}>{fmt(saleCartTotal)} <ChevronRight size={25}/></span></button>
        </div>
      </div>;
    }

    return <div style={shell}>
      <div style={headerStyle}>
        <button style={backButton} onClick={() => setSaleFlowDismissed(true)}><ArrowLeft size={24}/></button>
        <div style={{flex:1}}><div style={{fontWeight:900,fontSize:19}}>Seleccionar huevos</div><div style={{fontSize:12,opacity:.72}}>Paso 1 de 2 · Elige bandejas o cajas</div></div>
      </div>
      <div className="egg-sale-content egg-sale-select-content" style={{padding:"18px 16px 24px",maxWidth:680,margin:"0 auto"}}>
        <div className="egg-sale-info" style={{padding:"13px 15px",borderRadius:0,background:D?"rgba(255,159,28,.1)":"rgba(255,159,28,0.15)",border:`1.5px solid ${D?"rgba(255,159,28,.28)":"#FF9F1C"}`,marginBottom:14,color:textSecondary,fontSize:13,lineHeight:1.45}}>Selecciona una o más categorías y vende únicamente por bandeja de 30 o caja de 180 huevos.</div>
        <div style={{display:"flex",flexDirection:"column",gap:12}}>
          {inventory.map(q=>{
            const formato=saleCart[q.id]?.formato === "caja" ? "caja" : "bandeja";
            const qty=Math.max(0,Number(saleCart[q.id]?.cantidadFormatos||0));
            const stock=stockDe(q);
            const unitsPerFormat=formato === "caja" ? EGG_BOX_UNITS : EGG_TRAY_UNITS;
            const maxQty=Math.floor(stock/unitsPerFormat);
            const price=formato === "caja" ? Number(q.precioCaja||0) : Number(q.precioBandeja||0);
            const disabled=maxQty<=0;
            return <div key={q.id} className="egg-sale-card" style={{...card,padding:15,borderRadius:0,border:`2px solid ${qty>0?(D?"#2EC4B6":"#2EC4B6"):borderColor2}`,opacity:disabled ? .68 : 1}}>
              <div className="egg-sale-card-row" style={{display:"flex",alignItems:"center",gap:13}}>
                <div className="egg-sale-icon" style={{width:62,height:62,borderRadius:0,background:D?"rgba(255,159,28,.12)":"rgba(255,159,28,0.25)",display:"flex",alignItems:"center",justifyContent:"center",fontSize:30}}>🥚</div>
                <div className="egg-sale-card-info" style={{flex:1,minWidth:0}}><div style={{fontSize:18,fontWeight:900,color:textPrimary}}>H.{q.nombre}</div><span style={{display:"inline-block",marginTop:5,padding:"4px 9px",borderRadius:0,background:stock>0?(D?"rgba(46,196,182,.16)":"rgba(46,196,182,0.12)"):(D?"rgba(230,57,70,.16)":"rgba(230,57,70,0.15)"),color:stock>0?(D?"#2EC4B6":"#2EC4B6"):(D?"#E63946":"#E63946"),fontWeight:800,fontSize:11}}>{stock.toLocaleString("es-CL")} huevos disponibles</span><div style={{display:"flex",gap:6,marginTop:9}}>{[{id:"bandeja",label:"Bandeja 30"},{id:"caja",label:"Caja 180"}].map(opt=><button key={opt.id} type="button" onClick={()=>updateSaleFormat(q,opt.id)} style={{padding:"6px 9px",borderRadius:0,border:`1.5px solid ${formato===opt.id?(D?"#2EC4B6":"#2EC4B6"):borderColor2}`,background:formato===opt.id?(D?"rgba(46,196,182,.16)":"rgba(46,196,182,0.12)"):bgCard2,color:formato===opt.id?(D?"#2EC4B6":"#2EC4B6"):textSecondary,fontSize:10,fontWeight:800,cursor:"pointer"}}>{opt.label}</button>)}</div><div style={{marginTop:8,fontSize:17,fontWeight:900,color:textPrimary}}>{fmt(price)} <span style={{fontSize:11,color:textMuted,fontWeight:700}}>por {formato}</span></div></div>
                <div className="egg-sale-stepper" style={{height:52,minWidth:142,border:`2px solid ${borderColor2}`,borderRadius:0,display:"flex",alignItems:"center",justifyContent:"space-between",padding:"0 8px",background:bgCard2}}><button disabled={qty<=0} onClick={()=>changeSaleQuantity(q,-1)} style={{width:36,height:36,borderRadius:"50%",border:`2px solid ${textSecondary}`,background:"transparent",color:textPrimary,display:"flex",alignItems:"center",justifyContent:"center",cursor:qty>0?"pointer":"default",opacity:qty>0?1:.35}}><Minus size={18}/></button><div style={{textAlign:"center"}}><strong style={{fontSize:18,display:"block"}}>{qty}</strong><span style={{fontSize:9,color:textMuted}}>{formato}{qty===1?"":"s"}</span></div><button disabled={disabled||qty>=maxQty} onClick={()=>changeSaleQuantity(q,1)} style={{width:36,height:36,borderRadius:"50%",border:`2px solid ${textSecondary}`,background:"transparent",color:textPrimary,display:"flex",alignItems:"center",justifyContent:"center",cursor:!disabled&&qty<maxQty?"pointer":"default",opacity:!disabled&&qty<maxQty?1:.35}}><Plus size={18}/></button></div>
              </div>
            </div>;
          })}
        </div>
        {saleFlowError && <div style={{marginTop:13,padding:12,borderRadius:0,background:D?"rgba(230,57,70,.15)":"rgba(230,57,70,0.10)",color:D?"#E63946":"#E63946",fontWeight:800,fontSize:13}}>{saleFlowError}</div>}
      </div>
      <div className="egg-sale-bottom" style={bottomBar}>
        <button className="egg-sale-continue" disabled={!saleItems.length} onClick={()=>{setSaleFlowError("");setSaleStep("confirm");}} style={{width:"100%",maxWidth:680,margin:"0 auto",minHeight:62,border:"none",borderRadius:0,background:saleItems.length?"#1C1A17":(D?"#2A2723":"#E4E1D6"),color:saleItems.length?"#fff":textMuted,display:"flex",alignItems:"center",justifyContent:"space-between",padding:"0 20px",fontFamily:"inherit",cursor:saleItems.length?"pointer":"default"}}><span style={{display:"flex",alignItems:"center",gap:12}}><span style={{width:38,height:38,borderRadius:0,background:saleItems.length?"rgba(255,255,255,.13)":"rgba(100,110,120,.08)",display:"flex",alignItems:"center",justifyContent:"center",fontWeight:900}}>{saleCartPackages}</span><strong style={{fontSize:16}}>Continuar</strong></span><span style={{display:"flex",alignItems:"center",gap:8,fontSize:18,fontWeight:900}}>{fmt(saleCartTotal)} <ChevronRight size={25}/></span></button>
      </div>
    </div>;
  }

  return <div>
    <div className="page-header" style={{ display:"flex", alignItems:"center", justifyContent:"space-between", marginBottom:16 }}>
      <div>
        <div style={{ display:"flex", alignItems:"center", gap:10 }}><span style={{ fontSize:28 }}>🥚</span><h2 style={{ margin:0, fontSize:22, color:textPrimary }}>Control de Huevos</h2>{loadingEggs && <span style={{ fontSize:11, fontWeight:700, color:textMuted, padding:"3px 9px", borderRadius:0, background:bgCard2 }}>Cargando…</span>}</div>
        <p style={{ margin:"4px 0 0", fontSize:13, color:textMuted }}>Stock, ventas, ganancias y merma separados del resto de productos</p>
      </div>
      <button onClick={() => { setShowMovement(true); setError(""); }} className="btn-primary" style={{ padding:"11px 18px", borderRadius:0, display:"flex", alignItems:"center", gap:7 }}><Plus size={15}/> Registrar movimiento</button>
    </div>

    <div className="egg-tabs-mobile" style={{ ...card, padding:8, display:"flex", gap:6, marginBottom:18, overflowX:"auto", borderRadius:0 }}>
      {tabs.map(t => <button key={t.id} onClick={() => setTab(t.id)} className="egg-tab-mobile" style={{ padding:"10px 16px", borderRadius:0, border:"none", cursor:"pointer", whiteSpace:"nowrap", fontWeight:600, fontSize:13, fontFamily:"inherit", background:tab===t.id?(D?"#2EC4B6":"#2EC4B6"):"transparent", color:tab===t.id?"#fff":textSecondary, transition:"all .15s" }}>{t.label}</button>)}
    </div>

    {tab === "dashboard" && <>
      <div className="dashboard-grid" style={{ display:"grid", gridTemplateColumns:"repeat(4,1fr)", gap:14, marginBottom:16 }}>
        {[
          ["Cajas completas", totalBreakdown.cajas, "📦", D?"#2EC4B6":"#2EC4B6"],
          ["Bandejas sueltas", totalBreakdown.bandejas, "🥚", D?"#FF9F1C":"#FF9F1C"],
          ["Huevos totales", totalEggs.toLocaleString("es-CL"), "◯", D?"#2EC4B6":"#2EC4B6"],
          ["Merma acumulada", `${wasteUnits.toLocaleString("es-CL")} huevos`, "⚠️", D?"#E63946":"#E63946"],
        ].map(([label,value,icon,color]) => <div key={label} style={card} className="card-hover"><div style={{ fontSize:23, marginBottom:10 }}>{icon}</div><p style={{ margin:0, color:textMuted, fontSize:12 }}>{label}</p><p style={{ margin:"5px 0 0", color:textPrimary, fontSize:23, fontWeight:800 }}>{value}</p><div style={{ width:34, height:3, borderRadius:0, background:color, marginTop:12 }}/></div>)}
      </div>
      <div className="dashboard-grid" style={{ display:"grid", gridTemplateColumns:"repeat(4,1fr)", gap:14, marginBottom:18 }}>
        {[
          ["Ventas huevos", fmt(revenue), "Ingresos exclusivos de huevos", D?"#2EC4B6":"#2EC4B6"],
          ["Ganancia huevos", fmt(profit), "Sin mezclar otros productos", D?"#2EC4B6":"#2EC4B6"],
          ["Costo de merma", fmt(wasteCost), "Pérdida al costo", D?"#E63946":"#E63946"],
          ["Valor inventario", fmt(inventorySaleValue), `Costo: ${fmt(inventoryCost)}`, textPrimary],
        ].map(([label,value,sub,color]) => <div key={label} style={card}><p style={{ margin:0, color:textMuted, fontSize:12 }}>{label}</p><p style={{ margin:"6px 0 2px", color, fontSize:21, fontWeight:800 }}>{value}</p><p style={{ margin:0, color:textMuted, fontSize:11 }}>{sub}</p></div>)}
      </div>
      <div className="dashboard-charts" style={{ display:"grid", gridTemplateColumns:"1.5fr 1fr", gap:16 }}>
        <div style={card}><h3 style={{ margin:"0 0 16px", color:textPrimary, fontSize:14 }}>Stock por calidad (huevos)</h3><ResponsiveContainer width="100%" height={250}><BarChart data={chartData}><CartesianGrid strokeDasharray="3 3" stroke={borderColor}/><XAxis dataKey="calidad" tick={{ fill:textMuted, fontSize:11 }}/><YAxis tick={{ fill:textMuted, fontSize:11 }}/><Tooltip contentStyle={{ background:D?"#1C1A17":"#fff", border:`1px solid ${borderColor}`, borderRadius:0 }}/><Bar dataKey="stock" fill={D?"#2EC4B6":"#2EC4B6"} radius={[6,6,0,0]}/></BarChart></ResponsiveContainer></div>
        <div style={card}><h3 style={{ margin:"0 0 14px", color:textPrimary, fontSize:14 }}>Estado por calidad</h3>{inventory.map(q => { const b=eggBreakdown(stockDe(q)); const low=b.negativo || b.cajas<q.stockMinimoCajas; return <div key={q.id} style={{ display:"flex", alignItems:"center", justifyContent:"space-between", padding:"11px 0", borderBottom:`1px solid ${borderColor}` }}><div><p style={{ margin:0, color:textPrimary, fontWeight:700, fontSize:13 }}>{q.nombre}</p><p style={{ margin:"3px 0 0", color:b.negativo?"#E63946":textMuted, fontSize:11, fontWeight:b.negativo?700:400 }}>{b.cajas} cajas · {b.bandejas} bandejas · {b.unidades} huevos{b.negativo?" (faltante)":""}</p></div><span className="badge" style={{ background:b.negativo?(D?"rgba(230,57,70,.18)":"rgba(230,57,70,0.10)"):low?(D?"rgba(230,57,70,.16)":"rgba(230,57,70,0.10)"):(D?"rgba(46,196,182,.16)":"rgba(46,196,182,0.12)"), color:b.negativo?"#E63946":low?(D?"#E63946":"#E63946"):(D?"#2EC4B6":"#2EC4B6") }}>{b.negativo?"Stock negativo":low?"Stock bajo":"Disponible"}</span></div>})}</div>
      </div>
    </>}

    {tab === "inventario" && <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fit,minmax(260px,1fr))", gap:14 }}>{inventory.map(q => { const b=eggBreakdown(stockDe(q)); return <div key={q.id} style={{...card, borderRadius:0}} className="card-hover"><div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:14 }}><div><p style={{ margin:0, color:textPrimary, fontSize:17, fontWeight:800 }}>{q.nombre}</p><p style={{ margin:"3px 0 0", color:textMuted, fontSize:11 }}>Stock mínimo: {q.stockMinimoCajas} cajas</p></div><button onClick={() => openEditQuality(q)} style={{ width:34,height:34,borderRadius:0,border:`1px solid ${borderColor2}`,background:bgCard2,cursor:"pointer",color:textSecondary }}><Pencil size={14}/></button></div><div style={{ display:"grid", gridTemplateColumns:"repeat(3,1fr)", gap:8, marginBottom:14 }}>{[["Cajas",b.cajas],["Bandejas",b.bandejas],["Sueltos",b.unidades]].map(([l,v])=><div key={l} style={{ background:bgCard2,borderRadius:0,padding:"10px 8px",textAlign:"center" }}><p style={{ margin:0,color:textMuted,fontSize:10 }}>{l}</p><p style={{ margin:"4px 0 0",color:b.negativo?"#E63946":textPrimary,fontWeight:800,fontSize:18 }}>{v}</p></div>)}</div>{b.negativo && <p style={{margin:"-8px 0 12px",color:"#E63946",fontSize:11,fontWeight:700}}>⚠️ Stock negativo: se vendió más de lo disponible.</p>}<div style={{ borderTop:`1px solid ${borderColor}`, paddingTop:12, marginBottom:12 }}><p style={{ margin:"0 0 5px", color:textSecondary,fontSize:12 }}>Costo caja: <strong style={{color:textPrimary}}>{fmt(q.costoCaja)}</strong></p><p style={{ margin:"0 0 5px", color:textSecondary,fontSize:12 }}>Venta caja: <strong style={{color:D?"#2EC4B6":"#2EC4B6"}}>{fmt(q.precioCaja)}</strong></p><p style={{ margin:0, color:textSecondary,fontSize:12 }}>Venta bandeja: <strong style={{color:D?"#2EC4B6":"#2EC4B6"}}>{fmt(q.precioBandeja)}</strong></p></div><div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:8,marginBottom:8}}><button onClick={()=>openQuickAction("venta",q)} className="btn-primary" style={{padding:"10px",borderRadius:0,fontSize:12,display:"flex",alignItems:"center",justifyContent:"center",gap:6}}><ShoppingCart size={14}/> Vender</button><button onClick={()=>openQuickAction("entrada",q)} style={{padding:"10px",borderRadius:0,border:`1.5px solid ${borderColor2}`,background:bgCard2,color:textSecondary,cursor:"pointer",fontSize:12,fontWeight:700,display:"flex",alignItems:"center",justifyContent:"center",gap:6}}><Plus size={14}/> Entrada</button></div><button onClick={() => { setTab("lotes"); setLoteFiltro(q.id); }} style={{ width:"100%", padding:"9px", borderRadius:0, border:`1px solid ${borderColor2}`, background:"transparent", color:textMuted, cursor:"pointer", fontSize:12, fontWeight:700, display:"flex", alignItems:"center", justifyContent:"center", gap:6 }}>Ver detalle <ChevronRight size={13}/></button></div>})}</div>}

    {tab === "lotes" && <div style={{display:"grid",gap:14}}>
      {loteFiltro && <div style={{display:"flex",alignItems:"center",gap:8}}><span className="badge" style={{background:D?"rgba(46,196,182,.16)":"rgba(46,196,182,0.12)",color:D?"#2EC4B6":"#2EC4B6"}}>Filtrando por: {inventory.find(q=>q.id===loteFiltro)?.nombre || loteFiltro}</span><button onClick={()=>setLoteFiltro(null)} style={{background:"none",border:"none",color:textMuted,cursor:"pointer",fontSize:12,fontWeight:700}}>Quitar filtro</button></div>}
      {eggLots.filter(lot=>!loteFiltro || lot.calidadId===loteFiltro).length===0 ? <div style={card}><div style={{textAlign:"center",padding:36,color:textMuted}}>Todavía no hay lotes registrados. Las nuevas entradas aparecerán separadas por fecha.</div></div> : eggLots.filter(lot=>!loteFiltro || lot.calidadId===loteFiltro).map(lot=>{
        const initial=eggBreakdown(lot.huevosIniciales);
        const remaining=eggBreakdown(lot.stockRestante);
        return <div key={lot.id} style={{...card, borderRadius:0}} className="card-hover">
          <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",gap:12,marginBottom:14}}>
            <div><p style={{margin:0,color:textPrimary,fontSize:17,fontWeight:800}}>{lot.calidad}</p><p style={{margin:"4px 0 0",color:textMuted,fontSize:12}}>Ingreso: {lot.fechaIngreso ? new Date(`${lot.fechaIngreso}T12:00:00`).toLocaleDateString("es-CL") : "Sin fecha"}</p></div>
            <span className="badge" style={{background:lot.estado==="cerrado"?(D?"rgba(147,153,143,.18)":"#F2F1EC"):lot.stockRestante>0?(D?"rgba(46,196,182,.16)":"rgba(46,196,182,0.12)"):(D?"rgba(107,113,106,.16)":"#F2F1EC"),color:lot.estado==="cerrado"?textMuted:lot.stockRestante>0?(D?"#2EC4B6":"#2EC4B6"):textMuted}}>{lot.estado==="cerrado"?"Lote cerrado (transferido)":lot.stockRestante>0?"Lote activo":"Lote agotado"}</span>
          </div>
          <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(125px,1fr))",gap:9}}>
            {[
              ["Entrada anotada",`${initial.cajas}c · ${initial.bandejas}b · ${initial.unidades}u`],
              ...(Number(lot.transferidoDesde || 0) > 0 ? [["Traspaso anterior",`${eggBreakdown(lot.transferidoDesde).cajas}c · ${eggBreakdown(lot.transferidoDesde).bandejas}b · ${eggBreakdown(lot.transferidoDesde).unidades}u`]] : []),
              ["Huevos disponibles",`${remaining.cajas}c · ${remaining.bandejas}b · ${remaining.unidades}u`],
              ["Huevos vendidos",Number(lot.vendidos).toLocaleString("es-CL")],
              ["Roto",Number(lot.merma + lot.rotos).toLocaleString("es-CL")],
              ["Trizados",Number(lot.trizados).toLocaleString("es-CL")],
              ["Costo del lote",fmt(lot.costoTotal)],
              ["Ingresos",fmt(lot.ingreso)],
              ["Ganancia",fmt(lot.ganancia)],
            ].map(([label,value])=><div key={label} style={{background:bgCard2,borderRadius:0,padding:"11px 10px"}}><p style={{margin:0,color:textMuted,fontSize:10}}>{label}</p><p style={{margin:"5px 0 0",color:label==="Ganancia"?(lot.ganancia>=0?(D?"#2EC4B6":"#2EC4B6"):(D?"#E63946":"#E63946")):(label==="Roto"||label==="Trizados")?(D?"#E63946":"#E63946"):textPrimary,fontWeight:800,fontSize:14}}>{value}</p></div>)}
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
        // Filtro por categoría: compara por calidadId, pero si un movimiento
        // viejo trae un calidadId que ya no existe en el inventario actual,
        // cae al mismo criterio que usa computeEggLots (comparar por nombre
        // normalizado) para no dejarlo fuera del filtro por error.
        if (movFiltroCalidad !== "todas") {
          const mismaCalidad = m.calidadId === movFiltroCalidad
            || String(m.calidad || "").trim().toLowerCase() === String(inventory.find(q => q.id === movFiltroCalidad)?.nombre || "").trim().toLowerCase();
          if (!mismaCalidad) return false;
        }
        return true;
      });
      return <div style={{display:"flex",flexDirection:"column",gap:14}}>
        <div style={{display:"flex",gap:8,flexWrap:"wrap",alignItems:"center"}}>
          <Filter size={14} color={textMuted}/>
          {[["todos","Todos"],["hoy","Hoy"],["semana","Semana"],["mes","Mes"]].map(([id,label])=>
            <button key={id} onClick={()=>setMovFiltroPeriodo(id)} style={{padding:"7px 13px",borderRadius:0,border:`1.5px solid ${movFiltroPeriodo===id?(D?"#2EC4B6":"#2EC4B6"):borderColor2}`,background:movFiltroPeriodo===id?(D?"rgba(46,196,182,.16)":"rgba(46,196,182,0.12)"):bgCard2,color:movFiltroPeriodo===id?(D?"#2EC4B6":"#2EC4B6"):textSecondary,fontSize:12,fontWeight:700,cursor:"pointer"}}>{label}</button>)}
          <select value={movFiltroTipo} onChange={e=>setMovFiltroTipo(e.target.value)} style={{...inp,width:"auto",padding:"7px 12px",fontSize:12,borderRadius:0}}>
            <option value="todos">Todos los tipos</option>
            {Object.entries(typeLabels).map(([id,label])=><option key={id} value={id}>{label}</option>)}
          </select>
          <select value={movFiltroCalidad} onChange={e=>setMovFiltroCalidad(e.target.value)} style={{...inp,width:"auto",padding:"7px 12px",fontSize:12,borderRadius:0}}>
            <option value="todas">Todas las categorías</option>
            {inventory.map(q=><option key={q.id} value={q.id}>{q.nombre}</option>)}
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
                  <button onClick={()=>deleteMovement(m)} style={{background:"none",border:"none",cursor:"pointer",padding:4,color:D?"#E63946":"#E63946",display:"flex",flexShrink:0}} title="Eliminar movimiento"><Trash2 size={14}/></button>
                </div>
                <p style={{margin:"4px 0 0",color:textMuted,fontSize:11}}>{new Date(m.fecha).toLocaleString("es-CL",{weekday:"short",day:"numeric",month:"short",hour:"2-digit",minute:"2-digit"})} · {m.motivo} · {m.usuario}{m.tipo==="venta"&&m.metodoPago?` · Pago: ${m.metodoPago==="tarjeta"?"Tarjeta":m.metodoPago==="transferencia"?"Transferencia":"Efectivo"}`:""}</p>
                {(m.ingreso>0 || m.tipo==="venta") && <p style={{margin:"4px 0 0",fontSize:12}}><span style={{color:D?"#2EC4B6":"#2EC4B6",fontWeight:700}}>{m.ingreso?fmt(m.ingreso):"—"}</span>{m.tipo==="venta" && <span style={{color:m.ganancia>=0?(D?"#2EC4B6":"#2EC4B6"):(D?"#E63946":"#E63946"),fontWeight:700,marginLeft:10}}>Ganancia: {fmt(m.ganancia)}</span>}</p>}
              </div>
            </div>
          );})}
        </div>}
      </div>;
    })()}

    {tab === "merma" && <><div className="dashboard-grid" style={{ display:"grid",gridTemplateColumns:"repeat(3,1fr)",gap:14,marginBottom:16 }}>{[["Huevos perdidos",wasteUnits.toLocaleString("es-CL")],["Costo perdido",fmt(wasteCost)],["% sobre salidas",`${((wasteUnits/(wasteUnits+sales.reduce((s,m)=>s+m.huevos,0)||1))*100).toFixed(1)}%`]].map(([l,v])=><div key={l} style={card}><p style={{margin:0,color:textMuted,fontSize:12}}>{l}</p><p style={{margin:"6px 0 0",color:D?"#E63946":"#E63946",fontWeight:800,fontSize:22}}>{v}</p></div>)}</div><div style={card}>{wastes.length===0?<p style={{margin:0,textAlign:"center",padding:28,color:textMuted}}>No hay merma registrada.</p>:wastes.map((m,i)=><div key={m.id} style={{display:"flex",alignItems:"center",gap:12,padding:"12px 0",borderBottom:i<wastes.length-1?`1px solid ${borderColor}`:"none"}}><div style={{width:38,height:38,borderRadius:0,background:D?"rgba(230,57,70,.16)":"rgba(230,57,70,0.10)",display:"flex",alignItems:"center",justifyContent:"center"}}><TrendingDown size={17} color={D?"#E63946":"#E63946"}/></div><div style={{flex:1}}><p style={{margin:0,color:textPrimary,fontWeight:700,fontSize:13}}>{m.calidad} · {m.huevos} huevos</p><p style={{margin:"3px 0 0",color:textMuted,fontSize:11}}>{m.motivo} · {new Date(m.fecha).toLocaleString("es-CL")}</p></div><strong style={{color:D?"#E63946":"#E63946",fontSize:13}}>{fmt(m.costo)}</strong></div>)}</div></>}

    {tab === "reportes" && <div className="egg-report-page" style={{display:"grid",gap:16}}>
      <div style={{...card,borderRadius:0,padding:16}}>
        <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",gap:12,flexWrap:"wrap"}}>
          <div><h2 style={{margin:0,color:textPrimary,fontSize:22}}>Reportes de huevos</h2><p style={{margin:"5px 0 0",color:textMuted,fontSize:12}}>Ventas, ganancia y pérdidas separadas del inventario general.</p></div>
          <button onClick={exportEggReport} className="btn-primary" style={{padding:"10px 14px",borderRadius:0,fontSize:12}}>Exportar Excel</button>
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
        ].map(([label,value,sub,icon])=><div key={label} style={{...card,borderRadius:0,padding:15}}><div style={{fontSize:22}}>{icon}</div><p style={{margin:"8px 0 4px",fontSize:12,color:textMuted}}>{label}</p><strong style={{display:"block",fontSize:20,color:label==="Total perdido"?(D?"#E63946":"#E63946"):textPrimary}}>{value}</strong><span style={{fontSize:11,color:textSecondary}}>{sub}</span></div>)}
      </div>
      <div className="egg-report-payment-methods" style={{...card,borderRadius:0,padding:16}}>
        <h3 style={{margin:"0 0 14px",fontSize:16,color:textPrimary}}>Ventas de huevos por método de pago</h3>
        <div style={{display:"grid",gridTemplateColumns:"repeat(4,minmax(0,1fr))",gap:12}}>
          {[
            ["Efectivo",eggReport.paymentBreakdown.efectivo,"💵"],
            ["Débito",eggReport.paymentBreakdown.debito,"💳"],
            ["Transferencia",eggReport.paymentBreakdown.transferencia,"🏦"],
            ["Total",eggReport.paymentBreakdown.total,"Σ"]
          ].map(([label,value,icon])=><div key={label} style={{padding:"12px 6px",borderRadius:0,background:bgCard2,textAlign:"center",minWidth:0}}><div style={{fontSize:18}}>{icon}</div><strong style={{display:"block",fontSize:15,marginTop:6,color:label==="Total"?(D?"#2EC4B6":"#2EC4B6"):textPrimary,wordBreak:"break-word",lineHeight:1.15}}>{fmt(value)}</strong><span style={{fontSize:11,color:textMuted}}>{label}</span></div>)}
        </div>
      </div>
      <div className="egg-report-kpis egg-report-inventory-kpis" style={{display:"grid",gridTemplateColumns:"repeat(4,minmax(0,1fr))",gap:12}}>
        {[
          ["Stock inicial",`${eggReport.totals.stockInicial.toLocaleString("es-CL")} huevos`,"Antes del período","📦"],
          ["Entradas reales",`${eggReport.totals.entradas.toLocaleString("es-CL")} huevos`,fmt(eggReport.totals.valorEntradas),"➕"],
          ["Traspasos de lotes",`${eggReport.totals.traspasos.toLocaleString("es-CL")} huevos`,"No cuentan como compra nueva","🔄"],
          ["Stock final",`${eggReport.totals.stockFinal.toLocaleString("es-CL")} huevos`,"Después de ventas y pérdidas","✅"]
        ].map(([label,value,sub,icon])=><div key={label} style={{...card,borderRadius:0,padding:15}}><div style={{fontSize:22}}>{icon}</div><p style={{margin:"8px 0 4px",fontSize:12,color:textMuted}}>{label}</p><strong style={{display:"block",fontSize:20,color:textPrimary}}>{value}</strong><span style={{fontSize:11,color:textSecondary}}>{sub}</span></div>)}
      </div>
      <div style={{...card,borderRadius:0,padding:16}}>
        <h3 style={{margin:"0 0 14px",fontSize:16,color:textPrimary}}>Pérdidas del período</h3>
        <div className="egg-report-losses" style={{display:"grid",gridTemplateColumns:"repeat(4,minmax(0,1fr))",gap:10}}>
          {[
            ["Roto",eggReport.totals.roto,"#E63946"], ["Trizados",eggReport.totals.trizados,"#FF9F1C"], ["Total",eggReport.totals.totalPerdido,"#E63946"]
          ].map(([label,value,color])=><div key={label} style={{padding:14,borderRadius:0,background:bgCard2,textAlign:"center"}}><div style={{width:38,height:38,borderRadius:"50%",background:`${color}22`,color,display:"flex",alignItems:"center",justifyContent:"center",margin:"0 auto 8px",fontWeight:900}}>🥚</div><strong style={{display:"block",fontSize:21,color:textPrimary}}>{Number(value).toLocaleString("es-CL")}</strong><span style={{fontSize:11,color:textMuted}}>{label}</span></div>)}
        </div>
        <p style={{margin:"13px 0 0",fontSize:11,color:textMuted}}>Valor perdido al costo real del lote: <strong style={{color:D?"#E63946":"#E63946"}}>{fmt(eggReport.totals.valorPerdido)}</strong></p>
      </div>
      <div style={{...card,borderRadius:0,padding:0,overflow:"hidden"}}>
        <div style={{padding:"15px 16px",borderBottom:`1px solid ${borderColor}`}}><h3 style={{margin:0,fontSize:16,color:textPrimary}}>Detalle por categoría</h3></div>
        <div style={{overflowX:"auto"}}><table style={{width:"100%",borderCollapse:"collapse",minWidth:1350,fontSize:12}}>
          <thead><tr>{["Categoría","Stock inicial","Entradas","Valor entradas","Traspasos","Vendidos","Ingreso","Costo","Ganancia","Roto","Trizados","Total perdido","Valor perdido","Stock final"].map(h=><th key={h} style={{padding:"11px 10px",textAlign:"left",color:textMuted,background:bgCard2,borderBottom:`1px solid ${borderColor}`}}>{h}</th>)}</tr></thead>
          <tbody>{eggReport.categories.map(c=><tr key={c.id}><td style={{padding:11,borderBottom:`1px solid ${borderColor}`,fontWeight:800,color:textPrimary}}>{c.nombre}</td>{[c.stockInicial,c.entradas,fmt(c.valorEntradas),c.traspasos,c.vendidos,fmt(c.ingreso),fmt(c.costo),fmt(c.ganancia),c.roto,c.trizados,c.totalPerdido,fmt(c.valorPerdido),c.stockFinal].map((v,j)=><td key={j} style={{padding:11,borderBottom:`1px solid ${borderColor}`,color:j===7?(D?"#2EC4B6":"#2EC4B6"):j===11?(D?"#E63946":"#E63946"):textSecondary}}>{typeof v==="number"?v.toLocaleString("es-CL"):v}</td>)}</tr>)}
          <tr style={{background:bgCard2,fontWeight:900}}><td style={{padding:11,color:textPrimary}}>TOTAL</td>{[eggReport.totals.stockInicial,eggReport.totals.entradas,fmt(eggReport.totals.valorEntradas),eggReport.totals.traspasos,eggReport.totals.vendidos,fmt(eggReport.totals.ingreso),fmt(eggReport.totals.costo),fmt(eggReport.totals.ganancia),eggReport.totals.roto,eggReport.totals.trizados,eggReport.totals.totalPerdido,fmt(eggReport.totals.valorPerdido),eggReport.totals.stockFinal].map((v,j)=><td key={j} style={{padding:11,color:textPrimary}}>{typeof v==="number"?v.toLocaleString("es-CL"):v}</td>)}</tr>
          </tbody></table></div>
      </div>
    </div>}

    {tab === "estadisticas" && <><div className="dashboard-charts" style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:16}}><div style={card}><h3 style={{margin:"0 0 16px",color:textPrimary,fontSize:14}}>Ventas y roturas por calidad</h3><ResponsiveContainer width="100%" height={280}><BarChart data={chartData}><CartesianGrid strokeDasharray="3 3" stroke={borderColor}/><XAxis dataKey="calidad" tick={{fill:textMuted,fontSize:11}}/><YAxis tick={{fill:textMuted,fontSize:11}}/><Tooltip contentStyle={{background:D?"#1C1A17":"#fff",border:`1px solid ${borderColor}`,borderRadius:0}}/><Bar dataKey="ventas" fill={D?"#2EC4B6":"#2EC4B6"} radius={[5,5,0,0]}/><Bar dataKey="roto" fill={D?"#E63946":"#E63946"} radius={[5,5,0,0]}/></BarChart></ResponsiveContainer></div><div style={card}><h3 style={{margin:"0 0 16px",color:textPrimary,fontSize:14}}>Rentabilidad por calidad</h3>{inventory.map(q=>{const qSales=sales.filter(m=>m.calidadId===q.id);const qRev=qSales.reduce((s,m)=>s+m.ingreso,0);const qProfit=qSales.reduce((s,m)=>s+m.ganancia,0);return <div key={q.id} style={{padding:"12px 0",borderBottom:`1px solid ${borderColor}`}}><div style={{display:"flex",justifyContent:"space-between"}}><strong style={{color:textPrimary,fontSize:13}}>{q.nombre}</strong><strong style={{color:D?"#2EC4B6":"#2EC4B6",fontSize:13}}>{fmt(qProfit)}</strong></div><div style={{display:"flex",justifyContent:"space-between",marginTop:4}}><span style={{color:textMuted,fontSize:11}}>Ventas {fmt(qRev)}</span><span style={{color:textMuted,fontSize:11}}>{qRev>0?`${((qProfit/qRev)*100).toFixed(1)}% margen`:"Sin ventas"}</span></div></div>})}</div></div>
      <div style={{...card,marginTop:16,border:`1.5px solid ${D?"#2EC4B655":"rgba(46,196,182,0.30)"}`}}>
        <h3 style={{margin:"0 0 4px",color:textPrimary,fontSize:14}}>Datos crudos (debug)</h3>
        <p style={{margin:"0 0 14px",color:textMuted,fontSize:12}}>Solo para diagnóstico: muestra tal cual quedaron guardados los movimientos de tipo "entrada". Cópialo y pégalo si algo no calza.</p>
        <pre style={{margin:0,padding:12,borderRadius:0,background:bgCard2,color:textSecondary,fontSize:10.5,overflowX:"auto",maxHeight:280,overflowY:"auto",whiteSpace:"pre-wrap",wordBreak:"break-word"}}>{JSON.stringify(movements.filter(m=>m.tipo==="entrada"||m.tipo==="transferencia").map(m=>({id:m.id,tipo:m.tipo,calidad:m.calidad,calidadId:m.calidadId,fechaIngreso:m.fechaIngreso,fecha:m.fecha,huevos:m.huevos})),null,2)}</pre>
      </div>

      <div style={{...card,marginTop:16,border:`1.5px solid ${D?"#E6394655":"rgba(230,57,70,0.12)"}`}}>
        <h3 style={{margin:"0 0 4px",color:D?"#E63946":"#E63946",fontSize:14}}>Zona de riesgo</h3>
        <p style={{margin:"0 0 14px",color:textMuted,fontSize:12}}>Solo afecta al módulo de Huevos: lotes, stock, ventas, mermas, rotos, trizados, costos y ganancias. El inventario general, productos, categorías, usuarios y configuración no se ven afectados.</p>
        <button onClick={()=>{setResetText("");setResetOk(false);setShowReset(true);}} style={{padding:"10px 16px",borderRadius:0,border:`1.5px solid ${D?"#E63946":"#E63946"}`,background:"transparent",color:D?"#E63946":"#E63946",cursor:"pointer",fontSize:13,fontWeight:700}}>Restablecer inventario de huevos</button>
      </div>
    </>}

    {showMovement && <div style={{position:"fixed",inset:0,background:"rgba(0,0,0,.65)",display:"flex",alignItems:"center",justifyContent:"center",zIndex:250,backdropFilter:"blur(5px)"}}><div className="mobile-modal" style={{...card,width:520,maxHeight:"90vh",overflowY:"auto"}}><div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:18}}><div><h3 style={{margin:0,color:textPrimary,fontSize:18}}>Registrar movimiento de huevos</h3><p style={{margin:"4px 0 0",color:textMuted,fontSize:12}}>Las cantidades se convierten automáticamente</p></div><button onClick={()=>setShowMovement(false)} style={{border:"none",background:bgCard2,color:textMuted,width:32,height:32,borderRadius:0,cursor:"pointer"}}><X size={15}/></button></div><div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:12}}><label style={{fontSize:12,color:textSecondary,fontWeight:700}}>Tipo<select value={form.tipo} onChange={e=>{
  const tipo=e.target.value;
  setForm(f=>({
    ...f,
    tipo,
    motivo:tipo==="rotos"?"Roto":tipo==="trizados"?"Huevos trizados":tipo==="venta"?"Venta":"Compra de mercadería",
    precioUnitarioVenta:tipo==="venta"?String(selectedQuality?.precioVentaUnitario||""):f.precioUnitarioVenta,
    descuento:"",
    fechaIngreso:f.fechaIngreso||todayLocalISO(),
  }));
}} style={{...inp,marginTop:6}}><option value="entrada">Entrada</option><option value="venta">Venta</option><option value="rotos">Roto</option><option value="trizados">Trizados</option><option value="ajuste_entrada">Ajuste de entrada</option><option value="ajuste_salida">Ajuste de salida</option></select></label><label style={{fontSize:12,color:textSecondary,fontWeight:700}}>Calidad<select value={form.calidadId} onChange={e=>{
  const calidadId=e.target.value;
  const calidad=inventory.find(q=>q.id===calidadId);
  setForm(f=>({ ...f, calidadId, precioUnitarioVenta:f.tipo==="venta"?String(calidad?.precioVentaUnitario||""):f.precioUnitarioVenta }));
}} style={{...inp,marginTop:6}}>{inventory.map(q=><option key={q.id} value={q.id}>{q.nombre}</option>)}</select></label></div>{form.tipo!=="venta"&&<><div style={{marginTop:12}}><label style={{fontSize:12,color:textSecondary,fontWeight:700}}>{isUnitLoss?"Cantidad de huevos unitarios":"Cantidad de huevos"}</label><div style={{display:"flex",alignItems:"center",gap:8,marginTop:6}}><button type="button" onClick={()=>updateEggQuantity(Number(form.cantidad||0)-quantityStep)} style={{width:40,height:40,borderRadius:0,border:`1px solid ${borderColor2}`,background:bgCard2,color:textPrimary,fontSize:20,fontWeight:700,cursor:"pointer",flexShrink:0}}>−</button><input type="number" min="0" step={quantityStep} value={form.cantidad} onChange={e=>updateEggQuantity(e.target.value)} style={{...inp,textAlign:"center",padding:"10px 4px",flex:1,minWidth:0,fontSize:18,fontWeight:800}}/><button type="button" onClick={()=>updateEggQuantity(Number(form.cantidad||0)+quantityStep)} style={{width:40,height:40,borderRadius:0,border:"none",background:D?"#2EC4B6":"#2EC4B6",color:"#fff",fontSize:20,fontWeight:700,cursor:"pointer",flexShrink:0}}>+</button></div><div style={{display:"flex",gap:8,marginTop:8,flexWrap:"wrap"}}>{[...(isUnitLoss?[["+1 huevo",1]]:[]),["+1 bandeja",30],["+1 caja",180]].map(([l,q])=><button key={l} type="button" onClick={()=>updateEggQuantity(Number(form.cantidad||0)+q)} style={{padding:"6px 12px",borderRadius:0,border:`1.5px solid ${borderColor2}`,background:bgCard2,color:textSecondary,fontSize:12,fontWeight:700,cursor:"pointer"}}>{l}</button>)}</div></div><div style={{marginTop:12,padding:12,borderRadius:0,background:bgCard2,color:textSecondary,fontSize:12}}>Total del movimiento: <strong style={{color:textPrimary}}>{formUnits.toLocaleString("es-CL")} huevos</strong> · Stock actual: {stockDe(selectedQuality).toLocaleString("es-CL")}</div></>}{form.tipo==="entrada"&&<div style={{marginTop:12,padding:14,borderRadius:0,background:D?"rgba(46,196,182,.12)":"rgba(46,196,182,0.12)",border:`1.5px solid ${D?"#2EC4B655":"rgba(46,196,182,0.30)"}`}}><div style={{display:"flex",alignItems:"center",gap:8,marginBottom:4}}><DollarSign size={16} color={D?"#2EC4B6":"#2EC4B6"}/><strong style={{color:textPrimary,fontSize:13}}>Costo y venta (según configuración)</strong></div><p style={{margin:"0 0 12px",color:textMuted,fontSize:11}}>El costo y el precio de venta se toman de la configuración de "{selectedQuality?.nombre}" (botón ✎ en Inventario). Si ya hay un lote activo con la misma fecha, se suma a él; si es de otra fecha, ese lote se cierra y su stock pasa al nuevo.</p><label style={{display:"block",marginBottom:12,fontSize:11,color:textSecondary,fontWeight:700}}>Fecha de ingreso del lote<input type="date" value={form.fechaIngreso} onChange={e=>setForm({...form,fechaIngreso:e.target.value})} style={{...inp,marginTop:6}}/></label>{purchaseUnitValue<=0||saleUnitValue<=0?<p style={{margin:0,color:D?"#E63946":"#E63946",fontSize:12,fontWeight:700}}>Falta configurar el costo por caja y/o el precio de venta de esta categoría (botón ✎ en Inventario).</p>:formUnits>0&&<div style={{padding:"10px 12px",borderRadius:0,background:D?"#241F1A":"#fff",display:"grid",gridTemplateColumns:"repeat(3,minmax(0,1fr))",gap:12,color:textSecondary,fontSize:11}}><div><span>{formUnits.toLocaleString("es-CL")} huevos × {fmt(purchaseUnitValue)}</span><strong style={{display:"block",marginTop:4,color:textPrimary}}>{fmt(purchaseTotal)} (Costo)</strong></div><div><span>{formUnits.toLocaleString("es-CL")} huevos × {fmt(saleUnitValue)}</span><strong style={{display:"block",marginTop:4,color:textPrimary}}>{fmt(expectedSaleTotal)} (Venta esperada)</strong></div><div><span>Ganancia por huevo: <strong>{fmt(saleUnitValue-purchaseUnitValue)}</strong></span><strong style={{display:"block",marginTop:4,color:expectedProfit>=0?(D?"#2EC4B6":"#2EC4B6"):(D?"#E63946":"#E63946")}}>Ganancia estimada: {fmt(expectedProfit)}</strong><span style={{display:"block",marginTop:4,color:D?"#2EC4B6":"#2EC4B6"}}>Incremento: {expectedMargin.toFixed(2)}%</span></div></div>}</div>}{form.tipo==="venta"&&<div style={{marginTop:12}}><div style={{padding:14,borderRadius:0,background:D?"rgba(142,124,195,.12)":"rgba(142,124,195,0.10)",border:`1.5px solid ${D?"#8E7CC355":"rgba(142,124,195,0.20)"}`,display:"flex",gap:10,alignItems:"flex-start",marginBottom:14}}><DollarSign size={16} color={D?"#8E7CC3":"#8E7CC3"} style={{marginTop:1,flexShrink:0}}/><p style={{margin:0,color:textPrimary,fontSize:12.5,lineHeight:1.5}}>Al crear la venta se descontarán las unidades seleccionadas de tu inventario.</p></div><label style={{display:"block",marginBottom:12,fontSize:11,color:textSecondary,fontWeight:700}}>Fecha del movimiento<input type="date" value={form.fechaIngreso} onChange={e=>setForm({...form,fechaIngreso:e.target.value})} style={{...inp,marginTop:6}}/></label><div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10}}><div><label style={{fontSize:12,color:textSecondary,fontWeight:700}}>Cantidad de huevos (30 o 180) *</label><div style={{display:"flex",alignItems:"center",gap:8,marginTop:6}}><button type="button" onClick={()=>updateEggQuantity(Number(form.cantidad||0)-30)} style={{width:40,height:40,borderRadius:0,border:`1px solid ${borderColor2}`,background:bgCard2,color:textPrimary,fontSize:20,fontWeight:700,cursor:"pointer",flexShrink:0}}>−</button><input type="number" min="0" step="30" value={form.cantidad} readOnly style={{...inp,textAlign:"center",padding:"10px 4px",flex:1,minWidth:0,fontSize:18,fontWeight:800,cursor:"default"}}/><button type="button" onClick={()=>updateEggQuantity(Number(form.cantidad||0)+30)} style={{width:40,height:40,borderRadius:0,border:"none",background:D?"#2EC4B6":"#2EC4B6",color:"#fff",fontSize:20,fontWeight:700,cursor:"pointer",flexShrink:0}}>+</button></div></div><div><label style={{fontSize:12,color:textSecondary,fontWeight:700}}>Precio unitario *</label><div style={{marginTop:6,display:"flex",alignItems:"center",gap:4,...inp,padding:"4px 10px"}}><span style={{color:textMuted,fontSize:14}}>$</span><input type="number" min="0" value={form.precioUnitarioVenta} onChange={e=>setForm({...form,precioUnitarioVenta:e.target.value})} style={{border:"none",outline:"none",background:"transparent",color:textPrimary,fontSize:16,fontWeight:700,width:"100%",padding:"8px 0",fontFamily:"inherit"}}/></div></div></div><div style={{display:"flex",gap:8,marginTop:8,flexWrap:"wrap"}}>{[["+1 bandeja",30],["+1 caja",180]].map(([l,q])=><button key={q} type="button" onClick={()=>updateEggQuantity(Number(form.cantidad||0)+q)} style={{padding:"6px 12px",borderRadius:0,border:`1.5px solid ${borderColor2}`,background:bgCard2,color:textSecondary,fontSize:12,fontWeight:700,cursor:"pointer"}}>{l}</button>)}</div>{formUnits>0&&<p style={{margin:"14px 0 0",color:textSecondary,fontSize:13}}>Precio por {formUnits.toLocaleString("es-CL")} unidades: <strong style={{color:textPrimary}}>{fmt(saleGross)}</strong></p>}<div style={{marginTop:14}}><label style={{display:"block",fontSize:12,color:textSecondary,fontWeight:800,marginBottom:8}}>Método de pago</label><div style={{display:"grid",gridTemplateColumns:"repeat(3,minmax(0,1fr))",gap:8}}>{[{id:"efectivo",label:"Efectivo",Icon:Banknote},{id:"tarjeta",label:"Tarjeta",Icon:CreditCard},{id:"transferencia",label:"Transferencia",Icon:Landmark}].map(({id,label,Icon})=>{const active=form.metodoPago===id;return <button key={id} type="button" onClick={()=>setForm({...form,metodoPago:id})} style={{padding:"10px 5px",borderRadius:0,border:`1.5px solid ${active?(D?"#2EC4B6":"#2EC4B6"):borderColor2}`,background:active?(D?"rgba(46,196,182,.14)":"rgba(46,196,182,0.12)"):bgCard2,color:active?(D?"#2EC4B6":"#2EC4B6"):textSecondary,cursor:"pointer",fontFamily:"inherit",fontSize:10,fontWeight:800,display:"flex",flexDirection:"column",alignItems:"center",gap:5}}><Icon size={18}/>{label}</button>})}</div></div><label style={{display:"block",marginTop:12,fontSize:11,color:textSecondary,fontWeight:700}}>Descuento (opcional)<input type="number" min="0" value={form.descuento} onChange={e=>setForm({...form,descuento:e.target.value})} style={{...inp,marginTop:6}}/></label>{ventaUnitPrice<=0?<p style={{margin:"12px 0 0",color:D?"#E63946":"#E63946",fontSize:12,fontWeight:700}}>Ingresa un precio unitario para continuar.</p>:<div style={{marginTop:12,padding:"12px 14px",borderRadius:0,background:D?"#241F1A":"#fff",display:"flex",alignItems:"center",justifyContent:"space-between"}}><div><p style={{margin:0,color:textMuted,fontSize:11}}>{formUnits.toLocaleString("es-CL")} huevos × {fmt(ventaUnitPrice)}{saleDiscount>0?` · Descuento: -${fmt(saleDiscount)}`:""}</p><p style={{margin:"4px 0 0",color:textPrimary,fontSize:13,fontWeight:700}}>Total de la venta</p></div><strong style={{fontSize:22,color:D?"#2EC4B6":"#2EC4B6"}}>{fmt(saleTotal)}</strong></div>}</div>}{["rotos","trizados"].includes(form.tipo)&&<div style={{marginTop:12,padding:14,borderRadius:0,background:D?"rgba(230,57,70,.12)":"rgba(230,57,70,0.10)",border:`1.5px solid ${D?"#E6394655":"rgba(230,57,70,0.12)"}`}}><div style={{display:"flex",alignItems:"center",gap:8,marginBottom:12}}><TrendingDown size={16} color={D?"#E63946":"#E63946"}/><strong style={{color:textPrimary,fontSize:13}}>{form.tipo==="trizados"?"Datos de huevos trizados":"Datos de huevos rotos"}</strong></div><label style={{display:"block",marginBottom:12,fontSize:11,color:textSecondary,fontWeight:700}}>Fecha del movimiento<input type="date" value={form.fechaIngreso} onChange={e=>setForm({...form,fechaIngreso:e.target.value})} style={{...inp,marginTop:6}}/></label><label style={{display:"block",fontSize:11,color:textSecondary,fontWeight:700,marginBottom:6}}>Motivo rápido</label><div style={{display:"flex",flexWrap:"wrap",gap:8}}>{[form.tipo==="trizados"?"Huevos trizados":"Roto","Otro"].map(op=><button key={op} type="button" onClick={()=>setForm(f=>({...f,motivo:op}))} style={{padding:"6px 12px",borderRadius:0,border:`1.5px solid ${form.motivo===op?(D?"#E63946":"#E63946"):borderColor2}`,background:form.motivo===op?(D?"rgba(230,57,70,.16)":"rgba(230,57,70,0.10)"):bgCard2,color:form.motivo===op?(D?"#E63946":"#E63946"):textSecondary,fontSize:12,fontWeight:700,cursor:"pointer"}}>{op}</button>)}</div></div>}<label style={{display:"block",marginTop:12,fontSize:12,color:textSecondary,fontWeight:700}}>Motivo<input value={form.motivo} onChange={e=>setForm({...form,motivo:e.target.value})} style={{...inp,marginTop:6}}/></label><label style={{display:"block",marginTop:12,fontSize:12,color:textSecondary,fontWeight:700}}>Observaciones<textarea value={form.observaciones} onChange={e=>setForm({...form,observaciones:e.target.value})} style={{...inp,marginTop:6,minHeight:70,resize:"vertical"}}/></label>{error&&<p style={{margin:"10px 0 0",color:D?"#E63946":"#E63946",fontSize:12,fontWeight:700}}>{error}</p>}<div style={{display:"flex",gap:10,marginTop:18}}><button onClick={()=>setShowMovement(false)} style={{flex:1,padding:11,borderRadius:0,border:`1px solid ${borderColor2}`,background:bgCard2,color:textSecondary,cursor:"pointer",fontWeight:700}}>Cancelar</button><button onClick={registerMovement} disabled={guardandoMov} className="btn-primary" style={{flex:1,padding:11,borderRadius:0,opacity:guardandoMov?.6:1,cursor:guardandoMov?"not-allowed":"pointer"}}>{guardandoMov?"Guardando...":(form.tipo==="venta"?"Registrar venta":"Guardar movimiento")}</button></div></div></div>}

    {showEdit && <div style={{position:"fixed",inset:0,background:"rgba(0,0,0,.65)",display:"flex",alignItems:"center",justifyContent:"center",zIndex:250}}><div className="mobile-modal" style={{...card,width:430}}><div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:16}}><h3 style={{margin:0,color:textPrimary}}>Configurar {editForm.nombre}</h3><button onClick={()=>setShowEdit(null)} style={{border:"none",background:bgCard2,color:textMuted,width:32,height:32,borderRadius:0,cursor:"pointer"}}><X size={15}/></button></div>{[["Costo por caja","costoCaja"],["Precio venta unitario (por huevo)","precioVentaUnitario"],["Precio promoción (por huevo)","precioPromocionUnitario"],["Incremento sobre costo (%)","incrementoPct"],["Stock mínimo (cajas)","stockMinimoCajas"]].map(([l,k])=><label key={k} style={{display:"block",marginBottom:12,fontSize:12,color:textSecondary,fontWeight:700}}>{l}<input type="number" min="0" value={editForm[k] ?? 0} onChange={e=>setEditForm({...editForm,[k]:e.target.value})} style={{...inp,marginTop:6}}/></label>)}<button onClick={saveQuality} className="btn-primary" style={{width:"100%",padding:11,borderRadius:0}}>Guardar configuración</button></div></div>}

    {showReset && <div style={{position:"fixed",inset:0,background:"rgba(0,0,0,.65)",display:"flex",alignItems:"center",justifyContent:"center",zIndex:260,backdropFilter:"blur(5px)"}}><div className="mobile-modal" style={{...card,width:440}}>
      {resetOk ? <>
        <div style={{display:"flex",alignItems:"center",gap:10,marginBottom:6}}><div style={{width:36,height:36,borderRadius:0,background:D?"rgba(46,196,182,.16)":"rgba(46,196,182,0.12)",display:"flex",alignItems:"center",justifyContent:"center"}}><Check size={18} color={D?"#2EC4B6":"#2EC4B6"}/></div><h3 style={{margin:0,color:textPrimary,fontSize:16}}>Listo</h3></div>
        <p style={{margin:"0 0 18px",color:textSecondary,fontSize:13}}>El módulo de Huevos fue restablecido correctamente.</p>
        <button onClick={()=>setShowReset(false)} className="btn-primary" style={{width:"100%",padding:11,borderRadius:0}}>Cerrar</button>
      </> : <>
        <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:14}}><h3 style={{margin:0,color:D?"#E63946":"#E63946",fontSize:16}}>Restablecer inventario de huevos</h3><button onClick={()=>setShowReset(false)} style={{border:"none",background:bgCard2,color:textMuted,width:32,height:32,borderRadius:0,cursor:"pointer"}}><X size={15}/></button></div>
        <p style={{margin:"0 0 14px",padding:12,borderRadius:0,background:D?"rgba(230,57,70,.12)":"rgba(230,57,70,0.10)",color:textPrimary,fontSize:12.5,lineHeight:1.5}}>Esta acción eliminará permanentemente todos los registros del módulo Huevos. El inventario general no será afectado.</p>
        <label style={{display:"block",fontSize:12,color:textSecondary,fontWeight:700,marginBottom:6}}>Escribe <strong style={{color:textPrimary}}>RESTABLECER HUEVOS</strong> para confirmar</label>
        <input value={resetText} onChange={e=>setResetText(e.target.value)} style={{...inp,marginBottom:16}} placeholder="RESTABLECER HUEVOS"/>
        {error && <p style={{margin:"0 0 12px",color:D?"#E63946":"#E63946",fontSize:12,fontWeight:700}}>{error}</p>}
        <div style={{display:"flex",gap:10}}>
          <button onClick={()=>setShowReset(false)} style={{flex:1,padding:11,borderRadius:0,border:`1px solid ${borderColor2}`,background:bgCard2,color:textSecondary,cursor:"pointer",fontWeight:700}}>Cancelar</button>
          <button
            disabled={resetText!=="RESTABLECER HUEVOS"||resetting}
            onClick={async ()=>{
              setError(""); setResetting(true);
              try { await resetEggModule(); setResetOk(true); }
              catch (e) { setError(e.message || "No se pudo restablecer el módulo de huevos."); }
              finally { setResetting(false); }
            }}
            style={{flex:1,padding:11,borderRadius:0,border:"none",cursor:resetText!=="RESTABLECER HUEVOS"?"not-allowed":"pointer",fontWeight:700,color:"#fff",background:resetText!=="RESTABLECER HUEVOS"?(D?"#2A2723":"#E4E1D6"):(D?"#E63946":"#E63946")}}>
            {resetting?"Restableciendo…":"Restablecer"}
          </button>
        </div>
      </>}
    </div></div>}

    <button
      onClick={() => openQuickAction("entrada", selectedQuality || inventory[0])}
      title="Agregar huevos"
      style={{
        position:"fixed", bottom:26, right:26, width:58, height:58, borderRadius:0,
        border:"none", background:D?"#2EC4B6":"#2EC4B6", color:"#fff",
        boxShadow:"0 6px 18px rgba(0,0,0,.28)", display:"flex", alignItems:"center",
        justifyContent:"center", cursor:"pointer", zIndex:120,
      }}
    ><Plus size={26}/></button>
  </div>;
}

