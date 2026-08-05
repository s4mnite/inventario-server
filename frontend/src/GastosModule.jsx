import { useEffect, useMemo, useState } from "react";
import {
  Plus, Trash2, Search, Receipt, TrendingDown,
  ShoppingBag, Fuel, Lightbulb, Home, Sparkles, MoreHorizontal,
  CheckCircle, AlertCircle, X, Package, ChevronDown,
} from "lucide-react";
import { API, fmt } from "./lib/utils";

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
  modo: "unitario", // "unitario" | "manga"
  cantidad: 1, costoUnitario: 0,
  unidadesPorManga: 0, precioManga: 0, cantidadMangas: 1,
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
  const [error, setError] = useState("");
  const [busqueda, setBusqueda] = useState("");
  const [categoryOpen, setCategoryOpen] = useState(false);
  const authHeaders = { "x-usuario": currentUser?.usuario || "", "x-clave": currentUser?._clave || "" };

  const bg = darkMode ? "#121522" : "#f7f7f5";
  const card = darkMode ? "#1c2030" : "#fff";
  const text = darkMode ? "#f4f4f5" : "#171717";
  const muted = darkMode ? "#9ca3af" : "#71717a";
  const border = darkMode ? "#303548" : "#ececec";
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
      const producto = products.find(p => String(p.id || p._id) === String(productoId));
      if (!producto) return { ...emptyItemInventario(), productoId };
      const costoActual = Math.max(0, Number(producto.costo || 0));
      const unidadesPorManga = Math.max(0, Number(producto.mangaCantidad || 0));
      const precioManga = Math.max(0, Number(producto.mangaPrecio || 0));
      const tieneManga = Boolean(producto.mangaActiva && unidadesPorManga > 0 && precioManga > 0);
      return {
        ...x,
        productoId,
        nombre: producto.nombre || "",
        costoActual,
        costoUnitario: costoActual,
        unidadesPorManga,
        precioManga,
        modo: tieneManga ? x.modo : "unitario",
        cantidad: x.cantidad || 1,
        cantidadMangas: x.cantidadMangas || 1,
      };
    }),
  }));

  const cambiarItem = (i, key, value) => setForm(prev => ({ ...prev, itemsInventario: prev.itemsInventario.map((x, idx) => idx === i ? { ...x, [key]: value } : x) }));
  const cambiarModoItem = (i, modo) => cambiarItem(i, "modo", modo);
  const quitarItem = i => setForm(prev => ({ ...prev, itemsInventario: prev.itemsInventario.filter((_, idx) => idx !== i) }));

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

  const guardar = async () => {
    setError("");
    if (form.itemsInventario.length === 0 && !form.comercio.trim()) return setError("Ingresa el comercio o descripción del gasto.");
    if (Number(form.total) <= 0) return setError("Ingresa un total válido.");
    try {
      const payload = {
        ...form,
        comercio: form.comercio.trim() || "Compra de inventario",
        total: Number(form.total),
        iva: Number(form.iva || 0),
        itemsInventario: form.itemsInventario
          .map(x => ({ productoId: x.productoId, cantidad: unidadesItem(x), costoUnitario: costoUnitarioItem(x) }))
          .filter(x => x.productoId && x.cantidad > 0),
      };
      const res = await fetch(`${API}/api/gastos`, { method: "POST", headers: { "Content-Type": "application/json", ...authHeaders }, body: JSON.stringify(payload) });
      const data = await leerJsonSeguro(res, "No se pudo guardar el gasto.");
      setGastos(prev => [data.gasto, ...prev]);
      if (data.productos && setProducts) setProducts(data.productos);
      setModal(false); setForm(emptyForm());
    } catch (e) { setError(e.message); }
  };

  const eliminar = async id => {
    if (!confirm("¿Eliminar este gasto? El stock ingresado no se revertirá automáticamente.")) return;
    const res = await fetch(`${API}/api/gastos/${id}`, { method: "DELETE", headers: authHeaders });
    if (res.ok) setGastos(prev => prev.filter(g => (g.id || g._id) !== id));
  };

  const filtrados = gastos.filter(g => `${g.comercio} ${g.categoria} ${g.numeroDocumento}`.toLowerCase().includes(busqueda.toLowerCase()));

  return <div style={{ background:bg, minHeight:"100%", padding:"clamp(12px,2vw,24px)", color:text }}>
    <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", gap:12, marginBottom:18, flexWrap:"wrap" }}>
      <div><h2 style={{ margin:0, fontSize:24 }}>Gastos</h2><p style={{ margin:"4px 0 0", color:muted, fontSize:13 }}>Compras y egresos del local</p></div>
      <div style={{ display:"flex", gap:8 }}>
        <button onClick={() => { setForm(emptyForm()); setModal(true); }} style={{ border:0, background:"#d71920", color:"#fff", borderRadius:12, padding:"10px 16px", fontWeight:800, display:"flex", gap:7, alignItems:"center" }}><Plus size={17}/> Nuevo gasto</button>
      </div>
    </div>

    <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fit,minmax(155px,1fr))", gap:10, marginBottom:18 }}>
      {[["Hoy",resumen.hoy,"#fff3bf","#d97706"],["Este mes",resumen.mes,"#fee2e2","#d71920"],["Mercadería",resumen.mercaderia,"#dcfce7","#15803d"],["Operacionales",resumen.operaciones,"#e0e7ff","#4338ca"]].map(([l,v,b,c]) => <div key={l} style={{ background:card, border:`1px solid ${border}`, borderRadius:16, padding:15, boxShadow:"0 5px 18px rgba(0,0,0,.05)" }}><p style={{ margin:0,color:muted,fontSize:12,fontWeight:700 }}>{l}</p><p style={{ margin:"7px 0 0",fontSize:22,fontWeight:900,color:c }}>{fmt(v)}</p></div>)}
    </div>

    <div style={{ background:card, border:`1px solid ${border}`, borderRadius:16, padding:14, marginBottom:14 }}>
      <div style={{ position:"relative" }}><Search size={17} color={muted} style={{ position:"absolute",left:12,top:12 }}/><input value={busqueda} onChange={e=>setBusqueda(e.target.value)} placeholder="Buscar gasto, comercio o boleta..." style={{ width:"100%",boxSizing:"border-box",padding:"11px 12px 11px 38px",border:`1px solid ${border}`,borderRadius:12,background:bg,color:text,outline:"none" }}/></div>
    </div>

    {error && !modal && <div style={{ background:"#fff1f2",border:"1px solid #fecdd3",color:"#be123c",padding:12,borderRadius:12,marginBottom:12 }}><AlertCircle size={15}/> {error}</div>}
    <div style={{ background:card, border:`1px solid ${border}`, borderRadius:16, overflow:"hidden" }}>
      {loading ? <p style={{ padding:24,color:muted }}>Cargando gastos...</p> : filtrados.length === 0 ? <div style={{ padding:40,textAlign:"center",color:muted }}><Receipt size={38}/><p>No hay gastos registrados.</p></div> : filtrados.map((g,i) => {
        const cat = categoriasGasto.find(x=>x.id===g.categoria) || categoriasGasto.at(-1); const Icon=cat.icon;
        return <div key={g.id||g._id} style={{ display:"flex",alignItems:"center",gap:12,padding:14,borderBottom:i<filtrados.length-1?`1px solid ${border}`:"none" }}>
          <div style={{ width:42,height:42,borderRadius:12,background:"#fff3bf",display:"flex",alignItems:"center",justifyContent:"center",color:"#d97706" }}><Icon size={19}/></div>
          <div style={{ flex:1,minWidth:0 }}><p style={{ margin:0,fontWeight:850,whiteSpace:"nowrap",overflow:"hidden",textOverflow:"ellipsis" }}>{g.comercio}</p><p style={{ margin:"3px 0 0",color:muted,fontSize:11 }}>{g.fecha} · {cat.label}{g.numeroDocumento?` · N° ${g.numeroDocumento}`:""}</p></div>
          <div style={{ textAlign:"right" }}><p style={{ margin:0,fontWeight:900,color:"#d71920" }}>-{fmt(g.total)}</p>{g.imagenUrl&&<a href={`${API}${g.imagenUrl}`} target="_blank" rel="noreferrer" style={{ color:muted,fontSize:10 }}>Ver boleta</a>}</div>
          <button onClick={()=>eliminar(g.id||g._id)} style={{ border:0,background:"transparent",color:"#dc2626",padding:7 }}><Trash2 size={16}/></button>
        </div>;
      })}
    </div>

    {modal && <div style={{ position:"fixed",inset:0,height:"100dvh",zIndex:300,background:"rgba(0,0,0,.55)",display:"flex",alignItems:"flex-end",justifyContent:"center" }}>
      <div style={{ width:"100%",maxWidth:700,maxHeight:"92dvh",display:"flex",flexDirection:"column",background:card,borderRadius:"22px 22px 0 0",color:text,overflow:"hidden" }}>
        <div style={{ display:"flex",justifyContent:"space-between",alignItems:"center",padding:"18px 18px 14px" }}><div><h3 style={{ margin:0,fontSize:19 }}>Registrar gasto</h3><p style={{ margin:"3px 0 0",fontSize:12,color:muted }}>Ingresa los datos del gasto</p></div><button onClick={()=>setModal(false)} style={{ border:0,background:bg,color:text,width:34,height:34,borderRadius:10,flexShrink:0 }}><X size={18}/></button></div>

        <div style={{ flex:"1 1 auto",minHeight:0,overflowY:"auto",WebkitOverflowScrolling:"touch",padding:"0 18px",paddingBottom:24 }}>
          {error&&<div style={{ background:"#fff1f2",color:"#be123c",padding:10,borderRadius:10,fontSize:12,marginBottom:12 }}>{error}</div>}
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
              {categoryOpen && <div style={{position:"absolute",zIndex:20,left:0,right:0,top:"calc(100% + 5px)",background:card,border:`1px solid ${border}`,borderRadius:12,boxShadow:"0 12px 30px rgba(0,0,0,.18)",padding:8,maxHeight:260,overflowY:"auto"}}>
                {["huevos", "productos", "otros"].map(grupo => {
                  const items = categoriasGasto.filter(c => c.grupo === grupo);
                  if (!items.length) return null;
                  const titulo = grupo === "huevos" ? "HUEVOS" : grupo === "productos" ? "CATEGORÍAS DE PRODUCTOS" : "OTROS GASTOS";
                  return <div key={grupo}>
                    <div style={{padding:"7px 10px 5px",fontSize:10,fontWeight:900,letterSpacing:.6,color:muted}}>{titulo}</div>
                    {items.map(c=>{const Icon=c.icon;const selected=c.id===form.categoria;return <button type="button" key={c.id} onClick={()=>{setForm({...form,categoria:c.id});setCategoryOpen(false)}} style={{width:"100%",border:0,borderRadius:9,padding:"10px 11px",marginBottom:4,background:selected?(darkMode?"#27334a":"#fff3bf"):"transparent",color:text,display:"flex",alignItems:"center",gap:9,fontSize:13,fontWeight:selected?850:650,textAlign:"left",cursor:"pointer"}}><Icon size={16} color={selected?"#d97706":muted}/><span style={{flex:1}}>{c.label}</span>{selected&&<CheckCircle size={15} color="#15803d"/>}</button>})}
                  </div>;
                })}
              </div>}
            </div>
            <label style={{ fontSize:12,fontWeight:750 }}>Método de pago<select value={form.metodoPago} onChange={e=>setForm({...form,metodoPago:e.target.value})} style={inputStyle(card,text,border)}><option>Efectivo</option><option>Tarjeta</option><option>Transferencia</option></select></label>
            <label style={{ gridColumn:"1/-1",fontSize:12,fontWeight:750 }}>Observaciones<textarea value={form.notas} onChange={e=>setForm({...form,notas:e.target.value})} style={{...inputStyle(card,text,border),minHeight:65,resize:"vertical"}} /></label>
          </div>

          <div style={{ marginTop:16,paddingTop:14,borderTop:`1px solid ${border}` }}>
            <div style={{ display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:10 }}>
              <div><p style={{ margin:0,fontWeight:850 }}>Compra de inventario</p><p style={{ margin:"2px 0 0",fontSize:11,color:muted }}>Opcional: aumenta stock y actualiza costo promedio.</p></div>
              <button onClick={agregarItemInventario} style={{ border:0,background:"#15803d",color:"#fff",borderRadius:10,padding:"8px 10px",fontWeight:800,display:"flex",alignItems:"center",gap:6 }}><Plus size={14}/> Producto</button>
            </div>

            {form.itemsInventario.map((it,i)=>{
              const producto = products.find(p=>String(p.id||p._id)===String(it.productoId));
              const tieneManga = Boolean(producto?.mangaActiva && Number(it.unidadesPorManga)>0 && Number(producto?.mangaPrecio)>0);
              const unidades = unidadesItem(it);
              const costoCalc = costoUnitarioItem(it);
              return <div key={i} style={{ border:`1px solid ${border}`,borderRadius:12,padding:10,marginBottom:10,background:bg }}>
                <div style={{ display:"flex",gap:7,marginBottom:8 }}>
                  <select value={it.productoId} onChange={e=>seleccionarProductoItem(i,e.target.value)} style={{...inputStyle(card,text,border),marginTop:0,flex:1}}>
                    <option value="">Producto...</option>
                    {products.map(p=><option key={p.id||p._id} value={p.id||p._id}>{p.nombre}</option>)}
                  </select>
                  <button onClick={()=>quitarItem(i)} style={{ border:0,background:"#fee2e2",color:"#dc2626",borderRadius:9,padding:"0 11px",flexShrink:0 }}><X size={15}/></button>
                </div>

                {it.productoId && <>
                  <p style={{ margin:"0 0 8px",fontSize:11,color:muted }}>Costo actual: <strong style={{color:text}}>{fmt(it.costoActual)}</strong> por unidad</p>

                  <div style={{ display:"flex",gap:7,marginBottom:8 }}>
                    <button type="button" onClick={()=>cambiarModoItem(i,"unitario")} style={{ flex:1,padding:"8px",borderRadius:9,border:`1.5px solid ${it.modo==="unitario"?"#d71920":border}`,background:it.modo==="unitario"?(darkMode?"rgba(215,25,32,0.15)":"#fff3bf"):card,color:it.modo==="unitario"?"#d71920":muted,fontSize:12,fontWeight:750,cursor:"pointer" }}>○ Unitario</button>
                    <button type="button" disabled={!tieneManga} onClick={()=>cambiarModoItem(i,"manga")} title={tieneManga?"":"Este producto no tiene manga/bulto configurado"} style={{ flex:1,padding:"8px",borderRadius:9,border:`1.5px solid ${it.modo==="manga"?"#f59e0b":border}`,background:it.modo==="manga"?(darkMode?"rgba(245,158,11,0.2)":"#fffbeb"):card,color:it.modo==="manga"?"#d97706":muted,fontSize:12,fontWeight:750,cursor:tieneManga?"pointer":"not-allowed",opacity:tieneManga?1:.5 }}>○ Manga / Bulto</button>
                  </div>

                  {it.modo==="unitario" ? (
                    <div style={{ display:"grid",gridTemplateColumns:"1fr 1fr",gap:7 }}>
                      <label style={{ fontSize:11,fontWeight:700,color:muted }}>Cantidad<input type="number" min="1" value={it.cantidad} onChange={e=>cambiarItem(i,"cantidad",e.target.value)} style={inputStyle(card,text,border)} /></label>
                      <label style={{ fontSize:11,fontWeight:700,color:muted }}>Costo unitario<input type="number" min="0" value={it.costoUnitario} onChange={e=>cambiarItem(i,"costoUnitario",e.target.value)} style={inputStyle(card,text,border)} /></label>
                    </div>
                  ) : (
                    <div style={{ display:"grid",gridTemplateColumns:"1fr 1fr",gap:7 }}>
                      <label style={{ fontSize:11,fontWeight:700,color:muted }}>Cantidad de mangas<input type="number" min="1" value={it.cantidadMangas} onChange={e=>cambiarItem(i,"cantidadMangas",e.target.value)} style={inputStyle(card,text,border)} /></label>
                      <label style={{ fontSize:11,fontWeight:700,color:muted }}>Precio por manga<input type="number" min="0" value={it.precioManga} onChange={e=>cambiarItem(i,"precioManga",e.target.value)} style={inputStyle(card,text,border)} /></label>
                    </div>
                  )}

                  <p style={{ margin:"8px 0 0",fontSize:11,color:muted }}>
                    {unidades>0 ? <>Suma <strong style={{color:"#15803d"}}>{unidades}</strong> unidades al stock · costo unitario {fmt(costoCalc)}</> : "Ingresa cantidad para calcular"}
                    {" · "}Subtotal: <strong style={{color:text}}>{fmt(subtotalItem(it))}</strong>
                  </p>
                </>}
              </div>;
            })}

            {form.itemsInventario.length>0 && <div style={{ display:"flex",justifyContent:"space-between",flexWrap:"wrap",gap:8,padding:"10px 2px 2px",fontSize:12 }}>
              <span style={{color:muted}}>Subtotal productos: <strong style={{color:text}}>{fmt(subtotalInventario)}</strong></span>
              <span style={{color:muted}}>IVA: <strong style={{color:text}}>{fmt(Number(form.iva||0))}</strong></span>
              <span style={{color:muted}}>Total: <strong style={{color:"#d71920"}}>{fmt(totalCalculado)}</strong></span>
            </div>}
          </div>
        </div>

        <div style={{ padding:"14px 18px",paddingBottom:"calc(14px + env(safe-area-inset-bottom))",borderTop:`1px solid ${border}`,background:card,flexShrink:0 }}>
          <button onClick={guardar} style={{ width:"100%",padding:14,border:0,borderRadius:14,background:"#d71920",color:"#fff",fontWeight:900,fontSize:15 }}>Guardar gasto</button>
        </div>
      </div>
    </div>}
  </div>;
}

function inputStyle(bg,color,border){return{width:"100%",boxSizing:"border-box",marginTop:5,padding:"10px 11px",border:`1px solid ${border}`,borderRadius:10,background:bg,color,outline:"none",fontSize:13}}
