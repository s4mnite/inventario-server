import { useEffect, useMemo, useState } from "react";
import {
  Plus, Trash2, Pencil, Search, Receipt, TrendingDown,
  ShoppingBag, Fuel, Lightbulb, Home, Sparkles, MoreHorizontal,
  CheckCircle, AlertCircle, X, Package, ChevronDown,
} from "lucide-react";
import { API, fmt } from "./lib/utils";

// Debe coincidir con las mismas constantes usadas en HuevosModule.jsx:
// una caja de huevos tiene 180 unidades y una bandeja 30.
const EGG_BOX_UNITS = 180;
const EGG_TRAY_UNITS = 30;

const CATEGORIAS_BASE = [
  { id: "huevos", label: "Huevos", icon: Package },
  { id: "combustible", label: "Combustible", icon: Fuel },
  { id: "servicios", label: "Servicios", icon: Lightbulb },
  { id: "arriendo", label: "Arriendo", icon: Home },
  { id: "aseo", label: "Aseo", icon: Sparkles },
  { id: "otros", label: "Otros", icon: MoreHorizontal },
];

async function leerJsonSeguro(res, mensaje) {
  const tipo = res.headers.get("content-type") || "";
  const texto = await res.text();
  if (!tipo.includes("application/json")) {
    throw new Error(`${mensaje} El backend respondió ${res.status} sin JSON. Verifica que esté desplegada la API de Gastos.`);
  }
  let data;
  try { data = texto ? JSON.parse(texto) : {}; }
  catch { throw new Error(`${mensaje} La respuesta del backend no es JSON válido.`); }
  if (!res.ok) throw new Error(data.error || mensaje);
  return data;
}

const emptyForm = () => ({
  comercio: "", fecha: new Date().toISOString().slice(0, 10), total: "", iva: "",
  categoria: "huevos", metodoPago: "Efectivo", numeroDocumento: "", notas: "",
  itemsInventario: [],
});

const emptyItemInventario = () => ({
  productoId: "", nombre: "", costoActual: 0,
  tipo: "producto", // "producto" | "huevo"
  modo: "unitario", // "unitario" | "manga"
  cantidad: 1, costoUnitario: 0,
  unidadesPorManga: 0, precioManga: 0, cantidadMangas: 1,
  // Solo para tipo "huevo": la cantidad se ingresa en cajas/bandejas (no en
  // huevos sueltos), y el costo se ingresa como lo que se paga por caja —
  // igual que la lógica del módulo Huevos — nunca como precio de venta.
  calidadId: "", cajasHuevos: 1, bandejasHuevos: 0, costoCajaCompra: 0,
  // Solo aplica a tipo "producto": si está en false, este ítem se registra
  // en el gasto (monto, nombre, cantidad) pero NO suma stock ni recalcula
  // el costo promedio del producto. Los huevos siempre suman stock (no
  // tienen este interruptor).
  actualizarStock: true,
});

// Unidades totales que suma este ítem al stock, sin importar el modo elegido.
function unidadesItem(it) {
  if (it.modo === "manga") return Math.max(0, Number(it.cantidadMangas || 0)) * Math.max(0, Number(it.unidadesPorManga || 0));
  return Math.max(0, Number(it.cantidad || 0));
}

// Costo por unidad, calculado automáticamente cuando el modo es manga/bulto.
function costoUnitarioItem(it) {
  if (it.modo === "manga") {
    const unidadesPorManga = Math.max(0, Number(it.unidadesPorManga || 0));
    return unidadesPorManga > 0 ? Math.max(0, Number(it.precioManga || 0)) / unidadesPorManga : 0;
  }
  return Math.max(0, Number(it.costoUnitario || 0));
}

function subtotalItem(it) {
  if (it.modo === "manga") return Math.max(0, Number(it.cantidadMangas || 0)) * Math.max(0, Number(it.precioManga || 0));
  return Math.max(0, Number(it.cantidad || 0)) * Math.max(0, Number(it.costoUnitario || 0));
}

