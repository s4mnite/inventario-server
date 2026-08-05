import { useEffect, useMemo, useRef, useState } from "react";
import {
  Camera, Upload, Plus, Trash2, Search, Receipt, TrendingDown,
  ShoppingBag, Fuel, Lightbulb, Home, Sparkles, MoreHorizontal,
  CheckCircle, AlertCircle, X, Calendar, FileText, Package, ChevronDown, Image as ImageIcon,
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

let tesseractPromise = null;
function loadTesseract() {
  if (window.Tesseract) return Promise.resolve(window.Tesseract);
  if (tesseractPromise) return tesseractPromise;
  tesseractPromise = new Promise((resolve, reject) => {
    const script = document.createElement("script");
    script.src = "https://cdn.jsdelivr.net/npm/tesseract.js@5/dist/tesseract.min.js";
    script.onload = () => resolve(window.Tesseract);
    script.onerror = () => reject(new Error("No se pudo cargar el lector de boletas."));
    document.head.appendChild(script);
  });
  return tesseractPromise;
}

function normalizarNumero(raw) {
  if (!raw) return 0;
  let clean = String(raw).replace(/[^0-9.,]/g, "").trim();
  if (!clean) return 0;
  // En boletas chilenas el punto suele separar miles y la coma decimales.
  if (/^\d{1,3}(?:\.\d{3})+(?:,\d{1,2})?$/.test(clean)) {
    clean = clean.replace(/\./g, "").replace(",", ".");
  } else if (/^\d{1,3}(?:,\d{3})+$/.test(clean)) {
    clean = clean.replace(/,/g, "");
  } else if (clean.includes(",") && !clean.includes(".")) {
    const [a, b = ""] = clean.split(",");
    clean = b.length === 3 ? `${a}${b}` : `${a}.${b}`;
  } else {
    clean = clean.replace(/,/g, "");
  }
  return Number(clean) || 0;
}

function crearCanvasProcesado(bitmap, mode = "gray") {
  const maxWidth = 2200;
  const scale = Math.min(2.4, Math.max(1, maxWidth / bitmap.width));
  const canvas = document.createElement("canvas");
  canvas.width = Math.max(1, Math.round(bitmap.width * scale));
  canvas.height = Math.max(1, Math.round(bitmap.height * scale));
  const ctx = canvas.getContext("2d", { willReadFrequently: true });
  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = "high";
  ctx.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
  if (mode === "original") return canvas;

  const img = ctx.getImageData(0, 0, canvas.width, canvas.height);
  const d = img.data;
  let sum = 0;
  for (let i = 0; i < d.length; i += 4) {
    const gray = 0.299 * d[i] + 0.587 * d[i + 1] + 0.114 * d[i + 2];
    sum += gray;
    d[i] = d[i + 1] = d[i + 2] = gray;
  }
  const average = sum / (d.length / 4);
  const threshold = Math.max(125, Math.min(205, average * 0.9));
  for (let i = 0; i < d.length; i += 4) {
    let gray = d[i];
    if (mode === "binary") gray = gray < threshold ? 0 : 255;
    else gray = Math.max(0, Math.min(255, (gray - 128) * 1.65 + 128));
    d[i] = d[i + 1] = d[i + 2] = gray;
  }
  ctx.putImageData(img, 0, 0);
  return canvas;
}

async function prepararImagenOCR(file) {
  const bitmap = await createImageBitmap(file);
  return {
    original: crearCanvasProcesado(bitmap, "original"),
    gray: crearCanvasProcesado(bitmap, "gray"),
    binary: crearCanvasProcesado(bitmap, "binary"),
  };
}

function limpiarTextoOCR(texto) {
  return String(texto || "")
    .replace(/\r/g, "\n")
    .replace(/[|]/g, "I")
    .replace(/[“”]/g, '"')
    .split(/\n+/)
    .map(line => line.replace(/[ \t]{2,}/g, " ").trim())
    .filter(Boolean)
    .join("\n")
    .trim();
}

function montoDesdeLinea(linea) {
  const matches = [...String(linea).matchAll(/(?:\$\s*)?([0-9]{1,3}(?:[.\s][0-9]{3})+|[0-9]{3,})(?:,[0-9]{1,2})?/g)];
  return matches.map(m => normalizarNumero(m[1])).filter(n => n >= 1 && n < 100000000);
}

function extraerDatosBoleta(texto) {
  const limpio = limpiarTextoOCR(texto);
  const lines = limpio.split(/\n+/).map(x => x.trim()).filter(Boolean);
  const joined = lines.join(" ");

  // El total se busca por etiqueta y por línea, evitando RUT, folio, fechas y códigos.
  const totalLabels = /\b(TOTAL(?:\s+A\s+PAGAR)?|MONTO\s+TOTAL|TOTAL\s+PAGADO|TOTAL\s+BOLETA|A\s+PAGAR|PAGO\s+TOTAL|TOTAL\s+COMPRA)\b/i;
  const excludedMoneyLine = /RUT|FOLIO|BOLETA\s*(?:N|NRO|N°|NO)|FACTURA\s*(?:N|NRO|N°|NO)|DOCUMENTO|TEL[EÉ]FONO|FECHA|HORA|CAJA|VUELTO|CAMBIO/i;
  const labelledTotals = lines
    .filter(line => totalLabels.test(line) && !excludedMoneyLine.test(line))
    .flatMap(line => montoDesdeLinea(line));
  let total = labelledTotals.length ? labelledTotals.at(-1) : 0;

  if (!total) {
    const candidates = lines
      .filter(line => !excludedMoneyLine.test(line))
      .flatMap(line => montoDesdeLinea(line))
      .filter(n => n >= 100);
    total = candidates.length ? Math.max(...candidates) : 0;
  }

  const ivaLine = lines.find(line => /\bIVA(?:\s+19\s*%)?|I\.V\.A\.?\b/i.test(line));
  const ivaCandidates = ivaLine ? montoDesdeLinea(ivaLine) : [];
  const iva = ivaCandidates.length ? ivaCandidates.at(-1) : 0;

  const fechaCandidates = [...joined.matchAll(/\b(\d{1,2})[\/.\-](\d{1,2})[\/.\-](\d{2,4})\b/g)];
  let fecha = new Date().toISOString().slice(0, 10);
  for (const match of fechaCandidates) {
    let [, d, m, y] = match;
    if (y.length === 2) y = `20${y}`;
    const dd = Number(d), mm = Number(m), yy = Number(y);
    if (yy >= 2020 && yy <= 2100 && mm >= 1 && mm <= 12 && dd >= 1 && dd <= 31) {
      fecha = `${yy}-${String(mm).padStart(2, "0")}-${String(dd).padStart(2, "0")}`;
      break;
    }
  }

  const ignorar = /BOLETA|FACTURA|RUT|TOTAL|IVA|FECHA|GIRO|DIRECCI[ÓO]N|FONO|CAJA|VENDEDOR|DOCUMENTO|ELECTR[ÓO]NICA|SII|WWW\.|CLIENTE|TERMINAL/i;
  const comercioCandidates = lines.slice(0, 15)
    .map((line, idx) => {
      const cleaned = line.replace(/[^\p{L}\p{N}&.'\-\s]/gu, " ").replace(/\s+/g, " ").trim();
      const letters = (cleaned.match(/[\p{L}]/gu) || []).length;
      const uppercase = (cleaned.match(/[A-ZÁÉÍÓÚÑ]/g) || []).length;
      let score = letters * 2 + uppercase + Math.max(0, 8 - idx);
      if (cleaned.length < 4 || cleaned.length > 80 || ignorar.test(cleaned) || /^[-_.,:;\d\s]+$/.test(cleaned)) score = -999;
      return { cleaned, score };
    })
    .sort((a, b) => b.score - a.score);
  const comercio = comercioCandidates[0]?.score > 0 ? comercioCandidates[0].cleaned : "";

  const docLines = lines.filter(line => /BOLETA|FACTURA|FOLIO|DOCUMENTO/i.test(line) && !totalLabels.test(line));
  let numeroDocumento = "";
  for (const line of docLines) {
    const m = line.match(/(?:N[°ºO.]?|NRO\.?|NO\.?|FOLIO|BOLETA|FACTURA|DOCUMENTO)\s*[:#-]?\s*([0-9]{3,12})/i);
    if (m?.[1]) { numeroDocumento = m[1]; break; }
  }

  return {
    comercio: comercio.slice(0, 80),
    total,
    iva,
    fecha,
    numeroDocumento,
    textoOCR: limpio,
  };
}


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
  imagenUrl: "", textoOCR: "", itemsInventario: [],
});

export default function GastosModule({ currentUser, products = [], categoriasProductos = [], setProducts, darkMode = false }) {
  const [gastos, setGastos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modal, setModal] = useState(false);
  const [form, setForm] = useState(emptyForm);
  const [ocrLoading, setOcrLoading] = useState(false);
  const [ocrProgress, setOcrProgress] = useState(0);
  const [error, setError] = useState("");
  const [busqueda, setBusqueda] = useState("");
  const [categoryOpen, setCategoryOpen] = useState(false);
  const fileRef = useRef(null);
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

  const procesarImagen = async (file) => {
    if (!file) return;
    setError(""); setOcrLoading(true); setOcrProgress(0);
    try {
      const uploadData = new FormData(); uploadData.append("imagen", file);
      const uploadRes = await fetch(`${API}/api/gastos/upload-boleta`, { method: "POST", headers: authHeaders, body: uploadData });
      const uploaded = await leerJsonSeguro(uploadRes, "No se pudo subir la boleta.");
      const Tesseract = await loadTesseract();
      const preparada = await prepararImagenOCR(file);
      const passes = [
        { image: preparada.gray, psm: "6", start: 0, span: 45 },
        { image: preparada.binary, psm: "11", start: 45, span: 45 },
      ];
      const results = [];
      for (const pass of passes) {
        const result = await Tesseract.recognize(pass.image, "spa", {
          logger: m => {
            if (m.status === "recognizing text") {
              setOcrProgress(Math.min(95, Math.round(pass.start + (m.progress || 0) * pass.span)));
            }
          },
          tessedit_pageseg_mode: pass.psm,
          preserve_interword_spaces: "1",
        });
        results.push(result?.data || {});
      }
      const best = results.sort((a, b) => Number(b.confidence || 0) - Number(a.confidence || 0))[0] || {};
      const combinedText = [best.text, ...results.filter(r => r !== best).map(r => r.text)].filter(Boolean).join("\n");
      const datos = extraerDatosBoleta(combinedText);
      setOcrProgress(100);
      setForm(prev => ({ ...prev, ...datos, total: datos.total || prev.total, iva: datos.iva || prev.iva, imagenUrl: uploaded.url }));
    } catch (e) { setError(e.message); }
    finally { setOcrLoading(false); }
  };

  const agregarItemInventario = () => setForm(prev => ({ ...prev, itemsInventario: [...prev.itemsInventario, { productoId: "", cantidad: 1, costoUnitario: 0 }] }));
  const cambiarItem = (i, key, value) => setForm(prev => ({ ...prev, itemsInventario: prev.itemsInventario.map((x, idx) => idx === i ? { ...x, [key]: value } : x) }));
  const quitarItem = i => setForm(prev => ({ ...prev, itemsInventario: prev.itemsInventario.filter((_, idx) => idx !== i) }));

  const guardar = async () => {
    setError("");
    if (!form.comercio.trim()) return setError("Ingresa el comercio o descripción del gasto.");
    if (Number(form.total) <= 0) return setError("Ingresa un total válido.");
    try {
      const payload = { ...form, total: Number(form.total), iva: Number(form.iva || 0), itemsInventario: form.itemsInventario.filter(x => x.productoId && Number(x.cantidad) > 0).map(x => ({ ...x, cantidad: Number(x.cantidad), costoUnitario: Number(x.costoUnitario || 0) })) };
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
        <button onClick={() => { setForm(emptyForm()); setModal(true); setTimeout(() => fileRef.current?.click(), 120); }} style={{ border:`1px solid ${border}`, background:card, color:text, borderRadius:12, padding:"10px 14px", fontWeight:800, display:"flex", gap:7, alignItems:"center" }}><Camera size={17}/> Leer boleta</button>
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

    {modal && <div style={{ position:"fixed",inset:0,zIndex:300,background:"rgba(0,0,0,.55)",display:"flex",alignItems:"flex-end",justifyContent:"center" }}>
      <div style={{ width:"100%",maxWidth:700,maxHeight:"94vh",overflowY:"auto",background:card,borderRadius:"22px 22px 0 0",padding:18,color:text }}>
        <div style={{ display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:14 }}><div><h3 style={{ margin:0,fontSize:19 }}>Registrar gasto</h3><p style={{ margin:"3px 0 0",fontSize:12,color:muted }}>Sube una boleta o ingresa los datos</p></div><button onClick={()=>setModal(false)} style={{ border:0,background:bg,color:text,width:34,height:34,borderRadius:10 }}><X size={18}/></button></div>
        <input ref={fileRef} type="file" accept="image/*" capture="environment" hidden onChange={e=>procesarImagen(e.target.files?.[0])}/>
        <button onClick={()=>fileRef.current?.click()} disabled={ocrLoading} style={{ width:"100%",padding:13,border:`1.5px dashed #e0a800`,background:"#fff8db",color:"#7c5b00",borderRadius:14,fontWeight:850,display:"flex",alignItems:"center",justifyContent:"center",gap:8,marginBottom:14 }}><Upload size={18}/>{ocrLoading?`Leyendo boleta… ${ocrProgress}%`:form.imagenUrl?"Cambiar foto de la boleta":"Tomar o subir foto de la boleta"}</button>
        {form.imagenUrl&&<><div style={{ background:"#ecfdf5",color:"#047857",padding:10,borderRadius:10,fontSize:12,marginBottom:10,display:"flex",gap:7 }}><CheckCircle size={16}/> Imagen guardada y datos extraídos. Revisa antes de confirmar.</div><a href={`${API}${form.imagenUrl}`} target="_blank" rel="noreferrer" style={{display:"flex",alignItems:"center",justifyContent:"center",gap:7,color:"#2563eb",fontSize:12,fontWeight:750,marginBottom:10,textDecoration:"none"}}><ImageIcon size={15}/> Ver foto original</a></>}
        {error&&<div style={{ background:"#fff1f2",color:"#be123c",padding:10,borderRadius:10,fontSize:12,marginBottom:12 }}>{error}</div>}
        <div style={{ display:"grid",gridTemplateColumns:"repeat(2,minmax(0,1fr))",gap:10 }}>
          <label style={{ gridColumn:"1/-1",fontSize:12,fontWeight:750 }}>Comercio / descripción<input value={form.comercio} onChange={e=>setForm({...form,comercio:e.target.value})} style={inputStyle(card,text,border)} /></label>
          <label style={{ fontSize:12,fontWeight:750 }}>Fecha<input type="date" value={form.fecha} onChange={e=>setForm({...form,fecha:e.target.value})} style={inputStyle(card,text,border)} /></label>
          <label style={{ fontSize:12,fontWeight:750 }}>N° boleta/factura<input value={form.numeroDocumento} onChange={e=>setForm({...form,numeroDocumento:e.target.value})} style={inputStyle(card,text,border)} /></label>
          <label style={{ fontSize:12,fontWeight:750 }}>Total<input type="number" value={form.total} onChange={e=>setForm({...form,total:e.target.value})} style={inputStyle(card,text,border)} /></label>
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
        {form.textoOCR && <details style={{marginTop:12,background:bg,border:`1px solid ${border}`,borderRadius:10,padding:"9px 11px"}}><summary style={{cursor:"pointer",fontSize:12,fontWeight:800,color:muted}}>Ver texto leído por OCR</summary><pre style={{whiteSpace:"pre-wrap",fontSize:10,lineHeight:1.45,color:muted,maxHeight:130,overflow:"auto",margin:"8px 0 0"}}>{form.textoOCR}</pre></details>}
        <div style={{ marginTop:16,paddingTop:14,borderTop:`1px solid ${border}` }}>
          <div style={{ display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:8 }}><div><p style={{ margin:0,fontWeight:850 }}>Compra de inventario</p><p style={{ margin:"2px 0 0",fontSize:11,color:muted }}>Opcional: aumenta stock y actualiza costo promedio.</p></div><button onClick={agregarItemInventario} style={{ border:0,background:"#15803d",color:"#fff",borderRadius:10,padding:"8px 10px",fontWeight:800 }}><Plus size={14}/> Producto</button></div>
          {form.itemsInventario.map((it,i)=><div key={i} style={{ display:"grid",gridTemplateColumns:"minmax(0,1fr) 78px 105px 34px",gap:7,marginBottom:7 }}><select value={it.productoId} onChange={e=>cambiarItem(i,"productoId",e.target.value)} style={inputStyle(card,text,border)}><option value="">Producto...</option>{products.map(p=><option key={p.id||p._id} value={p.id||p._id}>{p.nombre}</option>)}</select><input type="number" min="1" value={it.cantidad} onChange={e=>cambiarItem(i,"cantidad",e.target.value)} placeholder="Cant." style={inputStyle(card,text,border)}/><input type="number" min="0" value={it.costoUnitario} onChange={e=>cambiarItem(i,"costoUnitario",e.target.value)} placeholder="Costo unit." style={inputStyle(card,text,border)}/><button onClick={()=>quitarItem(i)} style={{ border:0,background:"#fee2e2",color:"#dc2626",borderRadius:9 }}><X size={15}/></button></div>)}
        </div>
        <button onClick={guardar} disabled={ocrLoading} style={{ width:"100%",marginTop:16,padding:14,border:0,borderRadius:14,background:"#d71920",color:"#fff",fontWeight:900,fontSize:15 }}>Guardar gasto</button>
      </div>
    </div>}
  </div>;
}

function inputStyle(bg,color,border){return{width:"100%",boxSizing:"border-box",marginTop:5,padding:"10px 11px",border:`1px solid ${border}`,borderRadius:10,background:bg,color,outline:"none",fontSize:13}}