export default function GastosModule({ currentUser, products = [], categoriasProductos = [], setProducts, darkMode = false }) {
  const [gastos, setGastos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modal, setModal] = useState(false);
  const [form, setForm] = useState(emptyForm);
  const [editingId, setEditingId] = useState(null); // null = gasto nuevo; string = editando ese id
  const [error, setError] = useState("");
  const [guardando, setGuardando] = useState(false); // evita doble envío (doble tap) mientras la petición está en curso
  const [busqueda, setBusqueda] = useState("");
  const [categoryOpen, setCategoryOpen] = useState(false);
  const [huevosInventory, setHuevosInventory] = useState([]);
  const [productoBuscadorOpen, setProductoBuscadorOpen] = useState(null); // índice del item cuyo buscador está abierto
  const [productoBusqueda, setProductoBusqueda] = useState("");
  const authHeaders = { "x-usuario": currentUser?.usuario || "", "x-clave": currentUser?._clave || "" };
  const jsonHeaders = { "Content-Type": "application/json", ...authHeaders };

  const bg = darkMode ? "#121110" : "#F2F1EC";
  const card = darkMode ? "#1C1A17" : "#fff";
  const text = darkMode ? "#E9E6DB" : "#1C1A17";
  const muted = darkMode ? "#8C8678" : "#8C8678";
  const border = darkMode ? "#2A2723" : "#E9E6DB";
  const categoriasGasto = useMemo(() => {
    const nombres = [
      ...categoriasProductos.map(c => typeof c === "string" ? c : (c?.nombre || c?.label || c?.categoria || "")),
      ...products.map(p => p?.categoria || p?.category || ""),
    ]
      .map(v => String(v || "").trim())
      .filter(Boolean)
      .filter(v => !/^(huevos?|combustible|servicios?|arriendo|aseo|otros|mercader[ií]a)$/i.test(v));

    const desdeInventario = [...new Map(
      nombres.map(nombre => [nombre.toLocaleLowerCase("es"), nombre])
    ).values()]
      .sort((a, b) => a.localeCompare(b, "es"))
      .map(nombre => ({ id: `producto:${nombre}`, label: nombre, icon: ShoppingBag, grupo: "productos" }));

    return [
      { id: "huevos", label: "Huevos", icon: Package, grupo: "huevos" },
      ...desdeInventario,
      ...CATEGORIAS_BASE.filter(c => c.id !== "huevos").map(c => ({ ...c, grupo: "otros" })),
    ];
  }, [categoriasProductos, products]);

  const cargar = async () => {
    try {
      const res = await fetch(`${API}/api/gastos`, { headers: authHeaders });
      const data = await leerJsonSeguro(res, "No se pudieron cargar los gastos.");
      setGastos(Array.isArray(data) ? data : []);
    } catch (e) { setError(e.message); }
    finally { setLoading(false); }
  };

  useEffect(() => { if (currentUser) cargar(); }, [currentUser?.usuario]);

  // Trae las calidades de huevos configuradas (Súper, Extra, Primera...) para
  // poder ofrecerlas como "producto" al registrar una compra en Gastos, con
  // su costo de compra real (costoCaja), nunca el precio de venta.
  useEffect(() => {
    if (!currentUser?.usuario || !currentUser?._clave) return;
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch(`${API}/api/huevos?_=${Date.now()}`, { headers: authHeaders, cache: "no-store" });
        const data = await leerJsonSeguro(res, "No se pudo cargar el inventario de huevos.");
        if (!cancelled) setHuevosInventory(Array.isArray(data.inventory) ? data.inventory : []);
      } catch { /* si falla, simplemente no se ofrece huevos como producto */ }
    })();
    return () => { cancelled = true; };
  }, [currentUser?.usuario]);

  const hoy = new Date().toISOString().slice(0, 10);
  const mes = hoy.slice(0, 7);
  const resumen = useMemo(() => ({
    hoy: gastos.filter(g => String(g.fecha || "").slice(0, 10) === hoy).reduce((a, g) => a + Number(g.total || 0), 0),
    mes: gastos.filter(g => String(g.fecha || "").slice(0, 7) === mes).reduce((a, g) => a + Number(g.total || 0), 0),
    mercaderia: gastos.filter(g => (String(g.categoria || "").startsWith("producto:") || g.categoria === "huevos") && String(g.fecha || "").slice(0, 7) === mes).reduce((a, g) => a + Number(g.total || 0), 0),
    operaciones: gastos.filter(g => !(String(g.categoria || "").startsWith("producto:") || g.categoria === "huevos") && String(g.fecha || "").slice(0, 7) === mes).reduce((a, g) => a + Number(g.total || 0), 0),
  }), [gastos, hoy, mes]);

  const agregarItemInventario = () => setForm(prev => ({ ...prev, itemsInventario: [...prev.itemsInventario, emptyItemInventario()] }));

  const seleccionarProductoItem = (i, productoId) => setForm(prev => ({
    ...prev,
    itemsInventario: prev.itemsInventario.map((x, idx) => {
      if (idx !== i) return x;

      if (String(productoId).startsWith("huevo:")) {
        const calidadId = String(productoId).slice(6);
        const calidad = huevosInventory.find(q => q.id === calidadId);
        if (!calidad) return { ...emptyItemInventario(), productoId };
        // Costo de compra actual configurado para esta calidad (costoCaja),
        // NUNCA el precio de venta (precioVentaUnitario / precioCaja).
        const costoCajaCompra = Math.max(0, Number(calidad.costoCaja || 0));
        const costoActual = costoCajaCompra / EGG_BOX_UNITS;
        const cajasHuevos = 1, bandejasHuevos = 0;
        return {
          ...emptyItemInventario(),
          productoId, tipo: "huevo", calidadId,
          nombre: `Huevos ${calidad.nombre}`,
          costoActual, costoUnitario: costoActual,
          modo: "unitario",
          cajasHuevos, bandejasHuevos, costoCajaCompra,
          cantidad: cajasHuevos * EGG_BOX_UNITS + bandejasHuevos * EGG_TRAY_UNITS,
        };
      }

      const producto = products.find(p => String(p.id || p._id) === String(productoId));
      if (!producto) return { ...emptyItemInventario(), productoId };
      const costoActual = Math.max(0, Number(producto.costo || 0));
      const unidadesPorManga = Math.max(0, Number(producto.mangaCantidad || 0));
      // Precio real pagado por manga, configurado en el producto (Editar
      // Producto → "Precio compra por manga"). Si el producto no tiene ese
      // dato cargado (productos antiguos, o nunca se llenó ese campo), se
      // usa como respaldo una estimación: costo unitario de compra × unidades
      // por manga. En ambos casos el usuario puede ajustar el monto a lo
      // realmente pagado en esta compra si es distinto.
      // BUG FIX (histórico): antes se precargaba `producto.mangaPrecio`, que
      // es el precio de VENTA del bulto al cliente, nunca el de compra.
      const mangaCostoCompraProducto = Math.max(0, Number(producto.mangaCostoCompra || 0));
      const precioMangaEstimado = mangaCostoCompraProducto > 0
        ? mangaCostoCompraProducto
        : (unidadesPorManga > 0 ? costoActual * unidadesPorManga : 0);
      const tieneManga = Boolean(producto.mangaActiva && unidadesPorManga > 0 && Number(producto.mangaPrecio || 0) > 0);
      return {
        ...x,
        productoId,
        tipo: "producto", calidadId: "",
        nombre: producto.nombre || "",
        costoActual,
        costoUnitario: costoActual,
        unidadesPorManga,
        precioManga: precioMangaEstimado,
        modo: tieneManga ? x.modo : "unitario",
        cantidad: x.cantidad || 1,
        cantidadMangas: x.cantidadMangas || 1,
        actualizarStock: x.actualizarStock ?? true,
      };
    }),
  }));

  const cambiarItem = (i, key, value) => setForm(prev => ({ ...prev, itemsInventario: prev.itemsInventario.map((x, idx) => idx === i ? { ...x, [key]: value } : x) }));
  const cambiarModoItem = (i, modo) => cambiarItem(i, "modo", modo);
  const quitarItem = i => setForm(prev => ({ ...prev, itemsInventario: prev.itemsInventario.filter((_, idx) => idx !== i) }));

  // Para ítems de huevos: la cantidad se ingresa en cajas/bandejas y el costo
  // se ingresa como lo pagado por caja (180 huevos) — igual que en el módulo
  // Huevos. `cantidad` (huevos totales) y `costoUnitario` (costo por huevo)
  // quedan siempre derivados automáticamente para reutilizar los mismos
  // cálculos de subtotal que el resto de los ítems de inventario.
  const cambiarItemHuevo = (i, patch) => setForm(prev => ({
    ...prev,
    itemsInventario: prev.itemsInventario.map((x, idx) => {
      if (idx !== i) return x;
      const next = { ...x, ...patch };
      const cajas = Math.max(0, Number(next.cajasHuevos || 0));
      const bandejas = Math.max(0, Number(next.bandejasHuevos || 0));
      const costoCaja = Math.max(0, Number(next.costoCajaCompra || 0));
      next.cantidad = cajas * EGG_BOX_UNITS + bandejas * EGG_TRAY_UNITS;
      next.costoUnitario = costoCaja / EGG_BOX_UNITS;
      return next;
    }),
  }));

  const subtotalInventario = useMemo(
    () => form.itemsInventario.reduce((acc, it) => acc + subtotalItem(it), 0),
    [form.itemsInventario]
  );
  const totalCalculado = subtotalInventario + Math.max(0, Number(form.iva || 0));

  // Mientras haya productos de inventario cargados, el total del gasto se calcula
  // automáticamente a partir del subtotal de productos + IVA (el IVA sigue siendo editable).
  useEffect(() => {
    if (form.itemsInventario.length === 0) return;
    setForm(prev => (Number(prev.total) === totalCalculado ? prev : { ...prev, total: String(totalCalculado) }));
  }, [totalCalculado, form.itemsInventario.length]);

  // Con productos de inventario cargados, el comercio/descripción se arma solo
  // con los nombres de los productos: no hace falta escribirlo a mano.
  const comercioAutoInventario = useMemo(
    () => form.itemsInventario.map(it => it.nombre).filter(Boolean).join(", "),
    [form.itemsInventario]
  );
  useEffect(() => {
    if (form.itemsInventario.length === 0 || !comercioAutoInventario) return;
    setForm(prev => (prev.comercio === comercioAutoInventario ? prev : { ...prev, comercio: comercioAutoInventario }));
  }, [comercioAutoInventario, form.itemsInventario.length]);

  // Si el gasto quedó compuesto solo por huevos, la categoría se ajusta sola
  // a "huevos" para que el resumen de Mercadería y los reportes lo cuenten
  // correctamente (el usuario igual puede cambiarla a mano después).
  useEffect(() => {
    const tieneHuevo = form.itemsInventario.some(x => x.tipo === "huevo");
    const tieneProducto = form.itemsInventario.some(x => x.tipo !== "huevo" && x.productoId);
    if (tieneHuevo && !tieneProducto && form.categoria !== "huevos") {
      setForm(prev => ({ ...prev, categoria: "huevos" }));
    }
  }, [form.itemsInventario]);

  // Carga un gasto existente en el formulario para editarlo (mismo modal de "Registrar gasto").
  const abrirEditar = (g) => {
    const itemsInventario = (g.itemsInventario || []).map(it => {
      const producto = products.find(p => String(p.id || p._id) === String(it.productoId));
      const costoUnitario = Math.max(0, Number(it.costoUnitario || 0));
      const unidadesPorManga = Math.max(0, Number(producto?.mangaCantidad || 0));
      return {
        productoId: String(it.productoId || ""),
        nombre: it.nombre || producto?.nombre || "",
        costoActual: Math.max(0, Number(producto?.costo ?? it.costoUnitario ?? 0)),
        modo: "unitario",
        cantidad: Math.max(1, Number(it.cantidad || 1)),
        costoUnitario,
        unidadesPorManga,
        // Igual que al elegir un producto nuevo: se estima con el costo de
        // compra, nunca con el precio de venta del bulto (producto.mangaPrecio).
        precioManga: unidadesPorManga > 0 ? costoUnitario * unidadesPorManga : 0,
        cantidadMangas: 1,
        actualizarStock: it.actualizarStock !== false,
      };
    });
    setForm({
      comercio: g.comercio || "",
      fecha: String(g.fecha || "").slice(0, 10) || new Date().toISOString().slice(0, 10),
      total: String(g.total ?? ""),
      iva: String(g.iva ?? ""),
      categoria: g.categoria || "otros",
      metodoPago: g.metodoPago || "Efectivo",
      numeroDocumento: g.numeroDocumento || "",
      notas: g.notas || "",
      itemsInventario,
    });
    setEditingId(g.id || g._id);
    setError("");
    setModal(true);
  };

  // Aplica la compra de huevos registrada desde Gastos al módulo Huevos:
  // suma el stock, recalcula el costo promedio por caja y crea el mismo tipo
  // de movimiento "entrada" que se generaría entrando por ese módulo. Se
  // ejecuta solo al CREAR un gasto nuevo (nunca al editar uno existente).
  const aplicarEntradasHuevos = async (huevoItems, fechaMovimiento) => {
    if (!huevoItems.length) return;
    try {
      // Se relee el inventario justo antes de aplicar los cambios (en vez de
      // usar el estado ya cargado en este componente) para no pisar cambios
      // hechos mientras tanto desde el módulo Huevos en otra sesión.
      const res = await fetch(`${API}/api/huevos?_=${Date.now()}`, { headers: authHeaders, cache: "no-store" });
      const data = await leerJsonSeguro(res, "No se pudo sincronizar el inventario de huevos.");
      let inventory = Array.isArray(data.inventory) ? data.inventory : [];
      const movementsNuevos = [];

      huevoItems.forEach((item, idx) => {
        const units = Math.max(0, Number(item.cantidad || 0));
        const unitCost = Math.max(0, Number(item.costoUnitario || 0));
        const q = inventory.find(x => x.id === item.calidadId);
        if (!q || units <= 0) return;

        const oldStock = Math.max(0, Number(q.stockHuevos || 0));
        const oldUnitCost = Math.max(0, Number(q.costoCaja || 0)) / EGG_BOX_UNITS;
        const totalCompra = units * unitCost;
        const totalCostAfter = (oldStock * oldUnitCost) + totalCompra;
        const nextStock = oldStock + units;
        const averageUnitCost = nextStock > 0 ? totalCostAfter / nextStock : unitCost;

        inventory = inventory.map(x => x.id === q.id
          ? { ...x, stockHuevos: nextStock, costoCaja: Math.round(averageUnitCost * EGG_BOX_UNITS) }
          : x);

        movementsNuevos.push({
          id: Date.now() + idx,
          fechaIngreso: fechaMovimiento,
          fecha: new Date().toISOString(),
          tipo: "entrada",
          calidadId: q.id, calidad: q.nombre,
          cajas: 0, bandejas: 0, unidades: units, huevos: units,
          motivo: "Compra registrada desde Gastos",
          observaciones: form.comercio ? `Vinculado al gasto: ${form.comercio}` : "",
          usuario: currentUser?.usuario || "Usuario",
          ingreso: 0, costo: totalCompra, ganancia: -totalCompra,
          precioCaja: 0, precioBandeja: 0, precioUnidad: 0,
          valorUnitarioCompra: unitCost, totalCompra,
          precioVentaUnitario: Number(q.precioVentaUnitario || 0),
          ventaEsperada: 0, gananciaEstimada: 0, descuento: 0, metodoPago: "",
          origen: "gastos",
        });
      });

      if (!movementsNuevos.length) return;
      const res2 = await fetch(`${API}/api/huevos/movimientos`, {
        method: "POST", headers: jsonHeaders,
        body: JSON.stringify({ inventory, movement: movementsNuevos[0], movements: movementsNuevos }),
      });
      const data2 = await leerJsonSeguro(res2, "No se pudo actualizar el inventario de huevos.");
      setHuevosInventory(data2.inventory || inventory);
    } catch (e) {
      setError(prev => (prev ? `${prev} ` : "") + `El gasto se guardó, pero no se pudo actualizar el inventario de huevos: ${e.message}. Revisa el módulo Huevos.`);
    }
  };

  const guardar = async () => {
    // Protección contra doble tap/doble clic: si ya hay un guardado en curso,
    // ignora los intentos siguientes hasta que termine (éxito o error). Sin
    // esto, dos taps mandaban dos gastos y sumaban el stock de huevos dos
    // veces (el lote nuevo quedaba con el doble de lo ingresado).
    if (guardando) return;
    setError("");
    if (form.itemsInventario.length === 0 && !form.comercio.trim()) return setError("Ingresa el comercio o descripción del gasto.");
    if (Number(form.total) <= 0) return setError("Ingresa un total válido.");
    setGuardando(true);
    try {
      // Los ítems de huevos no viven en la colección "productos": se guardan
      // en el gasto solo como parte del total/descripción, y su stock se
      // aplica aparte contra el módulo Huevos (y únicamente al crear, no al
      // editar — ver aplicarEntradasHuevos).
      const productoItems = form.itemsInventario.filter(x => x.tipo !== "huevo");
      const huevoItems = form.itemsInventario.filter(x => x.tipo === "huevo" && x.calidadId && Number(x.cantidad) > 0 && x.actualizarStock !== false);

      const payload = {
        ...form,
        comercio: form.comercio.trim() || "Compra de inventario",
        total: Number(form.total),
        iva: Number(form.iva || 0),
        itemsInventario: productoItems
          .map(x => ({ productoId: x.productoId, cantidad: unidadesItem(x), costoUnitario: costoUnitarioItem(x), actualizarStock: x.actualizarStock !== false }))
          .filter(x => x.productoId && x.cantidad > 0),
      };
      const res = editingId
        ? await fetch(`${API}/api/gastos/${editingId}`, { method: "PUT", headers: jsonHeaders, body: JSON.stringify(payload) })
        : await fetch(`${API}/api/gastos`, { method: "POST", headers: jsonHeaders, body: JSON.stringify(payload) });
      const data = await leerJsonSeguro(res, editingId ? "No se pudo guardar la edición." : "No se pudo guardar el gasto.");
      setGastos(prev => editingId ? prev.map(g => (g.id || g._id) === editingId ? data.gasto : g) : [data.gasto, ...prev]);
      if (data.productos && setProducts) setProducts(data.productos);
      if (!editingId && huevoItems.length) await aplicarEntradasHuevos(huevoItems, form.fecha);
      setModal(false); setForm(emptyForm()); setEditingId(null);
    } catch (e) { setError(e.message); }
    finally { setGuardando(false); }
  };

  const eliminar = async id => {
    if (!confirm("¿Eliminar este gasto? El stock ingresado no se revertirá automáticamente.")) return;
    const res = await fetch(`${API}/api/gastos/${id}`, { method: "DELETE", headers: authHeaders });
    if (res.ok) setGastos(prev => prev.filter(g => (g.id || g._id) !== id));
  };

  const filtrados = gastos.filter(g => `${g.comercio} ${g.categoria} ${g.numeroDocumento}`.toLowerCase().includes(busqueda.toLowerCase()));

  // Agrupa los gastos filtrados por día (fecha) y ordena los grupos del más
  // reciente al más antiguo, para mostrar la lista separada por fecha con
  // un subtotal por día.
  const gruposPorDia = useMemo(() => {
    const mapa = new Map();
    filtrados.forEach(g => {
      const clave = String(g.fecha || "").slice(0, 10) || "Sin fecha";
      if (!mapa.has(clave)) mapa.set(clave, []);
      mapa.get(clave).push(g);
    });
    return [...mapa.entries()]
      .sort((a, b) => b[0].localeCompare(a[0]))
      .map(([fecha, items]) => ({
        fecha,
        items,
        total: items.reduce((s, g) => s + Number(g.total || 0), 0),
      }));
  }, [filtrados]);

  const etiquetaDia = fecha => {
    if (fecha === hoy) return "Hoy";
    const ayer = new Date(Date.now() - 86400000).toISOString().slice(0, 10);
    if (fecha === ayer) return "Ayer";
    const d = new Date(`${fecha}T00:00:00`);
    if (Number.isNaN(d.getTime())) return fecha;
    return d.toLocaleDateString("es-CL", { weekday: "long", day: "numeric", month: "long" });
  };

  return <div style={{ background:bg, minHeight:"100%", padding:"clamp(12px,2vw,24px)", color:text }}>
    <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", gap:12, marginBottom:18, flexWrap:"wrap" }}>
      <div><h2 style={{ margin:0, fontSize:24 }}>Gastos</h2><p style={{ margin:"4px 0 0", color:muted, fontSize:13 }}>Compras y egresos del local</p></div>
      <div style={{ display:"flex", gap:8 }}>
        <button onClick={() => { setForm(emptyForm()); setEditingId(null); setModal(true); }} style={{ border:0, background:"#E63946", color:"#fff", borderRadius:0, padding:"10px 16px", fontWeight:800, display:"flex", gap:7, alignItems:"center" }}><Plus size={17}/> Nuevo gasto</button>
      </div>
    </div>

    <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fit,minmax(155px,1fr))", gap:10, marginBottom:18 }}>
      {[["Hoy",resumen.hoy,"rgba(255,159,28,0.15)","#FF9F1C"],["Este mes",resumen.mes,"rgba(230,57,70,0.10)","#E63946"],["Mercadería",resumen.mercaderia,"rgba(46,196,182,0.12)","#2EC4B6"],["Operacionales",resumen.operaciones,"rgba(142,124,195,0.10)","#8E7CC3"]].map(([l,v,b,c]) => <div key={l} style={{ background:card, border:`1px solid ${border}`, borderRadius:0, padding:15, boxShadow:"0 5px 18px rgba(0,0,0,.05)" }}><p style={{ margin:0,color:muted,fontSize:12,fontWeight:700 }}>{l}</p><p style={{ margin:"7px 0 0",fontSize:22,fontWeight:900,color:c }}>{fmt(v)}</p></div>)}
    </div>

    <div style={{ background:card, border:`1px solid ${border}`, borderRadius:0, padding:14, marginBottom:14 }}>
      <div style={{ position:"relative" }}><Search size={17} color={muted} style={{ position:"absolute",left:12,top:12 }}/><input value={busqueda} onChange={e=>setBusqueda(e.target.value)} placeholder="Buscar gasto, comercio o boleta..." style={{ width:"100%",boxSizing:"border-box",padding:"11px 12px 11px 38px",border:`1px solid ${border}`,borderRadius:0,background:bg,color:text,outline:"none" }}/></div>
    </div>

    {error && !modal && <div style={{ background:"rgba(230,57,70,0.10)",border:"1px solid rgba(230,57,70,0.12)",color:"#E63946",padding:12,borderRadius:0,marginBottom:12 }}><AlertCircle size={15}/> {error}</div>}
    <div style={{ background:card, border:`1px solid ${border}`, borderRadius:0, overflow:"hidden" }}>
      {loading ? <p style={{ padding:24,color:muted }}>Cargando gastos...</p> : filtrados.length === 0 ? <div style={{ padding:40,textAlign:"center",color:muted }}><Receipt size={38}/><p>No hay gastos registrados.</p></div> : gruposPorDia.map((grupo, gi) => (
        <div key={grupo.fecha}>
          <div style={{ display:"flex",alignItems:"center",justifyContent:"space-between",gap:10,padding:"10px 14px",background:darkMode?"#1C1A17":"#F2F1EC",borderBottom:`1px solid ${border}`,borderTop:gi>0?`1px solid ${border}`:"none",position:"sticky",top:0 }}>
            <p style={{ margin:0,fontSize:12,fontWeight:850,color:muted,textTransform:"capitalize" }}>{etiquetaDia(grupo.fecha)}</p>
            <p style={{ margin:0,fontSize:12,fontWeight:900,color:"#E63946" }}>-{fmt(grupo.total)}</p>
          </div>
          {grupo.items.map((g,i) => {
            const cat = categoriasGasto.find(x=>x.id===g.categoria) || categoriasGasto.at(-1); const Icon=cat.icon;
            return <div key={g.id||g._id} style={{ display:"flex",alignItems:"center",gap:12,padding:14,borderBottom:(i<grupo.items.length-1||gi<gruposPorDia.length-1)?`1px solid ${border}`:"none" }}>
              <div style={{ width:42,height:42,borderRadius:0,background:"rgba(255,159,28,0.15)",display:"flex",alignItems:"center",justifyContent:"center",color:"#FF9F1C" }}><Icon size={19}/></div>
              <div style={{ flex:1,minWidth:0 }}><p style={{ margin:0,fontWeight:850,whiteSpace:"nowrap",overflow:"hidden",textOverflow:"ellipsis" }}>{g.comercio}</p><p style={{ margin:"3px 0 0",color:muted,fontSize:11 }}>{g.fecha} · {cat.label}{g.numeroDocumento?` · N° ${g.numeroDocumento}`:""}</p></div>
              <div style={{ textAlign:"right" }}><p style={{ margin:0,fontWeight:900,color:"#E63946" }}>-{fmt(g.total)}</p>{g.imagenUrl&&<a href={`${API}${g.imagenUrl}`} target="_blank" rel="noreferrer" style={{ color:muted,fontSize:10 }}>Ver boleta</a>}</div>
              <button onClick={()=>abrirEditar(g)} style={{ border:0,background:"transparent",color:"#8E7CC3",padding:7 }}><Pencil size={16}/></button>
              <button onClick={()=>eliminar(g.id||g._id)} style={{ border:0,background:"transparent",color:"#E63946",padding:7 }}><Trash2 size={16}/></button>
            </div>;
          })}
        </div>
      ))}
    </div>

    {modal && <div style={{ position:"fixed",inset:0,height:"100dvh",zIndex:12000,background:"rgba(0,0,0,.55)",display:"flex",alignItems:"flex-end",justifyContent:"center" }}>
      <div style={{ width:"100%",maxWidth:700,maxHeight:"92dvh",display:"flex",flexDirection:"column",background:card,borderRadius:"22px 22px 0 0",color:text,overflow:"hidden" }}>
        <div style={{ display:"flex",justifyContent:"space-between",alignItems:"center",padding:"18px 18px 14px" }}><div><h3 style={{ margin:0,fontSize:19 }}>{editingId?"Editar gasto":"Registrar gasto"}</h3><p style={{ margin:"3px 0 0",fontSize:12,color:muted }}>{editingId?"Modifica los datos del gasto":"Ingresa los datos del gasto"}</p></div><button onClick={()=>{setModal(false);setEditingId(null);}} style={{ border:0,background:bg,color:text,width:34,height:34,borderRadius:0,flexShrink:0 }}><X size={18}/></button></div>

        <div style={{ flex:"1 1 auto",minHeight:0,overflowY:"auto",WebkitOverflowScrolling:"touch",padding:"0 18px",paddingBottom:24 }}>
          {error&&<div style={{ background:"rgba(230,57,70,0.10)",color:"#E63946",padding:10,borderRadius:0,fontSize:12,marginBottom:12 }}>{error}</div>}
          <div style={{ display:"grid",gridTemplateColumns:"repeat(2,minmax(0,1fr))",gap:10 }}>
            {form.itemsInventario.length===0 && <label style={{ gridColumn:"1/-1",fontSize:12,fontWeight:750 }}>Comercio / descripción<input value={form.comercio} onChange={e=>setForm({...form,comercio:e.target.value})} style={inputStyle(card,text,border)} /></label>}
            <label style={{ fontSize:12,fontWeight:750 }}>Fecha<input type="date" value={form.fecha} onChange={e=>setForm({...form,fecha:e.target.value})} style={inputStyle(card,text,border)} /></label>
            <label style={{ fontSize:12,fontWeight:750 }}>N° boleta/factura<input value={form.numeroDocumento} onChange={e=>setForm({...form,numeroDocumento:e.target.value})} style={inputStyle(card,text,border)} /></label>
            <label style={{ fontSize:12,fontWeight:750 }}>Total{form.itemsInventario.length>0&&<span style={{fontWeight:600,color:muted}}> (automático)</span>}<input type="number" value={form.total} readOnly={form.itemsInventario.length>0} onChange={e=>setForm({...form,total:e.target.value})} style={{...inputStyle(card,text,border),...(form.itemsInventario.length>0?{opacity:.65,cursor:"not-allowed"}:{})}} /></label>
            <label style={{ fontSize:12,fontWeight:750 }}>IVA<input type="number" value={form.iva} onChange={e=>setForm({...form,iva:e.target.value})} style={inputStyle(card,text,border)} /></label>
            <div style={{ fontSize:12,fontWeight:750,position:"relative" }}>
              Categoría
              <button type="button" onClick={()=>setCategoryOpen(v=>!v)} style={{...inputStyle(card,text,border),display:"flex",alignItems:"center",justifyContent:"space-between",textAlign:"left",cursor:"pointer"}}>
                <span>{categoriasGasto.find(c=>c.id===form.categoria)?.label || "Seleccionar categoría"}</span><ChevronDown size={16}/>
              </button>
              {categoryOpen && <div style={{position:"absolute",zIndex:20,left:0,right:0,top:"calc(100% + 5px)",background:card,border:`1px solid ${border}`,borderRadius:0,boxShadow:"0 12px 30px rgba(0,0,0,.18)",padding:8,maxHeight:260,overflowY:"auto"}}>
                {["huevos", "productos", "otros"].map(grupo => {
                  const items = categoriasGasto.filter(c => c.grupo === grupo);
                  if (!items.length) return null;
                  const titulo = grupo === "huevos" ? "HUEVOS" : grupo === "productos" ? "CATEGORÍAS DE PRODUCTOS" : "OTROS GASTOS";
                  return <div key={grupo}>
                    <div style={{padding:"7px 10px 5px",fontSize:10,fontWeight:900,letterSpacing:.6,color:muted}}>{titulo}</div>
                    {items.map(c=>{const Icon=c.icon;const selected=c.id===form.categoria;return <button type="button" key={c.id} onClick={()=>{setForm({...form,categoria:c.id});setCategoryOpen(false)}} style={{width:"100%",border:0,borderRadius:0,padding:"10px 11px",marginBottom:4,background:selected?(darkMode?"#2A2723":"rgba(255,159,28,0.15)"):"transparent",color:text,display:"flex",alignItems:"center",gap:9,fontSize:13,fontWeight:selected?850:650,textAlign:"left",cursor:"pointer"}}><Icon size={16} color={selected?"#FF9F1C":muted}/><span style={{flex:1}}>{c.label}</span>{selected&&<CheckCircle size={15} color="#2EC4B6"/>}</button>})}
                  </div>;
                })}
              </div>}
            </div>
            <label style={{ fontSize:12,fontWeight:750 }}>Método de pago<select value={form.metodoPago} onChange={e=>setForm({...form,metodoPago:e.target.value})} style={inputStyle(card,text,border)}><option>Efectivo</option><option>Tarjeta</option><option>Transferencia</option></select></label>
            <label style={{ gridColumn:"1/-1",fontSize:12,fontWeight:750 }}>Observaciones<textarea value={form.notas} onChange={e=>setForm({...form,notas:e.target.value})} style={{...inputStyle(card,text,border),minHeight:65,resize:"vertical"}} /></label>
          </div>

          <div style={{ marginTop:16,paddingTop:14,borderTop:`1px solid ${border}` }}>
            <div style={{ display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:10 }}>
              <div><p style={{ margin:0,fontWeight:850 }}>Compra de inventario</p><p style={{ margin:"2px 0 0",fontSize:11,color:muted }}>Opcional: aumenta stock y actualiza costo promedio.{editingId?" Los huevos solo se pueden agregar al crear un gasto nuevo, no al editar.":""}</p></div>
              <button onClick={agregarItemInventario} style={{ border:0,background:"#2EC4B6",color:"#fff",borderRadius:0,padding:"8px 10px",fontWeight:800,display:"flex",alignItems:"center",gap:6 }}><Plus size={14}/> Producto</button>
            </div>

            {form.itemsInventario.map((it,i)=>{
              const producto = products.find(p=>String(p.id||p._id)===String(it.productoId));
              const tieneManga = Boolean(producto?.mangaActiva && Number(it.unidadesPorManga)>0 && Number(producto?.mangaPrecio)>0);
              const unidades = unidadesItem(it);
              const costoCalc = costoUnitarioItem(it);
              return <div key={i} style={{ border:`1px solid ${border}`,borderRadius:0,padding:10,marginBottom:10,background:bg }}>
                <div style={{ display:"flex",gap:7,marginBottom:8,position:"relative" }}>
                  <button
                    type="button"
                    onClick={() => { setProductoBuscadorOpen(productoBuscadorOpen===i ? null : i); setProductoBusqueda(""); }}
                    style={{ ...inputStyle(card,text,border),marginTop:0,flex:1,display:"flex",alignItems:"center",justifyContent:"space-between",textAlign:"left",cursor:"pointer",gap:8 }}
                  >
                    <span style={{overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap",color: it.productoId ? text : muted}}>
                      {it.productoId
                        ? (it.tipo==="huevo" ? `🥚 ${it.nombre || "Huevo"}` : (producto?.nombre || "Producto..."))
                        : "Producto..."}
                    </span>
                    <ChevronDown size={16}/>
                  </button>

                  {productoBuscadorOpen===i && <div style={{position:"absolute",zIndex:30,left:0,right:0,top:"calc(100% + 5px)",background:card,border:`1px solid ${border}`,borderRadius:0,boxShadow:"0 12px 30px rgba(0,0,0,.18)",maxHeight:320,display:"flex",flexDirection:"column"}}>
                    <input
                      autoFocus
                      value={productoBusqueda}
                      onChange={e=>setProductoBusqueda(e.target.value)}
                      placeholder="Escribe para buscar..."
                      style={{...inputStyle(card,text,border),margin:8,marginBottom:4,flexShrink:0}}
                    />
                    <div style={{overflowY:"auto",padding:8,paddingTop:0}}>
                      {(() => {
                        const q = productoBusqueda.trim().toLowerCase();
                        const huevosFiltrados = (!editingId ? huevosInventory : []).filter(hv => !q || hv.nombre.toLowerCase().includes(q));
                        const productosFiltrados = products.filter(p => !q || p.nombre.toLowerCase().includes(q));
                        if (!huevosFiltrados.length && !productosFiltrados.length) {
                          return <div style={{padding:"14px 10px",fontSize:12,color:muted,textAlign:"center"}}>Sin resultados para "{productoBusqueda}"</div>;
                        }
                        return <>
                          {huevosFiltrados.length>0 && <>
                            <div style={{padding:"7px 10px 5px",fontSize:10,fontWeight:900,letterSpacing:.6,color:muted}}>HUEVOS</div>
                            {huevosFiltrados.map(hv => <button type="button" key={`huevo:${hv.id}`} onClick={()=>{seleccionarProductoItem(i,`huevo:${hv.id}`);setProductoBuscadorOpen(null);}} style={{width:"100%",border:0,borderRadius:0,padding:"10px 11px",marginBottom:4,background:"transparent",color:text,display:"flex",alignItems:"center",gap:9,fontSize:13,fontWeight:650,textAlign:"left",cursor:"pointer"}}>🥚 Huevos - {hv.nombre}</button>)}
                          </>}
                          {productosFiltrados.length>0 && <>
                            <div style={{padding:"7px 10px 5px",fontSize:10,fontWeight:900,letterSpacing:.6,color:muted}}>PRODUCTOS</div>
                            {productosFiltrados.map(p => <button type="button" key={p.id||p._id} onClick={()=>{seleccionarProductoItem(i,p.id||p._id);setProductoBuscadorOpen(null);}} style={{width:"100%",border:0,borderRadius:0,padding:"10px 11px",marginBottom:4,background:"transparent",color:text,display:"flex",alignItems:"center",gap:9,fontSize:13,fontWeight:650,textAlign:"left",cursor:"pointer"}}>{p.nombre}</button>)}
                          </>}
                        </>;
                      })()}
                    </div>
                  </div>}

                  <button onClick={()=>quitarItem(i)} style={{ border:0,background:"rgba(230,57,70,0.10)",color:"#E63946",borderRadius:0,padding:"0 11px",flexShrink:0 }}><X size={15}/></button>
                </div>

                {it.productoId && it.tipo==="huevo" && <>
                  <p style={{ margin:"0 0 8px",fontSize:11,color:muted }}>Costo de compra actual: <strong style={{color:text}}>{fmt(it.costoActual)}</strong> por huevo</p>

                  <button
                    type="button"
                    onClick={()=>cambiarItem(i,"actualizarStock",!(it.actualizarStock!==false))}
                    style={{
                      display:"flex",alignItems:"center",gap:8,width:"100%",
                      border:`1.5px solid ${it.actualizarStock!==false?"#2EC4B6":border}`,
                      background:it.actualizarStock!==false?(darkMode?"rgba(46,196,182,0.15)":"rgba(46,196,182,0.12)"):card,
                      borderRadius:0,padding:"8px 10px",marginBottom:8,cursor:"pointer",textAlign:"left",
                    }}
                  >
                    <span style={{
                      width:32,height:18,borderRadius:0,flexShrink:0,position:"relative",
                      background:it.actualizarStock!==false?"#2EC4B6":(darkMode?"#6B6558":"#D6D2C4"),
                      transition:"background .15s",
                    }}>
                      <span style={{
                        position:"absolute",top:2,left:it.actualizarStock!==false?16:2,
                        width:14,height:14,borderRadius:"50%",background:"#fff",transition:"left .15s",
                      }}/>
                    </span>
                    <span style={{ fontSize:12,fontWeight:750,color:text }}>
                      {it.actualizarStock!==false ? "Agregar al stock" : "No agregar al stock (solo gasto)"}
                    </span>
                  </button>

                  <div style={{ display:"grid",gridTemplateColumns:"1fr 1fr",gap:7 }}>
                    <label style={{ fontSize:11,fontWeight:700,color:muted }}>Cajas (180 c/u)<input type="number" min="0" value={it.cajasHuevos} onChange={e=>cambiarItemHuevo(i,{cajasHuevos:e.target.value})} style={inputStyle(card,text,border)} /></label>
                    <label style={{ fontSize:11,fontWeight:700,color:muted }}>Bandejas (30 c/u)<input type="number" min="0" value={it.bandejasHuevos} onChange={e=>cambiarItemHuevo(i,{bandejasHuevos:e.target.value})} style={inputStyle(card,text,border)} /></label>
                  </div>
                  <label style={{ display:"block",marginTop:7,fontSize:11,fontWeight:700,color:muted }}>Precio pagado por caja (compra)<input type="number" min="0" value={it.costoCajaCompra} onChange={e=>cambiarItemHuevo(i,{costoCajaCompra:e.target.value})} style={inputStyle(card,text,border)} /></label>
                  <p style={{margin:"6px 0 0",fontSize:10,color:muted}}>Este monto es lo pagado al comprar — no el precio de venta al cliente.{it.actualizarStock!==false?" Al guardar, esta entrada se suma automáticamente al stock del módulo Huevos.":" El stock del módulo Huevos no se modificará."}</p>

                  <p style={{ margin:"8px 0 0",fontSize:11,color:muted }}>
                    {it.actualizarStock===false
                      ? <>No se sumará stock · costo por huevo {fmt(costoCalc)}</>
                      : (unidades>0 ? <>Suma <strong style={{color:"#2EC4B6"}}>{unidades.toLocaleString("es-CL")}</strong> huevos al stock · costo por huevo {fmt(costoCalc)}</> : "Ingresa cajas o bandejas para calcular")}
                    {" · "}Subtotal: <strong style={{color:text}}>{fmt(subtotalItem(it))}</strong>
                  </p>
                </>}

                {it.productoId && it.tipo!=="huevo" && <>
                  <p style={{ margin:"0 0 8px",fontSize:11,color:muted }}>Costo actual: <strong style={{color:text}}>{fmt(it.costoActual)}</strong> por unidad</p>

                  <button
                    type="button"
                    onClick={()=>cambiarItem(i,"actualizarStock",!(it.actualizarStock!==false))}
                    style={{
                      display:"flex",alignItems:"center",gap:8,width:"100%",
                      border:`1.5px solid ${it.actualizarStock!==false?"#2EC4B6":border}`,
                      background:it.actualizarStock!==false?(darkMode?"rgba(46,196,182,0.15)":"rgba(46,196,182,0.12)"):card,
                      borderRadius:0,padding:"8px 10px",marginBottom:8,cursor:"pointer",textAlign:"left",
                    }}
                  >
                    <span style={{
                      width:32,height:18,borderRadius:0,flexShrink:0,position:"relative",
                      background:it.actualizarStock!==false?"#2EC4B6":(darkMode?"#6B6558":"#D6D2C4"),
                      transition:"background .15s",
                    }}>
                      <span style={{
                        position:"absolute",top:2,left:it.actualizarStock!==false?16:2,
                        width:14,height:14,borderRadius:"50%",background:"#fff",transition:"left .15s",
                      }}/>
                    </span>
                    <span style={{ fontSize:12,fontWeight:750,color:text }}>
                      {it.actualizarStock!==false ? "Agregar al stock" : "No agregar al stock (solo gasto)"}
                    </span>
                  </button>

                  <div style={{ display:"flex",gap:7,marginBottom:8 }}>
                    <button type="button" onClick={()=>cambiarModoItem(i,"unitario")} style={{ flex:1,padding:"8px",borderRadius:0,border:`1.5px solid ${it.modo==="unitario"?"#E63946":border}`,background:it.modo==="unitario"?(darkMode?"rgba(230,57,70,0.15)":"rgba(255,159,28,0.15)"):card,color:it.modo==="unitario"?"#E63946":muted,fontSize:12,fontWeight:750,cursor:"pointer" }}>○ Unitario</button>
                    <button type="button" disabled={!tieneManga} onClick={()=>cambiarModoItem(i,"manga")} title={tieneManga?"":"Este producto no tiene manga/bulto configurado"} style={{ flex:1,padding:"8px",borderRadius:0,border:`1.5px solid ${it.modo==="manga"?"#FF9F1C":border}`,background:it.modo==="manga"?(darkMode?"rgba(255,159,28,0.2)":"rgba(255,159,28,0.12)"):card,color:it.modo==="manga"?"#FF9F1C":muted,fontSize:12,fontWeight:750,cursor:tieneManga?"pointer":"not-allowed",opacity:tieneManga?1:.5 }}>○ Manga / Bulto</button>
                  </div>

                  {it.modo==="unitario" ? (
                    <div style={{ display:"grid",gridTemplateColumns:"1fr 1fr",gap:7 }}>
                      <label style={{ fontSize:11,fontWeight:700,color:muted }}>Cantidad<input type="number" min="1" value={it.cantidad} onChange={e=>cambiarItem(i,"cantidad",e.target.value)} style={inputStyle(card,text,border)} /></label>
                      <label style={{ fontSize:11,fontWeight:700,color:muted }}>Costo unitario<input type="number" min="0" value={it.costoUnitario} onChange={e=>cambiarItem(i,"costoUnitario",e.target.value)} style={inputStyle(card,text,border)} /></label>
                    </div>
                  ) : (
                    <div style={{ display:"grid",gridTemplateColumns:"1fr 1fr",gap:7 }}>
                      <label style={{ fontSize:11,fontWeight:700,color:muted }}>Cantidad de mangas<input type="number" min="1" value={it.cantidadMangas} onChange={e=>cambiarItem(i,"cantidadMangas",e.target.value)} style={inputStyle(card,text,border)} /></label>
                      <label style={{ fontSize:11,fontWeight:700,color:muted }}>Precio pagado por manga (compra)<input type="number" min="0" value={it.precioManga} onChange={e=>cambiarItem(i,"precioManga",e.target.value)} style={inputStyle(card,text,border)} /></label>
                    </div>
                  )}

                  {it.modo==="manga" && Number(producto?.mangaPrecio||0)>0 && <p style={{margin:"6px 0 0",fontSize:10,color:muted}}>Referencia: precio de venta al público de esta manga {fmt(producto.mangaPrecio)} — no uses este valor como precio de compra.</p>}

                  <p style={{ margin:"8px 0 0",fontSize:11,color:muted }}>
                    {it.actualizarStock===false
                      ? <>No se sumará stock · costo unitario {fmt(costoCalc)}</>
                      : (unidades>0 ? <>Suma <strong style={{color:"#2EC4B6"}}>{unidades}</strong> unidades al stock · costo unitario {fmt(costoCalc)}</> : "Ingresa cantidad para calcular")}
                    {" · "}Subtotal: <strong style={{color:text}}>{fmt(subtotalItem(it))}</strong>
                  </p>
                </>}
              </div>;
            })}

            {form.itemsInventario.length>0 && <div style={{ display:"flex",justifyContent:"space-between",flexWrap:"wrap",gap:8,padding:"10px 2px 2px",fontSize:12 }}>
              <span style={{color:muted}}>Subtotal productos: <strong style={{color:text}}>{fmt(subtotalInventario)}</strong></span>
              <span style={{color:muted}}>IVA: <strong style={{color:text}}>{fmt(Number(form.iva||0))}</strong></span>
              <span style={{color:muted}}>Total: <strong style={{color:"#E63946"}}>{fmt(totalCalculado)}</strong></span>
            </div>}
          </div>
        </div>

        <div style={{ padding:"14px 18px",paddingBottom:"calc(14px + env(safe-area-inset-bottom))",borderTop:`1px solid ${border}`,background:card,flexShrink:0 }}>
          <button onClick={guardar} disabled={guardando} style={{ width:"100%",padding:14,border:0,borderRadius:0,background:"#E63946",color:"#fff",fontWeight:900,fontSize:15,opacity:guardando?.6:1,cursor:guardando?"not-allowed":"pointer" }}>{guardando?"Guardando...":(editingId?"Guardar cambios":"Guardar gasto")}</button>
        </div>
      </div>
    </div>}
  </div>;
}

function inputStyle(bg,color,border){return{width:"100%",boxSizing:"border-box",marginTop:5,padding:"10px 11px",border:`1px solid ${border}`,borderRadius:0,background:bg,color,outline:"none",fontSize:13}}
