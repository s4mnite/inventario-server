// v3.0.1 responsive
import { useState, useMemo, useEffect, useRef, useCallback } from "react";
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar, Cell,
} from "recharts";
import * as XLSX from "xlsx";
import {
  LayoutDashboard, Package, Tag, BarChart2, ShoppingCart, Settings, Bell, Search,
  Plus, Pencil, Trash2, AlertTriangle, DollarSign, X, LogOut, Banknote, CreditCard,
  ClipboardList, Check, Users, ShoppingBag, Store, Shield, Lock, Sliders, ChevronRight,
  Eye, EyeOff, UserPlus, Edit3, Download, Star, TrendingDown, Award, Activity,
  Smile, Calendar, FileText, Ban, CheckCircle, Mail, Clock, Moon, Sun, RefreshCw,
  Receipt, Zap, Send, AlertCircle, ExternalLink, Printer, Building2,
  TrendingUp, Layers, Scan, Menu,
} from "lucide-react";

import EggModule from "./HuevosModule";
import GastosModule from "./GastosModule";
import ReyDelHuevoInicio from "./ReyDelHuevoInicio";
import { API, fmt, fmtIVA, calcIncrementPct, priceFromIncrement } from "./lib/utils";

// ─── Constantes ───────────────────────────────────────────────────────────────
const APP_VERSION = "4.0.1";

const initialProducts = [];

const initialCategorias = [];
const defaultCatIcons = {};


// Calcula el precio real de una línea de producto respetando mangas/bultos y promociones.
// - En modo manga, `cantidad` representa mangas completas.
// - En modo unidad, primero se valorizan mangas completas, luego promociones completas
//   y finalmente las unidades sueltas al precio normal.
const calcularPrecioProducto = (producto, cantidad, esManga = false) => {
  const qty = Math.max(0, Number(cantidad || 0));
  const precioNormal = Math.max(0, Number(producto?.precio || 0));
  const mangaCantidad = Math.max(0, Number(producto?.mangaCantidad || 0));
  const mangaPrecio = Math.max(0, Number(producto?.mangaPrecio || 0));
  const promoCantidad = Math.max(0, Number(producto?.promoCantMin || 0));
  const promoPrecio = Math.max(0, Number(producto?.promoPrecio || 0));
  const mangaValida = Boolean(producto?.mangaActiva && mangaCantidad > 0 && mangaPrecio > 0);
  const promoValida = Boolean(producto?.promoActiva && promoCantidad > 0 && promoPrecio > 0);

  if (esManga && mangaValida) {
    const subtotal = qty * mangaPrecio;
    return {
      subtotal,
      precio: mangaPrecio,
      unidadesTotales: qty * mangaCantidad,
      unidadesPorManga: mangaCantidad,
      enPromo: false,
      aplicoManga: qty > 0,
      promoLabel: null,
      mangaLabel: `Manga x${mangaCantidad}`,
      pricingLabel: `${qty} manga${qty === 1 ? "" : "s"} × ${mangaPrecio}`,
    };
  }

  let restantes = qty;
  let subtotal = 0;
  let mangas = 0;
  let promos = 0;

  if (mangaValida && restantes >= mangaCantidad) {
    mangas = Math.floor(restantes / mangaCantidad);
    subtotal += mangas * mangaPrecio;
    restantes -= mangas * mangaCantidad;
  }

  if (promoValida && restantes >= promoCantidad) {
    promos = Math.floor(restantes / promoCantidad);
    subtotal += promos * promoPrecio;
    restantes -= promos * promoCantidad;
  }

  subtotal += restantes * precioNormal;
  const precioPromedio = qty > 0 ? subtotal / qty : precioNormal;
  const partes = [];
  if (mangas) partes.push(`${mangas} manga${mangas === 1 ? "" : "s"}`);
  if (promos) partes.push(`${promos} promo${promos === 1 ? "" : "s"}`);
  if (restantes) partes.push(`${restantes} suelta${restantes === 1 ? "" : "s"}`);

  return {
    subtotal,
    precio: precioPromedio,
    unidadesTotales: qty,
    unidadesPorManga: 1,
    enPromo: promos > 0,
    aplicoManga: mangas > 0,
    promoLabel: promoValida ? `${promoCantidad}x${promoPrecio}` : null,
    mangaLabel: mangaValida ? `Manga x${mangaCantidad}` : null,
    pricingLabel: partes.join(" + "),
  };
};

const EMOJI_LIST = [
  "📦","💻","🧹","🏠","🍎","👕","🎮","📚","🔧","🌿","🛒","🎯","🔑","💊","🚗","🍕","🎵","📱",
  "🖥️","⌨️","🖱️","🎧","🧴","🧼","🪑","📓","🔌","💡","🔦","🧰","🪛","🔩","🎨","✏️","📏","🗂️",
  "🧲","⚙️","🏭","🛠️","🧪","🔬","📡","💾","📷","🎥","📺","📻","🎸","🎹","🎺","🎻","🎲",
];


// ─── Storage helpers ──────────────────────────────────────────────────────────
// ventas/boletas: localStorage solo como caché offline, el backend es la fuente de verdad
const getSales   = () => JSON.parse(localStorage.getItem("inv_sales")   || "[]");
const saveSales  = (s) => localStorage.setItem("inv_sales",   JSON.stringify(s));
const getBoletas = () => JSON.parse(localStorage.getItem("inv_boletas") || "[]");
const saveBoletas= (b) => localStorage.setItem("inv_boletas", JSON.stringify(b));
const getConfig  = () => JSON.parse(localStorage.getItem("inv_config") || JSON.stringify({
  negocio: "Mi Negocio", direccion: "", telefono: "", moneda: "CLP", rut: "",
  notifStockBajo: true, notifVentas: true, stockMinimo: 5, tema: "claro",
  siiModo: "simulado", siiRut: "", siiClave: "",
}));
const saveConfig  = (c) => localStorage.setItem("inv_config", JSON.stringify(c));
const getCatIcons = () => JSON.parse(localStorage.getItem("inv_catIcons") || JSON.stringify(defaultCatIcons));
const saveCatIcons= (c) => localStorage.setItem("inv_catIcons", JSON.stringify(c));
const getDarkMode = () => localStorage.getItem("inv_dark") === "true";
const saveDarkMode= (v) => localStorage.setItem("inv_dark", String(v));
const getClientes = () => JSON.parse(localStorage.getItem("inv_clientes") || "[]");
const saveClientes = (c) => localStorage.setItem("inv_clientes", JSON.stringify(c));
// Papelera de productos eliminados: se borran del backend pero se guardan localmente
// para poder restaurarlos (vuelven a crearse en el backend al restaurar).
const getPapelera = () => JSON.parse(localStorage.getItem("inv_papelera") || "[]");
const savePapelera = (p) => localStorage.setItem("inv_papelera", JSON.stringify(p));

// ─────────────────────────────────────────────────────────────────────────────
//  ESCÁNER DE CÓDIGO DE BARRAS
//  Soporta: pistola USB (input rápido) y cámara del teléfono/PC
// ─────────────────────────────────────────────────────────────────────────────
// Carga ZXing desde CDN de forma lazy (solo cuando se necesita)
let zxingPromise = null;
const loadZXing = () => {
  if (zxingPromise) return zxingPromise;
  zxingPromise = new Promise((resolve, reject) => {
    if (window.ZXing) { resolve(window.ZXing); return; }
    const script = document.createElement("script");
    script.src = "https://unpkg.com/@zxing/library@0.19.1/umd/index.min.js";
    script.onload = () => resolve(window.ZXing);
    script.onerror = () => reject(new Error("No se pudo cargar la librería de escaneo."));
    document.head.appendChild(script);
  });
  return zxingPromise;
};

function BarcodeScanner({ onScan, onClose, darkMode }) {
  const videoRef    = useRef(null);
  const readerRef   = useRef(null);
  const streamRef   = useRef(null);
  const [error, setError]     = useState("");
  const [scanning, setScanning] = useState(false);
  const [loading, setLoading]   = useState(true);

  const stopCamera = useCallback(() => {
    try { readerRef.current?.reset(); } catch (_) {}
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(t => t.stop());
      streamRef.current = null;
    }
    setScanning(false);
  }, []);

  useEffect(() => {
    let cancelled = false;

    const start = async () => {
      setError(""); setLoading(true);

      // 1. Intentar primero con BarcodeDetector nativo (Chrome/Edge)
      if ("BarcodeDetector" in window) {
        try {
          const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: "environment" } });
          if (cancelled) { stream.getTracks().forEach(t => t.stop()); return; }
          streamRef.current = stream;
          if (videoRef.current) videoRef.current.srcObject = stream;
          setLoading(false); setScanning(true);

          const detector = new window.BarcodeDetector({
            formats: ["ean_13","ean_8","code_128","code_39","upc_a","upc_e","qr_code"],
          });
          const detect = async () => {
            if (cancelled || !videoRef.current || !streamRef.current) return;
            try {
              const barcodes = await detector.detect(videoRef.current);
              if (barcodes.length > 0) { stopCamera(); onScan(barcodes[0].rawValue); }
              else requestAnimationFrame(detect);
            } catch (_) { requestAnimationFrame(detect); }
          };
          requestAnimationFrame(detect);
          return;
        } catch (e) {
          // Permisos denegados u otro error — caer a ZXing
        }
      }

      // 2. Fallback: ZXing (Safari, Firefox, iOS, etc.)
      try {
        const ZXing = await loadZXing();
        if (cancelled) return;

        const hints = new Map();
        const formats = [
          ZXing.BarcodeFormat.EAN_13, ZXing.BarcodeFormat.EAN_8,
          ZXing.BarcodeFormat.CODE_128, ZXing.BarcodeFormat.CODE_39,
          ZXing.BarcodeFormat.UPC_A, ZXing.BarcodeFormat.UPC_E,
          ZXing.BarcodeFormat.QR_CODE,
        ];
        hints.set(ZXing.DecodeHintType.POSSIBLE_FORMATS, formats);

        const reader = new ZXing.BrowserMultiFormatReader(hints);
        readerRef.current = reader;

        // Obtener cámaras con la API estándar del navegador.
        // Evita depender de BrowserCodeReader.listVideoInputDevices, que no existe
        // en algunas versiones de ZXing.
        const mediaDevices = await navigator.mediaDevices.enumerateDevices();
        const devices = mediaDevices.filter(d => d.kind === "videoinput");
        const backCam = devices.find(d =>
          /back|rear|environment|trasera/i.test(d.label)
        ) || devices[devices.length - 1];

        const deviceId = backCam?.deviceId || undefined;

        setLoading(false); setScanning(true);

        await reader.decodeFromVideoDevice(deviceId, videoRef.current, (result, err, controls) => {
          if (cancelled) { controls?.stop(); return; }
          if (result) {
            controls?.stop();
            stopCamera();
            onScan(result.getText());
          }
          // err puede ser NotFoundException en cada frame sin código — ignorar
        });

        // Guardar stream para poder pararlo
        if (videoRef.current?.srcObject) streamRef.current = videoRef.current.srcObject;

      } catch (e) {
        if (!cancelled) setError(e.message || "No se pudo acceder a la cámara. Verifica los permisos.");
        setLoading(false);
      }
    };

    start();
    return () => { cancelled = true; stopCamera(); };
  }, [onScan, stopCamera]);

  const bg = darkMode ? "#1a1d2e" : "#fff";
  const textPrimary = darkMode ? "#e8eaf6" : "#1a1a2e";
  const textMuted   = darkMode ? "#9ca3af" : "#6b7280";

  return (
    <div style={{ position:"fixed", inset:0, background:"rgba(0,0,0,0.7)", display:"flex", alignItems:"center", justifyContent:"center", zIndex:200, backdropFilter:"blur(6px)" }}>
      <div className="fade-in" style={{ background:bg, borderRadius:20, padding:28, width:"92%", maxWidth:380, boxShadow:"0 30px 80px rgba(0,0,0,0.4)" }}>
        <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", marginBottom:20 }}>
          <div style={{ display:"flex", alignItems:"center", gap:10 }}>
            <div style={{ width:40, height:40, borderRadius:12, background:"linear-gradient(135deg,#d71920,#ef2b32)", display:"flex", alignItems:"center", justifyContent:"center" }}>
              <span style={{ fontSize:20 }}>📷</span>
            </div>
            <div>
              <p style={{ margin:0, fontWeight:800, fontSize:15, color:textPrimary }}>Escáner de cámara</p>
              <p style={{ margin:0, fontSize:11, color:textMuted }}>
                {loading ? "Cargando escáner..." : scanning ? "Apunta al código de barras" : "Listo"}
              </p>
            </div>
          </div>
          <button onClick={() => { stopCamera(); onClose(); }} style={{ background:darkMode?"#252840":"#f3f4f6", border:"none", cursor:"pointer", width:32, height:32, borderRadius:8, fontSize:16 }}>✕</button>
        </div>

        {error ? (
          <div style={{ background:"#fff1f2", border:"1.5px solid #fca5a5", borderRadius:12, padding:16, color:"#e03131", fontSize:13 }}>
            {error}
          </div>
        ) : (
          <div style={{ position:"relative", borderRadius:14, overflow:"hidden", background:"#000", aspectRatio:"4/3" }}>
            {loading && (
              <div style={{ position:"absolute", inset:0, display:"flex", alignItems:"center", justifyContent:"center", background:"#000", zIndex:2 }}>
                <div style={{ textAlign:"center", color:"#fff" }}>
                  <div className="spin" style={{ width:32, height:32, border:"3px solid rgba(255,255,255,0.2)", borderTop:"3px solid #ef2b32", borderRadius:"50%", margin:"0 auto 10px" }} />
                  <p style={{ margin:0, fontSize:12, color:"rgba(255,255,255,0.6)" }}>Iniciando cámara...</p>
                </div>
              </div>
            )}
            <video ref={videoRef} autoPlay playsInline muted style={{ width:"100%", height:"100%", objectFit:"cover" }} />
            {/* Marco de escaneo */}
            {scanning && (
              <div style={{ position:"absolute", inset:0, display:"flex", alignItems:"center", justifyContent:"center" }}>
                <div style={{ width:200, height:120, border:"3px solid #d71920", borderRadius:12, boxShadow:"0 0 0 1000px rgba(0,0,0,0.4)", position:"relative" }}>
                  <div style={{ position:"absolute", top:-2, left:-2, width:20, height:20, borderTop:"4px solid #ef2b32", borderLeft:"4px solid #ef2b32", borderRadius:"4px 0 0 0" }} />
                  <div style={{ position:"absolute", top:-2, right:-2, width:20, height:20, borderTop:"4px solid #ef2b32", borderRight:"4px solid #ef2b32", borderRadius:"0 4px 0 0" }} />
                  <div style={{ position:"absolute", bottom:-2, left:-2, width:20, height:20, borderBottom:"4px solid #ef2b32", borderLeft:"4px solid #ef2b32", borderRadius:"0 0 0 4px" }} />
                  <div style={{ position:"absolute", bottom:-2, right:-2, width:20, height:20, borderBottom:"4px solid #ef2b32", borderRight:"4px solid #ef2b32", borderRadius:"0 0 4px 0" }} />
                  {/* Línea animada de escaneo */}
                  <div className="scan-line" style={{ position:"absolute", left:4, right:4, height:2, background:"linear-gradient(90deg, transparent, #ef2b32, transparent)", borderRadius:2 }} />
                </div>
              </div>
            )}
            {scanning && (
              <div style={{ position:"absolute", bottom:12, left:0, right:0, textAlign:"center", color:"#fff", fontSize:12, fontWeight:600 }}>
                Escaneando...
              </div>
            )}
          </div>
        )}

        <p style={{ margin:"14px 0 0", fontSize:12, color:textMuted, textAlign:"center" }}>
          💡 También puedes usar tu pistola USB directamente en el campo de búsqueda
        </p>
      </div>
    </div>
  );
}

// Simula envío al SII
const enviarBoletaSII = async (boleta, modo) => {
  await new Promise(r => setTimeout(r, 1500));
  if (modo === "simulado") {
    const estados = ["aceptado", "aceptado", "aceptado", "pendiente", "rechazado"];
    const estado = estados[Math.floor(Math.random() * estados.length)];
    return {
      estadoSII: estado,
      trackId: `SIM_${Date.now()}`,
      mensaje: estado === "aceptado" ? "Documento aceptado por el SII"
              : estado === "pendiente" ? "Documento en proceso de validación"
              : "Documento rechazado: error en estructura",
      timestamp: new Date().toISOString(),
    };
  }
  // Modo producción (preparado para implementar con API real del SII)
  return { estadoSII: "pendiente", trackId: `PROD_${Date.now()}`, mensaje: "Enviado a SII (producción)", timestamp: new Date().toISOString() };
};

// Genera número de boleta único basado en el array actual (ya no depende de localStorage)
const generarNumeroBoleta = (boletasActuales) => {
  const ultimo = boletasActuales.length > 0 ? Math.max(...boletasActuales.map(b => b.numero || 0)) : 0;
  return ultimo + 1;
};

// ─── Dark Mode CSS ──────────────────────────────────────────────────────────── 
const getDarkVars = () => `
  :root {
    --bg-main: #151815;
    --bg-card: #1d211d;
    --bg-card2: #242923;
    --bg-hover: #293630;
    --bg-input: #1d211d;
    --border: #2a2e28;
    --border2: #343a32;
    --text-primary: #edefea;
    --text-secondary: #9ca39b;
    --text-muted: #6b716a;
    --sidebar-bg: #191d19;
    --header-bg: #191d19;
    --shadow: rgba(0,0,0,0.4);
    --accent: #ffc400;
    --accent-strong: #63c2a6;
    --accent-bg: rgba(79,174,147,0.15);
  }
`;
const getLightVars = () => `
  :root {
    --bg-main: #f7f6f3;
    --bg-card: #ffffff;
    --bg-card2: #f2f1ec;
    --bg-hover: #ecf4f0;
    --bg-input: #fafaf8;
    --border: #e9e7e0;
    --border2: #dedcd3;
    --text-primary: #20241f;
    --text-secondary: #5b6660;
    --text-muted: #93998f;
    --sidebar-bg: #ffffff;
    --header-bg: #ffffff;
    --shadow: rgba(32,36,31,0.05);
    --accent: #d71920;
    --accent-strong: #245a4c;
    --accent-bg: #e4f0ec;
  }
`;

const css = `
  @import url('https://fonts.googleapis.com/css2?family=Sora:wght@300;400;500;600;700;800&family=JetBrains+Mono:wght@400;600&display=swap');
  * { box-sizing: border-box; margin: 0; padding: 0; }
  body { font-family: 'Sora', sans-serif; }
  ::-webkit-scrollbar { width: 5px; height: 5px; }
  ::-webkit-scrollbar-track { background: var(--bg-main); }
  ::-webkit-scrollbar-thumb { background: var(--border2); border-radius: 10px; }
  input, select, button, textarea { font-family: 'Sora', sans-serif; }
  .nav-btn { transition: all 0.15s ease; color: var(--text-secondary); }
  .nav-btn:hover { background: var(--bg-hover) !important; color: var(--accent) !important; }
  .nav-btn.active { background: var(--accent) !important; color: #fff !important; box-shadow: 0 3px 10px var(--accent-bg); }
  .card-hover { transition: box-shadow 0.2s, transform 0.2s; }
  .card-hover:hover { box-shadow: 0 10px 28px var(--shadow); transform: translateY(-2px); }
  .btn-primary { background: var(--accent); color: #fff; border: none; cursor: pointer; font-weight: 600; transition: all 0.15s; }
  .btn-primary:hover { background: var(--accent-strong); transform: translateY(-1px); }
  .btn-danger { background: #fbeae4; color: #b3452f; border: 1px solid #f0d3c7; cursor: pointer; transition: all 0.15s; }
  .btn-danger:hover { background: #b3452f; color: #fff; }
  .btn-success { background: var(--accent-bg); color: var(--accent); border: 1px solid var(--accent-bg); cursor: pointer; transition: all 0.15s; font-weight: 600; }
  .btn-success:hover { background: var(--accent); color: #fff; }
  .empty-state { display: flex; flex-direction: column; align-items: center; justify-content: center; text-align: center; padding: 64px 24px; border-radius: 20px; background: var(--bg-card); border: 1.5px dashed var(--border2); }
  .toggle-switch { width: 46px; height: 26px; border-radius: 99px; border: none; cursor: pointer; position: relative; transition: background 0.2s; }
  .toggle-thumb { width: 20px; height: 20px; border-radius: 50%; background: #fff; position: absolute; top: 3px; transition: left 0.2s; box-shadow: 0 1px 4px rgba(0,0,0,0.2); }
  .fade-in { animation: fadeIn 0.25s ease; }
  @keyframes fadeIn { from { opacity: 0; transform: translateY(6px); } to { opacity: 1; transform: translateY(0); } }
  .badge { display: inline-flex; align-items: center; padding: 3px 10px; border-radius: 20px; font-size: 11px; font-weight: 600; }
  .mono { font-family: 'JetBrains Mono', monospace; }
  .config-nav-item { display: flex; align-items: center; gap: 10px; padding: 10px 14px; border-radius: 10px; cursor: pointer; transition: all 0.15s; font-size: 14px; font-weight: 500; color: var(--text-secondary); border: none; background: transparent; width: 100%; text-align: left; }
  .config-nav-item:hover { background: var(--bg-hover); color: var(--accent); }
  .config-nav-item.active { background: var(--accent-bg); color: var(--accent); font-weight: 600; }
  .search-dropdown { position: absolute; top: 100%; left: 0; right: 0; background: var(--bg-card); border: 1.5px solid var(--border2); border-radius: 12px; box-shadow: 0 8px 24px var(--shadow); z-index: 50; overflow: hidden; margin-top: 4px; }
  .search-dropdown-item { padding: 10px 14px; cursor: pointer; transition: background 0.1s; display: flex; align-items: center; gap: 10px; color: var(--text-primary); }
  .search-dropdown-item:hover { background: var(--bg-hover); }
  .emoji-grid { display: grid; grid-template-columns: repeat(8, 1fr); gap: 6px; max-height: 240px; overflow-y: auto; padding: 4px; }
  .emoji-btn { width: 36px; height: 36px; border-radius: 8px; border: 1.5px solid transparent; background: var(--bg-card2); font-size: 18px; cursor: pointer; display: flex; align-items: center; justify-content: center; transition: all 0.1s; }
  .emoji-btn:hover { background: var(--accent-bg); border-color: var(--accent); transform: scale(1.1); }
  .emoji-btn.selected { background: var(--accent-bg); border-color: var(--accent); }
  .stat-card { background: var(--bg-card); border-radius: 20px; padding: 22px 24px; border: 1px solid var(--border); box-shadow: 0 2px 10px var(--shadow); }
  @keyframes pulse { 0%,100% { opacity: 1; } 50% { opacity: 0.5; } }
  .pulse { animation: pulse 1.5s infinite; }
  @keyframes spin { to { transform: rotate(360deg); } }
  .spin { animation: spin 1s linear infinite; }
  .boleta-print { background: #fff !important; color: #000 !important; }
  @media print { .no-print { display: none !important; } }
  .step-line { width: 2px; background: var(--border2); margin: 0 auto; }
  .step-dot { width: 10px; height: 10px; border-radius: 50%; flex-shrink: 0; }
  @keyframes scanMove { 0% { top: 8px; } 50% { top: calc(100% - 10px); } 100% { top: 8px; } }
  .scan-line { animation: scanMove 1.8s ease-in-out infinite; }

  /* ── INICIO MÓVIL REY DEL HUEVO ── */
  .rey-mobile-home { display: none; }
  .rey-home-shell { max-width: 520px; margin: 0 auto; }
  .rey-home-hero { position:relative; overflow:hidden; border-radius:0 0 28px 28px; padding:22px 18px 25px; color:#351800; background:linear-gradient(135deg,#ffc400 0%,#ffda52 100%); box-shadow:0 10px 28px rgba(226,164,0,.20); }
  .rey-home-hero::after { content:''; position:absolute; width:150px; height:150px; border-radius:50%; right:-48px; top:-62px; background:rgba(255,255,255,.25); }
  .rey-home-brand { display:flex; align-items:center; gap:12px; position:relative; z-index:1; }
  
  .rey-home-logo img { width:100%; height:100%; object-fit:contain; display:block; border-radius:22px; }
.rey-home-logo { width:55px; height:55px; border-radius:18px; background:rgba(255,255,255,.80); display:flex; align-items:center; justify-content:center; font-size:31px; box-shadow:0 5px 14px rgba(120,60,0,.12); }
  .rey-home-greeting { font-size:21px; line-height:1.15; font-weight:800; color:#c9141e; margin:0; }
  .rey-home-date { margin:5px 0 0; font-size:12px; font-weight:600; color:rgba(53,24,0,.68); text-transform:capitalize; }
  .rey-mobile-body { padding:14px 14px 22px; }
  .rey-section-title { font-size:17px; font-weight:800; color:var(--text-primary); margin:5px 2px 11px; }
  .rey-profit-card { border-radius:24px; padding:19px; background:linear-gradient(145deg,#fff9dd,#fff1ac); border:1px solid #ffe376; box-shadow:0 8px 24px rgba(113,75,0,.10); }
  .rey-profit-top { display:flex; align-items:center; gap:12px; }
  .rey-profit-icon { width:50px; height:50px; border-radius:16px; background:#ffc400; display:flex; align-items:center; justify-content:center; color:#a20c15; }
  .rey-profit-label { font-size:12px; font-weight:700; color:#795b00; margin:0 0 3px; }
  .rey-profit-value { font-size:32px; letter-spacing:-1px; line-height:1.05; font-weight:800; color:#c9141e; margin:0; }
  .rey-profit-compare { display:flex; align-items:center; gap:10px; margin-top:16px; padding-top:14px; border-top:1px solid rgba(124,87,0,.15); }
  .rey-profit-badge { padding:7px 10px; border-radius:11px; font-size:12px; font-weight:800; white-space:nowrap; }
  .rey-profit-badge.up { background:#e7f8ec; color:#138a3d; }
  .rey-profit-badge.down { background:#ffe8e8; color:#d01b27; }
  .rey-yesterday { font-size:12px; color:#765f19; line-height:1.45; }
  .rey-yesterday strong { color:#3a2b00; }
  .rey-summary-grid { display:grid; grid-template-columns:1fr 1fr; gap:10px; }
  .rey-summary-card { border-radius:18px; background:var(--bg-card); border:1px solid var(--border); padding:14px; box-shadow:0 3px 13px var(--shadow); min-width:0; }
  .rey-summary-card.wide { grid-column:1 / -1; }
  .rey-summary-icon { font-size:23px; margin-bottom:7px; }
  .rey-summary-label { font-size:11px; color:var(--text-secondary); margin:0 0 4px; }
  .rey-summary-value { font-size:18px; color:var(--text-primary); font-weight:800; margin:0; overflow-wrap:anywhere; }
  .rey-summary-sub { font-size:10px; color:var(--text-muted); margin-top:3px; }
  .rey-actions-grid { display:grid; grid-template-columns:1fr 1fr; gap:10px; }
  .rey-action-card { border:0; border-radius:20px; min-height:104px; padding:14px 10px; cursor:pointer; font-family:inherit; display:flex; flex-direction:column; align-items:center; justify-content:center; gap:3px; font-weight:800; }
  .rey-action-card.yellow { background:#ffc400; color:#301b00; }
  .rey-action-card.red { background:linear-gradient(145deg,#e30613,#bd0010); color:white; }
  .rey-action-card span:first-child { font-size:29px; }
  .rey-action-card small { opacity:.77; font-size:10px; font-weight:600; }
  .rey-sale-button { width:100%; margin-top:10px; min-height:53px; border:0; border-radius:16px; background:linear-gradient(135deg,#e30613,#bd0010); color:#fff; font-family:inherit; font-size:14px; font-weight:800; cursor:pointer; box-shadow:0 8px 18px rgba(227,6,19,.22); }
  .rey-activity-card { background:var(--bg-card); border:1px solid var(--border); border-radius:20px; overflow:hidden; box-shadow:0 3px 13px var(--shadow); }
  .rey-activity-row { display:flex; gap:11px; align-items:center; padding:13px 14px; border-bottom:1px solid var(--border); }
  .rey-activity-row:last-child { border-bottom:0; }
  .rey-activity-dot { width:39px; height:39px; flex:0 0 39px; border-radius:13px; background:#e9f8ee; color:#138a3d; display:flex; align-items:center; justify-content:center; }
  .rey-activity-main { flex:1; min-width:0; }
  .rey-activity-name { margin:0; font-size:12px; font-weight:700; color:var(--text-primary); white-space:nowrap; overflow:hidden; text-overflow:ellipsis; }
  .rey-activity-meta { margin:3px 0 0; font-size:10px; color:var(--text-muted); }
  .rey-activity-total { font-size:12px; font-weight:800; color:#138a3d; white-space:nowrap; }

  /* ── RESPONSIVE MÓVIL ── */
  @media (max-width: 768px) {
    .rey-mobile-home { display: block !important; }
    .rey-desktop-dashboard { display: none !important; }
    .sidebar-desktop { display: none !important; }
    .main-content { margin-left: 0 !important; padding-bottom: 80px !important; }
    .bottom-nav { display: flex !important; }
    .header-date { display: none !important; }
    .header-search { display: none !important; }
    .header-dark-btn { display: none !important; }
    .stat-card { padding: 12px 14px !important; }
    .dashboard-grid { grid-template-columns: 1fr 1fr !important; gap: 10px !important; }
    .dashboard-charts { grid-template-columns: 1fr !important; }
    .mobile-topbar { padding: 0 14px !important; height: 54px !important; }
    .dashboard-mobile-topbar { display: none !important; }
    .mobile-topbar h1 { font-size: 16px !important; }
    .mobile-main { padding: 12px !important; padding-bottom: 80px !important; }
    .mobile-modal { width: calc(100vw - 24px) !important; max-width: 100% !important; max-height: 85vh !important; overflow-y: auto !important; border-radius: 20px 20px 16px 16px !important; }
    .mobile-modal-full { width: 100vw !important; height: 100vh !important; border-radius: 0 !important; }
    .mobile-bottom-sheet { position: fixed !important; bottom: 0 !important; left: 0 !important; right: 0 !important; border-radius: 20px 20px 0 0 !important; max-height: 92vh !important; overflow-y: auto !important; padding-bottom: calc(24px + env(safe-area-inset-bottom, 0px)) !important; }

    /* ── Productos ── */
    .products-grid { display: none !important; }
    .products-list-mobile { display: block !important; }
    .mobile-products-search { display: flex !important; }

    /* ── Filtros + botón nuevo ── */
    .products-header { flex-direction: column !important; gap: 8px !important; align-items: stretch !important; }
    .cat-filters { overflow-x: auto !important; flex-wrap: nowrap !important; padding-bottom: 4px !important; -webkit-overflow-scrolling: touch; scrollbar-width: none; }
    .cat-filters::-webkit-scrollbar { display: none; }
    .btn-nuevo-desktop { display: none !important; }

    /* ── Stats ── */
    .page-header { flex-direction: column !important; align-items: flex-start !important; gap: 10px !important; margin-bottom: 14px !important; }
    .page-header-actions { width: 100% !important; display: flex !important; justify-content: flex-end !important; }
    .ventas-grid { grid-template-columns: 1fr !important; }
    .stats-grid { grid-template-columns: 1fr 1fr !important; gap: 10px !important; }
    .stats-header { flex-direction: column !important; align-items: stretch !important; gap: 8px !important; }
    .stats-header button { width: 100% !important; justify-content: center !important; }

    /* ── Config ── */
    .config-layout { grid-template-columns: 1fr !important; }
    .config-nav { flex-direction: row !important; overflow-x: auto !important; flex-wrap: nowrap !important; gap: 6px !important; padding: 12px !important; -webkit-overflow-scrolling: touch; }
    .config-nav::-webkit-scrollbar { display: none; }
    .config-nav-item { white-space: nowrap !important; padding: 8px 12px !important; font-size: 12px !important; }
    .chart-section { grid-template-columns: 1fr !important; }
    .boleta-print-modal { width: 100vw !important; height: 100vh !important; padding: 16px !important; border-radius: 0 !important; }

    /* ── Ventas / Caja ── */
    .caja-layout { grid-template-columns: 1fr !important; }
    .caja-carrito { position: fixed !important; bottom: 68px !important; left: 0 !important; right: 0 !important; z-index: 50 !important; border-radius: 20px 20px 0 0 !important; max-height: 55vh !important; overflow-y: auto !important; padding: 16px !important; box-shadow: 0 -8px 30px rgba(0,0,0,0.3) !important; }
    .caja-carrito-toggle { display: flex !important; }

    input, select, textarea { font-size: 16px !important; }
    .table-scroll { overflow-x: auto !important; -webkit-overflow-scrolling: touch; }
    .notif-panel { right: -4px !important; width: calc(100vw - 16px) !important; max-width: 340px !important; }
    .dashboard-stat-value { font-size: 20px !important; }
    .grid-2-mobile { grid-template-columns: 1fr !important; }
    .grid-3-mobile { grid-template-columns: 1fr !important; }
  }
  @media (max-width: 480px) {
    .grid-3-mobile-sm { grid-template-columns: repeat(2,minmax(0,1fr)) !important; }
  }
  @media (min-width: 769px) {
    .bottom-nav { display: none !important; }
    .sidebar-desktop { display: flex !important; }
    .mobile-only { display: none !important; }
  }
  .bottom-nav {
    position: fixed; bottom: 0; left: 0; right: 0; height: 68px;
    background: var(--sidebar-bg); border-top: 1px solid var(--border);
    display: flex; align-items: center; justify-content: space-around;
    z-index: 200; box-shadow: 0 -4px 20px rgba(0,0,0,0.1);
    padding: 0 4px; padding-bottom: env(safe-area-inset-bottom, 0px);
  }
  .bottom-nav-btn {
    display: flex; flex-direction: column; align-items: center; justify-content: center;
    flex: 1; height: 100%; border: none; background: none; cursor: pointer;
    color: var(--text-secondary); font-size: 9px; font-weight: 600; gap: 3px;
    font-family: 'Sora', sans-serif; transition: all 0.15s; padding: 0 2px;
    position: relative; border-radius: 12px; margin: 6px 2px;
  }
  .bottom-nav-btn:active { transform: scale(0.92); }
  .bottom-nav-btn.active { color: var(--accent); }
  .bottom-nav-btn.active .bottom-nav-icon { background: var(--accent-bg); border-radius: 10px; }
  .bottom-nav-btn.active svg { filter: drop-shadow(0 2px 4px rgba(215,25,32,0.38)); }
  .bottom-nav-icon { width: 32px; height: 26px; display: flex; align-items: center; justify-content: center; border-radius: 8px; transition: background 0.15s; }
  .more-menu-overlay { position: fixed; inset: 0; z-index: 190; background: rgba(0,0,0,0.5); backdrop-filter: blur(3px); }
  .more-menu-panel { position: fixed; bottom: 76px; left: 8px; right: 8px; z-index: 195; border-radius: 18px; padding: 14px; box-shadow: 0 -8px 40px rgba(0,0,0,0.2); display: grid; grid-template-columns: repeat(3, 1fr); gap: 8px; }
  .more-menu-btn { display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 6px; padding: 14px 8px; border-radius: 14px; border: none; cursor: pointer; font-family: 'Sora', sans-serif; font-size: 11px; font-weight: 600; transition: all 0.15s; }
  .more-menu-btn:active { transform: scale(0.94); }
  /* Rey del Huevo — sistema visual móvil completo */
  :root { --brand-red:#d71920; --brand-red-2:#ef2b32; --brand-yellow:#ffc400; --brand-cream:#fff8df; }
  body { background:#f7f7f5; }
  .main-content { background:linear-gradient(180deg,#fff8d8 0,#f7f7f5 180px) !important; }
  .mobile-topbar { background:linear-gradient(135deg,#ffc400,#ffd84d) !important; border-bottom:none !important; box-shadow:0 8px 24px rgba(112,76,0,.12) !important; }
  .mobile-topbar h1 { color:#1f1f24 !important; font-weight:900 !important; letter-spacing:-.4px; }
  .bottom-nav { border-top:1px solid #eee !important; box-shadow:0 -10px 30px rgba(30,30,30,.10) !important; border-radius:22px 22px 0 0 !important; padding-top:8px !important; }
  .bottom-nav-btn { border-radius:14px !important; min-height:54px !important; }
  .bottom-nav-btn.active { color:var(--brand-red) !important; background:#fff1f1 !important; }
  .bottom-nav-btn.active .bottom-nav-icon { background:var(--brand-red) !important; color:white !important; border-radius:12px !important; padding:6px !important; width:32px !important; height:32px !important; }
  @media (max-width: 768px) {
    .bottom-nav {
      height: calc(72px + env(safe-area-inset-bottom, 0px)) !important;
      padding: 6px 5px env(safe-area-inset-bottom, 0px) !important;
      gap: 2px !important;
      justify-content: stretch !important;
      overflow: hidden !important;
    }
    .bottom-nav-btn {
      flex: 1 1 20% !important;
      min-width: 0 !important;
      height: 58px !important;
      min-height: 58px !important;
      margin: 0 !important;
      padding: 4px 1px 3px !important;
      gap: 2px !important;
      border-radius: 13px !important;
      overflow: hidden !important;
    }
    .bottom-nav-btn > span:last-child {
      width: 100% !important;
      min-width: 0 !important;
      padding: 0 1px !important;
      font-size: 9px !important;
      line-height: 11px !important;
      white-space: nowrap !important;
      overflow: hidden !important;
      text-overflow: ellipsis !important;
      text-align: center !important;
    }
    .bottom-nav-icon {
      width: 29px !important;
      height: 27px !important;
      flex: 0 0 27px !important;
    }
    .bottom-nav-icon svg { width: 19px !important; height: 19px !important; }
    .bottom-nav-btn.active .bottom-nav-icon {
      width: 29px !important;
      height: 29px !important;
      padding: 5px !important;
    }
    .main-content, .mobile-main {
      padding-bottom: calc(86px + env(safe-area-inset-bottom, 0px)) !important;
    }
    .more-menu-panel {
      bottom: calc(79px + env(safe-area-inset-bottom, 0px)) !important;
      grid-template-columns: repeat(3, minmax(0, 1fr)) !important;
      gap: 7px !important;
      padding: 11px !important;
    }
    .more-menu-btn {
      min-width: 0 !important;
      padding: 11px 5px !important;
      font-size: 10px !important;
      line-height: 13px !important;
      text-align: center !important;
    }
    .egg-tabs-mobile {
      display: grid !important;
      grid-template-columns: repeat(2, minmax(0, 1fr)) !important;
      gap: 7px !important;
      overflow: visible !important;
      padding: 7px !important;
    }
    .egg-tab-mobile {
      width: 100% !important;
      min-width: 0 !important;
      padding: 10px 6px !important;
      font-size: 12px !important;
      white-space: normal !important;
      line-height: 15px !important;
      text-align: center !important;
    }
    .mobile-topbar { padding-left:16px !important; }
    .mobile-products-search {
      display:grid !important;
      grid-template-columns:minmax(0,1fr) 48px !important;
      gap:9px !important;
      align-items:stretch !important;
    }
    .mobile-products-search > div:first-child { min-width:0 !important; }
    .mobile-products-search > button:last-child {
      grid-column:1 / -1 !important; width:100% !important; justify-content:center !important; min-height:48px !important;
    }
    .products-toolbar { display:block !important; margin-bottom:13px !important; }
    .desktop-product-actions { display:none !important; }
    .cat-filters {
      display:grid !important; grid-template-columns:repeat(2,minmax(0,1fr)) !important;
      gap:8px !important; overflow:visible !important; padding:0 !important;
    }
    .cat-filters button {
      min-width:0 !important; width:100% !important; min-height:43px !important;
      padding:8px 7px !important; white-space:normal !important; line-height:1.15 !important;
      font-size:11px !important; overflow-wrap:anywhere !important;
    }
    .mobile-product-card {
      gap:11px !important; padding:12px !important; border-radius:17px !important; align-items:flex-start !important;
    }
    .mobile-product-card > div:first-child > div:first-child { width:72px !important; height:72px !important; border-radius:13px !important; }
    .mobile-product-card p { max-width:100% !important; }
    .mobile-product-card button { min-height:34px; }
  }
  @media (max-width: 370px) {
    .bottom-nav-btn > span:last-child { font-size: 8px !important; }
    .bottom-nav-icon svg { width: 18px !important; height: 18px !important; }
  }

  /* Venta móvil: selector claro para huevos o inventario */
  .sale-choice-overlay { position:fixed; inset:0; z-index:290; background:rgba(16,18,25,.52); backdrop-filter:blur(3px); }
  .sale-choice-sheet { position:fixed; left:0; right:0; bottom:0; z-index:300; background:#fff; border-radius:26px 26px 0 0; padding:20px 18px calc(22px + env(safe-area-inset-bottom,0px)); box-shadow:0 -14px 44px rgba(0,0,0,.2); }
  .sale-choice-head { display:flex; align-items:flex-start; justify-content:space-between; gap:12px; margin-bottom:16px; }
  .sale-choice-head h2 { margin:0; color:#171923; font-size:23px; font-weight:900; }
  .sale-choice-head p { margin:4px 0 0; color:#737987; font-size:13px; }
  .sale-choice-head button { width:38px; height:38px; border:0; border-radius:50%; background:#eef1f5; color:#566273; display:grid; place-items:center; }
  .sale-choice-card { width:100%; display:flex; align-items:center; gap:14px; padding:15px; margin-top:11px; border:1px solid #e7e9ee; border-radius:18px; background:#fff; color:#1c2330; text-align:left; font-family:inherit; box-shadow:0 5px 16px rgba(22,28,38,.06); }
  .sale-choice-card.egg { border-color:#ffd85c; background:#fffaf0; }
  .sale-choice-card.products { border-color:#ffd8db; background:#fff7f7; }
  .sale-choice-icon { width:55px; height:55px; flex:0 0 55px; border-radius:16px; background:#ffc400; display:grid; place-items:center; font-size:29px; color:#d71920; }
  .sale-choice-card.products .sale-choice-icon { background:#ffe3e5; }
  .sale-choice-copy { flex:1; min-width:0; display:flex; flex-direction:column; gap:4px; }
  .sale-choice-copy strong { font-size:16px; font-weight:900; }
  .sale-choice-copy small { color:#747b88; font-size:11px; line-height:1.35; }

  .btn-primary { background:linear-gradient(135deg,var(--brand-red),var(--brand-red-2)) !important; box-shadow:0 7px 18px rgba(215,25,32,.22) !important; border-radius:14px !important; }
  .stat-card,.card-hover { border:1px solid rgba(20,20,20,.055) !important; box-shadow:0 8px 24px rgba(36,31,18,.075) !important; }
  .dashboard-grid > div:first-child { background:linear-gradient(135deg,var(--brand-red),#b80f16) !important; color:#fff !important; }
  .dashboard-grid > div:first-child p,.dashboard-grid > div:first-child svg { color:#fff !important; stroke:#fff !important; }
  .products-grid { gap:12px !important; }
  .product-card-desktop { border-radius:20px !important; overflow:hidden !important; }
  .cat-filters { overflow-x:auto; padding-bottom:5px; scrollbar-width:none; }
  .cat-filters::-webkit-scrollbar { display:none; }
  .cat-filters button { border-radius:999px !important; }
  table { border-collapse:separate !important; border-spacing:0 7px !important; }
  tbody tr { background:var(--bg-card2); }
  input,select,textarea { border-radius:13px !important; min-height:44px; }
  .mobile-bottom-sheet { border-radius:26px 26px 0 0 !important; }
  .more-menu-panel { border-radius:24px 24px 0 0 !important; }
  @media (max-width:768px) {
    .main-content { padding:0 !important; overflow-y:auto !important; }
    .mobile-main { padding:16px 14px 110px !important; }
    .page-header { margin:0 -14px 16px !important; padding:22px 18px 20px !important; background:linear-gradient(135deg,#ffc400,#ffdd62) !important; border-radius:0 0 24px 24px !important; box-shadow:0 10px 25px rgba(126,88,0,.13); }
    .page-header h2,.page-header h1 { font-size:24px !important; font-weight:900 !important; color:#1b1b1f !important; }
    .page-header p { color:#6f5710 !important; }
    .stats-grid { grid-template-columns:repeat(2,minmax(0,1fr)) !important; gap:12px !important; }
    .stats-grid > div,.dashboard-grid > div { border-radius:20px !important; padding:17px 15px !important; min-height:132px; }
    .dashboard-grid { grid-template-columns:repeat(2,minmax(0,1fr)) !important; gap:12px !important; }
    .dashboard-grid > div:first-child { grid-column:1/-1; min-height:150px; }
    .dashboard-stat-value { font-size:24px !important; letter-spacing:-.7px; }
    .dashboard-charts,.ventas-grid,.config-layout { grid-template-columns:1fr !important; }
    .products-grid { grid-template-columns:repeat(2,minmax(0,1fr)) !important; gap:11px !important; }
    .product-card-desktop { display:block !important; }
    .product-card-desktop > div:first-child { height:100px !important; }
    .mobile-products-search { display:flex !important; position:sticky; top:0; z-index:8; padding:8px 0; backdrop-filter:blur(10px); }
    .btn-nuevo-desktop { display:none !important; }
    .chart-section { overflow:hidden; border-radius:20px !important; }
    .notif-panel { width:calc(100vw - 24px) !important; right:12px !important; }
    .empty-state { padding:36px 18px !important; border-radius:20px !important; }
  }

  /* ── Auditoría móvil final 2026-07-28 ── */
  @media (max-width: 768px) {
    html, body, #root { width: 100%; max-width: 100%; overflow-x: hidden !important; }
    .mobile-menu-trigger { display: none !important; }
    .mobile-topbar { justify-content: center !important; padding: 0 12px !important; }
    .mobile-topbar > div:first-of-type { flex: 0 1 auto !important; text-align: center !important; }
    .mobile-topbar h1 { text-align: center !important; }
    .mobile-main, .main-content, main, section { max-width: 100vw !important; }
    .mobile-main > *, .main-content > * { min-width: 0 !important; }
    .config-layout { display: block !important; width: 100% !important; }
    .config-nav { display: grid !important; grid-template-columns: repeat(2,minmax(0,1fr)) !important; gap: 8px !important; overflow: visible !important; padding: 10px !important; width: 100% !important; }
    .config-nav-item { width: 100% !important; min-width: 0 !important; min-height: 48px !important; white-space: normal !important; text-align: left !important; line-height: 1.2 !important; padding: 10px !important; font-size: 11px !important; overflow-wrap: anywhere !important; }
    .ventas-grid, .caja-layout, .chart-section, .grid-2-mobile, .grid-3-mobile { grid-template-columns: minmax(0,1fr) !important; width: 100% !important; }
    .grid-3-mobile-sm { grid-template-columns: repeat(2,minmax(0,1fr)) !important; }
    .table-scroll { width: 100% !important; max-width: 100% !important; overflow-x: auto !important; }
    .table-scroll table { min-width: 620px; }
    .stat-card, .card-hover, .sale-choice-sheet, .mobile-bottom-sheet { width: 100% !important; max-width: 100% !important; min-width: 0 !important; overflow: hidden !important; }
    .stat-card *, .card-hover *, .sale-choice-sheet * { min-width: 0; overflow-wrap: anywhere; }
    .mono, .dashboard-stat-value { font-size: clamp(18px,6vw,30px) !important; }
    .mobile-products-search { display: grid !important; grid-template-columns: minmax(0,1fr) auto !important; gap: 8px !important; }
    .products-header { width: 100% !important; }
    .cat-filters { display: flex !important; width: 100% !important; overflow-x: auto !important; flex-wrap: nowrap !important; }
    .cat-filters > * { flex: 0 0 auto !important; max-width: 150px !important; white-space: normal !important; line-height: 1.15 !important; }
    .mobile-product-card { width: 100% !important; min-width: 0 !important; padding: 12px !important; gap: 10px !important; }
    .bottom-nav-btn > span:last-child { white-space: normal !important; display: -webkit-box !important; -webkit-line-clamp: 2 !important; -webkit-box-orient: vertical !important; line-height: 10px !important; max-height: 20px !important; font-size: 8.5px !important; overflow: hidden !important; }
    .bottom-nav { height: calc(76px + env(safe-area-inset-bottom,0px)) !important; }
    .main-content, .mobile-main { padding-bottom: calc(94px + env(safe-area-inset-bottom,0px)) !important; }
  }
  /* Corrección definitiva: selector Nueva venta siempre visible sobre navegación móvil */
  @media (max-width: 768px) {
    .sale-choice-overlay {
      z-index: 11990 !important;
      bottom: 0 !important;
    }
    .sale-choice-sheet {
      z-index: 12000 !important;
      left: 10px !important;
      right: 10px !important;
      bottom: calc(88px + env(safe-area-inset-bottom, 0px)) !important;
      width: auto !important;
      max-width: none !important;
      max-height: calc(100dvh - 112px - env(safe-area-inset-top, 0px) - env(safe-area-inset-bottom, 0px)) !important;
      overflow-x: hidden !important;
      overflow-y: auto !important;
      overscroll-behavior: contain !important;
      box-sizing: border-box !important;
      padding: 18px 16px 22px !important;
      border-radius: 26px !important;
      -webkit-overflow-scrolling: touch;
    }
    .sale-choice-head {
      position: sticky !important;
      top: -18px !important;
      z-index: 2 !important;
      margin: -18px -16px 12px !important;
      padding: 18px 16px 12px !important;
      background: #fff !important;
      border-bottom: 1px solid #eef0f3 !important;
    }
    .sale-choice-card {
      min-height: 104px !important;
      margin-top: 10px !important;
      padding: 13px !important;
    }
    .sale-choice-card:last-child { margin-bottom: 2px !important; }
    .sale-choice-icon { width: 52px !important; height: 52px !important; flex-basis: 52px !important; }
    .bottom-nav.sale-chooser-open {
      pointer-events: none !important;
      opacity: .78 !important;
    }
  }

  @media (max-width: 390px) {
    .config-nav { grid-template-columns: 1fr !important; }
    .grid-3-mobile-sm { grid-template-columns: 1fr !important; }
    .mobile-topbar h1 { font-size: 15px !important; }
  }

  .sales-mobile-v2 { display:none; }
  @media (max-width:768px){
    .sales-desktop-only{display:none!important}
    .sales-mobile-v2{display:block;max-width:560px;margin:0 auto;padding-bottom:20px}
    .sales-total-hero{display:flex;align-items:center;gap:14px;padding:20px;border-radius:22px;background:linear-gradient(135deg,#c90f1b,#e71928);color:#fff;box-shadow:0 10px 26px rgba(201,15,27,.22);margin-bottom:12px}
    .sales-total-icon{width:52px;height:52px;border-radius:16px;background:#fff2b7;color:#d08a00;display:grid;place-items:center;flex:none}
    .sales-total-hero span{display:block;font-size:12px;opacity:.85}.sales-total-hero strong{display:block;font-size:27px;line-height:1.1;margin-top:3px;overflow-wrap:anywhere}
    .sales-method-summary{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:8px;margin-bottom:14px}
    .sales-summary-mini{background:var(--bg-card);border:1px solid var(--border);border-radius:16px;padding:11px 7px;text-align:center;min-width:0;box-shadow:0 3px 12px var(--shadow)}
    .sales-summary-mini svg{display:block;margin:0 auto 5px}.sales-summary-mini span{font-size:10px;display:block;color:var(--text-secondary)}.sales-summary-mini strong{display:block;font-size:12px;margin-top:3px;overflow-wrap:anywhere}.sales-summary-mini.cash svg{color:#0aaa78}.sales-summary-mini.card svg{color:#7c3aed}.sales-summary-mini.transfer svg{color:#2563eb}
    .sales-choice-v2,.sales-products-v2,.sales-cart-v2{background:var(--bg-card);border:1px solid var(--border);border-radius:20px;padding:14px;box-shadow:0 4px 16px var(--shadow);margin-bottom:14px}
    .sales-choice-v2 h3,.sales-products-v2 h3,.sales-cart-v2 h3{font-size:15px;margin:0 0 11px;color:var(--text-primary)}.sales-choice-v2>div{display:grid;grid-template-columns:1fr 1fr;gap:9px}.sales-choice-v2 button{border:1.5px solid var(--border);background:var(--bg-card-2);border-radius:16px;padding:15px 8px;display:flex;flex-direction:column;align-items:center;gap:6px;color:var(--text-primary);font-family:inherit}.sales-choice-v2 button.active{border-color:#e71928;background:rgba(231,25,40,.05);color:#d71920}.sales-choice-v2 .egg{font-size:28px}.sales-choice-v2 small{font-size:9px;color:var(--text-muted)}
    .sales-products-head,.sales-cart-title{display:flex;align-items:center;justify-content:space-between;gap:8px}.sales-products-head span{font-size:10px;color:#d71920;font-weight:700}.sales-cart-title button{border:0;background:none;color:#d71920;font-weight:700}
    .sales-search-v2{height:46px;border:1.5px solid var(--border);border-radius:13px;display:flex;align-items:center;gap:8px;padding:0 5px 0 12px;background:var(--bg-card-2)}.sales-search-v2 input{border:0;outline:0;background:transparent;color:var(--text-primary);font:inherit;width:100%;min-width:0}.sales-scan-v2{width:38px;height:36px;flex:0 0 38px;border:0;border-radius:10px;background:#ffc400;color:#241400;display:grid;place-items:center;font-size:18px;cursor:pointer}.sales-scan-v2:active{transform:scale(.95)}
    .sales-cats-v2{display:flex;overflow-x:auto;gap:7px;padding:10px 0 12px;scrollbar-width:none}.sales-cats-v2 button{flex:none;border:1px solid var(--border);background:var(--bg-card);color:var(--text-secondary);border-radius:999px;padding:7px 11px;font:600 10px inherit}.sales-cats-v2 button.active{background:#ffc400;color:#351800;border-color:#ffc400}
    .sales-error-v2{font-size:11px;color:#c81e1e;background:#fff1f2;padding:8px 10px;border-radius:10px;margin-bottom:9px}
    .sales-product-grid-v2{display:grid;grid-template-columns:1fr 1fr;gap:9px}.sales-product-grid-v2 article{border:1px solid var(--border);border-radius:15px;padding:9px;min-width:0;background:var(--bg-card)}.sales-prod-img{height:86px;border-radius:11px;background:var(--bg-card-2);display:grid;place-items:center;position:relative;overflow:hidden}.sales-prod-img img{width:100%;height:100%;object-fit:contain}.sales-prod-img span{font-size:38px}.sales-prod-img em{position:absolute;left:5px;bottom:5px;background:#0aaa78;color:#fff;border-radius:7px;padding:3px 6px;font:700 8px inherit;font-style:normal}.sales-product-grid-v2 h4{font-size:11px;line-height:1.2;height:27px;margin:8px 0 3px;color:var(--text-primary);overflow:hidden}.sales-product-grid-v2>article>strong{color:#d71920;font-size:14px}.sales-prod-controls{display:grid;grid-template-columns:28px 1fr 28px;align-items:center;gap:4px;margin-top:8px}.sales-prod-controls button,.sales-cart-step button{border:0;border-radius:8px;background:#f1f2f5;color:#1f2937;height:28px;font-size:17px}.sales-prod-controls button:last-child{background:#d71920;color:#fff}.sales-prod-controls span{text-align:center;font-weight:800;font-size:12px}
    .sales-cart-row{display:grid;grid-template-columns:38px minmax(0,1fr) auto auto 22px;align-items:center;gap:6px;padding:9px 0;border-bottom:1px solid var(--border)}.sales-cart-thumb{width:38px;height:38px;border-radius:9px;background:var(--bg-card-2);display:grid;place-items:center;overflow:hidden}.sales-cart-thumb img{width:100%;height:100%;object-fit:contain}.sales-cart-name{min-width:0}.sales-cart-name b{display:block;font-size:10px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;color:var(--text-primary)}.sales-cart-name small{font-size:9px;color:#d71920}.sales-cart-step{display:flex;align-items:center;gap:4px}.sales-cart-step button{width:24px;height:24px;font-size:14px}.sales-cart-step span{font-size:11px;font-weight:800;min-width:15px;text-align:center}.sales-cart-row>strong{font-size:10px;color:var(--text-primary)}.sales-cart-row .trash{border:0;background:none;color:#d71920;padding:0}
    .sales-cart-total{display:flex;justify-content:space-between;align-items:center;padding:13px 0 5px;color:var(--text-primary);font-size:13px}.sales-cart-total strong{font-size:22px;color:#d71920}.sales-pay-title{font-size:12px;margin:13px 0 8px;color:var(--text-primary)}.sales-pay-v2{display:grid;grid-template-columns:repeat(3,1fr);gap:7px}.sales-pay-v2 button{border:1.5px solid var(--border);border-radius:13px;padding:10px 3px;background:var(--bg-card-2);color:var(--text-secondary);display:flex;flex-direction:column;align-items:center;gap:5px;font:700 9px inherit}.sales-pay-v2 button.active{border-color:#0aaa78;color:#07815d;background:rgba(10,170,120,.08)}
    .sales-cash-v2{display:grid;grid-template-columns:1fr auto;gap:6px;align-items:center;margin-top:10px}.sales-cash-v2 label{grid-column:1/-1;font-size:10px;font-weight:700}.sales-cash-v2 input{height:39px;border:1.5px solid var(--border);border-radius:11px;padding:0 10px;background:var(--bg-card-2);color:var(--text-primary);min-width:0}.sales-cash-v2 span{font-size:10px;color:#07815d;font-weight:800}.sales-finish-v2{width:100%;border:0;border-radius:13px;background:linear-gradient(135deg,#d71920,#ef2331);color:#fff;padding:13px;margin-top:12px;font:800 13px inherit;box-shadow:0 7px 18px rgba(215,25,32,.22)}
    .mobile-product-card{align-items:flex-start!important;padding:12px!important;gap:10px!important}.mobile-product-card>div:nth-child(2)>p:first-child{padding-right:25px!important}.mobile-product-card>div:nth-child(2)>p:nth-child(3){color:#d71920!important}.mobile-product-card button{white-space:nowrap}
  }

`;

// ─── API helpers ──────────────────────────────────────────────────────────────
const apiPost = async (url, body) => {
  const res = await fetch(API + url, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || "Error del servidor");
  return data;
};
const apiGet = async (url, adminUser, adminClave) => {
  const res = await fetch(API + url, { headers: { "x-admin-user": adminUser, "x-admin-clave": adminClave } });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || "Error del servidor");
  return data;
};
const apiPut = async (url, body, adminUser, adminClave) => {
  const res = await fetch(API + url, { method: "PUT", headers: { "Content-Type": "application/json", "x-admin-user": adminUser, "x-admin-clave": adminClave }, body: JSON.stringify(body) });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || "Error del servidor");
  return data;
};
const apiPatch = async (url, body, adminUser, adminClave) => {
  const res = await fetch(API + url, { method: "PATCH", headers: { "Content-Type": "application/json", "x-admin-user": adminUser, "x-admin-clave": adminClave }, body: JSON.stringify(body) });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || "Error del servidor");
  return data;
};
const apiDelete = async (url, adminUser, adminClave) => {
  const res = await fetch(API + url, { method: "DELETE", headers: { "x-admin-user": adminUser, "x-admin-clave": adminClave } });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || "Error del servidor");
  return data;
};

// ─── Componente: Ticket Supermercado ─────────────────────────────────────────
function BoletaModal({ boleta, config, darkMode, onClose }) {
  const D = darkMode;
  const total = boleta.total;
  const subtotalItems = boleta.items ? boleta.items.reduce((s, it) => s + (it.subtotal || it.precio * it.cantidad), 0) : total;
  const descuento = subtotalItems - total;
  const ahora = boleta.timestamp ? new Date(boleta.timestamp) : new Date();
  const fecha = ahora.toLocaleDateString("es-CL");
  const hora  = ahora.toLocaleTimeString("es-CL", { hour: "2-digit", minute: "2-digit" });
  const numStr = String(boleta.numero).padStart(8, "0");
  const codigoAuth = String(boleta.numero * 12345 % 999999).padStart(6, "0");
  const transaccion = String(boleta.numero).padStart(10, "0");

  const metodoPagoLabel = {
    "Efectivo":      "EFECTIVO",
    "Débito":        "DÉBITO",
    "Crédito":       "CRÉDITO",
    "Transferencia": "TRANSFERENCIA",
    "MercadoPago":   "MERCADOPAGO",
  }[boleta.metodoPago] || (boleta.metodoPago || "").toUpperCase();

  const ticketCSS = `
    @media print {
      body * { visibility: hidden !important; }
      #ticket-print, #ticket-print * { visibility: visible !important; }
      #ticket-print {
        position: fixed !important;
        top: 0; left: 0;
        width: 80mm !important;
        font-family: 'Courier New', monospace !important;
        font-size: 11px !important;
        color: #000 !important;
        background: #fff !important;
        padding: 4mm !important;
      }
    }
  `;

  const dashes = "- - - - - - - - - - - - - - - - - - -";

  return (
    <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.65)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 200, backdropFilter: "blur(6px)" }}>
      <style>{ticketCSS}</style>
      <div className="fade-in" style={{ background: D ? "#1a1d2e" : "#f0f0f0", borderRadius: 20, width: "92%", maxWidth: 420, maxHeight: "92vh", overflow: "auto", boxShadow: "0 30px 80px rgba(0,0,0,0.4)", display: "flex", flexDirection: "column" }}>

        {/* ── Barra superior ── */}
        <div className="no-print" style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "14px 18px", borderBottom: `1px solid ${D ? "#2d3158" : "#d1d5db"}` }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <Receipt size={16} color="#d71920" />
            <span style={{ fontWeight: 800, fontSize: 14, color: D ? "#e8eaf6" : "#1a1a2e" }}>Recibo N° {numStr}</span>
          </div>
          <div style={{ display: "flex", gap: 8 }}>
            <button onClick={() => window.print()} style={{ padding: "7px 14px", borderRadius: 8, border: `1px solid ${D ? "#2d3158" : "#d1d5db"}`, background: D ? "#252840" : "#fff", cursor: "pointer", fontSize: 12, color: D ? "#e8eaf6" : "#374151", display: "flex", alignItems: "center", gap: 5, fontFamily: "inherit", fontWeight: 600 }}>
              <Printer size={13} /> Imprimir
            </button>
            <button onClick={onClose} style={{ background: D ? "#252840" : "#e5e7eb", border: "none", cursor: "pointer", width: 32, height: 32, borderRadius: 8, display: "flex", alignItems: "center", justifyContent: "center" }}>
              <X size={16} color={D ? "#9ca3af" : "#6b7280"} />
            </button>
          </div>
        </div>

        {/* ── Ticket ── */}
        <div id="ticket-print" style={{ padding: "24px 32px 28px", fontFamily: "'Courier New', Courier, monospace", fontSize: 12, color: D ? "#e8eaf6" : "#111", background: D ? "#13152a" : "#fff", lineHeight: 1.7 }}>

          {/* Encabezado negocio */}
          <div style={{ textAlign: "center", marginBottom: 10 }}>
            <div style={{ fontSize: 22, fontWeight: 900, letterSpacing: 3, marginBottom: 2 }}>{(config.negocio || "MI NEGOCIO").toUpperCase()}</div>
            {config.giro && <div style={{ fontSize: 11, letterSpacing: 1 }}>{config.giro.toUpperCase()}</div>}
            {config.rut && <div style={{ fontSize: 11, marginTop: 4 }}>RUT: {config.rut}</div>}
            {config.direccion && <div style={{ fontSize: 11 }}>{config.direccion.toUpperCase()}</div>}
            {config.empresa && config.empresa !== config.negocio && <div style={{ fontSize: 11 }}>SUCURSAL: {config.empresa.toUpperCase()}</div>}
            {config.telefono && <div style={{ fontSize: 11 }}>TELÉFONO: {config.telefono}</div>}
          </div>

          <div style={{ color: D ? "#4b5563" : "#999", fontSize: 11, letterSpacing: 1 }}>{dashes}</div>

          {/* Tipo doc + número */}
          <div style={{ textAlign: "center", margin: "10px 0 6px" }}>
            <div style={{ fontSize: 13, fontWeight: 900, letterSpacing: 2 }}>COMPROBANTE DE VENTA</div>
            <div style={{ fontSize: 13, fontWeight: 700, marginTop: 2 }}>Nº {numStr.slice(0,4)} {numStr.slice(4)}</div>
          </div>

          <div style={{ color: D ? "#4b5563" : "#999", fontSize: 11, letterSpacing: 1 }}>{dashes}</div>

          {/* Fecha / hora / cajero */}
          <div style={{ display: "flex", justifyContent: "space-between", fontSize: 11, marginTop: 6, marginBottom: 2 }}>
            <span>FECHA: {fecha}</span>
            <span>HORA: {hora}</span>
          </div>
          <div style={{ fontSize: 11, marginBottom: 6 }}>CAJERO: {(boleta.vendedor || "").toUpperCase()}</div>

          <div style={{ color: D ? "#4b5563" : "#999", fontSize: 11, letterSpacing: 1 }}>{dashes}</div>

          {/* Cabecera columnas */}
          <div style={{ display: "flex", fontWeight: 900, fontSize: 11, margin: "6px 0 4px", letterSpacing: 0.5 }}>
            <span style={{ width: "5ch", textAlign: "center" }}>CANT.</span>
            <span style={{ flex: 1, paddingLeft: 8 }}>DESCRIPCIÓN</span>
            <span style={{ width: "10ch", textAlign: "right" }}>TOTAL</span>
          </div>

          <div style={{ color: D ? "#4b5563" : "#999", fontSize: 11, letterSpacing: 1 }}>{dashes}</div>

          {/* Items */}
          <div style={{ margin: "4px 0 8px" }}>
            {boleta.items && boleta.items.map((item, i) => {
              const subtotal = item.subtotal || item.precio * item.cantidad;
              return (
                <div key={i} style={{ display: "flex", fontSize: 11, marginBottom: 3 }}>
                  <span style={{ width: "5ch", textAlign: "center", flexShrink: 0 }}>{item.cantidad}</span>
                  <span style={{ flex: 1, paddingLeft: 8, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{item.nombre.toUpperCase()}</span>
                  <span style={{ width: "10ch", textAlign: "right", flexShrink: 0, fontWeight: 700 }}>${Number(subtotal).toLocaleString("es-CL")}</span>
                </div>
              );
            })}
          </div>

          <div style={{ color: D ? "#4b5563" : "#999", fontSize: 11, letterSpacing: 1 }}>{dashes}</div>

          {/* Totales */}
          <div style={{ margin: "8px 0" }}>
            <div style={{ display: "flex", justifyContent: "space-between", fontSize: 11, marginBottom: 3 }}>
              <span>SUBTOTAL</span>
              <span>${subtotalItems.toLocaleString("es-CL")}</span>
            </div>
            {descuento > 0 && (
              <div style={{ display: "flex", justifyContent: "space-between", fontSize: 11, marginBottom: 3 }}>
                <span>DESCUENTOS</span>
                <span>-${descuento.toLocaleString("es-CL")}</span>
              </div>
            )}
            <div style={{ display: "flex", justifyContent: "space-between", fontSize: 14, fontWeight: 900, marginTop: 4, letterSpacing: 0.5 }}>
              <span>TOTAL</span>
              <span>${total.toLocaleString("es-CL")}</span>
            </div>
          </div>

          <div style={{ color: D ? "#4b5563" : "#999", fontSize: 11, letterSpacing: 1 }}>{dashes}</div>

          {/* Pago */}
          <div style={{ margin: "8px 0", fontSize: 11 }}>
            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 2 }}>
              <span>FORMA DE PAGO:</span>
              <span style={{ fontWeight: 700 }}>{metodoPagoLabel}</span>
            </div>
            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 2 }}>
              <span>MONTO PAGADO:</span>
              <span>${(boleta.dineroRecibido || total).toLocaleString("es-CL")}</span>
            </div>
            {boleta.vuelto > 0 && (
              <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 2 }}>
                <span>VUELTO:</span>
                <span style={{ fontWeight: 700 }}>${boleta.vuelto.toLocaleString("es-CL")}</span>
              </div>
            )}
            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 2 }}>
              <span>CÓDIGO AUTORIZACIÓN:</span>
              <span>{codigoAuth}</span>
            </div>
            <div style={{ display: "flex", justifyContent: "space-between" }}>
              <span>TRANSACCIÓN:</span>
              <span>{transaccion}</span>
            </div>
            {boleta.mpPaymentId && (
              <div style={{ display: "flex", justifyContent: "space-between" }}>
                <span>REF MP:</span>
                <span>{boleta.mpPaymentId}</span>
              </div>
            )}
          </div>

          <div style={{ color: D ? "#4b5563" : "#999", fontSize: 11, letterSpacing: 1 }}>{dashes}</div>

          {/* Pie */}
          <div style={{ textAlign: "center", marginTop: 12 }}>
            <div style={{ fontSize: 12, fontWeight: 700, marginBottom: 4 }}>Gracias por su compra</div>
            <div style={{ fontSize: 10, color: D ? "#6b7280" : "#555", marginBottom: 2 }}>Este documento es un comprobante de venta</div>
            <div style={{ fontSize: 10, color: D ? "#6b7280" : "#555", marginBottom: 14 }}>y no constituye boleta ni factura.</div>
            {/* Código de barras simulado */}
            <div style={{ fontFamily: "monospace", fontSize: 28, letterSpacing: -2, color: D ? "#e8eaf6" : "#000", lineHeight: 1, marginBottom: 4 }}>
              {"█▌▐█▌▐▌█▌▐▐█▌▐█▌▐▌█▌▐▐█▌█▌▐█▌▐▌"}
            </div>
            <div style={{ fontSize: 11, color: D ? "#9ca3af" : "#555", letterSpacing: 1 }}>{transaccion}</div>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Admin Panel ──────────────────────────────────────────────────────────────
// ─── Renombrar Empresa ────────────────────────────────────────────────────────
function RenombrarEmpresa({ empresaActual, products, currentUser, setCurrentUser, setProducts, darkMode: D, inp, card, borderColor, textPrimary, textMuted }) {
  const [nuevoNombre, setNuevoNombre] = useState(empresaActual);
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState("");
  const [error, setError] = useState("");

  const handleRenombrar = async () => {
    const nombre = nuevoNombre.trim();
    if (!nombre || nombre === empresaActual) return;
    if (!window.confirm(`¿Renombrar la empresa de "${empresaActual}" a "${nombre}"? Se actualizarán todos los productos.`)) return;

    setLoading(true); setMsg(""); setError("");
    let ok = 0, fail = 0;

    // Actualizar empresa en todos los productos del backend
    for (const p of products) {
      try {
        const res = await fetch(`${API}/api/productos/${p.id}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ ...p, empresa: nombre }),
        });
        if (res.ok) ok++;
        else fail++;
      } catch { fail++; }
    }

    // Actualizar empresa en el usuario del backend
    try {
      await fetch(`${API}/api/users/${currentUser.usuario}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          "x-admin-user": currentUser.usuario,
          "x-admin-clave": currentUser._clave || "",
        },
        body: JSON.stringify({ empresa: nombre }),
      });
    } catch {}

    // Actualizar estado local
    setProducts(prev => prev.map(p => ({ ...p, empresa: nombre })));
    const updatedUser = { ...currentUser, empresa: nombre };
    setCurrentUser(updatedUser);

    setLoading(false);
    if (fail === 0) setMsg(`✅ Empresa renombrada a "${nombre}". ${ok} productos actualizados.`);
    else setMsg(`⚠️ Renombrada con ${fail} errores. ${ok} productos actualizados.`);
  };

  return (
    <div style={{ marginTop: 24, paddingTop: 20, borderTop: `1.5px solid ${borderColor}` }}>
      <label style={{ fontSize: 12, fontWeight: 700, color: D ? "#9ca3af" : "#374151", display: "block", marginBottom: 8 }}>
        🏢 Renombrar empresa
      </label>
      <p style={{ margin: "0 0 10px", fontSize: 12, color: textMuted }}>
        Actual: <strong style={{ color: textPrimary }}>{empresaActual}</strong> — cambia el nombre y se actualizarán todos los productos automáticamente.
      </p>
      <div style={{ display: "flex", gap: 8 }}>
        <input
          value={nuevoNombre}
          onChange={e => setNuevoNombre(e.target.value)}
          placeholder="Nuevo nombre de empresa"
          style={{ ...inp, flex: 1 }}
        />
        <button
          onClick={handleRenombrar}
          disabled={loading || nuevoNombre.trim() === empresaActual || !nuevoNombre.trim()}
          style={{ padding: "10px 16px", borderRadius: 10, border: "none", background: "linear-gradient(135deg,#d71920,#ef2b32)", color: "#fff", fontWeight: 700, fontSize: 13, cursor: "pointer", fontFamily: "inherit", opacity: loading ? 0.7 : 1, whiteSpace: "nowrap" }}
        >
          {loading ? "Guardando..." : "Renombrar"}
        </button>
      </div>
      {msg && <p style={{ margin: "8px 0 0", fontSize: 12, color: msg.startsWith("✅") ? "#10b981" : "#f59e0b", fontWeight: 600 }}>{msg}</p>}
      {error && <p style={{ margin: "8px 0 0", fontSize: 12, color: "#e03131" }}>{error}</p>}
    </div>
  );
}

// ─── AdminPanel ───────────────────────────────────────────────────────────────
function AdminPanel({ onBack, darkMode }) {
  const [usuario, setUsuario] = useState("");
  const [clave, setClave] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [adminUser, setAdminUser] = useState(null);
  const [adminClave, setAdminClave] = useState("");
  const [usuarios, setUsuarios] = useState([]);
  const [accionMsg, setAccionMsg] = useState("");
  const [tab, setTab] = useState("usuarios");
  const [logs, setLogs] = useState([]);
  const [dbQuery, setDbQuery] = useState("");
  const [dbResult, setDbResult] = useState(null);
  const [dbLoading, setDbLoading] = useState(false);
  const [empresas, setEmpresas] = useState([]);

  const inp = {
    width: "100%", padding: "10px 13px", borderRadius: 10, border: "1.5px solid #2d3458",
    fontSize: 13, outline: "none", background: "#1a1f35", color: "#e5e7eb", fontFamily: "Sora, sans-serif",
  };

  const handleLogin = async () => {
    setError(""); setLoading(true);
    try {
      const data = await apiPost("/api/auth/login", { usuario, clave });
      if (data.user.rol !== "gerente" && data.user.rol !== "programador") {
        setError("Solo gerentes o programadores."); setLoading(false); return;
      }
      setAdminUser(data.user); setAdminClave(clave);
      const d = await apiGet("/api/users", data.user.usuario, clave);
      setUsuarios(d);
      // Extraer empresas únicas
      const emps = [...new Set(d.map(u => u.empresa).filter(Boolean))];
      setEmpresas(emps);
      // Logs simulados del sistema
      setLogs([
        { time: new Date().toLocaleTimeString(), msg: "✅ Conexión a MongoDB establecida", type: "ok" },
        { time: new Date().toLocaleTimeString(), msg: `✅ ${d.length} usuarios cargados`, type: "ok" },
        { time: new Date().toLocaleTimeString(), msg: "ℹ️  Panel de programador iniciado", type: "info" },
      ]);
    } catch (e) { setError(e.message); }
    setLoading(false);
  };

  const handleResetEmpresa = async (empresa) => {
    if (!empresa) { setAccionMsg("❌ Empresa inválida."); return; }
    if (!window.confirm(`¿Resetear TODOS los datos de "${empresa}"? Esto eliminará productos, ventas y recibos de "${empresa}" únicamente.`)) return;
    setAccionMsg("Reseteando...");
    try {
      const _ep = `?empresa=${encodeURIComponent(empresa)}`;
      await fetch(`${API}/api/ventas${_ep}`, { method: "DELETE", headers: { "x-admin-user": adminUser.usuario, "x-admin-clave": adminClave } });
      await fetch(`${API}/api/boletas${_ep}`, { method: "DELETE", headers: { "x-admin-user": adminUser.usuario, "x-admin-clave": adminClave } });
      // Borrar productos de esa empresa
      const prods = await fetch(`${API}/api/productos`).then(r => r.json());
      for (const p of prods.filter(p => p.empresa === empresa)) {
        await fetch(`${API}/api/productos/${p.id || p._id}`, { method: "DELETE" });
      }
      setAccionMsg(`✅ Empresa "${empresa}" reseteada`);
      setLogs(prev => [...prev, { time: new Date().toLocaleTimeString(), msg: `🗑️  Reset empresa: ${empresa}`, type: "warn" }]);
    } catch (e) { setAccionMsg("❌ Error: " + e.message); }
  };

  const handleDbQuery = async () => {
    setDbLoading(true); setDbResult(null);
    try {
      const endpoint = dbQuery.trim().toLowerCase();
      let url = `${API}/api/${endpoint}`;
      const res = await fetch(url);
      const data = await res.json();
      setDbResult(data);
      setLogs(prev => [...prev, { time: new Date().toLocaleTimeString(), msg: `🔍 Query: /api/${endpoint} → ${Array.isArray(data) ? data.length + " registros" : "ok"}`, type: "info" }]);
    } catch (e) { setDbResult({ error: e.message }); }
    setDbLoading(false);
  };

  const esProg = adminUser?.rol === "programador";

  const tabs = [
    { id: "usuarios", label: "👥 Usuarios" },
    ...(esProg ? [
      { id: "empresas", label: "🏢 Empresas" },
      { id: "db", label: "🗄️ Base de Datos" },
      { id: "logs", label: "📋 Logs" },
    ] : []),
  ];

  return (
    <div style={{ width: "100vw", minHeight: "100vh", background: "linear-gradient(135deg, #0f1117, #1a1a2e)", display: "flex", alignItems: "center", justifyContent: "center", padding: 16 }}>
      <style>{getLightVars()}{css}</style>
      <div style={{ width: "100%", maxWidth: esProg && adminUser ? 720 : 460, background: "#13152a", borderRadius: 24, padding: 36, boxShadow: "0 20px 60px rgba(0,0,0,0.5)" }}>
        <button onClick={onBack} style={{ background: "none", border: "none", color: "#6b7280", cursor: "pointer", fontSize: 13, marginBottom: 20, display: "flex", alignItems: "center", gap: 6, fontFamily: "inherit" }}>← Volver</button>
        <div style={{ textAlign: "center", marginBottom: 28 }}>
          <div style={{ width: 56, height: 56, borderRadius: 16, background: "linear-gradient(135deg, #7c3aed, #ef2b32)", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 14px" }}>
            <Shield size={26} color="#fff" />
          </div>
          <h2 style={{ margin: 0, fontSize: 22, fontWeight: 800, color: "#e8eaf6" }}>Panel de Administración</h2>
          <p style={{ margin: "6px 0 0", fontSize: 13, color: "#6b7280" }}>Acceso para gerentes y programadores</p>
        </div>

        {!adminUser ? (
          <>
            {[{ label: "Usuario", val: usuario, set: setUsuario, type: "text" }, { label: "Contraseña", val: clave, set: setClave, type: "password" }].map(({ label, val, set, type }) => (
              <div key={label} style={{ marginBottom: 14 }}>
                <label style={{ fontSize: 12, fontWeight: 600, color: "#9ca3af", display: "block", marginBottom: 6 }}>{label}</label>
                <input type={type} value={val} onChange={e => set(e.target.value)} onKeyDown={e => e.key === "Enter" && handleLogin()} style={inp} />
              </div>
            ))}
            {error && <div style={{ background: "#450a0a", color: "#fca5a5", fontSize: 13, padding: "10px 14px", borderRadius: 8, marginBottom: 14 }}>⚠ {error}</div>}
            <button onClick={handleLogin} disabled={loading} className="btn-primary" style={{ width: "100%", padding: "13px", borderRadius: 12, fontSize: 15, fontWeight: 700 }}>
              {loading ? "Verificando..." : "Acceder"}
            </button>
          </>
        ) : (
          <div>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 20 }}>
              <p style={{ color: "#e8eaf6", fontWeight: 700, margin: 0 }}>
                {esProg ? "🛠️" : "👑"} {adminUser.nombre}
                <span style={{ marginLeft: 8, fontSize: 11, padding: "3px 8px", borderRadius: 6, background: esProg ? "rgba(124,58,237,0.3)" : "rgba(215,25,32,0.28)", color: esProg ? "#a78bfa" : "#748ffc" }}>{adminUser.rol}</span>
              </p>
              {accionMsg && <span style={{ fontSize: 12, color: "#34d399" }}>{accionMsg}</span>}
            </div>

            {/* Tabs */}
            <div style={{ display: "flex", gap: 6, marginBottom: 20, overflowX: "auto" }}>
              {tabs.map(t => (
                <button key={t.id} onClick={() => setTab(t.id)} style={{ padding: "8px 14px", borderRadius: 10, border: "none", cursor: "pointer", fontFamily: "inherit", fontSize: 12, fontWeight: 600, whiteSpace: "nowrap", background: tab === t.id ? "#d71920" : "#1e2235", color: tab === t.id ? "#fff" : "#9ca3af", transition: "all 0.15s" }}>{t.label}</button>
              ))}
            </div>

            {/* Tab: Usuarios */}
            {tab === "usuarios" && (
              <div style={{ maxHeight: 400, overflowY: "auto" }}>
                {usuarios.map(u => (
                  <div key={u.usuario} style={{ padding: "12px 16px", background: "#1e2235", borderRadius: 12, marginBottom: 8, display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                    <div>
                      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                        <span style={{ color: "#e8eaf6", fontSize: 14, fontWeight: 700 }}>@{u.usuario}</span>
                        <span style={{ fontSize: 11, padding: "2px 8px", borderRadius: 6, background: u.rol === "programador" ? "rgba(124,58,237,0.3)" : u.rol === "gerente" ? "rgba(215,25,32,0.28)" : "rgba(16,185,129,0.2)", color: u.rol === "programador" ? "#a78bfa" : u.rol === "gerente" ? "#748ffc" : "#34d399" }}>
                          {u.rol === "programador" ? "🛠️" : u.rol === "gerente" ? "👑" : "👤"} {u.rol}
                        </span>
                        {u.blocked && <span style={{ fontSize: 11, color: "#f87171" }}>🚫 bloqueado</span>}
                      </div>
                      <p style={{ margin: "3px 0 0", fontSize: 12, color: "#6b7280" }}>{u.nombre}{u.empresa ? ` · 🏢 ${u.empresa}` : ""}</p>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Tab: Empresas (solo programador) */}
            {tab === "empresas" && esProg && (
              <div>
                <p style={{ color: "#9ca3af", fontSize: 13, marginBottom: 16 }}>Empresas registradas en el sistema:</p>
                {empresas.length === 0 && <p style={{ color: "#6b7280", fontSize: 13 }}>No hay empresas registradas.</p>}
                {empresas.map(emp => {
                  const usersEmp = usuarios.filter(u => u.empresa === emp);
                  return (
                    <div key={emp} style={{ padding: "14px 16px", background: "#1e2235", borderRadius: 12, marginBottom: 10 }}>
                      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                        <div>
                          <p style={{ margin: 0, fontWeight: 700, color: "#e8eaf6", fontSize: 14 }}>🏢 {emp}</p>
                          <p style={{ margin: "4px 0 0", fontSize: 12, color: "#6b7280" }}>{usersEmp.length} usuario{usersEmp.length !== 1 ? "s" : ""}</p>
                        </div>
                        <button onClick={() => handleResetEmpresa(emp)} style={{ padding: "6px 12px", borderRadius: 8, border: "none", cursor: "pointer", background: "rgba(224,49,49,0.2)", color: "#f87171", fontSize: 12, fontWeight: 600, fontFamily: "inherit" }}>🗑️ Reset</button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            {/* Tab: Base de Datos (solo programador) */}
            {tab === "db" && esProg && (
              <div>
                <p style={{ color: "#9ca3af", fontSize: 13, marginBottom: 12 }}>Consultar colección (ej: <code style={{ color: "#a78bfa" }}>productos</code>, <code style={{ color: "#a78bfa" }}>ventas</code>, <code style={{ color: "#a78bfa" }}>recibos</code>)</p>
                <div style={{ display: "flex", gap: 8, marginBottom: 14 }}>
                  <input value={dbQuery} onChange={e => setDbQuery(e.target.value)} onKeyDown={e => e.key === "Enter" && handleDbQuery()} placeholder="productos" style={{ ...inp, flex: 1 }} />
                  <button onClick={handleDbQuery} disabled={dbLoading} style={{ padding: "10px 16px", borderRadius: 10, border: "none", background: "#d71920", color: "#fff", fontWeight: 700, cursor: "pointer", fontFamily: "inherit", fontSize: 13 }}>{dbLoading ? "..." : "GET"}</button>
                </div>
                {dbResult && (
                  <div style={{ background: "#0f1117", borderRadius: 10, padding: 14, maxHeight: 300, overflowY: "auto" }}>
                    <pre style={{ margin: 0, fontSize: 11, color: "#34d399", fontFamily: "monospace", whiteSpace: "pre-wrap", wordBreak: "break-all" }}>{JSON.stringify(dbResult, null, 2)}</pre>
                  </div>
                )}
              </div>
            )}

            {/* Tab: Logs (solo programador) */}
            {tab === "logs" && esProg && (
              <div style={{ background: "#0f1117", borderRadius: 12, padding: 16, maxHeight: 360, overflowY: "auto" }}>
                {logs.length === 0 && <p style={{ color: "#6b7280", fontSize: 13, margin: 0 }}>Sin logs.</p>}
                {[...logs].reverse().map((l, i) => (
                  <div key={i} style={{ display: "flex", gap: 10, marginBottom: 8, fontFamily: "monospace", fontSize: 12 }}>
                    <span style={{ color: "#4b5563", flexShrink: 0 }}>{l.time}</span>
                    <span style={{ color: l.type === "ok" ? "#34d399" : l.type === "warn" ? "#fbbf24" : "#a78bfa" }}>{l.msg}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Auth Screen ──────────────────────────────────────────────────────────────
function AuthScreen({ onLogin, onAdmin, darkMode, config }) {
  const [modo, setModo] = useState("login"); // login | registro | verificar | recuperar | recuperar-codigo | recuperar-nueva
  const [nombre, setNombre] = useState("");
  const [empresa, setEmpresa] = useState("");
  const [correo, setCorreo] = useState("");
  const [usuario, setUsuario] = useState("");
  const [clave, setClave] = useState("");
  const [nuevaClave, setNuevaClave] = useState("");
  const [codigoIngresado, setCodigoIngresado] = useState("");
  const [pendingData, setPendingData] = useState(null);
  const [correoRecuperacion, setCorreoRecuperacion] = useState("");
  const [error, setError] = useState("");
  const [exito, setExito] = useState("");
  const [showPass, setShowPass] = useState(false);
  const [loading, setLoading] = useState(false);

  const inp = {
    width: "100%", padding: "11px 14px", borderRadius: 12,
    border: `1.5px solid ${darkMode ? "#2d3158" : "#e5e7eb"}`,
    fontSize: 14, outline: "none",
    background: darkMode ? "#1e2235" : "#fafafa",
    color: darkMode ? "#e8eaf6" : "#1a1a2e",
    transition: "border 0.15s",
  };

  const handleLogin = async () => {
    setError(""); setLoading(true);
    try {
      const data = await apiPost("/api/auth/login", { usuario, clave });
      onLogin({ ...data.user, _clave: clave });
    } catch (e) { setError(e.message); }
    setLoading(false);
  };

  const handleRegistro = async () => {
    setError(""); setLoading(true);
    if (!nombre || !empresa || !usuario || !correo || !clave) { setError("Completa todos los campos."); setLoading(false); return; }
    try {
      await apiPost("/api/auth/send-code", { correo, nombre });
      setPendingData({ nombre, empresa, usuario, correo, clave });
      setExito(`Código enviado a ${correo}`);
      setModo("verificar");
    } catch (e) { setError(e.message); }
    setLoading(false);
  };

  const handleVerificar = async () => {
    setError(""); setLoading(true);
    try {
      await apiPost("/api/auth/verify-code", { correo: pendingData.correo, codigo: codigoIngresado });
      await apiPost("/api/auth/register", { ...pendingData, codigo: codigoIngresado });
      setExito("¡Cuenta activada! Inicia sesión.");
      setTimeout(() => { setModo("login"); setExito(""); }, 2000);
    } catch (e) { setError(e.message); }
    setLoading(false);
  };

  // ── Recuperación de contraseña ──
  const handleEnviarCodigoRecuperacion = async () => {
    setError(""); setLoading(true);
    if (!correoRecuperacion) { setError("Ingresa tu correo electrónico."); setLoading(false); return; }
    try {
      await apiPost("/api/auth/forgot-password", { correo: correoRecuperacion });
      setExito(`Código enviado a ${correoRecuperacion}`);
      setModo("recuperar-codigo");
    } catch (e) { setError(e.message); }
    setLoading(false);
  };

  const handleVerificarCodigoRecuperacion = async () => {
    setError(""); setLoading(true);
    if (!codigoIngresado || codigoIngresado.length < 6) { setError("Ingresa el código de 6 dígitos."); setLoading(false); return; }
    try {
      await apiPost("/api/auth/verify-reset-code", { correo: correoRecuperacion, codigo: codigoIngresado });
      setExito("Código válido. Ingresa tu nueva contraseña.");
      setModo("recuperar-nueva");
    } catch (e) { setError(e.message); }
    setLoading(false);
  };

  const handleCambiarContrasena = async () => {
    setError(""); setLoading(true);
    if (!nuevaClave || nuevaClave.length < 4) { setError("La contraseña debe tener al menos 4 caracteres."); setLoading(false); return; }
    try {
      await apiPost("/api/auth/reset-password", { correo: correoRecuperacion, codigo: codigoIngresado, nuevaClave });
      setExito("¡Contraseña cambiada! Inicia sesión.");
      setTimeout(() => { setModo("login"); setExito(""); setCodigoIngresado(""); setNuevaClave(""); setCorreoRecuperacion(""); }, 2000);
    } catch (e) { setError(e.message); }
    setLoading(false);
  };

  const bg = darkMode ? "linear-gradient(135deg, #0f1117, #1a1a2e, #13152a)" : "linear-gradient(135deg, #f0f2ff 0%, #e8ecff 50%, #f5f0ff 100%)";
  const cardBg = darkMode ? "#1a1d2e" : "#fff";
  const textPrimary = darkMode ? "#e8eaf6" : "#1a1a2e";
  const textMuted = darkMode ? "#9ca3af" : "#9ca3af";

  return (
    <div style={{ width: "100vw", height: "100vh", background: bg, display: "flex", alignItems: "center", justifyContent: "center" }}>
      <style>{darkMode ? getDarkVars() : getLightVars()}{css}</style>
      <div style={{ width: "92%", maxWidth: 430, background: cardBg, borderRadius: 24, padding: "40px 24px", boxShadow: darkMode ? "0 20px 60px rgba(0,0,0,0.5)" : "0 20px 60px rgba(59,91,219,0.15)" }} className="fade-in">
        <div style={{ textAlign: "center", marginBottom: 28 }}>
          <div style={{ width: 60, height: 60, borderRadius: 18, background: "linear-gradient(135deg, #d71920, #ef2b32)", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 14px", boxShadow: "0 8px 20px rgba(215,25,32,0.28)", overflow: "hidden" }}>
            {config?.logoNegocio
              ? <img src={config.logoNegocio} alt="logo" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
              : <Package size={28} color="#fff" strokeWidth={1.8} />
            }
          </div>
          <h2 style={{ fontSize: 24, fontWeight: 800, color: textPrimary, marginBottom: 4 }}>{config?.negocio || "Inventario Pro"}</h2>
          <p style={{ fontSize: 13, color: textMuted }}>
            {modo === "login" ? "Bienvenido de vuelta"
              : modo === "registro" ? "Crea tu cuenta gratis"
              : modo === "verificar" ? "Verifica tu correo"
              : modo === "recuperar" ? "Recupera tu contraseña"
              : modo === "recuperar-codigo" ? "Ingresa el código"
              : "Nueva contraseña"}
          </p>
        </div>

        {exito && <div style={{ background: "#ecfdf5", color: "#059669", fontSize: 13, padding: "11px 14px", borderRadius: 10, marginBottom: 16, fontWeight: 600, display: "flex", alignItems: "center", gap: 8 }}><CheckCircle size={15} /> {exito}</div>}

        {/* ── Verificar registro ── */}
        {modo === "verificar" && (
          <>
            <div style={{ marginBottom: 16 }}>
              <label style={{ fontSize: 12, fontWeight: 600, color: darkMode ? "#9ca3af" : "#374151", display: "block", marginBottom: 6 }}>Código de 6 dígitos</label>
              <input value={codigoIngresado} onChange={e => setCodigoIngresado(e.target.value.replace(/\D/g, "").slice(0, 6))}
                placeholder="000000" maxLength={6} style={{ ...inp, textAlign: "center", fontSize: 26, fontWeight: 800, letterSpacing: "0.4em" }} />
            </div>
            {error && <div style={{ background: "#fff1f2", color: "#e03131", fontSize: 13, padding: "10px 14px", borderRadius: 10, marginBottom: 14 }}>⚠ {error}</div>}
            <button onClick={handleVerificar} disabled={loading} className="btn-primary" style={{ width: "100%", padding: "13px", borderRadius: 12, fontSize: 15, fontWeight: 700 }}>
              {loading ? "Verificando..." : "Verificar cuenta"}
            </button>
          </>
        )}

        {/* ── Recuperar: ingresar correo ── */}
        {modo === "recuperar" && (
          <>
            <div style={{ background: darkMode ? "#1e2235" : "#f0f2ff", borderRadius: 12, padding: "12px 16px", marginBottom: 18, fontSize: 13, color: darkMode ? "#9ca3af" : "#d71920" }}>
              📧 Te enviaremos un código de recuperación a tu correo electrónico.
            </div>
            <div style={{ marginBottom: 16 }}>
              <label style={{ fontSize: 12, fontWeight: 600, color: darkMode ? "#9ca3af" : "#374151", display: "block", marginBottom: 6 }}>Correo electrónico</label>
              <input type="email" value={correoRecuperacion} onChange={e => setCorreoRecuperacion(e.target.value)} placeholder="tu@correo.com" style={inp} />
            </div>
            {error && <div style={{ background: "#fff1f2", color: "#e03131", fontSize: 13, padding: "10px 14px", borderRadius: 10, marginBottom: 14 }}>⚠ {error}</div>}
            <button onClick={handleEnviarCodigoRecuperacion} disabled={loading} className="btn-primary" style={{ width: "100%", padding: "13px", borderRadius: 12, fontSize: 15, fontWeight: 700, marginBottom: 12 }}>
              {loading ? "Enviando..." : "Enviar código"}
            </button>
            <div style={{ textAlign: "center" }}>
              <button onClick={() => { setModo("login"); setError(""); }} style={{ background: "none", border: "none", color: "#d71920", cursor: "pointer", fontSize: 13, fontFamily: "inherit" }}>
                ← Volver al login
              </button>
            </div>
          </>
        )}

        {/* ── Recuperar: ingresar código ── */}
        {modo === "recuperar-codigo" && (
          <>
            <div style={{ background: darkMode ? "#1e2235" : "#f0f2ff", borderRadius: 12, padding: "12px 16px", marginBottom: 18, fontSize: 13, color: darkMode ? "#9ca3af" : "#d71920" }}>
              📬 Código enviado a <strong>{correoRecuperacion}</strong>
            </div>
            <div style={{ marginBottom: 16 }}>
              <label style={{ fontSize: 12, fontWeight: 600, color: darkMode ? "#9ca3af" : "#374151", display: "block", marginBottom: 6 }}>Código de 6 dígitos</label>
              <input value={codigoIngresado} onChange={e => setCodigoIngresado(e.target.value.replace(/\D/g, "").slice(0, 6))}
                placeholder="000000" maxLength={6} style={{ ...inp, textAlign: "center", fontSize: 26, fontWeight: 800, letterSpacing: "0.4em" }} />
            </div>
            {error && <div style={{ background: "#fff1f2", color: "#e03131", fontSize: 13, padding: "10px 14px", borderRadius: 10, marginBottom: 14 }}>⚠ {error}</div>}
            <button onClick={handleVerificarCodigoRecuperacion} disabled={loading} className="btn-primary" style={{ width: "100%", padding: "13px", borderRadius: 12, fontSize: 15, fontWeight: 700, marginBottom: 12 }}>
              {loading ? "Verificando..." : "Verificar código"}
            </button>
            <div style={{ textAlign: "center" }}>
              <button onClick={() => { setModo("recuperar"); setError(""); setCodigoIngresado(""); }} style={{ background: "none", border: "none", color: "#d71920", cursor: "pointer", fontSize: 13, fontFamily: "inherit" }}>
                ← Volver
              </button>
            </div>
          </>
        )}

        {/* ── Recuperar: nueva contraseña ── */}
        {modo === "recuperar-nueva" && (
          <>
            <div style={{ marginBottom: 16 }}>
              <label style={{ fontSize: 12, fontWeight: 600, color: darkMode ? "#9ca3af" : "#374151", display: "block", marginBottom: 6 }}>Nueva contraseña</label>
              <div style={{ position: "relative" }}>
                <input type={showPass ? "text" : "password"} value={nuevaClave} onChange={e => setNuevaClave(e.target.value)} placeholder="Mínimo 4 caracteres" style={inp} />
                <button onClick={() => setShowPass(!showPass)} style={{ position: "absolute", right: 12, top: "50%", transform: "translateY(-50%)", background: "none", border: "none", cursor: "pointer", color: darkMode ? "#6b7280" : "#9ca3af" }}>
                  {showPass ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>
            {error && <div style={{ background: "#fff1f2", color: "#e03131", fontSize: 13, padding: "10px 14px", borderRadius: 10, marginBottom: 14 }}>⚠ {error}</div>}
            <button onClick={handleCambiarContrasena} disabled={loading} className="btn-primary" style={{ width: "100%", padding: "13px", borderRadius: 12, fontSize: 15, fontWeight: 700 }}>
              {loading ? "Cambiando..." : "Cambiar contraseña"}
            </button>
          </>
        )}

        {/* ── Login ── */}
        {modo === "login" && (
          <>
            {[{ label: "Usuario", val: usuario, set: setUsuario }, { label: "Contraseña", val: clave, set: setClave, type: "password" }].map(({ label, val, set, type }) => (
              <div key={label} style={{ marginBottom: 14 }}>
                <label style={{ fontSize: 12, fontWeight: 600, color: darkMode ? "#9ca3af" : "#374151", display: "block", marginBottom: 6 }}>{label}</label>
                <div style={{ position: "relative" }}>
                  <input type={type === "password" ? (showPass ? "text" : "password") : "text"} value={val} onChange={e => set(e.target.value)}
                    onKeyDown={e => e.key === "Enter" && handleLogin()} style={inp} />
                  {type === "password" && (
                    <button onClick={() => setShowPass(!showPass)} style={{ position: "absolute", right: 12, top: "50%", transform: "translateY(-50%)", background: "none", border: "none", cursor: "pointer", color: darkMode ? "#6b7280" : "#9ca3af" }}>
                      {showPass ? <EyeOff size={16} /> : <Eye size={16} />}
                    </button>
                  )}
                </div>
              </div>
            ))}
            {error && <div style={{ background: "#fff1f2", color: "#e03131", fontSize: 13, padding: "10px 14px", borderRadius: 10, marginBottom: 14 }}>⚠ {error}</div>}
            <button onClick={handleLogin} disabled={loading} className="btn-primary" style={{ width: "100%", padding: "13px", borderRadius: 12, fontSize: 15, fontWeight: 700, marginBottom: 12 }}>
              {loading ? "Cargando..." : "Iniciar sesión"}
            </button>
            <div style={{ padding: "12px 16px", background: darkMode ? "#1e2235" : "#f0f2ff", borderRadius: 10, fontSize: 13, color: darkMode ? "#9ca3af" : "#d71920", textAlign: "center", marginBottom: 12 }}>
              👤 Para crear una cuenta, contacta al administrador
            </div>
          </>
        )}
      </div>
    </div>
  );
}

// ─── App Principal ────────────────────────────────────────────────────────────
export default function App() {
  // Dark mode (persiste)
  const [darkMode, setDarkMode] = useState(getDarkMode);

  const toggleDark = () => {
    setDarkMode(prev => { saveDarkMode(!prev); return !prev; });
  };

  // Aplicar clase al body
  useEffect(() => {
    document.body.style.background = darkMode ? "#0f1117" : "#f4f5fb";
  }, [darkMode]);

  const [currentUser, setCurrentUserRaw] = useState(() => {
    try { const u = localStorage.getItem("inv_session"); return u ? JSON.parse(u) : null; } catch { return null; }
  });
  const setCurrentUser = (user) => {
    // Esta pantalla tiene hooks exclusivos del área autenticada. Cambiar la
    // sesión dentro del mismo render altera el orden de hooks (React #310).
    // Persistimos la sesión y recargamos para montar App desde cero.
    if (user) localStorage.setItem("inv_session", JSON.stringify(user));
    else localStorage.removeItem("inv_session");
    window.location.reload();
  };
  const [showAdmin, setShowAdmin] = useState(false);
  const [activeNav, setActiveNav] = useState("Dashboard");
  const [eggSaleMode, setEggSaleMode] = useState(false);
  const [saleChooserOpen, setSaleChooserOpen] = useState(false);
  const [saleFlowType, setSaleFlowType] = useState("products"); // products | free
  const [freeEggInventory, setFreeEggInventory] = useState([]);
  const [freeEggCart, setFreeEggCart] = useState({});
  const [freeEggLoading, setFreeEggLoading] = useState(false);
  const [products, setProducts] = useState(initialProducts);
  const [papelera, setPapelera] = useState(getPapelera);
  const [modalPapelera, setModalPapelera] = useState(false);
  const [categorias, setCategorias] = useState(initialCategorias);
  const [catIconos, setCatIconos] = useState(getCatIcons);
  const [search, setSearch] = useState("");
  const [catFilter, setCatFilter] = useState("Todos");
  const [modal, setModal] = useState(null);
  const [form, setForm] = useState({});
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [config, setConfig] = useState(getConfig);
  const [empresaVista, setEmpresaVista] = useState(""); // solo para programador

  // Ventas & Carrito
  const [ventas, setVentas] = useState(getSales);
  const [boletas, setBoletas] = useState(getBoletas);
  const [gastosReporte, setGastosReporte] = useState([]); // usados solo por el bloque Ingresos/Egresos/Balance de Reportes
  const [carrito, setCarrito] = useState([]);
  const [busquedaVenta, setBusquedaVenta] = useState("");
  const [showBusquedaDropdown, setShowBusquedaDropdown] = useState(false);
  const [productoSeleccionadoVenta, setProductoSeleccionadoVenta] = useState(null);
  const [carritoCantidad, setCarritoCantidad] = useState("1");
  const [carritoError, setCarritoError] = useState("");
  const [modoManga, setModoManga] = useState(false);
  const [pago, setPago] = useState("Efectivo");
  const [dineroRecibido, setDineroRecibido] = useState("");
  const [ventaError, setVentaError] = useState("");
  const [ventaExito, setVentaExito] = useState("");
  const [filtroPago, setFiltroPago] = useState("Todos");
  const [saleCatFilter, setSaleCatFilter] = useState("Todos");
  const busquedaRef = useRef(null);

  // Boletas / Facturas
  const [boletaModal, setBoletaModal] = useState(null);
  const [boletaGenerando, setBoletaGenerando] = useState(false);
  const [filtroBoleta, setFiltroBoleta] = useState("Todos");
  const [reporteTab, setReporteTab] = useState("ventas"); // "ventas" | "inventario"
  const [reportePeriodo, setReportePeriodo] = useState("mes"); // "dia" | "semana" | "mes" | "todo"
  const [reporteFecha, setReporteFecha] = useState(() => new Date().toISOString().slice(0, 10)); // ancla para reportePeriodo === "dia"

  // Categorías
  const [nuevaCat, setNuevaCat] = useState("");
  const [catError, setCatError] = useState("");
  const [editandoCat, setEditandoCat] = useState(null);
  const [confirmDeleteCat, setConfirmDeleteCat] = useState(null);
  const [modalIconoCat, setModalIconoCat] = useState(null);

  // Usuarios
  const [usuarios, setUsuarios] = useState([]);
  const [loadingUsuarios, setLoadingUsuarios] = useState(false);
  const [modalUsuario, setModalUsuario] = useState(null);
  const [formUsuario, setFormUsuario] = useState({});
  const [usuarioError, setUsuarioError] = useState("");
  const [modalNuevoUsuario, setModalNuevoUsuario] = useState(false);
  const [formNuevoUsuario, setFormNuevoUsuario] = useState({ nombre: "", usuario: "", correo: "", clave: "", rol: "empleado", empresa: "" });
  const [nuevoUsuarioError, setNuevoUsuarioError] = useState("");

  // Clientes frecuentes
  const [clientes, setClientes] = useState(getClientes);
  const clienteVacio = { nombre: "", razonSocial: "", rut: "", giro: "", telefono: "", correo: "", direccion: "", comuna: "", solicitaFactura: false, notas: "" };
  const [clienteForm, setClienteForm] = useState(clienteVacio);
  const [clienteEditando, setClienteEditando] = useState(null);
  const [clienteBusqueda, setClienteBusqueda] = useState("");
  const [clienteError, setClienteError] = useState("");

  // Notificaciones
  const [notifOpen, setNotifOpen] = useState(false);

  // Config
  const [configTab, setConfigTab] = useState("general");
  const [configSearch, setConfigSearch] = useState("");

  // Modal Reset
  const [showResetModal, setShowResetModal] = useState(false);
  const [resetConfirmText, setResetConfirmText] = useState("");
  
  // PIN rápido
  const getPinGuardado = () => localStorage.getItem("inv_pin") || "";
  const [showPinLock, setShowPinLock] = useState(false);
  const [pinInput, setPinInput] = useState("");
  const [pinError, setPinError] = useState("");
  const [pinNuevo, setPinNuevo] = useState("");
  const [pinConfirm, setPinConfirm] = useState("");
  const [pinMsg, setPinMsg] = useState("");
  const [stockWarning, setStockWarning] = useState("");

  // Estadísticas
  const [mesFiltro, setMesFiltro] = useState("actual");

  // Menú "Más" móvil
  const [moreMenuOpen, setMoreMenuOpen] = useState(false);

  // Notas en venta
  const [notaVenta, setNotaVenta] = useState("");
  const [clienteVentaId, setClienteVentaId] = useState("");
  const [requiereFactura, setRequiereFactura] = useState(false);
  const [showScanner, setShowScanner] = useState(false);
  const salesSearchMobileRef = useRef(null);
  const salesSearchDesktopRef = useRef(null);
  const usbScannerBufferRef = useRef("");
  const usbScannerLastKeyRef = useRef(0);

  // Búsqueda historial
  const [busquedaHistorial, setBusquedaHistorial] = useState("");
  const [fechaHistorial, setFechaHistorial] = useState("");

  // Caja
  const getCaja        = ()  => JSON.parse(localStorage.getItem("inv_caja")         || "{}");
  const saveCaja       = (c) => localStorage.setItem("inv_caja", JSON.stringify(c));
  const getHistorialCaja = () => JSON.parse(localStorage.getItem("inv_historial_caja") || "[]");
  const saveHistorialCaja= (h) => localStorage.setItem("inv_historial_caja", JSON.stringify(h));
  const [cajaData,       setCajaData]       = useState(getCaja);
  const [historialCaja,  setHistorialCaja]  = useState(getHistorialCaja);
  const [showCierreCaja, setShowCierreCaja] = useState(false);
  const [montoApertura,  setMontoApertura]  = useState("");
  const [cajaTab,        setCajaTab]        = useState("actual"); // actual | historial
  const [cajaError,      setCajaError]      = useState("");
  const [cajaExito,      setCajaExito]      = useState("");
  const [showAperturaModal, setShowAperturaModal] = useState(false);
  const [showCierreModal,   setShowCierreModal]   = useState(false);
  const [notasCierre,    setNotasCierre]    = useState("");
  const [montoContado,   setMontoContado]   = useState("");
  const [cajaProcesando, setCajaProcesando] = useState(false);

  const cajaAbierta = !!cajaData?.apertura && !cajaData?.cierre;

  // Identidad estable del negocio. Algunas sesiones antiguas quedaron guardadas
  // sin `empresa`; en ese caso usamos la caja local y, como último respaldo,
  // el nombre fijo de esta aplicación para no bloquear Caja en ningún equipo.
  const empresaCaja = String(currentUser?.empresa || cajaData?.empresa || "Rey del Huevo").trim();
  // Una sola identidad para todas las llamadas. Sesiones antiguas pueden no
  // traer `empresa`, pero Caja ya conoce el negocio correcto.
  const empresaActiva = empresaCaja || "Rey del Huevo";

  // MongoDB es la única fuente de verdad para Caja. localStorage queda solo
  // como respaldo temporal si el dispositivo está sin conexión.
  const sincronizarCajaServidor = useCallback(async ({ silencioso = true } = {}) => {
    const empresa = empresaCaja;
    if (!empresa) return false;
    try {
      const [rActual, rHistorial] = await Promise.all([
        fetch(`${API}/api/caja/actual?empresa=${encodeURIComponent(empresa)}&_=${Date.now()}`, { cache: "no-store" }),
        fetch(`${API}/api/caja/historial?empresa=${encodeURIComponent(empresa)}&limit=100&_=${Date.now()}`, { cache: "no-store" }),
      ]);

      const tipoActual = rActual.headers.get("content-type") || "";
      const tipoHistorial = rHistorial.headers.get("content-type") || "";
      if (!tipoActual.includes("application/json") || !tipoHistorial.includes("application/json")) {
        throw new Error("El servidor de caja no respondió en formato JSON.");
      }

      const [actual, historial] = await Promise.all([rActual.json(), rHistorial.json()]);
      if (!rActual.ok) throw new Error(actual?.error || "No se pudo consultar la caja actual.");
      if (!rHistorial.ok) throw new Error(historial?.error || "No se pudo consultar el historial de caja.");

      const cajaServidor = actual || {};
      const historialServidor = Array.isArray(historial) ? historial : [];
      setCajaData(cajaServidor);
      setHistorialCaja(historialServidor);
      saveCaja(cajaServidor);
      saveHistorialCaja(historialServidor);
      return true;
    } catch (e) {
      if (!silencioso) setCajaError(e?.message || "No se pudo sincronizar la caja.");
      console.error("No se pudo sincronizar la caja:", e);
      return false;
    }
  }, [API, empresaCaja]);

  useEffect(() => {
    if (!empresaCaja) return;
    sincronizarCajaServidor();

    // Refresca la caja en todos los dispositivos sin necesitar recargar.
    const intervalo = window.setInterval(() => sincronizarCajaServidor(), 10000);
    const alVolver = () => sincronizarCajaServidor();
    const alCambiarVisibilidad = () => {
      if (document.visibilityState === "visible") sincronizarCajaServidor();
    };
    window.addEventListener("focus", alVolver);
    window.addEventListener("online", alVolver);
    document.addEventListener("visibilitychange", alCambiarVisibilidad);

    return () => {
      window.clearInterval(intervalo);
      window.removeEventListener("focus", alVolver);
      window.removeEventListener("online", alVolver);
      document.removeEventListener("visibilitychange", alCambiarVisibilidad);
    };
  }, [empresaCaja, sincronizarCajaServidor]);

  useEffect(() => {
    if (activeNav === "Caja") sincronizarCajaServidor({ silencioso: false });
  }, [activeNav, sincronizarCajaServidor]);

  const handleAbrirCaja = async () => {
    setCajaError("");
    if (!montoApertura || isNaN(+montoApertura) || +montoApertura < 0) { setCajaError("Ingresa un monto de apertura válido."); return; }
    const nueva = {
      id: Date.now(),
      apertura: new Date().toISOString(),
      montoApertura: +montoApertura,
      abiertaPor: currentUser.nombre,
      cierre: null,
      montoCierre: null,
      cerradaPor: null,
      notas: "",
    };
    try {
      const r = await fetch(API + "/api/caja/abrir", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ ...nueva, empresa: empresaCaja }) });
      const d = await r.json();
      if (!r.ok) throw new Error(d.error || "No se pudo abrir caja");
      const cajaConfirmada = d?.caja || nueva;
      setCajaData(cajaConfirmada);
      saveCaja(cajaConfirmada);
    } catch (e) { setCajaError(e.message); return; }
    await sincronizarCajaServidor();
    setMontoApertura(""); setShowAperturaModal(false);
    setCajaExito("✅ Caja abierta correctamente."); setTimeout(() => setCajaExito(""), 3000);
  };

  const handleCerrarCaja = async () => {
    if (cajaProcesando) return;
    setCajaError("");
    setCajaProcesando(true);
    try {
      const empresa = empresaCaja;
      if (!empresa) throw new Error("No se pudo identificar el negocio de esta caja.");

      // Siempre consultamos primero la caja realmente abierta en MongoDB.
      // Así un ID viejo guardado en este navegador no impide el cierre.
      const cajaRespaldoId = cajaData?.id || cajaData?._id || "";
      const actualRes = await fetch(`${API}/api/caja/actual?empresa=${encodeURIComponent(empresa)}&id=${encodeURIComponent(cajaRespaldoId)}&_=${Date.now()}`, { cache: "no-store" });
      const actualType = actualRes.headers.get("content-type") || "";
      const actualData = actualType.includes("application/json") ? await actualRes.json() : null;
      if (!actualRes.ok) throw new Error(actualData?.error || "No se pudo consultar la caja abierta.");
      // Si la caja es antigua y solo existe en el respaldo local, se conserva y
      // el backend la migra como caja cerrada sin borrar sus ventas ni datos.
      const cajaReal = actualData?.apertura ? actualData : cajaData;
      if (!cajaReal?.apertura) throw new Error("No hay una caja abierta para cerrar.");

      const inicio = new Date(cajaReal.apertura).getTime();
      const ventasTurno = ventas.filter(v => Number(v.timestamp || new Date(v.creadoEn || 0).getTime() || 0) >= inicio);
      const totalTurno = ventasTurno.reduce((s, v) => s + Number(v.total || 0), 0);
      const efectivoTurno = ventasTurno
        .filter(v => String(v.pago || v.metodoPago || "").toLowerCase() === "efectivo")
        .reduce((s, v) => s + Number(v.total || 0), 0);
      const efectivoEsperado = Number(cajaReal.montoApertura || 0) + efectivoTurno;
      const contado = montoContado !== "" ? Number(montoContado) : efectivoEsperado;
      if (!Number.isFinite(contado) || contado < 0) throw new Error("Ingresa un monto contado válido.");

      const payload = {
        id: cajaReal.id || cajaReal._id || cajaData?.id,
        cierre: new Date().toISOString(),
        montoCierre: contado,
        cerradaPor: currentUser?.nombre || currentUser?.usuario || "Usuario",
        notas: notasCierre,
        ventasTurno: ventasTurno.length,
        totalTurno,
        efectivoTurno,
        efectivoEsperado,
        diferencia: contado - efectivoEsperado,
        empresa,
        apertura: cajaReal.apertura,
        montoApertura: Number(cajaReal.montoApertura || 0),
        abiertaPor: cajaReal.abiertaPor || "Usuario",
      };

      const r = await fetch(`${API}/api/caja/cerrar`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const tipo = r.headers.get("content-type") || "";
      const d = tipo.includes("application/json") ? await r.json() : { error: await r.text() };
      if (!r.ok) throw new Error(d?.error || "No se pudo cerrar caja");

      // Confirmación final: el servidor ya no debe devolver una caja abierta.
      const verifyRes = await fetch(`${API}/api/caja/actual?empresa=${encodeURIComponent(empresa)}&id=${encodeURIComponent(payload.id || "")}&_=${Date.now()}`, { cache: "no-store" });
      const verify = (verifyRes.headers.get("content-type") || "").includes("application/json") ? await verifyRes.json() : null;
      if (!verifyRes.ok) throw new Error(verify?.error || "No se pudo confirmar el cierre.");
      if (verify?.apertura && !verify?.cierre) throw new Error("El servidor todavía informa una caja abierta. Intenta nuevamente.");

      setCajaData({});
      saveCaja({});
      await sincronizarCajaServidor();
      setShowCierreModal(false);
      setNotasCierre("");
      setMontoContado("");
      setCajaExito("✅ Caja cerrada y confirmada en el servidor.");
      setTimeout(() => setCajaExito(""), 4000);
    } catch (e) {
      setCajaError(e?.message || "No se pudo cerrar la caja.");
    } finally {
      setCajaProcesando(false);
    }
  };

  // Modo offline
  const [isOnline, setIsOnline] = useState(() => typeof navigator !== "undefined" ? navigator.onLine : true);

  // Historial de precios
  const getHistorialPrecios = () => JSON.parse(localStorage.getItem("inv_precios") || "[]");
  const saveHistorialPrecios = (h) => localStorage.setItem("inv_precios", JSON.stringify(h));
  const [historialPrecios, setHistorialPrecios] = useState(getHistorialPrecios);

  // Mermas
  const getMermas = () => JSON.parse(localStorage.getItem("inv_mermas") || "[]");
  const saveMermas = (m) => localStorage.setItem("inv_mermas", JSON.stringify(m));
  const [mermas, setMermas] = useState(getMermas);
  const [modalMerma, setModalMerma] = useState(null);
  const [formMerma, setFormMerma] = useState({ productoId: "", cantidad: "", motivo: "" });
  const [mermaError, setMermaError] = useState("");

  // Modal ajuste de stock
  const [modalStock, setModalStock] = useState(null); // producto
  const [modalMover, setModalMover] = useState(null); // producto a mover de empresa
  const [stockAjuste, setStockAjuste] = useState("");
  const [stockTipo, setStockTipo] = useState("agregar"); // agregar | quitar
  const [quickStock, setQuickStock] = useState({});
  const [showScannerModal, setShowScannerModal] = useState(false);

  const esGerente = currentUser ? currentUser.rol === "gerente" || currentUser.rol === "programador" : false;
  const esProgramador = currentUser ? currentUser.rol === "programador" : false;

  const filtered = useMemo(() => {
    let base = products;
    if (esProgramador && empresaVista) base = products.filter(p => p.empresa === empresaVista);
    return base.filter(p => p.nombre.toLowerCase().includes(search.toLowerCase()) && (catFilter === "Todos" || p.categoria === catFilter));
  }, [products, search, catFilter, esProgramador, empresaVista]);

  useEffect(() => {
    const handleClick = (e) => {
      if (busquedaRef.current && !busquedaRef.current.contains(e.target)) setShowBusquedaDropdown(false);
    };
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  useEffect(() => {
    const goOnline = () => setIsOnline(true);
    const goOffline = () => setIsOnline(false);
    window.addEventListener("online", goOnline);
    window.addEventListener("offline", goOffline);
    return () => { window.removeEventListener("online", goOnline); window.removeEventListener("offline", goOffline); };
  }, []);

  useEffect(() => {
    if (activeNav === "Configuración" && configTab === "usuarios" && currentUser?.rol === "gerente") refreshUsuarios();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeNav, configTab, currentUser]);

  const sincronizarVentasYBoletas = useCallback(async ({ silencioso = true } = {}) => {
    if (!currentUser) return false;
    const empresa = empresaActiva;
    const suffix = empresa ? `?empresa=${encodeURIComponent(empresa)}&_=${Date.now()}` : `?empresa=&_=${Date.now()}`;
    const headers = { "x-usuario": currentUser.usuario, "x-clave": currentUser._clave || "" };
    try {
      const [rv, rb] = await Promise.all([
        fetch(API + "/api/ventas" + suffix, { headers, cache: "no-store" }),
        fetch(API + "/api/boletas" + suffix, { headers, cache: "no-store" }),
      ]);
      const [ventasData, boletasData] = await Promise.all([rv.json(), rb.json()]);
      if (!rv.ok) throw new Error(ventasData?.error || "No se pudieron sincronizar las ventas.");
      if (!rb.ok) throw new Error(boletasData?.error || "No se pudieron sincronizar las boletas.");
      const ventasServidor = Array.isArray(ventasData) ? ventasData.map(v => ({ ...v, id: v.id || v._id })) : [];
      const boletasServidor = Array.isArray(boletasData) ? boletasData.map(b => ({ ...b, id: b.id || b._id })) : [];
      setVentas(ventasServidor);
      setBoletas(boletasServidor);
      saveSales(ventasServidor);
      saveBoletas(boletasServidor);
      return true;
    } catch (e) {
      if (!silencioso) setVentaError(e?.message || "No se pudieron sincronizar ventas y boletas.");
      const ventasLocal = getSales();
      const boletasLocal = getBoletas();
      if (ventasLocal.length) setVentas(ventasLocal);
      if (boletasLocal.length) setBoletas(boletasLocal);
      return false;
    }
  }, [API, currentUser, empresaActiva]);

  useEffect(() => {
    if (!currentUser) return;
    sincronizarVentasYBoletas();
    const timer = window.setInterval(() => sincronizarVentasYBoletas(), 8000);
    const refrescar = () => sincronizarVentasYBoletas();
    const visible = () => { if (document.visibilityState === "visible") refrescar(); };
    window.addEventListener("focus", refrescar);
    window.addEventListener("online", refrescar);
    document.addEventListener("visibilitychange", visible);
    return () => {
      window.clearInterval(timer);
      window.removeEventListener("focus", refrescar);
      window.removeEventListener("online", refrescar);
      document.removeEventListener("visibilitychange", visible);
    };
  }, [currentUser, sincronizarVentasYBoletas]);

  useEffect(() => {
    if (["Ventas", "Recibos", "Reportes", "Dashboard"].includes(activeNav)) sincronizarVentasYBoletas();
  }, [activeNav, sincronizarVentasYBoletas]);

  // Trae los gastos/compras registrados en el módulo Gastos, solo para calcular
  // Egresos y Balance en Reportes. No modifica ni depende de la lógica de GastosModule.
  const sincronizarGastosReporte = useCallback(async () => {
    if (!currentUser) return false;
    const headers = { "x-usuario": currentUser.usuario, "x-clave": currentUser._clave || "" };
    try {
      const res = await fetch(API + "/api/gastos", { headers, cache: "no-store" });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || "No se pudieron sincronizar los gastos.");
      setGastosReporte(Array.isArray(data) ? data : []);
      return true;
    } catch (e) {
      return false;
    }
  }, [API, currentUser]);

  useEffect(() => {
    if (!currentUser) return;
    sincronizarGastosReporte();
    const timer = window.setInterval(() => sincronizarGastosReporte(), 8000);
    const refrescar = () => sincronizarGastosReporte();
    const visible = () => { if (document.visibilityState === "visible") refrescar(); };
    window.addEventListener("focus", refrescar);
    window.addEventListener("online", refrescar);
    document.addEventListener("visibilitychange", visible);
    return () => {
      window.clearInterval(timer);
      window.removeEventListener("focus", refrescar);
      window.removeEventListener("online", refrescar);
      document.removeEventListener("visibilitychange", visible);
    };
  }, [currentUser, sincronizarGastosReporte]);

  useEffect(() => {
    if (["Gastos", "Reportes", "Dashboard"].includes(activeNav)) sincronizarGastosReporte();
  }, [activeNav, sincronizarGastosReporte]);

  const sincronizarProductosYCategorias = useCallback(async () => {
    if (!currentUser) return false;
    const empresa = empresaActiva;
    try {
      const [rp, rc] = await Promise.all([
        fetch(`${API}/api/productos?_=${Date.now()}`, { cache: "no-store" }),
        fetch(`${API}/api/categorias?empresa=${encodeURIComponent(empresa)}&_=${Date.now()}`, { cache: "no-store" }),
      ]);
      const [productosData, categoriasData] = await Promise.all([rp.json(), rc.json()]);
      if (!rp.ok) throw new Error(productosData?.error || "No se pudieron sincronizar los productos.");
      if (!rc.ok) throw new Error(categoriasData?.error || "No se pudieron sincronizar las categorías.");

      if (Array.isArray(productosData)) {
        const filtered = currentUser?.rol === "programador"
          ? productosData
          : productosData.filter(p => empresa ? (!p.empresa || p.empresa === "" || p.empresa === empresa) : (!p.empresa || p.empresa === ""));
        setProducts(filtered.map(p => ({ ...p, id: p.id || p._id })));
      }
      if (Array.isArray(categoriasData)) {
        const filtered = categoriasData.filter(c => empresa ? (!c.empresa || c.empresa === "" || c.empresa === empresa) : (!c.empresa || c.empresa === ""));
        setCategorias(filtered.map(c => c.nombre));
        const icons = {};
        filtered.forEach(c => { if (c.icono) icons[c.nombre] = c.icono; });
        setCatIconos(icons);
      }
      return true;
    } catch (e) {
      console.error("No se pudieron sincronizar productos/categorías:", e);
      return false;
    }
  }, [API, currentUser, empresaActiva]);

  useEffect(() => {
    if (!currentUser) return;
    sincronizarProductosYCategorias();
    const timer = window.setInterval(sincronizarProductosYCategorias, 10000);
    const refresh = () => sincronizarProductosYCategorias();
    const visible = () => { if (document.visibilityState === "visible") refresh(); };
    window.addEventListener("focus", refresh);
    window.addEventListener("online", refresh);
    document.addEventListener("visibilitychange", visible);
    return () => {
      window.clearInterval(timer);
      window.removeEventListener("focus", refresh);
      window.removeEventListener("online", refresh);
      document.removeEventListener("visibilitychange", visible);
    };
  }, [currentUser, sincronizarProductosYCategorias]);

  useEffect(() => {
    if (["Dashboard", "Inventario", "Ventas", "Categorías"].includes(activeNav)) sincronizarProductosYCategorias();
  }, [activeNav, sincronizarProductosYCategorias]);

  // Cargar productos, categorias, ventas y boletas desde el backend
  useEffect(() => {
    if (!currentUser) return;
    const empresa = empresaActiva;

    fetch(API + "/api/productos").then(r => r.json()).then(data => {
      if (Array.isArray(data)) {
        const empresa = currentUser?.empresa || "";
        let filtered;
        if (currentUser?.rol === "programador") {
          // Programador ve todos los productos de todas las empresas
          filtered = data;
        } else if (empresa) {
          filtered = data.filter(p => !p.empresa || p.empresa === "" || p.empresa === empresa);
        } else {
          filtered = data.filter(p => !p.empresa || p.empresa === "");
        }
        setProducts(filtered.map(p => ({ ...p, id: p.id || p._id })));
      }
    }).catch(() => {});

    const empresaParam = `?empresa=${encodeURIComponent(empresaActiva)}`;
    fetch(API + "/api/categorias" + empresaParam).then(r => r.json()).then(data => {
      if (Array.isArray(data)) {
        const empresa = currentUser?.empresa || "";
        const filtradas = empresa
          ? data.filter(c => !c.empresa || c.empresa === "" || c.empresa === empresa)
          : data.filter(c => !c.empresa || c.empresa === "");
        setCategorias(filtradas.map(c => c.nombre));
        const icons = {};
        filtradas.forEach(c => { if (c.icono) icons[c.nombre] = c.icono; });
        setCatIconos(icons);
      }
    }).catch(() => {});

    // Cargar ventas desde backend (sincronizado entre dispositivos)
    fetch(API + "/api/ventas" + (empresa ? `?empresa=${encodeURIComponent(empresa)}` : ""), {
      headers: {
        "x-usuario": currentUser.usuario,
        "x-clave": currentUser._clave || "",
      },
    })
      .then(async r => {
        const data = await r.json();
        if (!r.ok) throw new Error(data.error || "No se pudieron cargar las ventas.");
        return data;
      })
      .then(data => {
        if (Array.isArray(data)) {
          const ventas = data.map(v => ({ ...v, id: v.id || v._id }));
          setVentas(ventas);
          saveSales(ventas); // actualizar caché local
        }
      })
      .catch(() => {
        // Si el backend no responde, usar caché local
        const local = getSales();
        if (local.length > 0) setVentas(local);
      });

    // Cargar boletas desde backend
    fetch(API + "/api/boletas" + (empresa ? `?empresa=${encodeURIComponent(empresa)}` : ""), {
      headers: {
        "x-usuario": currentUser.usuario,
        "x-clave": currentUser._clave || "",
      },
    })
      .then(async r => {
        const data = await r.json();
        if (!r.ok) throw new Error(data.error || "No se pudieron cargar las boletas.");
        return data;
      })
      .then(data => {
        if (Array.isArray(data)) {
          const bols = data.map(b => ({ ...b, id: b.id || b._id }));
          setBoletas(bols);
          saveBoletas(bols); // actualizar caché local
        }
      })
      .catch(() => {
        const local = getBoletas();
        if (local.length > 0) setBoletas(local);
      });
  }, [currentUser]);

  // Inyectar estilos globales SIEMPRE (antes del guard de currentUser)
  // para que no haya pantalla negra al hacer login
  const globalStyles = <style>{darkMode ? getDarkVars() : getLightVars()}{css}</style>;

  if (!currentUser) {
    if (showAdmin) return <><style>{darkMode ? getDarkVars() : getLightVars()}{css}</style><AdminPanel onBack={() => setShowAdmin(false)} darkMode={darkMode} /></>;
    return <><style>{darkMode ? getDarkVars() : getLightVars()}{css}</style><AuthScreen onLogin={setCurrentUser} onAdmin={() => setShowAdmin(true)} darkMode={darkMode} config={config} /></>;
  }

  const iniciales = currentUser.nombre.split(" ").map(p => p[0]).join("").slice(0, 2).toUpperCase();
  const lowStock = products.filter(p => p.stock <= (config.stockMinimo || 5)).sort((a, b) => a.stock - b.stock);

  // ── Temas ──
  const D = darkMode;
  const card = {
    background: D ? "#1a1d2e" : "#fff",
    borderRadius: 16,
    padding: "20px 22px",
    border: `1px solid ${D ? "#2d3158" : "#eef0f7"}`,
    boxShadow: `0 2px 8px ${D ? "rgba(0,0,0,0.3)" : "rgba(0,0,0,0.04)"}`,
  };
  const inp = {
    width: "100%", padding: "10px 13px", borderRadius: 10,
    border: `1.5px solid ${D ? "#2d3158" : "#e5e7eb"}`,
    fontSize: 14, outline: "none",
    background: D ? "#1e2235" : "#fafafa",
    color: D ? "#e8eaf6" : "#1a1a2e",
    fontFamily: "inherit", transition: "border 0.15s",
  };
  const textPrimary = D ? "#e8eaf6" : "#1a1a2e";
  const textSecondary = D ? "#9ca3af" : "#6b7280";
  const textMuted = D ? "#6b7280" : "#9ca3af";
  const bgMain = D ? "#0f1117" : "#f4f5fb";
  const bgCard = D ? "#1a1d2e" : "#fff";
  const bgCard2 = D ? "#252840" : "#f9fafb";
  const borderColor = D ? "#2d3158" : "#eef0f7";
  const borderColor2 = D ? "#343860" : "#e5e7eb";

  const navItems = [
    { name: "Dashboard", label: "Inicio", icon: LayoutDashboard },
    { name: "Productos", label: "Inventario", icon: Package },
    { name: "Huevos", label: "Huevos", icon: Package },
    { name: "Ventas", label: "Ventas", icon: ShoppingCart },
    { name: "Categorías", icon: Tag },
    { name: "Estadísticas", icon: BarChart2 },
    { name: "Reportes", icon: TrendingUp },
    { name: "Recibos", icon: Receipt },
    { name: "Caja", icon: Banknote },
    { name: "Mermas", icon: TrendingDown },
    { name: "Clientes", icon: Users },
    { name: "Gastos", icon: DollarSign },
    { name: "Configuración", icon: Settings },
  ];
  // "Usuarios" (gestión de usuarios/gerencia) ya no vive en el nav principal —
  // se accede desde dentro de Configuración, pero el contenido y el guard de
  // esGerente se mantienen intactos (activeNav sigue pudiendo valer "Usuarios").

  // ── Productos ──
  const openAdd = () => { setForm({ nombre: "", categoria: categorias[0] || "", precio: "", costo: "", incrementoPct: "", stock: "", img: "📦", imagenUrl: "", codigoBarra: "", mangaActiva: false, mangaCantidad: "", mangaPrecio: "", mangaCostoCompra: "", promoActiva: false, promoCantMin: "", promoPrecio: "" }); setModal("add"); };
  const openEdit = (p) => {
    const incrementoPct = p.incrementoPct ?? (Number(p.costo || 0) > 0 ? calcIncrementPct(p.costo, p.precio).toFixed(2) : "");
    setForm({ ...p, incrementoPct });
    setModal("edit");
  };
  const handleDeleteProd = async (id) => {
    const prod = products.find(p => p.id === id);
    if (!prod) return;
    if (!window.confirm(`¿Eliminar "${prod.nombre}"? Podrás restaurarlo desde la Papelera.`)) return;
    try {
      await fetch(API + "/api/productos/" + id, { method: "DELETE" });
      setProducts(prev => prev.filter(p => p.id !== id));
      const nuevaPapelera = [{ ...prod, eliminadoEn: new Date().toISOString() }, ...papelera];
      setPapelera(nuevaPapelera);
      savePapelera(nuevaPapelera);
    } catch (e) { alert("Error al eliminar: " + e.message); }
  };

  // Restaura un producto desde la papelera: lo vuelve a crear en el backend
  const handleRestaurarProd = async (item) => {
    const { id, _id, eliminadoEn, ...data } = item;
    try {
      const res = await fetch(API + "/api/productos", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(data) });
      const nuevo = await res.json();
      setProducts(prev => [...prev, { ...nuevo, id: nuevo.id || nuevo._id }]);
      const nuevaPapelera = papelera.filter(p => p !== item);
      setPapelera(nuevaPapelera);
      savePapelera(nuevaPapelera);
    } catch (e) { alert("Error al restaurar: " + e.message); }
  };

  // Quita un producto de la papelera para siempre (ya estaba borrado del backend)
  const handleEliminarDefinitivo = (item) => {
    if (!window.confirm(`¿Eliminar "${item.nombre}" definitivamente? Esta acción no se puede deshacer.`)) return;
    const nuevaPapelera = papelera.filter(p => p !== item);
    setPapelera(nuevaPapelera);
    savePapelera(nuevaPapelera);
  };

  const handleVaciarPapelera = () => {
    if (papelera.length === 0) return;
    if (!window.confirm("¿Vaciar la papelera completa? Esta acción no se puede deshacer.")) return;
    setPapelera([]);
    savePapelera([]);
  };

  const handleDuplicarProducto = (producto) => {
    const copia = {
      ...producto,
      id: undefined,
      _id: undefined,
      nombre: `${producto.nombre} copia`,
      codigoBarra: "",
      stock: 0,
    };
    setForm(copia);
    setModal("add");
  };

  const guardarCliente = () => {
    setClienteError("");
    const nombre = clienteForm.nombre.trim();
    if (!nombre) { setClienteError("Ingresa el nombre del cliente."); return; }
    let nuevos;
    if (clienteEditando) {
      nuevos = clientes.map(c => c.id === clienteEditando ? { ...c, ...clienteForm, nombre, actualizado: new Date().toISOString() } : c);
    } else {
      nuevos = [{ id: Date.now(), ...clienteForm, nombre, creado: new Date().toISOString(), compras: 0, totalGastado: 0 }, ...clientes];
    }
    setClientes(nuevos); saveClientes(nuevos);
    setClienteForm(clienteVacio);
    setClienteEditando(null);
  };

  const editarCliente = (cliente) => {
    setClienteEditando(cliente.id);
    setClienteForm({ ...clienteVacio, ...cliente, solicitaFactura: !!cliente.solicitaFactura });
    setClienteError("");
  };

  const eliminarCliente = (id) => {
    if (!window.confirm("¿Eliminar este cliente?")) return;
    const nuevos = clientes.filter(c => c.id !== id);
    setClientes(nuevos); saveClientes(nuevos);
    if (clienteEditando === id) { setClienteEditando(null); setClienteForm(clienteVacio); }
  };

  const handleMoverProducto = async (prod, nuevaEmpresa) => {
    try {
      await fetch(API + "/api/productos/" + prod.id, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...prod, empresa: nuevaEmpresa }),
      });
      setProducts(prev => prev.map(p => p.id === prod.id ? { ...p, empresa: nuevaEmpresa } : p));
      setModalMover(null);
    } catch (e) { alert("Error al mover: " + e.message); }
  };
  const handleSaveProd = async () => {
    if (!form.nombre || !form.precio || !form.stock) return;
    const data = { ...form, precio: +form.precio, costo: +(form.costo || 0), incrementoPct: Number(form.incrementoPct || calcIncrementPct(form.costo, form.precio) || 0), stock: +form.stock, empresa: currentUser?.empresa || "" };
    try {
      if (modal === "add") {
        const res = await fetch(API + "/api/productos", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(data) });
        const nuevo = await res.json();
        setProducts(prev => [...prev, { ...nuevo, id: nuevo.id || nuevo._id }]);
      } else {
        await fetch(API + "/api/productos/" + form.id, { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify(data) });
        setProducts(prev => prev.map(p => p.id === form.id ? { ...data, id: form.id } : p));
      }
      setModal(null);
    } catch (e) { alert("Error al guardar: " + e.message); }
  };

  // Subir imagen de producto al backend
  const handleSubirImagen = async (file, onSuccess) => {
    const formData = new FormData();
    formData.append("imagen", file);
    try {
      const res = await fetch(`${API}/api/productos/upload-imagen`, { method: "POST", body: formData });
      const contentType = res.headers.get("content-type") || "";
      if (!contentType.includes("application/json")) {
        // El servidor devolvió HTML (ruta no existe, servidor caído, etc.)
        if (res.status === 404) {
          alert("Error al subir imagen: La ruta de subida no existe en el servidor. Verifica que el backend tenga habilitado /api/productos/upload-imagen.");
        } else if (!res.ok) {
          alert(`Error al subir imagen: El servidor respondió con estado ${res.status}. Puede estar caído o iniciando (Render puede tardar ~30s).`);
        } else {
          alert("Error al subir imagen: El servidor no devolvió JSON. Revisa que el backend tenga configurado multer o el middleware de subida de archivos.");
        }
        return;
      }
      const data = await res.json();
      if (res.ok && data.url) { onSuccess(data.url); }
      else { alert("Error al subir imagen: " + (data.error || "desconocido")); }
    } catch (e) {
      if (e.message.includes("Failed to fetch") || e.message.includes("NetworkError")) {
        alert("Error al subir imagen: No se pudo conectar con el servidor. Verifica que esté en línea.");
      } else {
        alert("Error al subir imagen: " + e.message);
      }
    }
  };

  // ── Categorías ──
  const handleAgregarCat = async () => {
    setCatError("");
    const nombre = nuevaCat.trim();
    if (!nombre) { setCatError("Escribe un nombre."); return; }
    if (categorias.map(c => c.toLowerCase()).includes(nombre.toLowerCase())) { setCatError("Ya existe."); return; }
    try {
      const res = await fetch(API + "/api/categorias", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ nombre, icono: "📦", empresa: currentUser?.empresa || "" }) });
      const data = await res.json();
      if (!res.ok) { setCatError(data.error || "Error"); return; }
      setCategorias(prev => [...prev, nombre]);
      const newIcons = { ...catIconos, [nombre]: "📦" };
      setCatIconos(newIcons); saveCatIcons(newIcons);
      setNuevaCat("");
    } catch (e) { setCatError(e.message); }
  };
  const handleEliminarCat = (index) => {
    const nombre = categorias[index];
    const count = products.filter(p => p.categoria === nombre).length;
    if (count > 0) setConfirmDeleteCat({ index, nombre, count });
    else eliminarCatDirecto(index, nombre);
  };
  const eliminarCatDirecto = async (index, nombre) => {
    try {
      const empresaParam = currentUser?.empresa ? `?empresa=${encodeURIComponent(currentUser.empresa)}` : "?empresa=";
      const res = await fetch(API + "/api/categorias" + empresaParam);
      const cats = await res.json();
      const empresa = currentUser?.empresa || "";
      const filtradas = empresa
        ? cats.filter(c => c.empresa === empresa)
        : cats.filter(c => !c.empresa || c.empresa === "");
      const cat = filtradas.find(c => c.nombre === nombre);
      if (cat) await fetch(API + "/api/categorias/" + (cat._id || cat.id), { method: "DELETE" });
      setCategorias(prev => prev.filter((_, i) => i !== index));
      const newIcons = { ...catIconos }; delete newIcons[nombre];
      setCatIconos(newIcons); saveCatIcons(newIcons);
    } catch (e) { alert("Error al eliminar: " + e.message); }
  };
  const confirmarEliminarCat = () => {
    const { index, nombre } = confirmDeleteCat;
    setProducts(prev => prev.map(p => p.categoria === nombre ? { ...p, categoria: "Sin categoría" } : p));
    eliminarCatDirecto(index, nombre);
    setConfirmDeleteCat(null);
  };
  const handleCambiarIcono = (cat, emoji) => {
    const newIcons = { ...catIconos, [cat]: emoji };
    setCatIconos(newIcons); saveCatIcons(newIcons);
    setModalIconoCat(null);
  };

  // ── Ajuste de stock ──
  const registrarCompraInventario = async (prod, cantidad, costoTotal) => {
    const costoUnitario = Number(costoTotal || 0) / Math.max(1, Number(cantidad || 0));
    const res = await fetch(API + "/api/gastos", {
      method: "POST",
      headers: { "Content-Type": "application/json", "x-usuario": currentUser.usuario, "x-clave": currentUser._clave || "" },
      body: JSON.stringify({
        comercio: `Compra de ${prod.nombre}`,
        fecha: new Date().toISOString().slice(0, 10),
        total: Number(costoTotal || 0),
        categoria: "mercaderia",
        metodoPago: "Efectivo",
        notas: "Compra registrada desde el ingreso de stock.",
        itemsInventario: [{ productoId: prod.id, cantidad: Number(cantidad), costoUnitario }],
      }),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || "No se pudo registrar la compra.");
    if (Array.isArray(data.productos)) setProducts(data.productos.map(p => ({ ...p, id: p.id || p._id })));
    return data;
  };

  const handleAjustarStock = async () => {
    if (!modalStock || !stockAjuste || +stockAjuste <= 0) return;
    const cantidad = +stockAjuste;
    try {
      if (stockTipo === "agregar") {
        const costoSugerido = Math.round(Number(modalStock.costo || 0) * cantidad);
        const costoTotalRaw = window.prompt(`Costo total pagado por ${cantidad} unidades de ${modalStock.nombre}:`, String(costoSugerido || ""));
        if (costoTotalRaw === null) return;
        const costoTotal = Number(String(costoTotalRaw).replace(/[^0-9.-]/g, ""));
        if (!(costoTotal > 0)) return alert("Ingresa un costo total válido.");
        await registrarCompraInventario(modalStock, cantidad, costoTotal);
      } else {
        const nuevoStock = Math.max(0, modalStock.stock - cantidad);
        const res = await fetch(API + "/api/productos/" + modalStock.id, { method: "PUT", headers: { "Content-Type": "application/json", "x-usuario": currentUser.usuario, "x-clave": currentUser._clave || "" }, body: JSON.stringify({ ...modalStock, stock: nuevoStock }) });
        if (!res.ok) throw new Error((await res.json()).error || "No se pudo ajustar el stock.");
        setProducts(prev => prev.map(p => p.id === modalStock.id ? { ...p, stock: nuevoStock } : p));
      }
      setModalStock(null); setStockAjuste("");
    } catch (e) { alert("Error: " + e.message); }
  };

  const handleQuickStock = async (prod) => {
    const cantidad = parseInt(quickStock[prod.id] || "0", 10);
    if (!cantidad || cantidad <= 0) return;
    const costoSugerido = Math.round(Number(prod.costo || 0) * cantidad);
    const costoTotalRaw = window.prompt(`Costo total pagado por ${cantidad} unidades de ${prod.nombre}:`, String(costoSugerido || ""));
    if (costoTotalRaw === null) return;
    const costoTotal = Number(String(costoTotalRaw).replace(/[^0-9.-]/g, ""));
    if (!(costoTotal > 0)) return alert("Ingresa un costo total válido.");
    try {
      await registrarCompraInventario(prod, cantidad, costoTotal);
      setQuickStock(prev => ({ ...prev, [prod.id]: "" }));
    } catch (e) { alert("Error al registrar la compra: " + e.message); }
  };

  // ── Mermas ──
  const handleRegistrarMerma = async () => {
    setMermaError("");
    if (!formMerma.productoId || !formMerma.cantidad || !formMerma.motivo) { setMermaError("Completa todos los campos."); return; }
    const prod = products.find(p => p.id === formMerma.productoId);
    if (!prod) return;
    const cant = +formMerma.cantidad;
    if (cant > prod.stock) { setMermaError(`Stock insuficiente. Disponible: ${prod.stock}.`); return; }
    const nuevoStock = prod.stock - cant;
    try {
      await fetch(API + "/api/productos/" + prod.id, { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ ...prod, stock: nuevoStock }) });
      setProducts(prev => prev.map(p => p.id === prod.id ? { ...p, stock: nuevoStock } : p));
      const nuevaMerma = { id: Date.now(), productoId: prod.id, producto: prod.nombre, cantidad: cant, motivo: formMerma.motivo, fecha: new Date().toLocaleString("es-CL"), usuario: currentUser.nombre };
      const nuevasMermas = [nuevaMerma, ...mermas];
      setMermas(nuevasMermas); saveMermas(nuevasMermas);
      setModalMerma(null); setFormMerma({ productoId: "", cantidad: "", motivo: "" });
    } catch (e) { setMermaError("Error: " + e.message); }
  };

  // ── Carrito ──
  const productosBusqueda = busquedaVenta.length > 0
    ? products.filter(p => p.stock > 0 && p.nombre.toLowerCase().includes(busquedaVenta.toLowerCase())).slice(0, 6)
    : products.filter(p => p.stock > 0).slice(0, 6);

  const seleccionarProductoVenta = (prod) => {
    setProductoSeleccionadoVenta(prod);
    setBusquedaVenta(prod.nombre);
    setShowBusquedaDropdown(false);
    setCarritoError("");
  };

  const agregarAlCarrito = () => {
    setCarritoError(""); setStockWarning("");
    if (!productoSeleccionadoVenta || !carritoCantidad) { setCarritoError("Selecciona un producto y cantidad."); return; }
    const prod = productoSeleccionadoVenta;
    const cant = Number(carritoCantidad);
    if (!(cant > 0)) { setCarritoError("Cantidad inválida."); return; }

    const tieneManga = Boolean(prod.mangaActiva && Number(prod.mangaCantidad) > 0 && Number(prod.mangaPrecio) > 0);
    const esManga = Boolean(modoManga && tieneManga);
    const itemExistente = carrito.find(c => String(c.productoId) === String(prod.id) && Boolean(c.esManga) === esManga);
    const nuevaCantidad = Number(itemExistente?.cantidad || 0) + cant;
    const pricing = calcularPrecioProducto(prod, nuevaCantidad, esManga);

    if (pricing.unidadesTotales > Number(prod.stock || 0)) {
      setCarritoError(`Stock insuficiente. Disponible: ${prod.stock} unidades${tieneManga ? ` (${Math.floor(Number(prod.stock || 0) / Number(prod.mangaCantidad))} mangas)` : ""}.`);
      return;
    }

    const nuevoItem = {
      productoId: prod.id, nombre: prod.nombre, img: prod.img, imagenUrl: prod.imagenUrl,
      precio: pricing.precio, precioNormal: Number(prod.precio || 0),
      cantidad: nuevaCantidad, subtotal: pricing.subtotal,
      enPromo: pricing.enPromo, aplicoManga: pricing.aplicoManga,
      promoLabel: pricing.promoLabel, esManga, mangaLabel: pricing.mangaLabel,
      unidadesPorManga: pricing.unidadesPorManga, unidadesTotales: pricing.unidadesTotales,
      pricingLabel: pricing.pricingLabel,
    };

    setCarrito(prev => itemExistente
      ? prev.map(c => String(c.productoId) === String(prod.id) && Boolean(c.esManga) === esManga ? { ...c, ...nuevoItem } : c)
      : [...prev, nuevoItem]);

    const stockRestante = Number(prod.stock || 0) - pricing.unidadesTotales;
    if (stockRestante <= 2 && stockRestante >= 0) setStockWarning(`⚠️ Quedan solo ${stockRestante} unidad${stockRestante !== 1 ? "es" : ""} de "${prod.nombre}"`);
    setProductoSeleccionadoVenta(null); setBusquedaVenta(""); setCarritoCantidad("1"); setModoManga(false);
  };

  const agregarProductoRapido = (prod) => {
    setCarritoError("");
    if (!prod || Number(prod.stock || 0) <= 0) return;
    const existente = carrito.find(c => String(c.productoId) === String(prod.id) && !c.esManga);
    const nuevaCantidad = Number(existente?.cantidad || 0) + 1;
    const pricing = calcularPrecioProducto(prod, nuevaCantidad, false);
    if (pricing.unidadesTotales > Number(prod.stock || 0)) {
      setCarritoError(`Stock insuficiente para ${prod.nombre}.`);
      return;
    }
    const nuevoItem = {
      productoId: prod.id, nombre: prod.nombre, img: prod.img, imagenUrl: prod.imagenUrl,
      precio: pricing.precio, precioNormal: Number(prod.precio || 0),
      cantidad: nuevaCantidad, subtotal: pricing.subtotal,
      enPromo: pricing.enPromo, aplicoManga: pricing.aplicoManga,
      promoLabel: pricing.promoLabel, mangaLabel: pricing.mangaLabel, pricingLabel: pricing.pricingLabel,
      esManga: false, unidadesPorManga: 1, unidadesTotales: pricing.unidadesTotales,
    };
    setCarrito(prev => existente
      ? prev.map(c => String(c.productoId) === String(prod.id) && !c.esManga ? { ...c, ...nuevoItem } : c)
      : [...prev, nuevoItem]);
  };

  const procesarCodigoVenta = useCallback((codigoCrudo) => {
    const codigo = String(codigoCrudo || "").trim();
    if (!codigo) return false;

    const normalizado = codigo.toLowerCase();
    const prod = products.find(p =>
      String(p.codigoBarra || "").trim() === codigo ||
      String(p.codigo || "").trim() === codigo
    ) || products.find(p => String(p.nombre || "").toLowerCase() === normalizado);

    if (!prod) {
      setBusquedaVenta(codigo);
      setShowBusquedaDropdown(true);
      setCarritoError(`No se encontró un producto con el código ${codigo}.`);
      requestAnimationFrame(() => (salesSearchMobileRef.current?.offsetParent ? salesSearchMobileRef.current : salesSearchDesktopRef.current)?.select());
      return false;
    }

    agregarProductoRapido(prod);
    setBusquedaVenta("");
    setShowBusquedaDropdown(false);
    setCarritoError("");
    requestAnimationFrame(() => (salesSearchMobileRef.current?.offsetParent ? salesSearchMobileRef.current : salesSearchDesktopRef.current)?.focus());
    return true;
  }, [products, carrito]);

  // El escáner USB funciona como teclado: escribe el código y envía Enter.
  // Al entrar a Ventas dejamos el cursor listo para escanear sin abrir la cámara.
  useEffect(() => {
    if (activeNav !== "Ventas" || showScanner) return;
    const timer = setTimeout(() => (salesSearchMobileRef.current?.offsetParent ? salesSearchMobileRef.current : salesSearchDesktopRef.current)?.focus(), 120);
    return () => clearTimeout(timer);
  }, [activeNav, saleFlowType, showScanner]);

  // Captura global para pistolas USB que funcionan como teclado.
  // No depende de que el cursor siga dentro del buscador y procesa el código
  // cuando el lector envía Enter. El límite de tiempo evita capturar escritura manual.
  useEffect(() => {
    if (activeNav !== "Ventas" || showScanner) return;
    const onUsbScannerKey = (event) => {
      if (event.ctrlKey || event.altKey || event.metaKey) return;
      const now = Date.now();
      if (now - usbScannerLastKeyRef.current > 140) usbScannerBufferRef.current = "";
      usbScannerLastKeyRef.current = now;

      if (event.key === "Enter") {
        const code = usbScannerBufferRef.current.trim();
        usbScannerBufferRef.current = "";
        if (code.length >= 4) {
          event.preventDefault();
          procesarCodigoVenta(code);
        }
        return;
      }
      if (event.key.length === 1) usbScannerBufferRef.current += event.key;
    };
    window.addEventListener("keydown", onUsbScannerKey, true);
    return () => window.removeEventListener("keydown", onUsbScannerKey, true);
  }, [activeNav, showScanner, procesarCodigoVenta]);


  useEffect(() => {
    if (saleFlowType !== "free" || !currentUser || activeNav !== "Ventas") return;
    let cancelled = false;
    setFreeEggLoading(true);
    fetch(`${API}/api/huevos`, {
      headers: {
        "x-usuario": currentUser?.usuario || "",
        "x-clave": currentUser?._clave || "",
      },
    })
      .then(async res => {
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || "No se pudo cargar el inventario de huevos.");
        if (!cancelled) setFreeEggInventory(Array.isArray(data.inventory) ? data.inventory : []);
      })
      .catch(err => { if (!cancelled) setVentaError(err.message); })
      .finally(() => { if (!cancelled) setFreeEggLoading(false); });
    return () => { cancelled = true; };
  }, [saleFlowType, activeNav, currentUser?.usuario, currentUser?._clave]);

  const changeFreeEgg = (quality, delta) => {
    setFreeEggCart(prev => {
      const current = prev[quality.id] || { formato: "bandeja", cantidad: 0 };
      const unitsPer = current.formato === "caja" ? 180 : 30;
      const max = Math.floor(Number(quality.stockHuevos || 0) / unitsPer);
      return { ...prev, [quality.id]: { ...current, cantidad: Math.max(0, Math.min(max, Number(current.cantidad || 0) + delta)) } };
    });
  };

  const setFreeEggCantidad = (quality, nuevaCantRaw) => {
    setFreeEggCart(prev => {
      const current = prev[quality.id] || { formato: "bandeja", cantidad: 0 };
      const unitsPer = current.formato === "caja" ? 180 : 30;
      const max = Math.floor(Number(quality.stockHuevos || 0) / unitsPer);
      const nuevaCant = Math.floor(Number(nuevaCantRaw));
      if (!Number.isFinite(nuevaCant)) return prev;
      return { ...prev, [quality.id]: { ...current, cantidad: Math.max(0, Math.min(max, nuevaCant)) } };
    });
  };

  const setFreeEggFormat = (quality, formato) => {
    setFreeEggCart(prev => {
      const current = prev[quality.id] || { cantidad: 0 };
      const unitsPer = formato === "caja" ? 180 : 30;
      const max = Math.floor(Number(quality.stockHuevos || 0) / unitsPer);
      return { ...prev, [quality.id]: { formato, cantidad: Math.min(Number(current.cantidad || 0), max) } };
    });
  };

  const freeEggItems = freeEggInventory.map(q => {
    const row = freeEggCart[q.id] || { formato: "bandeja", cantidad: 0 };
    const formato = row.formato === "caja" ? "caja" : "bandeja";
    const cantidad = Math.max(0, Number(row.cantidad || 0));
    const unidadesPorFormato = formato === "caja" ? 180 : 30;
    const precioFormato = Number(formato === "caja" ? q.precioCaja : q.precioBandeja) || 0;
    return {
      tipoItem: "huevo", calidadId: q.id, calidad: q.nombre, nombre: `Huevos ${q.nombre} · ${formato}`,
      formato, cantidadFormatos: cantidad, cantidad, unidadesPorFormato, huevos: cantidad * unidadesPorFormato,
      precio: precioFormato, subtotal: cantidad * precioFormato, costoCaja: Number(q.costoCaja || 0),
      precioCaja: Number(q.precioCaja || 0), precioBandeja: Number(q.precioBandeja || 0), stockHuevos: Number(q.stockHuevos || 0),
    };
  }).filter(item => item.cantidadFormatos > 0);

  const quitarDelCarrito = (productoId, esManga) => setCarrito(prev => prev.filter(c => !(String(c.productoId) === String(productoId) && Boolean(c.esManga) === Boolean(esManga))));

  const alternarPrecioManualCarrito = (productoId, esManga) => {
    const prod = products.find(p => String(p.id) === String(productoId));
    setCarrito(prev => prev.map(item => {
      if (!(String(item.productoId) === String(productoId) && Boolean(item.esManga) === Boolean(esManga))) return item;
      if (item.precioManualActivo) {
        const pricing = calcularPrecioProducto(prod || item, Number(item.cantidad || 0), Boolean(esManga));
        return {
          ...item,
          precioManualActivo: false,
          precioManualTotal: "",
          precio: pricing.precio,
          subtotal: pricing.subtotal,
          enPromo: pricing.enPromo,
          aplicoManga: pricing.aplicoManga,
          promoLabel: pricing.promoLabel,
          mangaLabel: pricing.mangaLabel,
          pricingLabel: pricing.pricingLabel,
          unidadesPorManga: pricing.unidadesPorManga,
          unidadesTotales: pricing.unidadesTotales,
        };
      }
      return {
        ...item,
        precioManualActivo: true,
        precioManualTotal: String(Math.round(Number(item.subtotal || 0))),
        pricingLabelAutomatico: item.pricingLabel || "",
        pricingLabel: "Precio manual",
      };
    }));
  };

  const cambiarPrecioManualCarrito = (productoId, esManga, valor) => {
    const limpio = String(valor ?? "").replace(/[^0-9]/g, "");
    setCarrito(prev => prev.map(item => {
      if (!(String(item.productoId) === String(productoId) && Boolean(item.esManga) === Boolean(esManga))) return item;
      const totalManual = limpio === "" ? 0 : Number(limpio);
      const cantidad = Math.max(1, Number(item.cantidad || 1));
      return {
        ...item,
        precioManualActivo: true,
        precioManualTotal: limpio,
        subtotal: totalManual,
        precio: totalManual / cantidad,
        enPromo: false,
        aplicoManga: false,
        pricingLabel: "Precio manual",
      };
    }));
  };

  // Permite escribir la cantidad directamente (además de usar los botones +/−)
  const fijarCantidadCarrito = (prod, nuevaCantRaw, esManga = false) => {
    setCarritoError("");
    const nuevaCant = Math.floor(Number(nuevaCantRaw));
    if (!prod || !Number.isFinite(nuevaCant)) return;
    if (nuevaCant <= 0) {
      quitarDelCarrito(prod.id, esManga);
      return;
    }
    const pricing = calcularPrecioProducto(prod, nuevaCant, Boolean(esManga));
    if (pricing.unidadesTotales > Number(prod.stock || 0)) {
      setCarritoError(`Stock insuficiente para ${prod.nombre}.`);
      return;
    }
    const existente = carrito.find(c => String(c.productoId) === String(prod.id) && Boolean(c.esManga) === Boolean(esManga));
    if (existente) {
      cambiarCantidadCarrito(prod.id, nuevaCant, esManga);
      return;
    }
    const nuevoItem = {
      productoId: prod.id, nombre: prod.nombre, img: prod.img, imagenUrl: prod.imagenUrl,
      precio: pricing.precio, precioNormal: Number(prod.precio || 0),
      cantidad: nuevaCant, subtotal: pricing.subtotal,
      enPromo: pricing.enPromo, aplicoManga: pricing.aplicoManga,
      promoLabel: pricing.promoLabel, mangaLabel: pricing.mangaLabel, pricingLabel: pricing.pricingLabel,
      esManga: Boolean(esManga), unidadesPorManga: pricing.unidadesPorManga, unidadesTotales: pricing.unidadesTotales,
    };
    setCarrito(prev => [...prev, nuevoItem]);
  };

  const cambiarCantidadCarrito = (productoId, nuevaCant, esManga) => {
    const prod = products.find(p => String(p.id) === String(productoId));
    if (!prod || nuevaCant < 1) return;
    const pricing = calcularPrecioProducto(prod, nuevaCant, Boolean(esManga));
    if (pricing.unidadesTotales > Number(prod.stock || 0)) return;
    setCarrito(prev => prev.map(c => {
      if (!(String(c.productoId) === String(productoId) && Boolean(c.esManga) === Boolean(esManga))) return c;
      if (c.precioManualActivo) {
        const totalManual = Number(c.precioManualTotal || c.subtotal || 0);
        return {
          ...c,
          cantidad: nuevaCant,
          precio: totalManual / Math.max(1, nuevaCant),
          subtotal: totalManual,
          unidadesPorManga: pricing.unidadesPorManga,
          unidadesTotales: pricing.unidadesTotales,
          pricingLabel: "Precio manual",
        };
      }
      return {
        ...c, cantidad: nuevaCant, precio: pricing.precio, subtotal: pricing.subtotal,
        enPromo: pricing.enPromo, aplicoManga: pricing.aplicoManga,
        promoLabel: pricing.promoLabel, mangaLabel: pricing.mangaLabel, pricingLabel: pricing.pricingLabel,
        unidadesPorManga: pricing.unidadesPorManga, unidadesTotales: pricing.unidadesTotales,
      };
    }));
  };
  const totalProductosCarrito = carrito.reduce((s, c) => s + c.subtotal, 0);
  const totalHuevosLibre = saleFlowType === "free" ? freeEggItems.reduce((s, c) => s + c.subtotal, 0) : 0;
  const totalCarrito = totalProductosCarrito + totalHuevosLibre;
  const vuelto = dineroRecibido !== "" ? (+dineroRecibido - totalCarrito) : null;

  // ── Flujo de pago completo: Efectivo/Transferencia ──
  const handleVentaDirecta = async () => {
    setVentaError("");
    setVentaExito("");

    if (!cajaAbierta) {
      setVentaError("Debes abrir caja antes de registrar una venta.");
      setActiveNav("Caja");
      setShowAperturaModal(true);
      return;
    }

    if (carrito.length === 0 && freeEggItems.length === 0) {
      setVentaError(saleFlowType === "free" ? "Agrega al menos un producto o una categoría de huevos." : "Agrega al menos un producto.");
      return;
    }

    const itemManualInvalido = carrito.find(item => item.precioManualActivo && !(Number(item.precioManualTotal) > 0));
    if (itemManualInvalido) {
      setVentaError(`Ingresa un precio manual válido para ${itemManualInvalido.nombre}.`);
      return;
    }

    const clienteSeleccionado = clientes.find(c => String(c.id) === String(clienteVentaId)) || null;
    if (requiereFactura && !clienteSeleccionado) {
      setVentaError("Selecciona un cliente para emitir la factura.");
      return;
    }
    if (requiereFactura && (!clienteSeleccionado.rut || !(clienteSeleccionado.razonSocial || clienteSeleccionado.nombre) || !clienteSeleccionado.giro || !clienteSeleccionado.direccion || !clienteSeleccionado.comuna)) {
      setVentaError("El cliente no tiene completos los datos de facturación: RUT, razón social, giro, dirección y comuna.");
      return;
    }

    if (pago === "Efectivo" && dineroRecibido !== "" && +dineroRecibido < totalCarrito) {
      setVentaError("El dinero recibido es menor al total.");
      return;
    }

    const ahora = new Date();
    const ventaId = String(ahora.getTime());
    const numeroBoleta = String(generarNumeroBoleta(boletas));

    const itemsVenta = [
      ...carrito.map(item => ({ ...item, tipoItem: item.tipoItem || "producto" })),
      ...freeEggItems,
    ];

    const venta = {
      id: ventaId,
      items: itemsVenta,
      eggItems: freeEggItems,
      tipoVenta: saleFlowType === "free" ? "libre" : "productos",
      total: totalCarrito,
      pago,
      dineroRecibido: dineroRecibido !== "" ? +dineroRecibido : totalCarrito,
      vuelto: vuelto !== null && vuelto > 0 ? vuelto : 0,
      fecha: ahora.toLocaleString("es-CL"),
      timestamp: ahora.getTime(),
      usuario: currentUser.nombre,
      estadoPago: "confirmado",
      empresa: empresaCaja,
      cajaId: cajaData.id,
      clienteId: clienteSeleccionado?.id || null,
      cliente: clienteSeleccionado ? { ...clienteSeleccionado } : null,
      requiereFactura,
      tipoDocumento: requiereFactura ? "factura_pendiente" : "boleta",
    };

    const boleta = {
      numero: numeroBoleta,
      ventaId,
      fecha: ahora.toLocaleString("es-CL"),
      timestamp: ahora.getTime(),
      items: itemsVenta,
      eggItems: freeEggItems,
      total: totalCarrito,
      subtotal: totalCarrito,
      metodoPago: pago,
      estadoPago: "confirmado",
      vendedor: currentUser.nombre,
      negocio: config.negocio,
      tipoDoc: requiereFactura ? "factura_pendiente" : "recibo",
      clienteId: clienteSeleccionado?.id || null,
      cliente: clienteSeleccionado ? { ...clienteSeleccionado } : null,
      requiereFactura,
      cajaId: cajaData.id,
      dineroRecibido: venta.dineroRecibido,
      vuelto: venta.vuelto,
      empresa: empresaCaja,
    };

    setBoletaGenerando(true);

    try {
      const controller = new AbortController();
      const timeoutId = window.setTimeout(() => controller.abort(), 30000);
      let res;
      try {
        res = await fetch(API + "/api/ventas", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "x-usuario": currentUser.usuario,
            "x-clave": currentUser._clave || "",
          },
          body: JSON.stringify({ venta: { ...venta, empresa: empresaActiva }, boleta: { ...boleta, empresa: empresaActiva } }),
          signal: controller.signal,
        });
      } finally {
        window.clearTimeout(timeoutId);
      }

      const contentType = res.headers.get("content-type") || "";
      const data = contentType.includes("application/json")
        ? await res.json()
        : { error: await res.text() };

      if (!res.ok) {
        throw new Error(data.error || "No se pudo guardar la venta y la boleta.");
      }

      const ventaGuardada = {
        ...venta,
        ...(data.venta || {}),
        id: data.venta?.id || ventaId,
      };

      const boletaGuardada = {
        ...boleta,
        ...(data.boleta || {}),
        id: data.boleta?._id || data.boleta?.id,
      };

      const updatedVentas = [
        ventaGuardada,
        ...ventas.filter(v => String(v.id) !== String(ventaGuardada.id)),
      ];

      const updatedBoletas = [
        boletaGuardada,
        ...boletas.filter(b =>
          String(b.ventaId) !== String(boletaGuardada.ventaId) &&
          String(b.numero) !== String(boletaGuardada.numero)
        ),
      ];

      setVentas(updatedVentas);
      saveSales(updatedVentas);
      setBoletas(updatedBoletas);
      saveBoletas(updatedBoletas);

      // El backend descuenta el stock después de guardar la venta y la boleta.
      setProducts(prev => prev.map(prod => {
        const item = carrito.find(c => String(c.productoId) === String(prod.id));
        if (!item) return prod;
        const unidades = Number(item.cantidad || 0) * Number(item.unidadesPorManga || 1);
        return { ...prod, stock: Number(prod.stock || 0) - unidades };
      }));

      setCarrito([]);
      setFreeEggCart({});
      if (Array.isArray(data.eggInventory)) setFreeEggInventory(data.eggInventory);
      setDineroRecibido("");
      setPago("Efectivo");
      if (clienteSeleccionado) {
        const clientesActualizados = clientes.map(c => String(c.id) === String(clienteSeleccionado.id)
          ? { ...c, compras: Number(c.compras || 0) + 1, totalGastado: Number(c.totalGastado || 0) + totalCarrito, ultimaCompra: ahora.toISOString() }
          : c);
        setClientes(clientesActualizados);
        saveClientes(clientesActualizados);
      }
      setClienteVentaId("");
      setRequiereFactura(false);
      setVentaExito(requiereFactura ? "✓ Venta guardada y marcada para factura." : "✓ Venta y boleta guardadas en MongoDB.");
      setTimeout(() => setVentaExito(""), 5000);
    } catch (error) {
      // No se crea una boleta local falsa cuando MongoDB falla.
      setVentaError(
        `No se guardó la venta. No cierres ni repitas el cobro hasta revisar la conexión: ${error.message}`
      );
    } finally {
      setBoletaGenerando(false);
    }
  };

  // ── Generación de Boleta ──
  const generarBoleta = async (venta, mpPaymentId) => {
    setBoletaGenerando(true);
    const numero = generarNumeroBoleta(boletas);
    const ahora = new Date();

    const boletaLocal = {
      numero,
      ventaId: venta.id,
      fecha: ahora.toLocaleString("es-CL"),
      timestamp: ahora.getTime(),
      items: venta.items,
      total: venta.total,
      subtotal: venta.total,
      metodoPago: venta.pago,
      estadoPago: "confirmado",
      vendedor: venta.usuario,
      mpPaymentId: mpPaymentId || venta.mpPaymentId || null,
      negocio: config.negocio,
      tipoDoc: "recibo",
      empresa: currentUser?.empresa || "",
    };

    let boletaGuardada = { ...boletaLocal };
    try {
      const res = await fetch(API + "/api/boletas", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(boletaLocal),
      });
      if (res.ok) {
        const data = await res.json();
        boletaGuardada = { ...boletaLocal, ...data, id: data.id || data._id };
      }
    } catch (_) {}

    const updatedBoletas = [boletaGuardada, ...boletas];
    setBoletas(updatedBoletas); saveBoletas(updatedBoletas);
    setBoletaGenerando(false);
    return boletaGuardada;
  };

  // ── Estadísticas ──
  const ahora = new Date();
  const mesActual = ahora.getMonth();
  const anioActual = ahora.getFullYear();
  const mesNombre = ahora.toLocaleString("es-CL", { month: "long", year: "numeric" });

  const ventasMes = ventas.filter(v => {
    if (v.timestamp) { const d = new Date(v.timestamp); return d.getMonth() === mesActual && d.getFullYear() === anioActual; }
    return true;
  });
  const totalMes = ventasMes.reduce((s, v) => s + v.total, 0);
  const totalMesEfectivo = ventasMes.filter(v => v.pago === "Efectivo").reduce((s, v) => s + v.total, 0);
  const totalMesDebito = ventasMes.filter(v => ["Tarjeta", "Débito"].includes(v.pago)).reduce((s, v) => s + v.total, 0);
  const totalMesCredito = ventasMes.filter(v => v.pago === "Crédito").reduce((s, v) => s + v.total, 0);
  const totalMesTransferencia = ventasMes.filter(v => v.pago === "Transferencia").reduce((s, v) => s + v.total, 0);
  const ticketPromedio = ventasMes.length > 0 ? Math.round(totalMes / ventasMes.length) : 0;

  const productosVendidosMap = {};
  ventasMes.forEach(v => {
    (v.items || []).forEach(item => {
      if (!productosVendidosMap[item.nombre]) productosVendidosMap[item.nombre] = { nombre: item.nombre, img: item.img || "📦", cantidad: 0, ingresos: 0 };
      productosVendidosMap[item.nombre].cantidad += item.cantidad;
      productosVendidosMap[item.nombre].ingresos += item.subtotal;
    });
  });
  const productosMasVendidos = Object.values(productosVendidosMap).sort((a, b) => b.cantidad - a.cantidad);
  const barColors = ["#d71920", "#ef2b32", "#748ffc", "#91a7ff", "#ffd966", "#dee2ff"];

  const metodoPagoGlobal = (v) => String(v?.pago || v?.metodoPago || v?.formaPago || "Efectivo").trim().toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
  const totalEfectivo = ventas.filter(v => metodoPagoGlobal(v) === "efectivo").reduce((s, v) => s + Number(v.total || 0), 0);
  const totalTarjeta = ventas.filter(v => ["tarjeta", "debito", "credito", "redcompra", "tarjeta debito", "tarjeta credito"].includes(metodoPagoGlobal(v))).reduce((s, v) => s + Number(v.total || 0), 0);
  const totalTransferencia = ventas.filter(v => ["transferencia", "transfer", "transferencia bancaria"].includes(metodoPagoGlobal(v))).reduce((s, v) => s + Number(v.total || 0), 0);
  const totalGeneral = totalEfectivo + totalTarjeta + totalTransferencia;


  // Datos reales del inicio móvil: ventas menos costo de los productos.
  const fechaLocalClave = (value) => {
    const d = value ? new Date(value) : null;
    if (!d || Number.isNaN(d.getTime())) return "";
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
  };
  const hoyDate = new Date();
  const ayerDate = new Date(hoyDate);
  ayerDate.setDate(hoyDate.getDate() - 1);
  const hoyClave = fechaLocalClave(hoyDate);
  const ayerClave = fechaLocalClave(ayerDate);
  const costoProductoPorNombre = new Map(products.map(p => [String(p.nombre || "").trim().toLowerCase(), Number(p.costo || 0)]));
  const gananciaVenta = (venta) => (venta.items || []).reduce((acc, item) => {
    const cantidad = Number(item.cantidad || item.cantidadFormatos || 0);
    const ingreso = Number(item.subtotal ?? (Number(item.precio || 0) * cantidad));
    if (item.tipoItem === "huevo") {
      const huevos = Number(item.huevos || 0);
      const costoCaja = Number(item.costoCaja || 0);
      return acc + ingreso - ((huevos / 180) * costoCaja);
    }
    const costoUnitario = Number(item.costo ?? item.precioCosto ?? costoProductoPorNombre.get(String(item.nombre || "").trim().toLowerCase()) ?? 0);
    const unidades = cantidad * Number(item.unidadesPorManga || 1);
    return acc + ingreso - (costoUnitario * unidades);
  }, 0);
  const fechaVentaClave = (venta) => fechaLocalClave(venta.timestamp || venta.createdAt || venta.creadoEn || venta.fechaISO || venta.fecha);

  // El inicio debe reflejar todas las ventas guardadas en MongoDB, tanto de
  // productos como de huevos. Antes solo leía el caché local del módulo Huevos,
  // por eso una venta podía guardarse correctamente y el Inicio seguía en $0.
  const ventasHoy = ventas.filter(v => fechaVentaClave(v) === hoyClave);
  const ventasAyer = ventas.filter(v => fechaVentaClave(v) === ayerClave);

  // Lista compatible para las secciones “Últimas ventas de huevos” y
  // “Movimientos recientes”. Se genera desde las ventas ya cargadas desde
  // MongoDB, evitando depender de una variable o caché local inexistente.
  const movimientosHuevosInicio = ventas
    .flatMap((venta) => (venta.items || [])
      .filter((item) => item.tipoItem === "huevo" || Number(item.huevos || 0) > 0)
      .map((item, index) => ({
        id: `${venta._id || venta.id || venta.timestamp || "venta"}-${index}`,
        tipo: "venta",
        calidad: item.calidad || String(item.nombre || "Venta de huevos").replace(/^Huevos\s*/i, ""),
        huevos: Number(item.huevos || (Number(item.cantidad || item.cantidadFormatos || 0) * Number(item.unidadesPorFormato || 0)) || 0),
        unidades: Number(item.huevos || 0),
        metodoPago: venta.pago || venta.metodoPago || "Efectivo",
        ingreso: Number(item.subtotal ?? (Number(item.precio || 0) * Number(item.cantidad || item.cantidadFormatos || 0))),
        fecha: venta.timestamp || venta.createdAt || venta.creadoEn || venta.fechaISO || venta.fecha,
      })))
    .sort((a, b) => new Date(b.fecha || 0) - new Date(a.fecha || 0));
  const ventasHuevosHoyTotal = ventasHoy.reduce((sum, v) => sum + Number(v.total || 0), 0);
  const ventasHuevosAyerTotal = ventasAyer.reduce((sum, v) => sum + Number(v.total || 0), 0);
  const gananciasHoy = ventasHoy.reduce((sum, v) => sum + gananciaVenta(v), 0);
  const gananciasAyer = ventasAyer.reduce((sum, v) => sum + gananciaVenta(v), 0);
  const huevosVendidosHoy = ventasHoy.reduce((sum, v) => sum + (v.items || []).reduce((itemSum, item) => itemSum + (item.tipoItem === "huevo" ? Number(item.huevos || 0) : 0), 0), 0);
  const diferenciaGanancias = gananciasHoy - gananciasAyer;
  const porcentajeGanancias = gananciasAyer > 0 ? (diferenciaGanancias / gananciasAyer) * 100 : (gananciasHoy > 0 ? 100 : 0);
  const diferenciaVentas = ventasHuevosHoyTotal - ventasHuevosAyerTotal;
  const porcentajeVentas = ventasHuevosAyerTotal > 0 ? (diferenciaVentas / ventasHuevosAyerTotal) * 100 : (ventasHuevosHoyTotal > 0 ? 100 : 0);
  const saludoHora = hoyDate.getHours() < 12 ? "Buenos días" : hoyDate.getHours() < 19 ? "Buenas tardes" : "Buenas noches";
  const fechaInicio = hoyDate.toLocaleDateString("es-CL", { weekday: "long", day: "numeric", month: "long" });
  const bandejasVendidasHoy = Math.floor(huevosVendidosHoy / 30);
  const gastosHoyInicio = gastosReporte.filter(g => fechaLocalClave(g?.fecha || g?.creadoEn || g?.createdAt) === hoyClave);
  const egresosHoyInicio = gastosHoyInicio.reduce((sum, g) => sum + Number(g?.total || 0), 0);
  const movimientosInicioDashboard = [
    ...ventasHoy.map((v, index) => ({
      id: v.id || v._id || `venta-${index}`,
      tipo: "venta",
      titulo: (v.items || []).some(i => i?.tipoItem === "huevo") ? "Venta de huevos" : "Venta de inventario",
      detalle: (v.items || []).map(i => i?.nombre).filter(Boolean).slice(0, 2).join(" · ") || (v.pago || v.metodoPago || "Venta"),
      hora: new Date(v.timestamp || v.createdAt || v.creadoEn || Date.now()).toLocaleTimeString("es-CL", { hour: "2-digit", minute: "2-digit" }),
      monto: Number(v.total || 0),
      positivo: true,
      fechaOrden: new Date(v.timestamp || v.createdAt || v.creadoEn || 0).getTime(),
    })),
    ...gastosHoyInicio.map((g, index) => ({
      id: g.id || g._id || `gasto-${index}`,
      tipo: "gasto",
      titulo: "Gasto registrado",
      detalle: g.comercio || g.descripcion || g.categoria || "Gasto",
      hora: new Date(g.creadoEn || g.createdAt || `${g.fecha || hoyClave}T12:00:00`).toLocaleTimeString("es-CL", { hour: "2-digit", minute: "2-digit" }),
      monto: Number(g.total || 0),
      positivo: false,
      fechaOrden: new Date(g.creadoEn || g.createdAt || `${g.fecha || hoyClave}T12:00:00`).getTime(),
    })),
  ].sort((a, b) => b.fechaOrden - a.fechaOrden);
  const valorInventarioReal = products.reduce((sum, p) => sum + Number(p.stock || 0) * Number(p.precio || 0), 0);

  // Mes anterior
  const mesAnteriorNum = mesActual === 0 ? 11 : mesActual - 1;
  const anioAnteriorNum = mesActual === 0 ? anioActual - 1 : anioActual;
  const ventasMesAnterior = ventas.filter(v => {
    if (v.timestamp) { const d = new Date(v.timestamp); return d.getMonth() === mesAnteriorNum && d.getFullYear() === anioAnteriorNum; }
    return false;
  });
  const totalMesAnterior = ventasMesAnterior.reduce((s, v) => s + v.total, 0);
  const cambioMes = totalMesAnterior > 0 ? Math.round(((totalMes - totalMesAnterior) / totalMesAnterior) * 100) : null;

  // Historial filtrado
  const ventasFiltradas = ventas.filter(v => {
    if (filtroPago !== "Todos" && v.pago !== filtroPago) return false;
    if (fechaHistorial) {
      const fechaV = v.timestamp ? new Date(v.timestamp).toISOString().slice(0, 10) : "";
      if (fechaV !== fechaHistorial) return false;
    }
    if (busquedaHistorial) {
      const q = busquedaHistorial.toLowerCase();
      const enItems = v.items?.some(i => i.nombre.toLowerCase().includes(q));
      const enNota = v.nota?.toLowerCase().includes(q);
      if (!enItems && !enNota) return false;
    }
    return true;
  });

  const notificaciones = [
    ...lowStock.map(p => ({ tipo: "stock", msg: `${p.img} ${p.nombre} tiene solo ${p.stock} unidades`, color: "#f59e0b" })),

    ...ventas.slice(0, 2).map(v => ({ tipo: "venta", msg: `Venta registrada por ${fmt(v.total)}`, color: "#10b981" })),
  ];

  // ── Usuarios ──
  const refreshUsuarios = async () => {
    if (!currentUser?._clave) return;
    setLoadingUsuarios(true);
    try { const data = await apiGet("/api/users", currentUser.usuario, currentUser._clave); setUsuarios(data); }
    catch (e) { console.error(e.message); }
    setLoadingUsuarios(false);
  };
  const handleEditarUsuario = (u) => { setFormUsuario({ ...u, nuevaClave: "", nuevoUsuario: u.usuario }); setModalUsuario("edit"); setUsuarioError(""); };
  const handleGuardarUsuario = async () => {
    setUsuarioError("");
    if (!formUsuario.nombre) { setUsuarioError("El nombre es obligatorio."); return; }
    try {
      const payload = {
        nombre: formUsuario.nombre,
        rol: formUsuario.rol,
        correo: formUsuario.correo,
        empresa: formUsuario.empresa,
      };
      if (formUsuario.nuevaClave) payload.nuevaClave = formUsuario.nuevaClave;
      if (formUsuario.nuevoUsuario && formUsuario.nuevoUsuario !== formUsuario.usuario) payload.nuevoUsuario = formUsuario.nuevoUsuario;
      await apiPut(`/api/users/${formUsuario.usuario}`, payload, currentUser.usuario, currentUser._clave);
      await refreshUsuarios(); setModalUsuario(null);
    } catch (e) { setUsuarioError(e.message); }
  };
  const handleEliminarUsuario = async (usuario) => {
    if (usuario === currentUser.usuario) { alert("No puedes eliminarte."); return; }
    try { await apiDelete(`/api/users/${usuario}`, currentUser.usuario, currentUser._clave); await refreshUsuarios(); }
    catch (e) { alert("Error: " + e.message); }
  };
  const handleBloquearUsuario = async (usuario, blocked) => {
    if (usuario === currentUser.usuario) return;
    try { await apiPatch(`/api/users/${usuario}/block`, { blocked }, currentUser.usuario, currentUser._clave); await refreshUsuarios(); }
    catch (e) { alert("Error: " + e.message); }
  };
  const handleCrearUsuario = async () => {
    setNuevoUsuarioError("");
    if (!formNuevoUsuario.nombre || !formNuevoUsuario.usuario || !formNuevoUsuario.clave) { setNuevoUsuarioError("Completa nombre, usuario y contraseña."); return; }
    // Si no escribió empresa, heredar la del gerente que está creando
    const payload = { ...formNuevoUsuario, empresa: formNuevoUsuario.empresa || currentUser?.empresa || "" };
    try {
      const res = await fetch(`${API}/api/users`, { method: "POST", headers: { "Content-Type": "application/json", "x-admin-user": currentUser.usuario, "x-admin-clave": currentUser._clave }, body: JSON.stringify(payload) });
      const d = await res.json();
      if (!res.ok) { setNuevoUsuarioError(d.error || "Error al crear usuario"); return; }
      await refreshUsuarios();
      setModalNuevoUsuario(false);
      setFormNuevoUsuario({ nombre: "", usuario: "", correo: "", clave: "", rol: "empleado", empresa: "" });
    } catch (e) { setNuevoUsuarioError(e.message); }
  };

  // ── Config ──
  const guardarConfig = (nuevaConfig) => { setConfig(nuevaConfig); saveConfig(nuevaConfig); };

  // ── RESET COMPLETO ──
  const handleResetCompleto = async () => {
    if (resetConfirmText !== "RESTABLECER") return;
    // Las ventas y boletas monetarias nunca se eliminan del backend.
    // El restablecimiento solo limpia preferencias locales.
    // Borrar local
    localStorage.removeItem("inv_sales");
    localStorage.removeItem("inv_boletas");
    localStorage.removeItem("inv_config");
    localStorage.removeItem("inv_catIcons");
    saveDarkMode(false);
    setVentas([]); setBoletas([]);
    setProducts([]); setCategorias([]);
    setCatIconos({}); saveCatIcons({});
    const defaultConfig = { negocio: "Mi Negocio", direccion: "", telefono: "", moneda: "CLP", rut: "", notifStockBajo: true, notifVentas: true, stockMinimo: 5, tema: "claro", siiModo: "simulado", siiRut: "", siiClave: "" };
    setConfig(defaultConfig); saveConfig(defaultConfig);
    setDarkMode(false);
    setShowResetModal(false);
    setResetConfirmText("");
    setActiveNav("Dashboard");
  };

  // ── Reconciliar stock (corrige retroactivamente ventas que no descontaron stock) ──
  const [reconciliando, setReconciliando] = useState(false);
  const [resultReconciliacion, setResultReconciliacion] = useState(null);
  const handleReconciliarStock = async () => {
    if (!window.confirm("Esto va a revisar todas las ventas pendientes y descontar el stock que les falte. Es seguro correrlo más de una vez (no descuenta dos veces la misma venta). ¿Continuar?")) return;
    setReconciliando(true);
    setResultReconciliacion(null);
    try {
      const res = await fetch(`${API}/api/productos/reconciliar-stock`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-admin-user": currentUser.usuario,
          "x-admin-clave": currentUser._clave || "",
        },
        body: JSON.stringify({ empresa: currentUser?.empresa || "" }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "No se pudo reconciliar el stock.");
      setResultReconciliacion(data);
      // Refrescar productos para ver el stock ya corregido
      const productosRes = await fetch(API + "/api/productos");
      const productosData = await productosRes.json();
      if (Array.isArray(productosData)) {
        const empresa = currentUser?.empresa || "";
        let filtered;
        if (currentUser?.rol === "programador") filtered = productosData;
        else if (empresa) filtered = productosData.filter(p => !p.empresa || p.empresa === "" || p.empresa === empresa);
        else filtered = productosData.filter(p => !p.empresa || p.empresa === "");
        setProducts(filtered.map(p => ({ ...p, id: p.id || p._id })));
      }
    } catch (e) {
      alert("Error al reconciliar stock: " + e.message);
    } finally {
      setReconciliando(false);
    }
  };

  // ── Revertir reconciliación (corrige el descuento duplicado de stock) ──
  const [revirtiendo, setRevirtiendo] = useState(false);
  const [resultReversion, setResultReversion] = useState(null);
  const handleRevertirReconciliacion = async () => {
    if (!window.confirm("Esto va a devolver el stock que se restó de más por la reconciliación anterior (la que descontó dos veces boletas que ya tenían su stock aplicado). Es seguro correrlo más de una vez (no devuelve dos veces la misma boleta). ¿Continuar?")) return;
    setRevirtiendo(true);
    setResultReversion(null);
    try {
      const res = await fetch(`${API}/api/productos/revertir-reconciliacion`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-admin-user": currentUser.usuario,
          "x-admin-clave": currentUser._clave || "",
        },
        body: JSON.stringify({ empresa: currentUser?.empresa || "" }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "No se pudo revertir la reconciliación.");
      setResultReversion(data);
      // Refrescar productos para ver el stock ya corregido
      const productosRes = await fetch(API + "/api/productos");
      const productosData = await productosRes.json();
      if (Array.isArray(productosData)) {
        const empresa = currentUser?.empresa || "";
        let filtered;
        if (currentUser?.rol === "programador") filtered = productosData;
        else if (empresa) filtered = productosData.filter(p => !p.empresa || p.empresa === "" || p.empresa === empresa);
        else filtered = productosData.filter(p => !p.empresa || p.empresa === "");
        setProducts(filtered.map(p => ({ ...p, id: p.id || p._id })));
      }
    } catch (e) {
      alert("Error al revertir la reconciliación: " + e.message);
    } finally {
      setRevirtiendo(false);
    }
  };

  const configSections = [
    { id: "general", label: "General", icon: Store, desc: "Datos del negocio" },
    { id: "pagos", label: "Métodos de Pago", icon: CreditCard, desc: "Formas de cobro habilitadas" },
    { id: "notificaciones", label: "Notificaciones", icon: Bell, desc: "Alertas y avisos" },
    { id: "preferencias", label: "Preferencias", icon: Sliders, desc: "Apariencia e interfaz" },
    { id: "respaldo", label: "Respaldo", icon: Download, desc: "Exportar e importar datos" },
    { id: "usuarios", label: "Gestión de Usuarios", icon: Users, desc: "Cuentas y permisos", soloGerente: true },
    { id: "seguridad", label: "Seguridad", icon: Shield, desc: "Roles y acceso", soloGerente: true },
    { id: "cuenta", label: "Mi Cuenta", icon: Lock, desc: "Tu perfil" },
  ];
  const configSectionsFiltered = configSearch
    ? configSections.filter(s => s.label.toLowerCase().includes(configSearch.toLowerCase()) || s.desc.toLowerCase().includes(configSearch.toLowerCase()))
    : configSections;

  const exportarExcel = () => {
    const wb = XLSX.utils.book_new();
    const mesStr = mesNombre.charAt(0).toUpperCase() + mesNombre.slice(1);
    // Desglose por método de pago del mes (no altera los cálculos existentes de totalMes/ventasMes).
    const pagosMes = ventasMes.reduce((acc, v) => {
      const metodo = normalizarMetodoPago(v);
      acc[metodo] = (acc[metodo] || 0) + Number(v.total || 0);
      return acc;
    }, { Efectivo: 0, "Débito": 0, Transferencia: 0, "Crédito": 0 });
    const efectivoMes = pagosMes.Efectivo;
    const debitoMes = pagosMes["Débito"] + pagosMes["Crédito"];
    const transferenciaMes = pagosMes.Transferencia;
    const totalMetodosMes = efectivoMes + debitoMes + transferenciaMes;
    const ws1 = XLSX.utils.aoa_to_sheet([
      ["RESUMEN MENSUAL"],[],
      ["Total", totalMes],["Ventas", ventasMes.length],["Ticket Prom.", ticketPromedio],
      [],
      ["Ventas por método de pago"],
      ["Efectivo","Débito","Transferencia","Total"],
      [efectivoMes, debitoMes, transferenciaMes, totalMetodosMes]
    ]);
    XLSX.utils.book_append_sheet(wb, ws1, "Resumen");
    const ws2 = XLSX.utils.aoa_to_sheet([
      ["#","Fecha","Vendedor","Productos","Pago","Total ($)","Efectivo","Débito","Transferencia","Total"],
      ...ventasMes.map((v,i)=>{
        const metodo = normalizarMetodoPago(v);
        const total = Number(v.total || 0);
        return [i+1,v.fecha,v.usuario,(v.items||[]).map(it=>`${it.nombre}×${it.cantidad}`).join("|"),v.pago,total,
          metodo==="Efectivo"?total:0, (metodo==="Débito"||metodo==="Crédito")?total:0, metodo==="Transferencia"?total:0, total];
      })
    ]);
    XLSX.utils.book_append_sheet(wb, ws2, "Ventas");
    const ws3 = XLSX.utils.aoa_to_sheet([["N°","Fecha","Método","Total"],...boletas.map((b,i)=>[b.numero,b.fecha,b.metodoPago,b.total])]);
    XLSX.utils.book_append_sheet(wb, ws3, "Recibos");
    XLSX.writeFile(wb, `reporte-${mesStr.replace(" ","-")}.xlsx`);
  };

  // Normaliza los nombres de pago que pueden venir desde Android, web, PC o ventas antiguas.
  // De este modo "Tarjeta", "debito", "Débito" y metodoPago se muestran juntos.
  const normalizarMetodoPago = (venta) => {
    const raw = String(venta?.pago || venta?.metodoPago || venta?.formaPago || "Efectivo")
      .trim()
      .toLowerCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "");
    if (["debito", "tarjeta", "tarjeta debito", "redcompra"].includes(raw)) return "Débito";
    if (["transferencia", "transfer", "transferencia bancaria"].includes(raw)) return "Transferencia";
    if (["credito", "tarjeta credito"].includes(raw)) return "Crédito";
    return "Efectivo";
  };
  const fechaVentaReporte = (venta) => venta?.timestamp || venta?.createdAt || venta?.creadoEn || venta?.fechaISO || venta?.fecha;

  // ─── CÁLCULOS REPORTES ───────────────────────────────────────────────────────
  const ahora2 = new Date();
  const ventasPeriodo = ventas.filter(v => {
    const fecha = fechaVentaReporte(v);
    if (!fecha) return reportePeriodo === "todo";
    const d = new Date(fecha);
    if (Number.isNaN(d.getTime())) return reportePeriodo === "todo";
    if (reportePeriodo === "dia") return d.toISOString().slice(0, 10) === reporteFecha;
    if (reportePeriodo === "semana") return (ahora2 - d) / (1000*60*60*24) <= 7;
    if (reportePeriodo === "mes") return d.getMonth() === mesActual && d.getFullYear() === anioActual;
    return true;
  });
  const totalPeriodo = ventasPeriodo.reduce((s, v) => s + Number(v.total || 0), 0);
  const ticketProm = ventasPeriodo.length > 0 ? Math.round(totalPeriodo / ventasPeriodo.length) : 0;
  const ventasPorDia = {};
  ventas.forEach(v => {
    if (!v.timestamp) return;
    const d = new Date(v.timestamp);
    if ((ahora2 - d) / (1000*60*60*24) > 14) return;
    const key = d.toLocaleDateString("es-CL", { day: "2-digit", month: "2-digit" });
    if (!ventasPorDia[key]) ventasPorDia[key] = { dia: key, total: 0, cantidad: 0 };
    ventasPorDia[key].total += v.total;
    ventasPorDia[key].cantidad += 1;
  });
  const graficoDias = Object.values(ventasPorDia).slice(-14);
  const repProdMap = {};
  ventasPeriodo.forEach(v => v.items?.forEach(i => {
    if (!repProdMap[i.nombre]) repProdMap[i.nombre] = { nombre: i.nombre, cantidad: 0, ingresos: 0 };
    repProdMap[i.nombre].cantidad += i.cantidad;
    repProdMap[i.nombre].ingresos += i.subtotal || 0;
  }));
  const topProductosRep = Object.values(repProdMap).sort((a, b) => b.ingresos - a.ingresos).slice(0, 8);

  // ── Costo/Beneficio del período ──────────────────────────────────────────
  // BUG FIX: antes solo buscaba el costo en `products`, así que los ítems de
  // huevos (que no son un "producto" con nombre coincidente) siempre sumaban
  // costo $0 aquí — el ingreso de la venta de huevos sí se contaba pero su
  // costo no, inflando el margen cada vez que se vendían huevos. Ahora el
  // costo de huevos se calcula igual que en el resto de la app: con el costo
  // de COMPRA guardado en el propio ítem de la venta (costoCaja), nunca con
  // el precio de venta.
  const costosPeriodo = (() => {
    const prodMap = {};
    products.forEach(p => { prodMap[p.nombre] = p.costo || 0; });
    let costoTotal = 0;
    ventasPeriodo.forEach(v => v.items?.forEach(i => {
      if (i.tipoItem === "huevo") {
        const huevosVendidos = Number(i.huevos || 0);
        const costoCajaCompra = Number(i.costoCaja || 0);
        costoTotal += (huevosVendidos / 180) * costoCajaCompra;
        return;
      }
      const costoUnitario = Number(i.costo ?? i.precioCosto ?? prodMap[i.nombre] ?? 0);
      const unidades = Number(i.cantidad || i.cantidadFormatos || 1) * Number(i.unidadesPorManga || 1);
      costoTotal += costoUnitario * unidades;
    }));
    return costoTotal;
  })();
  const ingresosPeriodo   = ventasPeriodo.reduce((s, v) => s + v.total, 0);
  const gananciaPeriodo   = ingresosPeriodo - costosPeriodo;

  // ── Pérdidas del período (mermas de inventario general) ──────────────────
  // Usamos el id (timestamp) de cada merma para filtrar por período, ya que
  // `fecha` se guarda como texto localizado (es-CL) y no es parseable de forma
  // confiable con `new Date()`.
  const mermasPeriodo = mermas.filter(m => {
    const d = new Date(Number(m.id) || NaN);
    if (Number.isNaN(d.getTime())) return reportePeriodo === "todo";
    if (reportePeriodo === "dia") return d.toISOString().slice(0, 10) === reporteFecha;
    if (reportePeriodo === "semana") return (ahora2 - d) / (1000*60*60*24) <= 7;
    if (reportePeriodo === "mes") return d.getMonth() === mesActual && d.getFullYear() === anioActual;
    return true;
  });
  const mermasPorMotivo = (() => {
    const prodMap = {}; products.forEach(p => { prodMap[p.id] = p; });
    const acc = { "Vencido": 0, "Dañado": 0, "Robo": 0, "Error de inventario": 0, "Otro": 0 };
    let valorTotal = 0, unidadesTotal = 0;
    mermasPeriodo.forEach(m => {
      const cant = Number(m.cantidad || 0);
      const motivo = acc.hasOwnProperty(m.motivo) ? m.motivo : "Otro";
      acc[motivo] = (acc[motivo] || 0) + cant;
      unidadesTotal += cant;
      const costoUnit = Number(prodMap[m.productoId]?.costo || 0);
      valorTotal += costoUnit * cant;
    });
    return { porMotivo: acc, unidadesTotal, valorTotal };
  })();

  // ── Ingresos / Egresos / Balance del período (bloque financiero de Reportes) ──
  // Egresos = todos los gastos registrados en el módulo Gastos (incluye compras de
  // inventario, ya que se guardan como gasto: se cuentan una sola vez, no se duplican).
  const gastosPeriodo = gastosReporte.filter(g => {
    const fecha = g?.fecha || g?.createdAt || g?.creadoEn;
    if (!fecha) return reportePeriodo === "todo";
    const d = new Date(fecha);
    if (Number.isNaN(d.getTime())) return reportePeriodo === "todo";
    if (reportePeriodo === "dia") return d.toISOString().slice(0, 10) === reporteFecha;
    if (reportePeriodo === "semana") return (ahora2 - d) / (1000*60*60*24) <= 7;
    if (reportePeriodo === "mes") return d.getMonth() === mesActual && d.getFullYear() === anioActual;
    return true;
  });
  const egresosPeriodo = gastosPeriodo.reduce((s, g) => s + Number(g.total || 0), 0);
  const balancePeriodo = ingresosPeriodo - egresosPeriodo;
  const margenPct         = costosPeriodo > 0 ? Math.round((gananciaPeriodo / costosPeriodo) * 100) : 0;
  const topGananciaProd   = Object.values(repProdMap).map(p => {
    const costo = (products.find(pr => pr.nombre === p.nombre)?.costo || 0) * p.cantidad;
    return { ...p, costo, ganancia: p.ingresos - costo, margen: costo > 0 ? Math.round(((p.ingresos - costo) / costo) * 100) : 0 };
  }).sort((a, b) => b.ganancia - a.ganancia).slice(0, 8);
  const resumenPagosPeriodo = ventasPeriodo.reduce((acc, venta) => {
    const metodo = normalizarMetodoPago(venta);
    const monto = Number(venta.total || 0);
    acc[metodo] = (acc[metodo] || 0) + monto;
    return acc;
  }, { Efectivo: 0, "Débito": 0, Transferencia: 0, "Crédito": 0 });
  const metodosRep = [
    { label: "Efectivo",      color: "#10b981", val: resumenPagosPeriodo.Efectivo },
    { label: "Débito",        color: "#f59e0b", val: resumenPagosPeriodo["Débito"] + resumenPagosPeriodo["Crédito"] },
    { label: "Transferencia", color: "#8b5cf6", val: resumenPagosPeriodo.Transferencia },
  ];
  const totalProductos   = products.length;
  const valorInventario = products.reduce((s, p) => s + ((p.precio||0)*(p.stock||0)), 0);
  const valorCosto      = products.reduce((s, p) => s + ((p.costo||0)*(p.stock||0)), 0);
  const stockTotal      = products.reduce((s, p) => s + (p.stock||0), 0);
  const stockBajoRep    = products.filter(p => (p.stock||0) <= (p.stockMinimo||5) && (p.stock||0) > 0);
  const sinStockRep     = products.filter(p => (p.stock||0) === 0);
  const conStockRep     = products.filter(p => (p.stock||0) > 0);
  const topValorStock   = [...products].filter(p => p.stock > 0).sort((a,b)=>(b.precio*b.stock)-(a.precio*a.stock)).slice(0,8);
  const catStockMap = {};
  products.forEach(p => {
    const cat = p.categoria || "Sin categoría";
    if (!catStockMap[cat]) catStockMap[cat] = { cat, cantidad: 0, valor: 0 };
    catStockMap[cat].cantidad += p.stock || 0;
    catStockMap[cat].valor += (p.precio||0)*(p.stock||0);
  });
  const catStockArr = Object.values(catStockMap).sort((a,b)=>b.valor-a.valor);
  const catColors = ["#d71920","#10b981","#f59e0b","#e03131","#8b5cf6","#009ee3","#059669","#d97706"];
  const mejorDia = graficoDias.length > 0 ? graficoDias.reduce((a,b)=>b.total>a.total?b:a, graficoDias[0])?.dia || "—" : "—";

  // ── Gráfico Tendencia de Ventas: datos reales del mes actual ─────────────────
  const salesData = (() => {
    const hoy = new Date();
    const mes = hoy.getMonth();
    const anio = hoy.getFullYear();
    const diaHoy = hoy.getDate();
    const mapa = {};
    for (let d = 1; d <= diaHoy; d++) mapa[d] = 0;
    ventas.forEach(v => {
      if (!v.timestamp) return;
      const fecha = new Date(v.timestamp);
      if (fecha.getMonth() !== mes || fecha.getFullYear() !== anio) return;
      const dia = fecha.getDate();
      if (mapa[dia] !== undefined) mapa[dia] += v.total || 0;
    });
    return Object.entries(mapa).map(([day, ventas]) => ({ day: String(day), ventas }));
  })();

  // ─── RENDER ───────────────────────────────────────────────────────────────────
  return (
    <div style={{ display: "flex", width: "100vw", height: "100vh", fontFamily: "'Sora', sans-serif", background: bgMain, overflow: "hidden" }}>
      {globalStyles}

      {/* Boleta Modal */}
      {boletaModal && <BoletaModal boleta={boletaModal} config={config} darkMode={D} onClose={() => setBoletaModal(null)} />}

      {/* Reset Modal */}
      {showResetModal && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.7)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 300, backdropFilter: "blur(6px)" }}>
          <div className="fade-in" style={{ background: D ? "#1a1d2e" : "#fff", borderRadius: 20, padding: 32, width: "92%", maxWidth: 440, boxShadow: "0 30px 80px rgba(0,0,0,0.4)" }}>
            <div style={{ textAlign: "center", marginBottom: 22 }}>
              <div style={{ width: 64, height: 64, borderRadius: "50%", background: "#fff1f2", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 14px" }}>
                <AlertTriangle size={30} color="#e03131" />
              </div>
              <h3 style={{ margin: "0 0 10px", fontSize: 20, fontWeight: 800, color: D ? "#e8eaf6" : "#1a1a2e" }}>⚠ Restablecer el sistema</h3>
              <p style={{ margin: 0, fontSize: 14, color: D ? "#9ca3af" : "#6b7280", lineHeight: 1.6 }}>
                Esta acción es <strong style={{ color: "#e03131" }}>irreversible</strong>. Se borrarán <strong>todas las ventas, recibos, configuración</strong> y el sistema volverá al estado inicial.
              </p>
            </div>
            <div style={{ background: "#fff1f2", border: "1.5px solid #fecaca", borderRadius: 10, padding: "12px 16px", marginBottom: 20 }}>
              <p style={{ margin: "0 0 8px", fontSize: 13, fontWeight: 700, color: "#e03131" }}>Se eliminará permanentemente:</p>
              {["Todas las ventas registradas", "Todos los recibos generados", "Historial de transacciones MP", "Configuración del sistema", "Datos del negocio"].map(item => (
                <p key={item} style={{ margin: "0 0 4px", fontSize: 12, color: "#dc2626" }}>✗ {item}</p>
              ))}
            </div>
            <p style={{ margin: "0 0 8px", fontSize: 13, fontWeight: 600, color: D ? "#e8eaf6" : "#374151" }}>
              Escribe <strong style={{ color: "#e03131", fontFamily: "monospace" }}>RESTABLECER</strong> para confirmar:
            </p>
            <input value={resetConfirmText} onChange={e => setResetConfirmText(e.target.value)} placeholder="RESTABLECER" style={{ ...inp, marginBottom: 16, fontFamily: "monospace", fontWeight: 700, letterSpacing: "0.05em" }} />
            <div style={{ display: "flex", gap: 10 }}>
              <button onClick={() => { setShowResetModal(false); setResetConfirmText(""); }} style={{ flex: 1, padding: "11px", borderRadius: 10, border: `1.5px solid ${borderColor2}`, background: bgCard2, cursor: "pointer", fontSize: 14, color: textSecondary, fontWeight: 600, fontFamily: "inherit" }}>Cancelar</button>
              <button onClick={handleResetCompleto} disabled={resetConfirmText !== "RESTABLECER"} style={{ flex: 1, padding: "11px", borderRadius: 10, border: "none", background: resetConfirmText === "RESTABLECER" ? "linear-gradient(135deg, #e03131, #f03e3e)" : "#d1d5db", cursor: resetConfirmText === "RESTABLECER" ? "pointer" : "not-allowed", fontSize: 14, fontWeight: 700, color: resetConfirmText === "RESTABLECER" ? "#fff" : "#9ca3af", fontFamily: "inherit" }}>
                Restablecer Todo
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Sidebar ── */}
      <aside className="sidebar-desktop" style={{ width: sidebarOpen ? 240 : 70, transition: "width 0.25s cubic-bezier(0.4,0,0.2,1)", flexShrink: 0, background: D ? "#191d19" : "#fff", borderRight: `1px solid ${borderColor}`, display: "flex", flexDirection: "column", overflow: "hidden" }}>
        <div style={{ padding: "22px 16px 18px", display: "flex", alignItems: "center", gap: 11, cursor: "pointer" }} onClick={() => setSidebarOpen(!sidebarOpen)}>
          <div style={{ width: 38, height: 38, borderRadius: 12, background: config.logoNegocio ? "transparent" : (D ? "#ffc400" : "#d71920"), display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, overflow: "hidden" }}>
            {config.logoNegocio
              ? <img src={config.logoNegocio} alt="logo" style={{ width: "100%", height: "100%", objectFit: "cover", borderRadius: 12 }} />
              : <Package size={18} color="#fff" strokeWidth={2} />}
          </div>
          {sidebarOpen && <div>
            <p style={{ margin: 0, fontWeight: 700, fontSize: 15, color: textPrimary, whiteSpace: "nowrap" }}>{config.negocio}</p>
            <p style={{ margin: 0, fontSize: 10, color: textMuted, fontWeight: 500, textTransform: "uppercase", letterSpacing: "0.6px" }}>Sistema de gestión</p>
          </div>}
        </div>
        <nav style={{ flex: 1, padding: "6px 12px", overflowY: "auto" }}>
          {navItems.map(({ name, label, icon: Icon }) => (
            <button key={name} onClick={() => { setEggSaleMode(false); setActiveNav(name); }} className={`nav-btn ${activeNav === name ? "active" : ""}`}
              style={{ display: "flex", alignItems: "center", gap: 12, width: "100%", padding: "11px 13px", borderRadius: 12, border: "none", cursor: "pointer", fontSize: 14, marginBottom: 2, whiteSpace: "nowrap", fontFamily: "inherit", fontWeight: 500, background: "none" }}>
              <Icon size={17} strokeWidth={1.8} style={{ flexShrink: 0 }} />
              {sidebarOpen && <span>{label || name}</span>}
            </button>
          ))}
        </nav>
        <div style={{ padding: "14px 14px", borderTop: `1px solid ${borderColor}`, display: "flex", alignItems: "center", gap: 10 }}>
          <div style={{ width: 34, height: 34, borderRadius: "50%", background: esGerente ? (D ? "#ffc400" : "#d71920") : (D ? "#63c2a6" : "#4a8d7a"), color: "#fff", display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 700, fontSize: 12, flexShrink: 0 }}>
            {iniciales}
          </div>
          {sidebarOpen && <>
            <div style={{ flex: 1, minWidth: 0 }}>
              <p style={{ margin: 0, fontSize: 13, fontWeight: 700, color: textPrimary, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{currentUser.nombre}</p>
              <p style={{ margin: 0, fontSize: 11, color: textMuted, fontWeight: 600 }}>{esGerente ? "Gerente" : "Empleado"}</p>
            </div>
            <button onClick={() => setCurrentUser(null)} style={{ background: "none", border: "none", cursor: "pointer", padding: 4, color: textMuted, borderRadius: 8 }}><LogOut size={15} /></button>
          </>}
        </div>
      </aside>

      {/* ── Bottom Nav (solo móvil) ── */}
      {moreMenuOpen && (
        <>
          <div className="more-menu-overlay" onClick={() => setMoreMenuOpen(false)} />
          <div className="more-menu-panel" style={{ background: bgCard, border: `1px solid ${borderColor}` }}>
            {navItems.slice(4).map(({ name, label, icon: Icon }) => (
              <button key={name} onClick={() => { setEggSaleMode(false); setActiveNav(name); setMoreMenuOpen(false); }}
                className="more-menu-btn"
                style={{ background: activeNav === name ? (D ? "rgba(79,174,147,0.18)" : "#e4f0ec") : bgCard2, color: activeNav === name ? (D ? "#ffc400" : "#d71920") : textSecondary, border: `1px solid ${borderColor}` }}>
                <Icon size={22} strokeWidth={1.8} />
                {label || name}
              </button>
            ))}
            <button onClick={() => { setCurrentUser(null); setMoreMenuOpen(false); }}
              className="more-menu-btn"
              style={{ background: "#fbeae4", color: "#b3452f", border: "1px solid #f0d3c7" }}>
              <LogOut size={22} strokeWidth={1.8} />
              Salir
            </button>
          </div>
        </>
      )}
      {saleChooserOpen && (
        <>
          <div className="sale-choice-overlay" onClick={() => setSaleChooserOpen(false)} />
          <section className="sale-choice-sheet" aria-label="Seleccionar tipo de venta">
            <div className="sale-choice-head">
              <div>
                <h2>Nueva venta</h2>
                <p>Selecciona qué quieres vender.</p>
              </div>
              <button onClick={() => setSaleChooserOpen(false)} aria-label="Cerrar"><X size={21}/></button>
            </div>
            <button className="sale-choice-card egg" onClick={() => { setSaleFlowType("free"); setEggSaleMode(false); setActiveNav("Ventas"); setSaleChooserOpen(false); }}>
              <span className="sale-choice-icon">🛒</span>
              <span className="sale-choice-copy"><strong>Venta libre</strong><small>Agrega huevos y productos en una sola boleta.</small></span>
              <ChevronRight size={24}/>
            </button>
            <button className="sale-choice-card products" onClick={() => { setSaleFlowType("products"); setEggSaleMode(false); setFreeEggCart({}); setActiveNav("Ventas"); setSaleChooserOpen(false); }}>
              <span className="sale-choice-icon"><ShoppingBag size={30}/></span>
              <span className="sale-choice-copy"><strong>Venta de productos</strong><small>Vende solo productos del inventario.</small></span>
              <ChevronRight size={24}/>
            </button>
          </section>
        </>
      )}
      <nav className={`bottom-nav ${saleChooserOpen ? "sale-chooser-open" : ""}`}> 
        {navItems.slice(0, 4).map(({ name, label, icon: Icon }) => {
          const isSales = name === "Ventas";
          const isEggInventory = name === "Huevos";
          const isActive = isSales
            ? activeNav === "Ventas" || (activeNav === "Huevos" && eggSaleMode)
            : isEggInventory
              ? activeNav === "Huevos" && !eggSaleMode
              : activeNav === name;

          return (
            <button
              key={name}
              onClick={() => {
                if (isSales) {
                  setSaleChooserOpen(true);
                } else {
                  setEggSaleMode(false);
                  setActiveNav(name);
                }
                setMoreMenuOpen(false);
              }}
              className={`bottom-nav-btn ${isActive ? "active" : ""}`}
            >
              <span className="bottom-nav-icon"><Icon size={20} strokeWidth={1.8} /></span>
              <span>{isSales ? "Ventas" : (label || name)}</span>
            </button>
          );
        })}
        <button onClick={() => setMoreMenuOpen(o => !o)} className={`bottom-nav-btn ${moreMenuOpen || navItems.slice(4).some(n => n.name === activeNav) ? "active" : ""}`}>
          <span className="bottom-nav-icon">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="5" cy="12" r="1.5"/><circle cx="12" cy="12" r="1.5"/><circle cx="19" cy="12" r="1.5"/>
            </svg>
          </span>
          <span>Más</span>
        </button>
      </nav>

      {/* ── Main ── */}
      <div className="main-content" style={{ flex: 1, display: "flex", flexDirection: "column", overflow: "hidden" }}>
        {/* Topbar */}
        <header className={`mobile-topbar ${activeNav === "Dashboard" ? "dashboard-mobile-topbar" : ""}`} style={{ background: D ? "#13152a" : "#fff", borderBottom: `1px solid ${borderColor}`, padding: "0 24px", height: 62, display: "flex", alignItems: "center", gap: 12, flexShrink: 0 }}>
          <div style={{ flex: 1, minWidth: 0 }}>
            <h1 style={{ margin: 0, fontSize: 18, fontWeight: 700, color: textPrimary, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{navItems.find(n => n.name === activeNav)?.label || activeNav}</h1>
            <p className="header-date" style={{ margin: 0, fontSize: 12, color: textMuted }}>{new Date().toLocaleDateString("es-CL", { weekday: "long", year: "numeric", month: "long", day: "numeric" })}</p>
          </div>

          {/* Selector de empresa — solo programador */}
          {esProgramador && (
            <div style={{ display: "flex", alignItems: "center", gap: 6, background: "rgba(124,58,237,0.15)", border: "1.5px solid rgba(124,58,237,0.4)", borderRadius: 10, padding: "6px 10px", flexShrink: 0 }}>
              <span style={{ fontSize: 13 }}>🏢</span>
              <select
                value={empresaVista}
                onChange={e => { setEmpresaVista(e.target.value); setCatFilter("Todos"); }}
                style={{ background: "transparent", border: "none", outline: "none", color: "#a78bfa", fontWeight: 700, fontSize: 12, fontFamily: "inherit", cursor: "pointer", maxWidth: 130 }}
              >
                <option value="">Todas las empresas</option>
                {[...new Set(products.map(p => p.empresa).filter(Boolean))].map(emp => (
                  <option key={emp} value={emp}>{emp}</option>
                ))}
              </select>
            </div>
          )}
          <div className="header-search" style={{ position: "relative", display: "flex", alignItems: "center", background: bgCard2, borderRadius: 10, padding: "8px 14px", gap: 8, width: 220, border: `1px solid ${borderColor}` }}>
            <Search size={14} color={textMuted} />
            <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Buscar productos..." style={{ background: "none", border: "none", outline: "none", fontSize: 13, color: textPrimary, width: "100%", fontFamily: "inherit" }} />
          </div>
          {/* Dark mode toggle */}
          <button className="header-dark-btn" onClick={toggleDark} title={D ? "Modo claro" : "Modo oscuro"}
            style={{ background: D ? "#252840" : "#f4f5fb", border: `1px solid ${borderColor}`, cursor: "pointer", width: 38, height: 38, borderRadius: 10, display: "flex", alignItems: "center", justifyContent: "center", transition: "all 0.2s" }}>
            {D ? <Sun size={17} color="#f59e0b" /> : <Moon size={17} color="#6b7280" />}
          </button>
          <div style={{ position: "relative" }}>
            <button onClick={() => setNotifOpen(!notifOpen)} style={{ background: notifOpen ? (D ? "#252840" : "#fff3bf") : (D ? "#1e2235" : "#f4f5fb"), border: `1px solid ${borderColor}`, cursor: "pointer", width: 38, height: 38, borderRadius: 10, display: "flex", alignItems: "center", justifyContent: "center", position: "relative" }}>
              <Bell size={17} color={notifOpen ? "#d71920" : textMuted} />
              {notificaciones.length > 0 && <span style={{ position: "absolute", top: 6, right: 6, width: 8, height: 8, borderRadius: "50%", background: "#ef4444", border: `2px solid ${D ? "#13152a" : "#fff"}` }} />}
            </button>
            {notifOpen && (
              <div className="fade-in notif-panel" style={{ position: "absolute", right: 0, top: 46, width: "min(320px, 90vw)", background: bgCard, borderRadius: 16, boxShadow: `0 12px 40px ${D ? "rgba(0,0,0,0.5)" : "rgba(0,0,0,0.12)"}`, border: `1px solid ${borderColor}`, zIndex: 50, overflow: "hidden" }}>
                <div style={{ padding: "14px 16px", borderBottom: `1px solid ${borderColor}`, display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                  <p style={{ margin: 0, fontSize: 14, fontWeight: 700, color: textPrimary }}>Notificaciones</p>
                  <button onClick={() => setNotifOpen(false)} style={{ background: "none", border: "none", cursor: "pointer", color: textMuted }}><X size={14} /></button>
                </div>
                {notificaciones.length === 0
                  ? <p style={{ padding: "24px", textAlign: "center", color: textMuted, fontSize: 13 }}>Sin notificaciones 🎉</p>
                  : notificaciones.map((n, i) => (
                    <div key={i} style={{ padding: "12px 16px", borderBottom: `1px solid ${borderColor}`, display: "flex", alignItems: "flex-start", gap: 10 }}>
                      <div style={{ width: 8, height: 8, borderRadius: "50%", background: n.color, flexShrink: 0, marginTop: 5 }} />
                      <p style={{ margin: 0, fontSize: 13, color: textSecondary, lineHeight: 1.5 }}>{n.msg}</p>
                    </div>
                  ))}
              </div>
            )}
          </div>
          {/* Mobile: search + dark toggle */}
          <button className="mobile-only" onClick={toggleDark}
            style={{ background: D ? "#252840" : "#f4f5fb", border: `1px solid ${borderColor}`, cursor: "pointer", width: 36, height: 36, borderRadius: 10, display: "flex", alignItems: "center", justifyContent: "center" }}>
            {D ? <Sun size={16} color="#f59e0b" /> : <Moon size={16} color="#6b7280" />}
          </button>
          <div style={{ width: 36, height: 36, borderRadius: "50%", background: esGerente ? "linear-gradient(135deg, #d71920, #ef2b32)" : "linear-gradient(135deg, #10b981, #34d399)", color: "#fff", display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 700, fontSize: 12 }}>
            {iniciales}
          </div>
        </header>

        <main className="fade-in mobile-main" style={{ flex: 1, overflow: "auto", padding: "20px 24px" }}>

          {/* ── HUEVOS (módulo independiente) ── */}
          {activeNav === "Huevos" && (
            <EggModule
              D={D} card={card} inp={inp}
              textPrimary={textPrimary} textSecondary={textSecondary} textMuted={textMuted}
              bgCard2={bgCard2} borderColor={borderColor} borderColor2={borderColor2}
              currentUser={currentUser}
              saleMode={eggSaleMode}
            />
          )}

          {/* ── DASHBOARD ── */}
          {activeNav === "Dashboard" && (
            <>
              <div className="rey-desktop-dashboard">
                <section className="desktop-overview-head">
                  <div>
                    <h2>Inicio</h2>
                    <p>{fechaInicio}</p>
                  </div>
                </section>

                <section className="desktop-kpi-grid">
                  <article className="desktop-kpi-card"><span className="desktop-kpi-icon yellow">$</span><div><small>Ventas del día</small><strong>{fmt(ventasHuevosHoyTotal)}</strong><em>{ventasHoy.length} ventas</em></div></article>
                  <article className="desktop-kpi-card"><span className="desktop-kpi-icon green">$</span><div><small>Ganancias</small><strong>{fmt(gananciasHoy)}</strong><em className={porcentajeGanancias >= 0 ? "up" : "down"}>{porcentajeGanancias >= 0 ? "↑" : "↓"} {Math.abs(porcentajeGanancias).toLocaleString("es-CL", { maximumFractionDigits: 1 })}%</em></div></article>
                  <article className="desktop-kpi-card"><span className="desktop-kpi-icon blue">▣</span><div><small>Productos</small><strong>{products.length}</strong><em>registrados</em></div></article>
                  <article className="desktop-kpi-card"><span className="desktop-kpi-icon purple">!</span><div><small>Stock bajo</small><strong>{stockBajoRep.length}</strong><em>requieren atención</em></div></article>
                </section>

                <section className="desktop-section">
                  <div className="desktop-section-title"><h3>Ventas rápidas</h3></div>
                  <div className="desktop-quick-grid">
                    <button className="desktop-quick-card egg" onClick={() => { setEggSaleMode(true); setActiveNav("Huevos"); }}><span>🥚</span><b>Nueva venta</b><small>Vender huevos</small></button>
                    <button className="desktop-quick-card red" onClick={() => setActiveNav("Ventas")}><span>🛒</span><b>Ver ventas</b><small>Historial y caja</small></button>
                    <button className="desktop-quick-card blue" onClick={() => setActiveNav("Productos")}><span>▦</span><b>Inventario</b><small>Buscar productos</small></button>
                    <button className="desktop-quick-card green" onClick={() => setActiveNav("Reportes")}><span>＋</span><b>Más opciones</b><small>Reportes y gestión</small></button>
                  </div>
                </section>

                <section className="desktop-section">
                  <div className="desktop-section-title"><h3>Productos destacados</h3><button onClick={() => setActiveNav("Productos")}>Ver todos</button></div>
                  <div className="desktop-featured-grid">
                    {products.slice(0, 5).map((p, i) => (
                      <article className="desktop-feature-card" key={p.id || p._id || i}>
                        <div className="desktop-product-image">{p.imagen ? <img src={p.imagen} alt={p.nombre}/> : <Package size={42}/>}</div>
                        <h4>{p.nombre}</h4>
                        <strong>{fmt(Number(p.precio || 0))}</strong>
                        <small>{Number(p.stock || 0).toLocaleString("es-CL")} disponibles</small>
                        <button onClick={() => setActiveNav("Productos")}>Ver producto</button>
                      </article>
                    ))}
                    {products.length === 0 && <div className="desktop-empty-products">Aún no hay productos registrados.</div>}
                  </div>
                </section>

                <section className="desktop-section desktop-last-sales">
                  <div className="desktop-section-title"><h3>Últimas ventas de huevos</h3><button onClick={() => setActiveNav("Huevos")}>Ver todas</button></div>
                  <div className="desktop-sales-table">
                    {movimientosHuevosInicio.filter(m => m.tipo === "venta").slice(0, 5).map((m, i) => (
                      <div className="desktop-sale-row" key={m.id || i}><span className="desktop-sale-dot">🥚</span><div><b>{m.calidad || "Venta de huevos"}</b><small>{Number(m.huevos || m.unidades || 0)} huevos · {m.metodoPago || "Efectivo"}</small></div><strong>{fmt(Number(m.ingreso || 0))}</strong></div>
                    ))}
                    {movimientosHuevosInicio.filter(m => m.tipo === "venta").length === 0 && <div className="desktop-empty-products">Sin ventas recientes.</div>}
                  </div>
                </section>
              </div>

              <div className="rey-mobile-home">
                <ReyDelHuevoInicio
                  currentUser={currentUser}
                  saludo={saludoHora}
                  fecha={fechaInicio}
                  ventasHoy={ventasHuevosHoyTotal}
                  bandejasHoy={bandejasVendidasHoy}
                  huevosHoy={huevosVendidosHoy}
                  gananciaHoy={gananciasHoy}
                  deltaVentas={porcentajeVentas}
                  deltaHuevos={porcentajeVentas}
                  deltaGanancia={porcentajeGanancias}
                  egresosHoy={egresosHoyInicio}
                  movimientos={movimientosInicioDashboard}
                  stockBajo={stockBajoRep.length}
                  notificaciones={notificaciones.length}
                  dark={D}
                  onToggleDark={toggleDark}
                  onNotifications={() => setNotifOpen(!notifOpen)}
                  onNavigate={(destino) => setActiveNav(destino)}
                  onVentaHuevos={() => { setEggSaleMode(true); setActiveNav("Huevos"); }}
                />
              </div>
            </>
          )}

          {/* ── PRODUCTOS ── */}
          {activeNav === "Productos" && (
            <div>
              {/* Mobile search bar — shown only on mobile */}
              <div className="mobile-products-search" style={{ display: "none", gap: 10, marginBottom: 12 }}>
                <div style={{ position: "relative", flex: 1 }}>
                  <Search size={15} color={textMuted} style={{ position: "absolute", left: 12, top: "50%", transform: "translateY(-50%)", pointerEvents: "none" }} />
                  <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Buscar productos..." style={{ width: "100%", padding: "10px 12px 10px 36px", borderRadius: 12, border: `1.5px solid ${borderColor2}`, background: bgCard2, color: textPrimary, fontSize: 14, fontFamily: "inherit", outline: "none" }} />
                </div>
                <button onClick={() => setModalPapelera(true)} style={{ display: "flex", alignItems: "center", gap: 6, padding: "10px 12px", borderRadius: 12, fontSize: 13, border: `1.5px solid ${borderColor2}`, background: bgCard, color: textSecondary, cursor: "pointer", fontFamily: "inherit", position: "relative", flexShrink: 0 }}>
                  <Trash2 size={15} />
                  {papelera.length > 0 && (
                    <span style={{ position: "absolute", top: -6, right: -6, background: "#e03131", color: "#fff", fontSize: 10, fontWeight: 800, borderRadius: 10, minWidth: 18, height: 18, display: "flex", alignItems: "center", justifyContent: "center", padding: "0 4px" }}>{papelera.length}</span>
                  )}
                </button>
                <button onClick={openAdd} className="btn-primary" style={{ display: "flex", alignItems: "center", gap: 6, padding: "10px 16px", borderRadius: 12, fontSize: 13, whiteSpace: "nowrap" }}>
                  <Plus size={15} /> Nuevo producto
                </button>
              </div>
              <div className="products-toolbar" style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 18 }}>
                <div className="cat-filters" style={{ display: "flex", gap: 8 }}>
                  {["Todos", ...categorias].map(cat => (
                    <button key={cat} onClick={() => setCatFilter(cat)}
                      style={{ padding: "7px 14px", borderRadius: 8, border: `1.5px solid ${catFilter === cat ? "#d71920" : borderColor2}`, background: catFilter === cat ? "#d71920" : bgCard, color: catFilter === cat ? "#fff" : textSecondary, cursor: "pointer", fontSize: 13, fontWeight: 600, fontFamily: "inherit", transition: "all 0.15s" }}>
                      {cat}
                    </button>
                  ))}
                </div>
                <div className="desktop-product-actions" style={{ display: "flex", gap: 8 }}>
                  <button onClick={() => setModalPapelera(true)} style={{ display: "flex", alignItems: "center", gap: 7, padding: "9px 16px", borderRadius: 10, fontSize: 13, border: `1.5px solid ${borderColor2}`, background: bgCard, color: textSecondary, cursor: "pointer", fontFamily: "inherit", fontWeight: 600, position: "relative" }}>
                    <Trash2 size={15} /> Papelera
                    {papelera.length > 0 && (
                      <span style={{ position: "absolute", top: -6, right: -6, background: "#e03131", color: "#fff", fontSize: 10, fontWeight: 800, borderRadius: 10, minWidth: 18, height: 18, display: "flex", alignItems: "center", justifyContent: "center", padding: "0 4px" }}>{papelera.length}</span>
                    )}
                  </button>
                  <button onClick={openAdd} className="btn-primary btn-nuevo-desktop" style={{ display: "flex", alignItems: "center", gap: 7, padding: "9px 18px", borderRadius: 10, fontSize: 13 }}>
                    <Plus size={15} /> Nuevo Producto
                  </button>
                </div>
              </div>
              <div className="products-grid" style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(240px, 1fr))", gap: 14 }}>
                {filtered.map(p => (
                  <div key={p.id} style={{ ...card, cursor: "default", padding: 0, overflow: "hidden" }} className="card-hover product-card-desktop">
                    {/* Imagen superior */}
                    <div style={{ position: "relative", width: "100%", height: 120, background: D ? "#1e2235" : "#f4f5fb", display: "flex", alignItems: "center", justifyContent: "center" }}>
                      {p.imagenUrl
                        ? <img src={p.imagenUrl} alt={p.nombre} style={{ width: "100%", height: "100%", objectFit: "contain", padding: 8 }} />
                        : <div style={{ fontSize: 52 }}>{p.img}</div>
                      }
                      <div style={{ position: "absolute", top: 8, right: 8, display: "flex", gap: 4 }}>
                        <button onClick={() => { setModalStock(p); setStockAjuste(""); setStockTipo("agregar"); }} style={{ padding: "4px 7px", borderRadius: 8, border: `1px solid ${borderColor2}`, background: bgCard, cursor: "pointer", color: "#10b981", display: "flex" }}><Plus size={12} /></button>
                        <button onClick={() => openEdit(p)} style={{ padding: "4px 7px", borderRadius: 8, border: `1px solid ${borderColor2}`, background: bgCard, cursor: "pointer", color: textSecondary, display: "flex" }}><Pencil size={12} /></button>
                        <button title="Duplicar producto" onClick={() => handleDuplicarProducto(p)} style={{ padding: "4px 7px", borderRadius: 8, border: `1px solid ${borderColor2}`, background: bgCard, cursor: "pointer", color: "#8b5cf6", display: "flex" }}><ClipboardList size={12} /></button>
                        {esGerente && <button onClick={() => setModalMover(p)} title="Mover a otra empresa" style={{ padding: "4px 7px", borderRadius: 8, border: `1px solid ${borderColor2}`, background: bgCard, cursor: "pointer", color: "#7c3aed", display: "flex", fontSize: 11, fontWeight: 700 }}>🏢</button>}
                        <button onClick={() => handleDeleteProd(p.id)} className="btn-danger" style={{ padding: "4px 7px", borderRadius: 8, fontSize: 12, display: "flex" }}><Trash2 size={12} /></button>
                      </div>
                    </div>
                    <div style={{ padding: "12px 14px 14px" }}>
                      <p style={{ margin: "0 0 2px", fontSize: 14, fontWeight: 700, color: textPrimary }}>{p.nombre}</p>
                      <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 8 }}>
                        <p style={{ margin: 0, fontSize: 11, color: textMuted }}>{p.categoria}</p>
                        {(esGerente) && p.empresa && (
                          <span style={{ fontSize: 10, fontWeight: 700, padding: "2px 6px", borderRadius: 6, background: D ? "rgba(124,58,237,0.2)" : "#f3f0ff", color: "#7c3aed", whiteSpace: "nowrap" }}>🏢 {p.empresa}</span>
                        )}
                      </div>
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: p.mangaActiva && p.mangaCantidad && p.mangaPrecio ? 6 : 10 }}>
                        <span style={{ fontSize: 17, fontWeight: 800, color: "#10b981" }} className="mono">{fmt(p.precio)}</span>
                        <span style={{ fontSize: 12, fontWeight: 700, padding: "4px 10px", borderRadius: 8, background: p.stock === 0 ? "#fff1f2" : p.stock <= (config.stockMinimo || 5) ? "#fffbeb" : D ? "rgba(16,185,129,0.15)" : "#ecfdf5", color: p.stock === 0 ? "#e03131" : p.stock <= (config.stockMinimo || 5) ? "#d97706" : "#059669" }}>
                          {p.stock} uds{p.mangaActiva && p.mangaCantidad && +p.mangaCantidad > 0 ? ` / ${Math.floor(p.stock / +p.mangaCantidad)} m` : ""}
                        </span>
                      </div>
                      {p.mangaActiva && p.mangaCantidad && p.mangaPrecio && (
                        <div style={{ marginBottom: 8, padding: "5px 10px", background: D ? "rgba(245,158,11,0.15)" : "#fffbeb", borderRadius: 8, border: `1px solid ${D ? "rgba(245,158,11,0.3)" : "#fde68a"}`, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                          <span style={{ fontSize: 11, color: "#d97706", fontWeight: 600 }}>📦 Manga x{p.mangaCantidad}</span>
                          <span style={{ fontSize: 12, fontWeight: 800, color: "#d97706" }}>{fmt(+p.mangaPrecio)}</span>
                        </div>
                      )}
                      <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
                        <input type="number" min="1" placeholder="Cantidad" value={quickStock[p.id] || ""} onChange={e => setQuickStock(prev => ({ ...prev, [p.id]: e.target.value }))} onKeyDown={e => e.key === "Enter" && handleQuickStock(p)} style={{ flex: 1, minWidth: 0, padding: "7px 8px", borderRadius: 8, border: `1.5px solid ${borderColor2}`, background: D ? "#1a1d2e" : "#fafafa", color: textPrimary, fontSize: 13, fontFamily: "inherit", outline: "none" }} />
                        <button onClick={() => handleQuickStock(p)} style={{ padding: "7px 10px", borderRadius: 8, border: "none", background: "linear-gradient(135deg,#10b981,#059669)", color: "#fff", fontWeight: 700, fontSize: 12, cursor: "pointer", whiteSpace: "nowrap", fontFamily: "inherit", flexShrink: 0 }}>+ Stock</button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              {/* ── Vista móvil lista (estilo app) ── */}
              <div className="products-list-mobile" style={{ display: "none" }}>
                {filtered.map(p => (
                  <div key={`m-${p.id}`} className="mobile-product-card" style={{ display: "flex", alignItems: "center", gap: 14, padding: "14px", marginBottom: 10, background: bgCard, borderRadius: 18, border: `1px solid ${borderColor}`, position: "relative", boxShadow: `0 2px 8px ${D ? "rgba(0,0,0,0.3)" : "rgba(0,0,0,0.04)"}` }}>
                    {/* Imagen */}
                    <div style={{ position: "relative", flexShrink: 0 }}>
                      <div style={{ width: 88, height: 88, borderRadius: 14, overflow: "hidden", background: D ? "#1e2235" : "#f4f5fb", display: "flex", alignItems: "center", justifyContent: "center" }}>
                        {p.imagenUrl
                          ? <img src={p.imagenUrl} alt={p.nombre} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                          : <div style={{ fontSize: 40 }}>{p.img}</div>
                        }
                      </div>
                      {/* Badge stock */}
                      <div style={{ position: "absolute", top: -2, left: -2, background: p.stock === 0 ? "#e03131" : p.stock <= (config.stockMinimo || 5) ? "#f59e0b" : "#10b981", color: "#fff", fontSize: 10, fontWeight: 700, padding: "3px 7px", borderRadius: 8, whiteSpace: "nowrap" }}>
                        {p.stock} uds{p.mangaActiva && p.mangaCantidad && +p.mangaCantidad > 0 ? ` / ${Math.floor(p.stock / +p.mangaCantidad)} m` : ""}
                      </div>
                    </div>
                    {/* Info */}
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <p style={{ margin: "0 0 2px", fontSize: 16, fontWeight: 700, color: textPrimary, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{p.nombre}</p>
                      <p style={{ margin: "0 0 8px", fontSize: 12, color: textMuted }}>{p.categoria}</p>
                      <p style={{ margin: 0, fontSize: 20, fontWeight: 800, color: "#10b981" }} className="mono">{fmt(p.precio)}</p>
                      {p.mangaActiva && p.mangaCantidad && p.mangaPrecio && (
                        <p style={{ margin: "3px 0 0", fontSize: 11, color: "#d97706", fontWeight: 600 }}>📦 {Math.floor(p.stock / +p.mangaCantidad)} mangas x{p.mangaCantidad}u disponibles · {fmt(+p.mangaPrecio)} c/u</p>
                      )}
                      {/* Stepper + Stock button */}
                      <div style={{ display: "flex", alignItems: "center", gap: 8, marginTop: 10 }}>
                        <div style={{ display: "flex", alignItems: "center", gap: 6, background: bgCard2, borderRadius: 10, padding: "5px 10px", border: `1.5px solid ${borderColor2}` }}>
                          <button onClick={() => { const v = Math.max(0, (+(quickStock[p.id] || p.stock)) - 1); setQuickStock(prev => ({ ...prev, [p.id]: String(v) })); }} style={{ width: 26, height: 26, borderRadius: 7, border: "none", background: D ? "#2d3158" : "#e5e7eb", cursor: "pointer", color: textPrimary, fontSize: 18, display: "flex", alignItems: "center", justifyContent: "center", lineHeight: 1 }}>−</button>
                          <span style={{ fontSize: 15, fontWeight: 700, color: textPrimary, minWidth: 26, textAlign: "center" }}>{quickStock[p.id] !== undefined ? quickStock[p.id] : p.stock}</span>
                          <button onClick={() => { const v = (+(quickStock[p.id] || p.stock)) + 1; setQuickStock(prev => ({ ...prev, [p.id]: String(v) })); }} style={{ width: 26, height: 26, borderRadius: 7, border: "none", background: D ? "#2d3158" : "#e5e7eb", cursor: "pointer", color: textPrimary, fontSize: 18, display: "flex", alignItems: "center", justifyContent: "center", lineHeight: 1 }}>+</button>
                        </div>
                        <button onClick={() => handleQuickStock(p)} style={{ padding: "7px 16px", borderRadius: 10, border: "none", background: "linear-gradient(135deg,#10b981,#059669)", color: "#fff", fontWeight: 700, fontSize: 13, cursor: "pointer", fontFamily: "inherit" }}>+ Stock</button>
                      </div>
                    </div>
                    {/* Menú 3 puntos */}
                    <button onClick={() => openEdit(p)} style={{ position: "absolute", top: 14, right: 14, background: "none", border: "none", cursor: "pointer", color: textMuted, padding: 4 }}>
                      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="5" r="1.5"/><circle cx="12" cy="12" r="1.5"/><circle cx="12" cy="19" r="1.5"/></svg>
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* ── CATEGORÍAS ── */}
          {activeNav === "Categorías" && (
            <div style={{ maxWidth: 640 }}>
              <div style={{ ...card, marginBottom: 16 }}>
                <h3 style={{ margin: "0 0 16px", fontSize: 15, fontWeight: 700, color: textPrimary }}>Nueva Categoría</h3>
                <div style={{ display: "flex", gap: 8 }}>
                  <input value={nuevaCat} onChange={e => setNuevaCat(e.target.value)} onKeyDown={e => e.key === "Enter" && handleAgregarCat()} placeholder="Nombre de la categoría" style={inp} />
                  <button onClick={handleAgregarCat} className="btn-primary" style={{ padding: "10px 18px", borderRadius: 10, fontSize: 13, whiteSpace: "nowrap", display: "flex", alignItems: "center", gap: 6 }}><Plus size={15} /> Agregar</button>
                </div>
                {catError && <p style={{ color: "#e03131", fontSize: 13, marginTop: 8, fontWeight: 500 }}>⚠ {catError}</p>}
              </div>
              <div style={card}>
                <h3 style={{ margin: "0 0 16px", fontSize: 15, fontWeight: 700, color: textPrimary }}>Categorías ({categorias.length})</h3>
                {categorias.map((cat, i) => (
                  <div key={cat} style={{ display: "flex", alignItems: "center", gap: 12, padding: "12px 14px", background: bgCard2, borderRadius: 12, marginBottom: 8, border: `1px solid ${borderColor}` }}>
                    <button onClick={() => setModalIconoCat({ nombre: cat })} style={{ fontSize: 26, border: "none", cursor: "pointer", width: 44, height: 44, borderRadius: 12, background: bgCard, display: "flex", alignItems: "center", justifyContent: "center" }}>
                      {catIconos[cat] || "📦"}
                    </button>
                    <div style={{ flex: 1 }}>
                      {editandoCat?.index === i ? (
                        <input value={editandoCat.valor} onChange={e => setEditandoCat(prev => ({ ...prev, valor: e.target.value }))} onKeyDown={e => { if (e.key === "Enter") handleEditarCat(i); if (e.key === "Escape") setEditandoCat(null); }} autoFocus style={{ ...inp, width: "auto", padding: "6px 10px", fontSize: 14 }} />
                      ) : (
                        <p style={{ margin: 0, fontSize: 14, fontWeight: 700, color: textPrimary }}>{cat}</p>
                      )}
                      <p style={{ margin: 0, fontSize: 12, color: textMuted }}>{products.filter(p => p.categoria === cat).length} productos</p>
                    </div>
                    <div style={{ display: "flex", gap: 6 }}>
                      {editandoCat?.index === i ? (
                        <>
                          <button onClick={() => handleEditarCat(i)} className="btn-success" style={{ padding: "5px 10px", borderRadius: 8, fontSize: 12 }}><Check size={13} /></button>
                          <button onClick={() => setEditandoCat(null)} style={{ padding: "5px 10px", borderRadius: 8, border: `1px solid ${borderColor2}`, background: bgCard, cursor: "pointer", color: textSecondary, fontSize: 12, display: "flex", alignItems: "center" }}><X size={13} /></button>
                        </>
                      ) : (
                        <>
                          <button onClick={() => setEditandoCat({ index: i, valor: cat })} style={{ padding: "5px 8px", borderRadius: 8, border: `1px solid ${borderColor2}`, background: bgCard, cursor: "pointer", color: textSecondary, display: "flex" }}><Pencil size={13} /></button>
                          <button onClick={() => handleEliminarCat(i)} className="btn-danger" style={{ padding: "5px 8px", borderRadius: 8, fontSize: 12, display: "flex" }}><Trash2 size={13} /></button>
                        </>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* ── ESTADÍSTICAS ── */}
          {activeNav === "Estadísticas" && (
            <div>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 20 }}>
                <h3 style={{ margin: 0, fontSize: 16, fontWeight: 700, color: textPrimary }}>Estadísticas de {mesNombre.charAt(0).toUpperCase() + mesNombre.slice(1)}</h3>
                <button onClick={exportarExcel} className="btn-primary" style={{ display: "flex", alignItems: "center", gap: 7, padding: "9px 18px", borderRadius: 10, fontSize: 13 }}>
                  <Download size={15} /> Exportar Excel
                </button>
              </div>
              <div className="stats-grid" style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 14, marginBottom: 20 }}>
                {[
                  { label: "Total Ingresos", value: fmt(totalMes), icon: DollarSign, color: "#10b981", bg: D ? "rgba(16,185,129,0.15)" : "#ecfdf5" },
                  { label: "Ventas realizadas", value: ventasMes.length, icon: ShoppingCart, color: "#d71920", bg: D ? "rgba(59,91,219,0.15)" : "#fff3bf" },
                  { label: "Ticket Promedio", value: fmt(ticketPromedio), icon: Activity, color: "#8b5cf6", bg: D ? "rgba(139,92,246,0.15)" : "#f5f3ff" },
                  { label: "Boletas emitidas", value: boletas.filter(b => { const d = new Date(b.timestamp); return d.getMonth() === mesActual && d.getFullYear() === anioActual; }).length, icon: Receipt, color: "#f59e0b", bg: D ? "rgba(245,158,11,0.15)" : "#fffbeb" },
                ].map(({ label, value, icon: Icon, color, bg }) => (
                  <div key={label} style={card} className="card-hover">
                    <div style={{ width: 38, height: 38, borderRadius: 10, background: bg, display: "flex", alignItems: "center", justifyContent: "center", marginBottom: 10 }}><Icon size={18} color={color} /></div>
                    <p style={{ margin: "0 0 2px", fontSize: 22, fontWeight: 800, color: textPrimary }}>{value}</p>
                    <p style={{ margin: 0, fontSize: 12, color: textMuted }}>{label}</p>
                  </div>
                ))}
              </div>
              <div className="chart-section" style={{ display: "grid", gridTemplateColumns: "1fr 300px", gap: 16 }}>
                <div style={card}>
                  <h3 style={{ margin: "0 0 16px", fontSize: 14, fontWeight: 700, color: textPrimary }}>Productos más vendidos</h3>
                  {productosMasVendidos.length === 0 ? (
                    <p style={{ color: textMuted, fontSize: 13, textAlign: "center", padding: "30px 0" }}>No hay ventas este mes aún</p>
                  ) : (
                    <ResponsiveContainer width="100%" height={220}>
                      <BarChart data={productosMasVendidos.slice(0, 6)} margin={{ top: 4, right: 4, left: -20, bottom: 0 }}>
                        <CartesianGrid strokeDasharray="3 3" stroke={D ? "#2d3158" : "#f0f0f0"} vertical={false} />
                        <XAxis dataKey="nombre" tick={{ fontSize: 10, fill: textMuted }} tickLine={false} axisLine={false} tickFormatter={n => n.length > 10 ? n.slice(0, 10) + "…" : n} />
                        <YAxis tick={{ fontSize: 10, fill: textMuted }} tickLine={false} axisLine={false} allowDecimals={false} />
                        <Tooltip contentStyle={{ fontSize: 12, borderRadius: 10, background: bgCard, border: `1px solid ${borderColor}`, color: textPrimary }} />
                        <Bar dataKey="cantidad" radius={[8, 8, 0, 0]}>
                          {productosMasVendidos.slice(0, 6).map((_, index) => <Cell key={index} fill={barColors[index % barColors.length]} />)}
                        </Bar>
                      </BarChart>
                    </ResponsiveContainer>
                  )}
                </div>
                <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
                  <div style={card}>
                    <h3 style={{ margin: "0 0 14px", fontSize: 14, fontWeight: 700, color: textPrimary }}>Métodos de Pago</h3>
                    {[
                      { icon: Banknote,    label: "Efectivo",      value: totalMesEfectivo,      color: "#10b981", bg: D ? "rgba(16,185,129,0.15)"  : "#ecfdf5" },
                      { icon: CreditCard, label: "Débito",         value: totalMesDebito,         color: "#f59e0b", bg: D ? "rgba(245,158,11,0.15)"  : "#fffbeb" },
                      { icon: CreditCard, label: "Crédito",        value: totalMesCredito,        color: "#e03131", bg: D ? "rgba(224,49,49,0.15)"   : "#fff1f2" },
                      { icon: CreditCard, label: "Transferencia",  value: totalMesTransferencia,  color: "#8b5cf6", bg: D ? "rgba(139,92,246,0.15)" : "#f5f3ff" },
                    ].map(({ icon: Icon, label, value, color, bg }) => (
                      <div key={label} style={{ display: "flex", alignItems: "center", gap: 10, padding: "10px 12px", background: bg, borderRadius: 10, marginBottom: 8 }}>
                        <Icon size={15} color={color} />
                        <div style={{ flex: 1 }}>
                          <p style={{ margin: 0, fontSize: 11, color: textSecondary }}>{label}</p>
                          <p style={{ margin: 0, fontSize: 14, fontWeight: 800, color: textPrimary }} className="mono">{fmt(value)}</p>
                        </div>
                        <span style={{ fontSize: 11, fontWeight: 700, color, background: D ? "rgba(255,255,255,0.1)" : "#fff", padding: "2px 7px", borderRadius: 6 }}>
                          {totalMes > 0 ? Math.round((value / totalMes) * 100) : 0}%
                        </span>
                      </div>
                    ))}
                  </div>
                  <div style={{ ...card, background: D ? "linear-gradient(135deg, #1a1d2e, #252840)" : "linear-gradient(135deg, #1a1a2e, #2d2d4e)" }}>
                    <p style={{ margin: "0 0 6px", fontSize: 12, color: "#6b7280" }}>Total del Mes</p>
                    <p style={{ margin: "0 0 4px", fontSize: 28, fontWeight: 800, color: "#10b981" }} className="mono">{fmt(totalMes)}</p>
                    <p style={{ margin: 0, fontSize: 11, color: "#4b5563" }}>{ventasMes.length} ventas · {boletas.length} boletas</p>
                  </div>
                </div>
              </div>
            </div>
          )}

          {activeNav === "Reportes" && (
            <div>
                {/* Header */}
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 20, flexWrap: "wrap", gap: 10 }}>
                  <div>
                    <h2 style={{ margin: 0, fontSize: 18, fontWeight: 800, color: textPrimary }}>Reportes</h2>
                    <p style={{ margin: 0, fontSize: 13, color: textMuted }}>Análisis detallado de ventas e inventario</p>
                  </div>
                  <div style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center" }}>
                    {reportePeriodo === "dia" && (
                      <input type="date" value={reporteFecha} onChange={e => setReporteFecha(e.target.value)}
                        style={{ padding: "7px 10px", borderRadius: 10, border: `1.5px solid ${borderColor2}`, background: bgCard2, color: textPrimary, fontSize: 12, fontFamily: "inherit" }} />
                    )}
                    {["dia","semana","mes","todo"].map(p => (
                      <button key={p} onClick={() => setReportePeriodo(p)}
                        style={{ padding: "7px 14px", borderRadius: 10, border: `1.5px solid ${reportePeriodo === p ? "#d71920" : borderColor2}`, background: reportePeriodo === p ? "#d71920" : bgCard2, color: reportePeriodo === p ? "#fff" : textSecondary, cursor: "pointer", fontSize: 12, fontWeight: 700, fontFamily: "inherit" }}>
                        {p === "dia" ? "Día" : p === "semana" ? "7 días" : p === "mes" ? "Este mes" : "Todo"}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Tabs */}
                <div style={{ display: "flex", gap: 8, marginBottom: 20 }}>
                  {[{ id: "ventas", label: "📈 Reporte Ventas" }, { id: "inventario", label: "📦 Reporte Inventario" }].map(t => (
                    <button key={t.id} onClick={() => setReporteTab(t.id)}
                      style={{ padding: "10px 20px", borderRadius: 12, border: `2px solid ${reporteTab === t.id ? "#d71920" : borderColor2}`, background: reporteTab === t.id ? (D ? "rgba(59,91,219,0.15)" : "#fff3bf") : bgCard2, color: reporteTab === t.id ? "#d71920" : textSecondary, cursor: "pointer", fontSize: 13, fontWeight: 700, fontFamily: "inherit" }}>
                      {t.label}
                    </button>
                  ))}
                </div>

                {/* Ingresos / Egresos / Balance del período */}
                <div className="grid-2-mobile" style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 14, marginBottom: 20 }}>
                  {[
                    { label: "Ingresos", val: ingresosPeriodo, color: "#10b981", bg: D ? "rgba(16,185,129,0.15)" : "#ecfdf5", icon: TrendingUp, prefix: "" },
                    { label: "Egresos", val: egresosPeriodo, color: "#e03131", bg: D ? "rgba(224,49,49,0.15)" : "#fff1f2", icon: TrendingDown, prefix: "-" },
                    { label: "Balance", val: balancePeriodo, color: balancePeriodo >= 0 ? "#10b981" : "#e03131", bg: balancePeriodo >= 0 ? (D ? "rgba(16,185,129,0.15)" : "#ecfdf5") : (D ? "rgba(224,49,49,0.15)" : "#fff1f2"), icon: DollarSign, prefix: "" },
                  ].map(({ label, val, color, bg, icon: Icon, prefix }) => (
                    <div key={label} style={card} className="card-hover">
                      <div style={{ width: 36, height: 36, borderRadius: 10, background: bg, display: "flex", alignItems: "center", justifyContent: "center", marginBottom: 10 }}><Icon size={17} color={color} /></div>
                      <p style={{ margin: "0 0 2px", fontSize: 20, fontWeight: 800, color }} className="mono">{prefix}{fmt(Math.abs(val))}</p>
                      <p style={{ margin: 0, fontSize: 12, color: textMuted }}>{label}</p>
                    </div>
                  ))}
                </div>

                {/* ── REPORTE VENTAS ── */}
                {reporteTab === "ventas" && (
                  <div>
                    {/* KPIs */}
                    <div className="stats-grid" style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: 14, marginBottom: 20 }}>
                      {[
                        { label: "Total Ventas", val: fmt(totalPeriodo), icon: DollarSign, color: "#10b981", bg: D ? "rgba(16,185,129,0.15)" : "#ecfdf5" },
                        { label: "Nº Transacciones", val: ventasPeriodo.length, icon: ShoppingCart, color: "#d71920", bg: D ? "rgba(59,91,219,0.15)" : "#fff3bf" },
                        { label: "Ticket Promedio", val: fmt(ticketProm), icon: Activity, color: "#8b5cf6", bg: D ? "rgba(139,92,246,0.15)" : "#f5f3ff" },
                        { label: "Mejor Día", val: graficoDias.length > 0 ? graficoDias.reduce((a,b) => b.total > a.total ? b : a, graficoDias[0])?.dia || "—" : "—", icon: Star, color: "#f59e0b", bg: D ? "rgba(245,158,11,0.15)" : "#fffbeb" },
                      ].map(({ label, val, icon: Icon, color, bg }) => (
                        <div key={label} style={card} className="card-hover">
                          <div style={{ width: 36, height: 36, borderRadius: 10, background: bg, display: "flex", alignItems: "center", justifyContent: "center", marginBottom: 10 }}><Icon size={17} color={color} /></div>
                          <p style={{ margin: "0 0 2px", fontSize: 20, fontWeight: 800, color: textPrimary }}>{val}</p>
                          <p style={{ margin: 0, fontSize: 12, color: textMuted }}>{label}</p>
                        </div>
                      ))}
                    </div>

                    {/* Ventas por método de pago (Efectivo / Débito / Transferencia / Total) */}
                    <div className="reportes-payment-methods" style={{ ...card, marginBottom: 16 }}>
                      <h3 style={{ margin: "0 0 14px", fontSize: 14, fontWeight: 700, color: textPrimary }}>Ventas por método de pago</h3>
                      <div style={{ display: "grid", gridTemplateColumns: "repeat(4,minmax(0,1fr))", gap: 12 }}>
                        {[
                          { label: "Efectivo", val: resumenPagosPeriodo.Efectivo, icon: "💵" },
                          { label: "Débito", val: resumenPagosPeriodo["Débito"] + resumenPagosPeriodo["Crédito"], icon: "💳" },
                          { label: "Transferencia", val: resumenPagosPeriodo.Transferencia, icon: "🏦" },
                          { label: "Total", val: totalPeriodo, icon: "Σ" },
                        ].map(({ label, val, icon }) => (
                          <div key={label} style={{ padding: "12px 6px", borderRadius: 14, background: bgCard2, textAlign: "center", minWidth: 0 }}>
                            <div style={{ fontSize: 18 }}>{icon}</div>
                            <strong style={{ display: "block", fontSize: 15, marginTop: 6, color: label === "Total" ? "#10b981" : textPrimary, wordBreak: "break-word", lineHeight: 1.15 }} className="mono">{fmt(val)}</strong>
                            <span style={{ fontSize: 11, color: textMuted }}>{label}</span>
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Gráfico ventas por día */}
                    <div style={{ ...card, marginBottom: 16 }}>
                      <h3 style={{ margin: "0 0 16px", fontSize: 14, fontWeight: 700, color: textPrimary }}>Ventas últimos 14 días</h3>
                      {graficoDias.length === 0 ? (
                        <p style={{ color: textMuted, fontSize: 13, textAlign: "center", padding: "30px 0" }}>Sin datos</p>
                      ) : (
                        <ResponsiveContainer width="100%" height={200}>
                          <AreaChart data={graficoDias} margin={{ top: 4, right: 4, left: -10, bottom: 0 }}>
                            <defs>
                              <linearGradient id="gradRep" x1="0" y1="0" x2="0" y2="1">
                                <stop offset="5%" stopColor="#d71920" stopOpacity={0.3} />
                                <stop offset="95%" stopColor="#d71920" stopOpacity={0} />
                              </linearGradient>
                            </defs>
                            <CartesianGrid strokeDasharray="3 3" stroke={D ? "#2d3158" : "#f0f0f0"} vertical={false} />
                            <XAxis dataKey="dia" tick={{ fontSize: 10, fill: textMuted }} tickLine={false} axisLine={false} />
                            <YAxis tick={{ fontSize: 10, fill: textMuted }} tickLine={false} axisLine={false} tickFormatter={v => `$${(v/1000).toFixed(0)}k`} />
                            <Tooltip contentStyle={{ fontSize: 12, borderRadius: 10, background: bgCard, border: `1px solid ${borderColor}`, color: textPrimary }} formatter={v => [fmt(v), "Total"]} />
                            <Area type="monotone" dataKey="total" stroke="#d71920" strokeWidth={2.5} fill="url(#gradRep)" />
                          </AreaChart>
                        </ResponsiveContainer>
                      )}
                    </div>

                    <div className="grid-2-mobile" style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, marginBottom: 16 }}>
                      {/* Top productos por ingreso */}
                      <div style={card}>
                        <h3 style={{ margin: "0 0 14px", fontSize: 14, fontWeight: 700, color: textPrimary }}>Top productos por ingreso</h3>
                        {topProductosRep.length === 0 ? <p style={{ color: textMuted, fontSize: 13, textAlign: "center", padding: "20px 0" }}>Sin ventas</p> : topProductosRep.map((p, i) => (
                          <div key={p.nombre} style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 10 }}>
                            <span style={{ width: 22, height: 22, borderRadius: 6, background: D ? "rgba(215,25,32,0.15)" : "#fff3bf", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 11, fontWeight: 800, color: "#d71920", flexShrink: 0 }}>{i+1}</span>
                            <div style={{ flex: 1, minWidth: 0 }}>
                              <p style={{ margin: "0 0 2px", fontSize: 12, fontWeight: 700, color: textPrimary, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{p.nombre}</p>
                              <div style={{ height: 4, borderRadius: 4, background: D ? "#2d3158" : "#f0f0f0", overflow: "hidden" }}>
                                <div style={{ height: "100%", width: `${Math.round((p.ingresos / topProductosRep[0].ingresos) * 100)}%`, background: barColors[i % barColors.length], borderRadius: 4 }} />
                              </div>
                            </div>
                            <div style={{ textAlign: "right", flexShrink: 0 }}>
                              <p style={{ margin: 0, fontSize: 12, fontWeight: 800, color: textPrimary }} className="mono">{fmt(p.ingresos)}</p>
                              <p style={{ margin: 0, fontSize: 10, color: textMuted }}>{p.cantidad} uds</p>
                            </div>
                          </div>
                        ))}
                      </div>

                      {/* Métodos de pago */}
                      <div style={card}>
                        <h3 style={{ margin: "0 0 14px", fontSize: 14, fontWeight: 700, color: textPrimary }}>Distribución por método de pago</h3>
                        {metodosRep.length === 0 ? <p style={{ color: textMuted, fontSize: 13, textAlign: "center", padding: "20px 0" }}>Sin ventas</p> : metodosRep.map(m => (
                          <div key={m.label} style={{ marginBottom: 12 }}>
                            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 4 }}>
                              <span style={{ fontSize: 12, fontWeight: 600, color: textSecondary }}>{m.label}</span>
                              <span style={{ fontSize: 12, fontWeight: 800, color: textPrimary }} className="mono">{fmt(m.val)} · {totalPeriodo > 0 ? Math.round((m.val / totalPeriodo) * 100) : 0}%</span>
                            </div>
                            <div style={{ height: 8, borderRadius: 8, background: D ? "#2d3158" : "#f0f0f0", overflow: "hidden" }}>
                              <div style={{ height: "100%", width: `${totalPeriodo > 0 ? Math.round((m.val / totalPeriodo) * 100) : 0}%`, background: m.color, borderRadius: 8, transition: "width 0.5s" }} />
                            </div>
                          </div>
                        ))}
                        <div style={{ marginTop: 14, paddingTop: 12, borderTop: `1px solid ${borderColor2}`, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                          <span style={{ fontSize: 13, fontWeight: 800, color: textPrimary }}>Total general</span>
                          <span style={{ fontSize: 15, fontWeight: 900, color: textPrimary }} className="mono">{fmt(totalPeriodo)}</span>
                        </div>
                      </div>
                    </div>

                    {/* Resumen comparativo */}
                    {cambioMes !== null && (
                      <div style={{ ...card, background: D ? "linear-gradient(135deg,#1a1d2e,#252840)" : "linear-gradient(135deg,#1a1a2e,#2d2d4e)", display: "flex", alignItems: "center", gap: 20 }}>
                        <div style={{ flex: 1 }}>
                          <p style={{ margin: "0 0 4px", fontSize: 12, color: "#6b7280" }}>Este mes vs mes anterior</p>
                          <p style={{ margin: 0, fontSize: 26, fontWeight: 800, color: "#10b981" }} className="mono">{fmt(totalMes)}</p>
                        </div>
                        <div style={{ textAlign: "right" }}>
                          <span style={{ fontSize: 16, fontWeight: 800, color: cambioMes >= 0 ? "#10b981" : "#e03131" }}>
                            {cambioMes >= 0 ? "▲" : "▼"} {Math.abs(cambioMes)}%
                          </span>
                          <p style={{ margin: "4px 0 0", fontSize: 11, color: "#6b7280" }}>vs {fmt(totalMesAnterior)} mes ant.</p>
                        </div>
                      </div>
                    )}

                    {/* ── Panel Costo / Beneficio ── */}
                    <div style={{ ...card, marginTop: 16 }}>
                      <h3 style={{ margin: "0 0 16px", fontSize: 15, fontWeight: 800, color: textPrimary }}>💰 Costo / Beneficio del período</h3>
                      {costosPeriodo === 0 && (
                        <p style={{ margin: "0 0 12px", fontSize: 12, color: textMuted, background: D ? "rgba(245,158,11,0.1)" : "#fffbeb", padding: "10px 14px", borderRadius: 8 }}>
                          ⚠️ Agrega el costo de compra a tus productos para ver la ganancia real. Edita cada producto y completa el campo <strong>Costo</strong>.
                        </p>
                      )}
                      <div className="grid-3-mobile" style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 12, marginBottom: 20 }}>
                        {[
                          { label: "Ingresos totales", val: fmt(ingresosPeriodo), color: "#10b981", bg: D ? "rgba(16,185,129,0.15)" : "#ecfdf5", icon: "💵" },
                          { label: "Costo total",       val: fmt(costosPeriodo),  color: "#e03131", bg: D ? "rgba(224,49,49,0.15)"  : "#fff1f2", icon: "🧾" },
                          { label: "Ganancia neta",     val: fmt(gananciaPeriodo), color: gananciaPeriodo >= 0 ? "#d71920" : "#e03131", bg: D ? "rgba(59,91,219,0.15)" : "#fff3bf", icon: "📈" },
                        ].map(({ label, val, color, bg, icon }) => (
                          <div key={label} style={{ background: bg, borderRadius: 12, padding: "14px 16px" }}>
                            <p style={{ margin: "0 0 4px", fontSize: 20 }}>{icon}</p>
                            <p style={{ margin: "0 0 2px", fontSize: 20, fontWeight: 800, color }} className="mono">{val}</p>
                            <p style={{ margin: 0, fontSize: 11, color: textMuted }}>{label}</p>
                          </div>
                        ))}
                      </div>

                      {/* Barra de incremento sobre costo */}
                      <div style={{ marginBottom: 20 }}>
                        <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 6 }}>
                          <span style={{ fontSize: 12, fontWeight: 700, color: textSecondary }}>Incremento sobre costo del período</span>
                          <span style={{ fontSize: 13, fontWeight: 800, color: margenPct >= 30 ? "#10b981" : margenPct >= 10 ? "#f59e0b" : "#e03131" }}>{margenPct}%</span>
                        </div>
                        <div style={{ height: 10, borderRadius: 10, background: D ? "#2d3158" : "#f0f0f0", overflow: "hidden" }}>
                          <div style={{ height: "100%", width: `${Math.min(margenPct, 100)}%`, background: margenPct >= 30 ? "#10b981" : margenPct >= 10 ? "#f59e0b" : "#e03131", borderRadius: 10, transition: "width 0.6s" }} />
                        </div>
                        <p style={{ margin: "4px 0 0", fontSize: 11, color: textMuted }}>
                          {margenPct >= 30 ? "✅ Incremento saludable" : margenPct >= 10 ? "⚠️ Incremento ajustado" : costosPeriodo === 0 ? "— Sin datos de costo" : "🔴 Incremento bajo"}
                        </p>
                      </div>

                      {/* Top productos por ganancia */}
                      {topGananciaProd.length > 0 && costosPeriodo > 0 && (
                        <div>
                          <p style={{ margin: "0 0 12px", fontSize: 13, fontWeight: 700, color: textPrimary }}>Productos más rentables</p>
                          {topGananciaProd.map((p, i) => (
                            <div key={p.nombre} style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 10 }}>
                              <span style={{ fontSize: 13, fontWeight: 800, color: textMuted, width: 18 }}>#{i+1}</span>
                              <div style={{ flex: 1, minWidth: 0 }}>
                                <p style={{ margin: "0 0 2px", fontSize: 12, fontWeight: 700, color: textPrimary, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{p.nombre}</p>
                                <div style={{ height: 4, borderRadius: 4, background: D ? "#2d3158" : "#f0f0f0" }}>
                                  <div style={{ height: "100%", width: `${topGananciaProd[0].ganancia > 0 ? Math.round((p.ganancia / topGananciaProd[0].ganancia) * 100) : 0}%`, background: catColors[i % catColors.length], borderRadius: 4 }} />
                                </div>
                              </div>
                              <div style={{ textAlign: "right", flexShrink: 0 }}>
                                <p style={{ margin: 0, fontSize: 12, fontWeight: 800, color: p.ganancia >= 0 ? "#10b981" : "#e03131" }} className="mono">{fmt(p.ganancia)}</p>
                                <p style={{ margin: 0, fontSize: 10, color: textMuted }}>{p.margen}% incremento</p>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {/* ── REPORTE INVENTARIO ── */}
                {reporteTab === "inventario" && (
                  <div>
                    {/* KPIs inventario */}
                    <div className="stats-grid" style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: 14, marginBottom: 20 }}>
                      {[
                        { label: "Valor en Stock", val: fmt(valorInventario), icon: DollarSign, color: "#10b981", bg: D ? "rgba(16,185,129,0.15)" : "#ecfdf5" },
                        { label: "Total Productos", val: totalProductos, icon: Package, color: "#d71920", bg: D ? "rgba(59,91,219,0.15)" : "#fff3bf" },
                        { label: "Unidades en Stock", val: stockTotal, icon: Layers, color: "#8b5cf6", bg: D ? "rgba(139,92,246,0.15)" : "#f5f3ff" },
                        { label: "Stock Bajo / Sin stock", val: `${stockBajoRep.length} / ${sinStockRep.length}`, icon: AlertTriangle, color: "#e03131", bg: D ? "rgba(224,49,49,0.15)" : "#fff1f2" },
                      ].map(({ label, val, icon: Icon, color, bg }) => (
                        <div key={label} style={card} className="card-hover">
                          <div style={{ width: 36, height: 36, borderRadius: 10, background: bg, display: "flex", alignItems: "center", justifyContent: "center", marginBottom: 10 }}><Icon size={17} color={color} /></div>
                          <p style={{ margin: "0 0 2px", fontSize: 20, fontWeight: 800, color: textPrimary }}>{val}</p>
                          <p style={{ margin: 0, fontSize: 12, color: textMuted }}>{label}</p>
                        </div>
                      ))}
                    </div>

                    <div className="grid-2-mobile" style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, marginBottom: 16 }}>
                      {/* Top productos por valor en stock */}
                      <div style={card}>
                        <h3 style={{ margin: "0 0 14px", fontSize: 14, fontWeight: 700, color: textPrimary }}>Top productos por valor en stock</h3>
                        {topValorStock.length === 0 ? <p style={{ color: textMuted, fontSize: 13, textAlign: "center", padding: "20px 0" }}>Sin productos</p> : topValorStock.map((p, i) => {
                          const val = (p.precio || 0) * (p.stock || 0);
                          return (
                            <div key={p.id} style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 10 }}>
                              <span style={{ fontSize: 18, flexShrink: 0 }}>{p.emoji || "📦"}</span>
                              <div style={{ flex: 1, minWidth: 0 }}>
                                <p style={{ margin: "0 0 2px", fontSize: 12, fontWeight: 700, color: textPrimary, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{p.nombre}</p>
                                <div style={{ height: 4, borderRadius: 4, background: D ? "#2d3158" : "#f0f0f0" }}>
                                  <div style={{ height: "100%", width: `${Math.round((val / ((topValorStock[0].precio || 1) * (topValorStock[0].stock || 1))) * 100)}%`, background: catColors[i % catColors.length], borderRadius: 4 }} />
                                </div>
                              </div>
                              <div style={{ textAlign: "right", flexShrink: 0 }}>
                                <p style={{ margin: 0, fontSize: 12, fontWeight: 800, color: textPrimary }} className="mono">{fmt(val)}</p>
                                <p style={{ margin: 0, fontSize: 10, color: textMuted }}>{p.stock} uds</p>
                              </div>
                            </div>
                          );
                        })}
                      </div>

                      {/* Stock por categoría */}
                      <div style={card}>
                        <h3 style={{ margin: "0 0 14px", fontSize: 14, fontWeight: 700, color: textPrimary }}>Stock por categoría</h3>
                        {catStockArr.length === 0 ? <p style={{ color: textMuted, fontSize: 13, textAlign: "center", padding: "20px 0" }}>Sin categorías</p> : catStockArr.map((c, i) => (
                          <div key={c.cat} style={{ marginBottom: 12 }}>
                            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 4 }}>
                              <span style={{ fontSize: 12, fontWeight: 600, color: textSecondary }}>{c.cat}</span>
                              <span style={{ fontSize: 12, fontWeight: 800, color: textPrimary }}>{c.cantidad} uds · <span className="mono">{fmt(c.valor)}</span></span>
                            </div>
                            <div style={{ height: 8, borderRadius: 8, background: D ? "#2d3158" : "#f0f0f0", overflow: "hidden" }}>
                              <div style={{ height: "100%", width: `${catStockArr[0].valor > 0 ? Math.round((c.valor / catStockArr[0].valor) * 100) : 0}%`, background: catColors[i % catColors.length], borderRadius: 8 }} />
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Alertas stock */}
                    {(stockBajoRep.length > 0 || sinStockRep.length > 0) && (
                      <div style={card}>
                        <h3 style={{ margin: "0 0 14px", fontSize: 14, fontWeight: 700, color: textPrimary }}>⚠️ Alertas de Stock</h3>
                        <div className="grid-2-mobile" style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
                          <div>
                            <p style={{ margin: "0 0 8px", fontSize: 12, fontWeight: 700, color: "#e03131" }}>Sin stock ({sinStockRep.length})</p>
                            {sinStockRep.slice(0, 5).map(p => (
                              <div key={p.id} style={{ display: "flex", alignItems: "center", gap: 8, padding: "8px 10px", background: D ? "rgba(224,49,49,0.1)" : "#fff1f2", borderRadius: 8, marginBottom: 6 }}>
                                <span style={{ fontSize: 16 }}>{p.emoji || "📦"}</span>
                                <p style={{ margin: 0, fontSize: 12, fontWeight: 600, color: textPrimary, flex: 1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{p.nombre}</p>
                                <span style={{ fontSize: 11, fontWeight: 800, color: "#e03131" }}>0</span>
                              </div>
                            ))}
                            {sinStockRep.length > 5 && <p style={{ margin: 0, fontSize: 11, color: textMuted }}>+{sinStockRep.length - 5} más</p>}
                          </div>
                          <div>
                            <p style={{ margin: "0 0 8px", fontSize: 12, fontWeight: 700, color: "#f59e0b" }}>Stock bajo ({stockBajoRep.length})</p>
                            {stockBajoRep.slice(0, 5).map(p => (
                              <div key={p.id} style={{ display: "flex", alignItems: "center", gap: 8, padding: "8px 10px", background: D ? "rgba(245,158,11,0.1)" : "#fffbeb", borderRadius: 8, marginBottom: 6 }}>
                                <span style={{ fontSize: 16 }}>{p.emoji || "📦"}</span>
                                <p style={{ margin: 0, fontSize: 12, fontWeight: 600, color: textPrimary, flex: 1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{p.nombre}</p>
                                <span style={{ fontSize: 11, fontWeight: 800, color: "#f59e0b" }}>{p.stock}</span>
                              </div>
                            ))}
                            {stockBajoRep.length > 5 && <p style={{ margin: 0, fontSize: 11, color: textMuted }}>+{stockBajoRep.length - 5} más</p>}
                          </div>
                        </div>
                      </div>
                    )}

                    {/* Pérdidas del período (mermas) */}
                    <div style={{ ...card, marginTop: 16 }}>
                      <h3 style={{ margin: "0 0 14px", fontSize: 15, fontWeight: 800, color: textPrimary }}>⚠️ Pérdidas del período</h3>
                      {mermasPeriodo.length === 0 ? (
                        <p style={{ margin: 0, fontSize: 13, color: textMuted, textAlign: "center", padding: "10px 0" }}>Sin mermas registradas en este período.</p>
                      ) : (
                        <>
                          <div style={{ display: "grid", gridTemplateColumns: "repeat(5,minmax(0,1fr))", gap: 8 }}>
                            {[
                              ["Vencido", mermasPorMotivo.porMotivo["Vencido"], "#e5a22b"],
                              ["Dañado", mermasPorMotivo.porMotivo["Dañado"], "#d9483f"],
                              ["Robo", mermasPorMotivo.porMotivo["Robo"], "#e03131"],
                              ["Error inv.", mermasPorMotivo.porMotivo["Error de inventario"], "#8b5cf6"],
                              ["Total", mermasPorMotivo.unidadesTotal, "#c7362f"],
                            ].map(([label, value, color]) => (
                              <div key={label} style={{ padding: "10px 4px", borderRadius: 12, background: bgCard2, textAlign: "center", minWidth: 0 }}>
                                <div style={{ width: 28, height: 28, borderRadius: "50%", background: `${color}22`, color, display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 6px", fontSize: 12 }}>📦</div>
                                <strong style={{ display: "block", fontSize: 15, color: textPrimary, wordBreak: "break-word", lineHeight: 1.15 }}>{Number(value || 0)}</strong>
                                <span style={{ fontSize: 9.5, color: textMuted }}>{label}</span>
                              </div>
                            ))}
                          </div>
                          <p style={{ margin: "13px 0 0", fontSize: 11, color: textMuted }}>Valor perdido al costo: <strong style={{ color: "#e03131" }}>{fmt(mermasPorMotivo.valorTotal)}</strong> · {mermasPeriodo.length} registro{mermasPeriodo.length===1?"":"s"}</p>
                        </>
                      )}
                    </div>

                    {/* Resumen financiero */}
                    <div className="grid-2-mobile" style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14, marginTop: 16 }}>
                      <div style={{ ...card, background: D ? "linear-gradient(135deg,#1a1d2e,#252840)" : "linear-gradient(135deg,#1a1a2e,#2d2d4e)" }}>
                        <p style={{ margin: "0 0 4px", fontSize: 12, color: "#6b7280" }}>Valor total inventario</p>
                        <p style={{ margin: "0 0 2px", fontSize: 26, fontWeight: 800, color: "#10b981" }} className="mono">{fmt(valorInventario)}</p>
                        <p style={{ margin: 0, fontSize: 11, color: "#4b5563" }}>{stockTotal} unidades · {conStockRep.length} productos</p>
                      </div>
                      <div style={{ ...card, background: D ? "linear-gradient(135deg,#1a1d2e,#252840)" : "linear-gradient(135deg,#f0fdf4,#ecfdf5)" }}>
                        <p style={{ margin: "0 0 4px", fontSize: 12, color: D ? "#6b7280" : "#374151" }}>Incremento estimado en stock</p>
                        <p style={{ margin: "0 0 2px", fontSize: 26, fontWeight: 800, color: "#d71920" }} className="mono">{fmt(valorInventario - valorCosto)}</p>
                        <p style={{ margin: 0, fontSize: 11, color: D ? "#4b5563" : "#6b7280" }}>Precio venta − costo</p>
                      </div>
                    </div>
                  </div>
                )}
            </div>
          )}

          {activeNav === "Ventas" && (
            !cajaAbierta ? <div style={{...card,textAlign:"center",padding:36}}><Banknote size={42} color="#d71920"/><h2 style={{color:textPrimary}}>Caja cerrada</h2><p style={{color:textMuted}}>Debes abrir caja antes de registrar cualquier venta.</p><button className="btn-primary" onClick={()=>{setActiveNav("Caja");setShowAperturaModal(true);}} style={{padding:"12px 22px",borderRadius:12}}>Abrir caja</button></div> :
            <div>
              {/* ── Scanner de código de barras ── */}
              {showScanner && (
                <BarcodeScanner
                  darkMode={D}
                  onClose={() => setShowScanner(false)}
                  onScan={(codigo) => {
                    setShowScanner(false);
                    procesarCodigoVenta(codigo);
                  }}
                />
              )}

              <div className="dashboard-grid sales-desktop-only" style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 16, marginBottom: 20 }}>
                {[
                  { icon: DollarSign, label: "Total General", value: fmt(totalGeneral), color: "#d71920", bg: D ? "rgba(59,91,219,0.15)" : "#fff3bf" },
                  { icon: Banknote, label: "Efectivo", value: fmt(totalEfectivo), color: "#10b981", bg: D ? "rgba(16,185,129,0.15)" : "#ecfdf5" },
                  { icon: CreditCard, label: "Tarjeta", value: fmt(totalTarjeta), color: "#7c3aed", bg: D ? "rgba(124,58,237,0.15)" : "#f5f3ff" },
                  { icon: CreditCard, label: "Transferencia", value: fmt(totalTransferencia), color: "#2563eb", bg: D ? "rgba(37,99,235,0.15)" : "#eff6ff" },
                ].map(({ icon: Icon, label, value, color, bg }) => (
                  <div key={label} style={{ ...card, display: "flex", alignItems: "center", gap: 16 }} className="card-hover">
                    <div style={{ width: 46, height: 46, borderRadius: 14, background: bg, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                      <Icon size={22} color={color} strokeWidth={1.8} />
                    </div>
                    <div>
                      <p style={{ margin: 0, fontSize: 12, color: textMuted }}>{label}</p>
                      <p style={{ margin: 0, fontSize: 20, fontWeight: 800, color: textPrimary }} className="mono">{value}</p>
                    </div>
                  </div>
                ))}
              </div>

              <section className="sales-mobile-v2">
                <div className="sales-total-hero">
                  <div className="sales-total-icon"><DollarSign size={24} /></div>
                  <div><span>Total general</span><strong className="mono">{fmt(totalGeneral)}</strong></div>
                </div>
                <div className="sales-method-summary">
                  {[
                    { label: "Efectivo", value: totalEfectivo, icon: Banknote, cls: "cash" },
                    { label: "Tarjeta", value: totalTarjeta, icon: CreditCard, cls: "card" },
                    { label: "Transferencia", value: totalTransferencia, icon: CreditCard, cls: "transfer" },
                  ].map(({label,value,icon:Icon,cls}) => <div className={`sales-summary-mini ${cls}`} key={label}><Icon size={18}/><span>{label}</span><strong className="mono">{fmt(value)}</strong></div>)}
                </div>
                <div className="sales-choice-v2 sale-mode-summary">
                  <h3>{saleFlowType === "free" ? "Venta libre" : "Venta de productos"}</h3>
                  <p>{saleFlowType === "free" ? "Huevos y productos en una sola boleta. Los informes se separan automáticamente." : "Solo productos del inventario."}</p>
                  <button onClick={() => setSaleChooserOpen(true)}>Cambiar tipo de venta</button>
                </div>

                {saleFlowType === "free" && <div className="sales-products-v2 free-eggs-section">
                  <div className="sales-products-head"><h3>Huevos</h3><span>{freeEggItems.reduce((s,i)=>s+i.cantidadFormatos,0)} formatos</span></div>
                  {freeEggLoading ? <p style={{color:textMuted}}>Cargando inventario de huevos…</p> : <div className="free-eggs-grid">
                    {freeEggInventory.map(q => {
                      const row = freeEggCart[q.id] || { formato:"bandeja", cantidad:0 };
                      const max = Math.floor(Number(q.stockHuevos || 0) / (row.formato === "caja" ? 180 : 30));
                      return <article key={q.id} className="free-egg-card">
                        <div><span className="free-egg-icon">🥚</span><div><h4>{q.nombre}</h4><small>{Number(q.stockHuevos||0).toLocaleString("es-CL")} huevos disponibles</small></div></div>
                        <div className="free-egg-format"><button className={row.formato!=="caja"?"active":""} onClick={()=>setFreeEggFormat(q,"bandeja")}>Bandeja 30</button><button className={row.formato==="caja"?"active":""} onClick={()=>setFreeEggFormat(q,"caja")}>Caja 180</button></div>
                        <div className="free-egg-bottom"><strong>{fmt(row.formato === "caja" ? q.precioCaja : q.precioBandeja)}</strong><div className="sales-prod-controls"><button disabled={!row.cantidad} onClick={()=>changeFreeEgg(q,-1)}>−</button><input type="number" min="0" inputMode="numeric" value={row.cantidad||0} onFocus={e=>e.target.select()} onChange={e=>setFreeEggCantidad(q,e.target.value)} style={{width:36,textAlign:"center",border:"none",background:"transparent",fontWeight:800,fontSize:14,color:"inherit",padding:0}} /><button disabled={(row.cantidad||0)>=max} onClick={()=>changeFreeEgg(q,1)}>+</button></div></div>
                      </article>;
                    })}
                  </div>}
                </div>}

                <div className="sales-products-v2">
                  <div className="sales-products-head"><h3>Productos</h3><span>{carrito.reduce((s,i)=>s+i.cantidad,0)} en carrito</span></div>
                  <div className="sales-search-v2">
                    <Search size={18}/>
                    <input
                      ref={salesSearchMobileRef}
                      value={busquedaVenta}
                      onChange={e=>setBusquedaVenta(e.target.value)}
                      onKeyDown={e => {
                        if (e.key === "Enter") {
                          e.preventDefault();
                          procesarCodigoVenta(e.currentTarget.value);
                        }
                      }}
                      autoComplete="off"
                      inputMode="text"
                      placeholder="Buscar o escanear código..."
                    />
                    <button
                      type="button"
                      className="sales-scan-v2"
                      onClick={() => setShowScanner(true)}
                      title="Escanear código de barras o QR"
                      aria-label="Escanear código de barras o QR"
                    >
                      📷
                    </button>
                  </div>
                  <div className="sales-cats-v2">{["Todos", ...categorias].map(cat => <button key={cat} className={saleCatFilter===cat?"active":""} onClick={()=>setSaleCatFilter(cat)}>{cat}</button>)}</div>
                  {carritoError && <div className="sales-error-v2">⚠ {carritoError}</div>}
                  <div className="sales-product-grid-v2">
                    {products.filter(p => Number(p.stock)>0 && (saleCatFilter==="Todos" || p.categoria===saleCatFilter) && (!busquedaVenta || p.nombre.toLowerCase().includes(busquedaVenta.toLowerCase()))).map(p => {
                      const item=carrito.find(c=>String(c.productoId)===String(p.id) && !c.esManga);
                      return <article key={p.id}>
                        <div className="sales-prod-img">{p.imagenUrl?<img src={p.imagenUrl} alt={p.nombre}/>:<span>{p.img||"📦"}</span>}<em>{p.stock} uds</em></div>
                        <h4>{p.nombre}</h4><strong className="mono">{fmt(p.precio)}</strong>
                        <div className="sales-prod-controls">
                          <button disabled={!item} onClick={()=>item && (item.cantidad===1?quitarDelCarrito(p.id,false):cambiarCantidadCarrito(p.id,item.cantidad-1,false))}>−</button>
                          <input
                            type="number"
                            min="0"
                            inputMode="numeric"
                            value={item?.cantidad ?? 0}
                            onFocus={e=>e.target.select()}
                            onChange={e=>fijarCantidadCarrito(p,e.target.value,false)}
                            style={{width:36,textAlign:"center",border:"none",background:"transparent",fontWeight:800,fontSize:14,color:"inherit",padding:0,MozAppearance:"textfield"}}
                          />
                          <button onClick={()=>agregarProductoRapido(p)}>+</button>
                        </div>
                      </article>;
                    })}
                  </div>
                </div>
                {(carrito.length>0 || freeEggItems.length>0) && <div className="sales-cart-v2">
                  <div className="sales-cart-title"><h3>Carrito de venta</h3><button onClick={()=>setCarrito([])}>Vaciar</button></div>
                  {freeEggItems.map(item=><div className="sales-cart-row" key={`egg-${item.calidadId}`}>
                    <div className="sales-cart-thumb"><span>🥚</span></div>
                    <div className="sales-cart-name"><b>{item.calidad}</b><small>{item.cantidadFormatos} {item.formato}{item.cantidadFormatos===1?"":"s"} · {item.huevos} huevos</small></div>
                    <strong className="mono">{fmt(item.subtotal)}</strong>
                    <button className="trash" onClick={()=>setFreeEggCart(prev=>({...prev,[item.calidadId]:{...(prev[item.calidadId]||{}),cantidad:0}}))}><Trash2 size={15}/></button>
                  </div>)}
                  {carrito.map(item=><div className="sales-cart-row" key={`${item.productoId}-${item.esManga}`}>
                    <div className="sales-cart-thumb">{item.imagenUrl?<img src={item.imagenUrl} alt=""/>:<span>{item.img||"📦"}</span>}</div>
                    <div className="sales-cart-name">
                      <b>{item.nombre}</b>
                      <small>{item.precioManualActivo ? `Precio manual · ${fmt(item.subtotal)}` : (item.esManga ? `${fmt(item.precio)} por manga` : (item.pricingLabel ? `${item.pricingLabel} · ${fmt(item.subtotal)}` : `${fmt(item.precio)} c/u`))}</small>
                      <button type="button" onClick={()=>alternarPrecioManualCarrito(item.productoId,item.esManga)} style={{marginTop:5,border:"none",padding:0,background:"transparent",color:item.precioManualActivo?"#d71920":"#2563eb",fontSize:11,fontWeight:800,cursor:"pointer"}}>
                        {item.precioManualActivo ? "Usar precio automático" : "✏️ Precio manual"}
                      </button>
                      {item.precioManualActivo && <input type="number" min="0" inputMode="numeric" value={item.precioManualTotal ?? ""} onChange={e=>cambiarPrecioManualCarrito(item.productoId,item.esManga,e.target.value)} placeholder="Total a cobrar" style={{marginTop:6,width:"100%",maxWidth:150,padding:"7px 9px",border:`1px solid ${borderColor2}`,borderRadius:8,background:bgCard,color:textPrimary,fontWeight:800}} />}
                    </div>
                    <div className="sales-cart-step">
                      <button onClick={()=>item.cantidad===1?quitarDelCarrito(item.productoId,item.esManga):cambiarCantidadCarrito(item.productoId,item.cantidad-1,item.esManga)}>−</button>
                      <input
                        type="number"
                        min="0"
                        inputMode="numeric"
                        value={item.cantidad}
                        onFocus={e=>e.target.select()}
                        onChange={e=>{ const prod = products.find(pr=>String(pr.id)===String(item.productoId)); if (prod) fijarCantidadCarrito(prod,e.target.value,item.esManga); }}
                        style={{width:36,textAlign:"center",border:"none",background:"transparent",fontWeight:800,fontSize:14,color:"inherit",padding:0}}
                      />
                      <button onClick={()=>cambiarCantidadCarrito(item.productoId,item.cantidad+1,item.esManga)}>+</button>
                    </div>
                    <strong className="mono">{fmt(item.subtotal)}</strong>
                    <button className="trash" onClick={()=>quitarDelCarrito(item.productoId,item.esManga)}><Trash2 size={15}/></button>
                  </div>)}
                  <div className="sales-cart-total"><span>Total a pagar</span><strong className="mono">{fmt(totalCarrito)}</strong></div>

                  <div style={{ marginBottom: 14, padding: 12, borderRadius: 12, border: `1px solid ${borderColor2}`, background: bgCard2 }}>
                    <label style={{ display:"block", fontSize:12, fontWeight:800, color:textSecondary, marginBottom:7 }}>Cliente</label>
                    <select value={clienteVentaId} onChange={e => { const id=e.target.value; setClienteVentaId(id); const c=clientes.find(x=>String(x.id)===String(id)); setRequiereFactura(!!c?.solicitaFactura); }} style={{...inp, marginBottom:10}}>
                      <option value="">Consumidor final</option>
                      {clientes.map(c => <option key={c.id} value={c.id}>{c.razonSocial || c.nombre}{c.rut ? ` · ${c.rut}` : ""}</option>)}
                    </select>
                    <label style={{display:"flex",alignItems:"center",gap:9,fontSize:12,fontWeight:700,color:textSecondary}}>
                      <input type="checkbox" checked={requiereFactura} onChange={e=>setRequiereFactura(e.target.checked)} /> Esta venta requiere factura
                    </label>
                    {requiereFactura && !clienteVentaId && <button onClick={()=>setActiveNav("Clientes")} style={{marginTop:9,border:"none",background:"transparent",color:"#d71920",fontWeight:800,cursor:"pointer"}}>+ Crear o seleccionar cliente de factura</button>}
                  </div>
                  <h4 className="sales-pay-title">Método de pago</h4>
                  <div className="sales-pay-v2">
                    {[{val:"Efectivo",icon:Banknote},{val:"Tarjeta",icon:CreditCard},{val:"Transferencia",icon:CreditCard}].map(({val,icon:Icon})=><button key={val} className={pago===val?"active":""} onClick={()=>setPago(val)}><Icon size={22}/><span>{val}</span></button>)}
                  </div>
                  {pago==="Efectivo" && <div className="sales-cash-v2"><label>Dinero recibido</label><input type="number" min={totalCarrito} value={dineroRecibido} onChange={e=>setDineroRecibido(e.target.value)} placeholder={String(totalCarrito)}/>{vuelto!==null&&vuelto>=0&&<span>Vuelto: {fmt(vuelto)}</span>}</div>}
                  <button className="sales-finish-v2" disabled={boletaGenerando} onClick={handleVentaDirecta}>{boletaGenerando?"Guardando...":"Finalizar venta →"}</button>
                </div>}
              </section>

              <div className="ventas-grid sales-desktop-only" style={{ display: "grid", gridTemplateColumns: "440px 1fr", gap: 18 }}>
                {/* ── Formulario Nueva Venta ── */}
                <div style={{ ...card, height: "fit-content" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 18 }}>
                    <div style={{ width: 36, height: 36, borderRadius: 10, background: "linear-gradient(135deg, #d71920, #ef2b32)", display: "flex", alignItems: "center", justifyContent: "center" }}>
                      <ShoppingBag size={16} color="#fff" />
                    </div>
                    <h3 style={{ margin: 0, fontSize: 15, fontWeight: 700, color: textPrimary }}>Nueva Venta</h3>
                    {boletaGenerando && <span style={{ fontSize: 11, color: "#d71920", background: D ? "rgba(215,25,32,0.15)" : "#fff3bf", padding: "3px 8px", borderRadius: 6, fontWeight: 600 }} className="pulse">Generando recibo...</span>}
                  </div>

                  {ventaExito && <div style={{ background: "#ecfdf5", color: "#059669", fontSize: 13, padding: "11px 14px", borderRadius: 10, marginBottom: 14, fontWeight: 600 }}>{ventaExito}</div>}
                  {ventaError && <div style={{ background: "#fff1f2", color: "#e03131", fontSize: 13, padding: "11px 14px", borderRadius: 10, marginBottom: 14, fontWeight: 600 }}>⚠ {ventaError}</div>}

                  {/* Buscador */}
                  <div style={{ background: bgCard2, borderRadius: 12, padding: "14px 16px", marginBottom: 16, border: `1px solid ${borderColor}` }}>
                    <p style={{ margin: "0 0 10px", fontSize: 12, fontWeight: 700, color: textSecondary, textTransform: "uppercase", letterSpacing: "0.5px" }}>Buscar producto</p>
                    <div style={{ position: "relative" }} ref={busquedaRef}>
                      <div style={{ position: "relative", display: "flex", alignItems: "center", gap: 8 }}>
                        <div style={{ position: "relative", flex: 1 }}>
                          <Search size={14} color={textMuted} style={{ position: "absolute", left: 12, top: "50%", transform: "translateY(-50%)", pointerEvents: "none" }} />
                          <input
                            ref={salesSearchDesktopRef}
                            value={busquedaVenta}
                            onChange={e => { setBusquedaVenta(e.target.value); setShowBusquedaDropdown(true); if (!e.target.value) setProductoSeleccionadoVenta(null); }}
                            onFocus={() => setShowBusquedaDropdown(true)}
                            onKeyDown={e => { if (e.key === "Enter") { e.preventDefault(); procesarCodigoVenta(e.currentTarget.value); } }}
                            autoComplete="off"
                            placeholder="Escribe o escanea código..."
                            style={{ ...inp, paddingLeft: 36, width: "100%" }}
                          />
                          {busquedaVenta && <button onClick={() => { setBusquedaVenta(""); setProductoSeleccionadoVenta(null); setShowBusquedaDropdown(false); }} style={{ position: "absolute", right: 10, top: "50%", transform: "translateY(-50%)", background: "none", border: "none", cursor: "pointer", color: textMuted, padding: 2 }}><X size={14} /></button>}
                        </div>
                        <button onClick={() => setShowScanner(true)} title="Escanear código de barras" style={{ flexShrink: 0, width: 40, height: 40, borderRadius: 10, border: `1.5px solid ${borderColor2}`, background: D ? "#252840" : "#f0f2ff", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", color: "#d71920" }}>
                          <span style={{ fontSize: 18 }}>📷</span>
                        </button>
                      </div>
                      {showBusquedaDropdown && productosBusqueda.length > 0 && (
                        <div className="search-dropdown">
                          {productosBusqueda.map(p => (
                            <div key={p.id} className="search-dropdown-item" onClick={() => seleccionarProductoVenta(p)}>
                              <span style={{ fontSize: 20 }}>{p.img}</span>
                              <div style={{ flex: 1 }}>
                                <p style={{ margin: 0, fontSize: 13, fontWeight: 600, color: textPrimary }}>{p.nombre}</p>
                                <p style={{ margin: 0, fontSize: 11, color: textMuted }}>{p.categoria} · Stock: {p.stock}</p>
                              </div>
                              <span style={{ fontSize: 12, fontWeight: 800, color: "#10b981", fontFamily: "JetBrains Mono" }}>{fmt(p.precio)}</span>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                    {productoSeleccionadoVenta && (
                      <div style={{ marginTop: 10 }}>
                        {/* Info producto seleccionado */}
                        <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "10px 12px", background: D ? "rgba(59,91,219,0.15)" : "#fff3bf", borderRadius: 10, marginBottom: 8, border: `1.5px solid ${D ? "#d7192040" : "#ffd966"}` }}>
                          <span style={{ fontSize: 22 }}>{productoSeleccionadoVenta.img}</span>
                          <div style={{ flex: 1 }}>
                            <p style={{ margin: 0, fontSize: 13, fontWeight: 700, color: "#d71920" }}>{productoSeleccionadoVenta.nombre}</p>
                            <p style={{ margin: 0, fontSize: 11, color: "#ef2b32" }}>
                              {fmt(productoSeleccionadoVenta.precio)} c/u
                              {productoSeleccionadoVenta.mangaActiva && productoSeleccionadoVenta.mangaCantidad && productoSeleccionadoVenta.mangaPrecio && (
                                <span style={{ marginLeft: 8, color: "#f59e0b", fontWeight: 700 }}>· Manga x{productoSeleccionadoVenta.mangaCantidad}: {fmt(+productoSeleccionadoVenta.mangaPrecio)}</span>
                              )}
                            </p>
                            <p style={{ margin: "2px 0 0", fontSize: 11, color: "#6b7280" }}>
                              Stock: {productoSeleccionadoVenta.stock} uds
                              {productoSeleccionadoVenta.mangaActiva && productoSeleccionadoVenta.mangaCantidad && productoSeleccionadoVenta.mangaCantidad > 0 && (
                                <span style={{ marginLeft: 6 }}>/ {Math.floor(productoSeleccionadoVenta.stock / +productoSeleccionadoVenta.mangaCantidad)} mangas</span>
                              )}
                            </p>
                          </div>
                        </div>
                        {/* Toggle manga / unidad */}
                        {productoSeleccionadoVenta.mangaActiva && productoSeleccionadoVenta.mangaCantidad && productoSeleccionadoVenta.mangaPrecio && (
                          <div style={{ display: "flex", gap: 6, marginBottom: 8 }}>
                            <button onClick={() => setModoManga(false)}
                              style={{ flex: 1, padding: "8px", borderRadius: 9, border: `1.5px solid ${!modoManga ? "#d71920" : borderColor2}`, background: !modoManga ? (D ? "rgba(215,25,32,0.15)" : "#fff3bf") : bgCard2, cursor: "pointer", fontSize: 12, fontWeight: 700, color: !modoManga ? "#d71920" : textSecondary, fontFamily: "inherit" }}>
                              📦 Por unidad<br /><span style={{ fontWeight: 400, fontSize: 11 }}>{fmt(productoSeleccionadoVenta.precio)} c/u</span>
                            </button>
                            <button onClick={() => setModoManga(true)}
                              style={{ flex: 1, padding: "8px", borderRadius: 9, border: `1.5px solid ${modoManga ? "#f59e0b" : borderColor2}`, background: modoManga ? (D ? "rgba(245,158,11,0.2)" : "#fffbeb") : bgCard2, cursor: "pointer", fontSize: 12, fontWeight: 700, color: modoManga ? "#d97706" : textSecondary, fontFamily: "inherit" }}>
                              📦 Por manga<br /><span style={{ fontWeight: 400, fontSize: 11 }}>{fmt(+productoSeleccionadoVenta.mangaPrecio)} x{productoSeleccionadoVenta.mangaCantidad} uds</span>
                            </button>
                          </div>
                        )}
                      </div>
                    )}
                    <div style={{ display: "flex", gap: 8, marginTop: productoSeleccionadoVenta ? 0 : 10 }}>
                      <input type="number" min="1" value={carritoCantidad} onChange={e => setCarritoCantidad(e.target.value)} placeholder={modoManga ? "Nº mangas" : "Cantidad"} style={{ ...inp, flex: 1 }} />
                      <button onClick={agregarAlCarrito} className="btn-primary" style={{ padding: "10px 16px", borderRadius: 10, fontSize: 13, display: "flex", alignItems: "center", gap: 4, whiteSpace: "nowrap" }}>
                        <Plus size={15} /> Agregar
                      </button>
                    </div>
                    {carritoError && <p style={{ color: "#e03131", fontSize: 12, margin: "6px 0 0", fontWeight: 500 }}>⚠ {carritoError}</p>}
                    {stockWarning && <p style={{ color: "#d97706", fontSize: 12, margin: "6px 0 0", fontWeight: 500, background: "#fffbeb", padding: "6px 10px", borderRadius: 8 }}>{stockWarning}</p>}
                  </div>

                  {/* Carrito */}
                  {carrito.length > 0 && (
                    <div style={{ marginBottom: 16 }}>
                      <p style={{ margin: "0 0 10px", fontSize: 12, fontWeight: 700, color: textSecondary, textTransform: "uppercase", letterSpacing: "0.5px" }}>Carrito ({carrito.length})</p>
                      {carrito.map(item => (
                        <div key={`${item.productoId}-${item.esManga ? "manga" : "unit"}`} style={{ display: "flex", alignItems: "center", gap: 8, padding: "8px 12px", background: bgCard2, borderRadius: 10, marginBottom: 6, border: `1px solid ${item.esManga ? (D ? "rgba(245,158,11,0.4)" : "#fde68a") : borderColor}` }}>
                          <span style={{ fontSize: 18 }}>{item.img}</span>
                          <div style={{ flex: 1, minWidth: 0 }}>
                            <p style={{ margin: 0, fontSize: 12, fontWeight: 600, color: textPrimary, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{item.nombre}</p>
                            <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                              <p style={{ margin: 0, fontSize: 11, color: textMuted }}>{fmt(item.precio)} {item.esManga ? `x manga` : `c/u`}</p>
                              {item.esManga && item.mangaLabel && (
                                <span style={{ fontSize: 10, fontWeight: 700, color: "#d97706", background: "#fffbeb", padding: "1px 6px", borderRadius: 6 }}>📦 {item.mangaLabel}</span>
                              )}
                              {!item.esManga && item.enPromo && item.promoLabel && (
                                <span style={{ fontSize: 10, fontWeight: 700, color: "#d71920", background: "#fff3bf", padding: "1px 6px", borderRadius: 6 }}>🏷️ {item.promoLabel}</span>
                              )}
                            </div>
                            {item.esManga && (
                              <p style={{ margin: 0, fontSize: 10, color: "#d97706" }}>{item.cantidad * (item.unidadesPorManga || 1)} unidades descontadas</p>
                            )}
                            <button type="button" onClick={() => alternarPrecioManualCarrito(item.productoId, item.esManga)} style={{ marginTop: 4, border: "none", padding: 0, background: "transparent", color: item.precioManualActivo ? "#d71920" : "#2563eb", fontSize: 10, fontWeight: 800, cursor: "pointer" }}>
                              {item.precioManualActivo ? "Usar precio automático" : "✏️ Precio manual"}
                            </button>
                            {item.precioManualActivo && (
                              <input type="number" min="0" inputMode="numeric" value={item.precioManualTotal ?? ""} onChange={e => cambiarPrecioManualCarrito(item.productoId, item.esManga, e.target.value)} placeholder="Total a cobrar" style={{ ...inp, marginTop: 5, padding: "6px 8px", fontSize: 11, maxWidth: 150 }} />
                            )}
                          </div>
                          <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                            <button onClick={() => cambiarCantidadCarrito(item.productoId, item.cantidad - 1, item.esManga)} style={{ width: 24, height: 24, borderRadius: 6, border: `1px solid ${borderColor2}`, background: bgCard, cursor: "pointer", color: textSecondary, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 14 }}>−</button>
                            <span style={{ fontSize: 13, fontWeight: 700, minWidth: 20, textAlign: "center", color: textPrimary }}>{item.cantidad}</span>
                            <button onClick={() => cambiarCantidadCarrito(item.productoId, item.cantidad + 1, item.esManga)} style={{ width: 24, height: 24, borderRadius: 6, border: `1px solid ${borderColor2}`, background: bgCard, cursor: "pointer", color: textSecondary, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 14 }}>+</button>
                          </div>
                          <span style={{ fontSize: 13, fontWeight: 800, color: "#10b981", minWidth: 70, textAlign: "right" }} className="mono">{fmt(item.subtotal)}</span>
                          <button onClick={() => quitarDelCarrito(item.productoId, item.esManga)} style={{ background: "none", border: "none", cursor: "pointer", color: "#e03131", padding: 2 }}><X size={14} /></button>
                        </div>
                      ))}
                      <div style={{ display: "flex", justifyContent: "space-between", padding: "10px 12px", background: D ? "rgba(16,185,129,0.15)" : "#ecfdf5", borderRadius: 10, marginTop: 6 }}>
                        <span style={{ fontWeight: 700, color: textPrimary }}>Total</span>
                        <span style={{ fontWeight: 800, fontSize: 18, color: "#10b981" }} className="mono">{fmt(totalCarrito)}</span>
                      </div>
                    </div>
                  )}




                  <div style={{ marginBottom: 14, padding: 12, borderRadius: 12, border: `1px solid ${borderColor2}`, background: bgCard2 }}>
                    <label style={{ display:"block", fontSize:12, fontWeight:800, color:textSecondary, marginBottom:7 }}>Cliente</label>
                    <select value={clienteVentaId} onChange={e => { const id=e.target.value; setClienteVentaId(id); const c=clientes.find(x=>String(x.id)===String(id)); setRequiereFactura(!!c?.solicitaFactura); }} style={{...inp, marginBottom:10}}>
                      <option value="">Consumidor final</option>
                      {clientes.map(c => <option key={c.id} value={c.id}>{c.razonSocial || c.nombre}{c.rut ? ` · ${c.rut}` : ""}</option>)}
                    </select>
                    <label style={{display:"flex",alignItems:"center",gap:9,fontSize:12,fontWeight:700,color:textSecondary}}>
                      <input type="checkbox" checked={requiereFactura} onChange={e=>setRequiereFactura(e.target.checked)} /> Esta venta requiere factura
                    </label>
                    {requiereFactura && !clienteVentaId && <button onClick={()=>setActiveNav("Clientes")} style={{marginTop:9,border:"none",background:"transparent",color:"#d71920",fontWeight:800,cursor:"pointer"}}>+ Crear o seleccionar cliente de factura</button>}
                  </div>
                  {/* Método de pago */}
                  {carrito.length > 0 && (
                    <div style={{ marginBottom: 16 }}>
                      <p style={{ margin: "0 0 10px", fontSize: 12, fontWeight: 700, color: textSecondary, textTransform: "uppercase", letterSpacing: "0.5px" }}>Método de pago</p>
                      <div className="grid-3-mobile-sm" style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 6, marginBottom: 12 }}>
                        {[
                          { val: "Efectivo", icon: Banknote, color: "#10b981" },
                          { val: "Tarjeta", icon: CreditCard, color: "#7c3aed" },
                          { val: "Transferencia", icon: CreditCard, color: "#8b5cf6" },
                        ].map(({ val, icon: Icon, color }) => (
                          <button key={val} onClick={() => setPago(val)}
                            style={{ padding: "9px 6px", borderRadius: 10, border: `2px solid ${pago === val ? color : borderColor2}`, background: pago === val ? (D ? `${color}20` : `${color}10`) : bgCard, cursor: "pointer", fontSize: 11, fontWeight: 700, color: pago === val ? color : textSecondary, fontFamily: "inherit", display: "flex", flexDirection: "column", alignItems: "center", gap: 4, transition: "all 0.15s" }}>
                            <Icon size={14} />
                            {val}
                          </button>
                        ))}
                      </div>

                      {pago === "Efectivo" && (
                        <div style={{ marginBottom: 8 }}>
                          <label style={{ fontSize: 11, fontWeight: 700, color: textSecondary, display: "block", marginBottom: 6, textTransform: "uppercase", letterSpacing: "0.4px" }}>Dinero recibido</label>
                          <input type="number" min={totalCarrito} value={dineroRecibido} onChange={e => setDineroRecibido(e.target.value)} placeholder={String(totalCarrito)} style={inp} />
                          {vuelto !== null && vuelto >= 0 && (
                            <p style={{ margin: "6px 0 0", fontSize: 13, color: "#10b981", fontWeight: 700 }}>Vuelto: <span className="mono">{fmt(vuelto)}</span></p>
                          )}
                        </div>
                      )}

                      {/* Botón confirmar */}
                      <button onClick={handleVentaDirecta} className="btn-primary" style={{ width: "100%", padding: "13px", borderRadius: 10, fontSize: 14, fontWeight: 700, display: "flex", alignItems: "center", justifyContent: "center", gap: 8 }}>
                        <Check size={16} /> Confirmar Venta
                      </button>
                    </div>
                  )}
                </div>

                {/* ── Lista de Ventas ── */}
                <div style={card}>
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 16 }}>
                    <h3 style={{ margin: 0, fontSize: 15, fontWeight: 700, color: textPrimary }}>Historial de Ventas</h3>
                    <div style={{ display: "flex", gap: 6 }}>
                      {["Todos", "Efectivo", "Tarjeta", "Transferencia"].map(f => (
                        <button key={f} onClick={() => setFiltroPago(f)}
                          style={{ padding: "5px 12px", borderRadius: 8, border: `1.5px solid ${filtroPago === f ? "#d71920" : borderColor2}`, background: filtroPago === f ? "#d71920" : bgCard2, color: filtroPago === f ? "#fff" : textSecondary, cursor: "pointer", fontSize: 11, fontWeight: 600, fontFamily: "inherit" }}>
                          {f}
                        </button>
                      ))}
                    </div>
                  </div>
                  {ventasFiltradas.length === 0
                    ? <p style={{ color: textMuted, fontSize: 13, textAlign: "center", padding: "30px 0" }}>No hay ventas registradas</p>
                    : ventasFiltradas.map(v => (
                      <div key={v.id} style={{ padding: "14px", background: bgCard2, borderRadius: 12, marginBottom: 10, border: `1px solid ${borderColor}` }}>
                        <div style={{ display: "flex", gap: 12 }}>
                          <div style={{ width: 38, height: 38, borderRadius: 10, background: v.pago === "Efectivo" ? (D ? "rgba(16,185,129,0.2)" : "#ecfdf5") : ["Tarjeta", "Débito"].includes(v.pago) ? (D ? "rgba(245,158,11,0.2)" : "#fffbeb") :  (D ? "rgba(139,92,246,0.2)" : "#f5f3ff"), display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                            {v.pago === "Efectivo" ? <Banknote size={18} color="#10b981" /> : ["Tarjeta", "Débito"].includes(v.pago) ? <CreditCard size={18} color="#f59e0b" /> :  <CreditCard size={18} color="#8b5cf6" />}
                          </div>
                          <div style={{ flex: 1 }}>
                            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 6 }}>
                              <div>
                                <p style={{ margin: 0, fontSize: 14, fontWeight: 700, color: textPrimary }}>{(v.items||[]).length} producto{(v.items||[]).length !== 1 ? "s" : ""}</p>
                                <p style={{ margin: 0, fontSize: 11, color: textMuted }}>{v.fecha} · {v.usuario}</p>
                              </div>
                              <div style={{ textAlign: "right" }}>
                                <p style={{ margin: 0, fontSize: 18, fontWeight: 800, color: "#10b981" }} className="mono">{fmt(v.total)}</p>
                                <span className="badge" style={{ background: v.pago === "Efectivo" ? "#ecfdf5" : ["Tarjeta", "Débito"].includes(v.pago) ? "#fffbeb" : v.pago === "Crédito" ? "#fff1f2" : "#f5f3ff", color: v.pago === "Efectivo" ? "#059669" : ["Tarjeta", "Débito"].includes(v.pago) ? "#f59e0b" : v.pago === "Crédito" ? "#e03131" : "#8b5cf6" }}>{v.pago}</span>
                              </div>
                            </div>
                            <div style={{ display: "flex", flexWrap: "wrap", gap: 5 }}>
                              {(v.items||[]).map(item => (
                                <span key={`${item.productoId}-${item.esManga ? "m" : "u"}`} style={{ fontSize: 11, background: D ? "#2d3158" : "#f3f4f6", color: textSecondary, padding: "2px 8px", borderRadius: 5, fontWeight: 500 }}>
                                  {item.img} {item.nombre} ×{item.cantidad}{item.esManga ? " 📦" : ""}
                                </span>
                              ))}
                            </div>
                            {/* Boleta asociada */}
                            {(() => { const b = boletas.find(b => b.ventaId === v.id); return b ? (
                              <button onClick={() => setBoletaModal(b)} style={{ marginTop: 8, padding: "4px 10px", borderRadius: 7, border: `1px solid ${D ? "#2d3158" : "#e5e7eb"}`, background: "none", cursor: "pointer", fontSize: 11, color: "#d71920", display: "flex", alignItems: "center", gap: 5, fontFamily: "inherit" }}>
                                <Receipt size={12} /> Boleta #{String(b.numero).padStart(6, "0")}
                              </button>
                            ) : null; })()}
                          </div>
                          <button onClick={async () => {
                            if (!window.confirm("¿Eliminar esta venta? El stock de los productos vendidos se devolverá automáticamente al inventario.")) return;
                            try {
                              const res = await fetch(`${API}/api/ventas/${v.id}`, {
                                method: "DELETE",
                                headers: { "x-usuario": currentUser.usuario, "x-clave": currentUser._clave || "" },
                              });
                              const data = await res.json();
                              if (!res.ok) throw new Error(data.error || "No se pudo eliminar la venta.");

                              const updatedVentas = ventas.filter(x => String(x.id) !== String(v.id));
                              setVentas(updatedVentas); saveSales(updatedVentas);
                              const boletaAsociada = boletas.find(b => b.ventaId === v.id);
                              if (boletaAsociada) {
                                const updatedBoletas = boletas.filter(b => b.numero !== boletaAsociada.numero);
                                setBoletas(updatedBoletas); saveBoletas(updatedBoletas);
                              }

                              setProducts(prev => prev.map(prod => {
                                const item = (v.items || []).find(c => String(c.productoId) === String(prod.id));
                                if (!item) return prod;
                                const unidades = Number(item.cantidad || 0) * Number(item.unidadesPorManga || 1);
                                return { ...prod, stock: Number(prod.stock || 0) + unidades };
                              }));
                            } catch (err) {
                              alert("No se pudo eliminar la venta: " + err.message);
                            }
                          }} style={{ background: "none", border: "none", cursor: "pointer", padding: "4px", color: "#e03131", alignSelf: "flex-start", flexShrink: 0 }} title="Eliminar venta"><Trash2 size={15} /></button>
                        </div>
                      </div>
                    ))}
                </div>
              </div>
            </div>
          )}

          {/* ── BOLETAS ── */}
          {activeNav === "Recibos" && (
            <div className="receipts-screen">
              <div className="grid-2-mobile receipts-kpis" style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14, marginBottom: 20 }}>
                <div style={{ ...card, display: "flex", alignItems: "center", gap: 14 }} className="card-hover receipts-kpi-card">
                  <div className="receipts-kpi-icon" style={{ width: 42, height: 42, borderRadius: 12, background: D ? "rgba(59,91,219,0.15)" : "#fff3bf", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                    <Receipt size={20} color="#d71920" />
                  </div>
                  <div>
                    <p style={{ margin: 0, fontSize: 24, fontWeight: 800, color: textPrimary }}>{boletas.length}</p>
                    <p style={{ margin: 0, fontSize: 12, color: textMuted }}>Total Boletas</p>
                  </div>
                </div>
                <div style={{ ...card, display: "flex", alignItems: "center", gap: 14 }} className="card-hover receipts-kpi-card">
                  <div className="receipts-kpi-icon" style={{ width: 42, height: 42, borderRadius: 12, background: D ? "rgba(16,185,129,0.15)" : "#ecfdf5", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                    <DollarSign size={20} color="#10b981" />
                  </div>
                  <div>
                    <p style={{ margin: 0, fontSize: 20, fontWeight: 800, color: textPrimary }} className="mono">{fmt(boletas.reduce((s, b) => s + b.total, 0))}</p>
                    <p style={{ margin: 0, fontSize: 12, color: textMuted }}>Monto Total</p>
                  </div>
                </div>
              </div>

              <div style={card} className="receipts-panel">
                <div className="receipts-toolbar" style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 16 }}>
                  <h3 style={{ margin: 0, fontSize: 15, fontWeight: 700, color: textPrimary }}>Todos los Recibos</h3>
                  <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                    {boletas.length > 0 && (<>
                      <button onClick={() => {
                        const wb = XLSX.utils.book_new();
                        const resumen = [["N°","Fecha","Timestamp","Vendedor","Empresa","Método Pago","Subtotal ($)","Total ($)","Estado Pago","ID Venta"]];
                        const detalle = [["N° Boleta","Producto","Cantidad","Precio Unitario ($)","Subtotal ($)"]];
                        boletas.forEach(b => {
                          resumen.push([
                            Number(b.numero || 0), b.fecha || "", Number(b.timestamp || 0), b.vendedor || "",
                            b.empresa || "", b.metodoPago || "", Number(b.subtotal || b.total || 0),
                            Number(b.total || 0), b.estadoPago || "confirmado", b.ventaId || ""
                          ]);
                          (b.items || []).forEach(it => detalle.push([
                            Number(b.numero || 0), it.nombre || "", Number(it.cantidad || 0),
                            Number(it.precio || 0), Number(it.subtotal || (it.precio || 0) * (it.cantidad || 0))
                          ]));
                        });
                        const wsResumen = XLSX.utils.aoa_to_sheet(resumen);
                        wsResumen["!cols"] = [{wch:10},{wch:22},{wch:15},{wch:18},{wch:18},{wch:16},{wch:14},{wch:14},{wch:14},{wch:22}];
                        const wsDetalle = XLSX.utils.aoa_to_sheet(detalle);
                        wsDetalle["!cols"] = [{wch:12},{wch:36},{wch:10},{wch:18},{wch:14}];
                        XLSX.utils.book_append_sheet(wb, wsResumen, "Boletas");
                        XLSX.utils.book_append_sheet(wb, wsDetalle, "Detalle");
                        const fecha = new Date().toLocaleDateString("es-CL").replace(/\//g,"-");
                        XLSX.writeFile(wb, `respaldo-boletas-${fecha}.xlsx`);
                      }} style={{ padding: "7px 14px", borderRadius: 8, border: `1px solid ${D ? "#2d3158" : "#d1d5db"}`, background: D ? "#252840" : "#fff", cursor: "pointer", fontSize: 12, fontWeight: 700, display: "flex", alignItems: "center", gap: 5, fontFamily: "inherit", color: "#10b981" }}>
                        <Download size={12} /> Guardar respaldo Excel
                      </button>
                      <button onClick={() => {
                        const input = document.createElement("input");
                        input.type = "file";
                        input.accept = ".xlsx,.xls";
                        input.onchange = async (ev) => {
                          const file = ev.target.files?.[0];
                          if (!file) return;
                          try {
                            const data = await file.arrayBuffer();
                            const wb = XLSX.read(data, { type: "array" });
                            const wsBoletas = wb.Sheets["Boletas"] || wb.Sheets["Recibos"] || wb.Sheets[wb.SheetNames[0]];
                            if (!wsBoletas) throw new Error("El archivo no contiene una hoja de boletas.");
                            const filas = XLSX.utils.sheet_to_json(wsBoletas, { defval: "" });
                            const wsDetalle = wb.Sheets["Detalle"];
                            const filasDetalle = wsDetalle ? XLSX.utils.sheet_to_json(wsDetalle, { defval: "" }) : [];
                            const normalizadas = filas.map((r, idx) => {
                              const numero = Number(r["N°"] || r["N° Boleta"] || r.numero || idx + 1);
                              const items = filasDetalle.filter(d => Number(d["N° Boleta"]) === numero).map(d => ({
                                nombre: d["Producto"] || "Producto",
                                cantidad: Number(d["Cantidad"] || 0),
                                precio: Number(d["Precio Unitario ($)"] || 0),
                                subtotal: Number(d["Subtotal ($)"] || 0),
                              }));
                              return {
                                numero,
                                fecha: r["Fecha"] || new Date().toLocaleString("es-CL"),
                                timestamp: Number(r["Timestamp"] || Date.now()),
                                vendedor: r["Vendedor"] || "",
                                empresa: r["Empresa"] || currentUser?.empresa || "",
                                metodoPago: r["Método Pago"] || r["Método"] || "",
                                subtotal: Number(r["Subtotal ($)"] || r["Total ($)"] || r["Total"] || 0),
                                total: Number(r["Total ($)"] || r["Total"] || 0),
                                estadoPago: r["Estado Pago"] || "confirmado",
                                ventaId: r["ID Venta"] || "",
                                items,
                                tipoDoc: "recibo",
                              };
                            }).filter(b => b.numero && b.total >= 0);
                            if (!normalizadas.length) throw new Error("No se encontraron boletas válidas.");
                            const mapa = new Map();
                            [...boletas, ...normalizadas].forEach(b => mapa.set(String(b.numero), b));
                            const restauradas = Array.from(mapa.values()).sort((a,b) => Number(b.timestamp || 0) - Number(a.timestamp || 0));
                            setBoletas(restauradas);
                            saveBoletas(restauradas);
                            alert(`Respaldo restaurado: ${normalizadas.length} boletas leídas. Se conservaron las existentes.`);
                          } catch (err) {
                            alert("No se pudo restaurar el respaldo: " + (err.message || "archivo inválido"));
                          }
                        };
                        input.click();
                      }} style={{ padding: "7px 14px", borderRadius: 8, border: `1px solid ${D ? "#2d3158" : "#d1d5db"}`, background: D ? "#252840" : "#fff", cursor: "pointer", fontSize: 12, fontWeight: 700, display: "flex", alignItems: "center", gap: 5, fontFamily: "inherit", color: "#3b82f6" }}>
                        <RefreshCw size={12} /> Restaurar Excel
                      </button>
                      <button onClick={async () => {
                        if (!window.confirm(`¿Borrar todos los recibos? (${boletas.length} documentos)`)) return;
                        alert("Por seguridad, las boletas no se pueden borrar. Puedes exportarlas a Excel para respaldo.");
                      }} className="btn-danger" style={{ padding: "7px 14px", borderRadius: 8, fontSize: 12, fontWeight: 700, display: "flex", alignItems: "center", gap: 5, fontFamily: "inherit" }}>
                        <Trash2 size={12} /> Borrar todos
                      </button>
                    </>)}
                  </div>
                </div>

                <div style={{ marginBottom: 14, padding: "11px 14px", borderRadius: 10, background: D ? "rgba(59,130,246,0.10)" : "#eff6ff", border: `1px solid ${D ? "rgba(59,130,246,0.25)" : "#bfdbfe"}`, color: D ? "#93c5fd" : "#1d4ed8", fontSize: 12, lineHeight: 1.5 }}>
                  <strong>Respaldo de seguridad:</strong> guarda el Excel regularmente. El archivo incluye una hoja con las boletas y otra con el detalle de cada producto, y luego puede restaurarse sin borrar las boletas actuales.
                </div>

                {boletas.length === 0 ? (
                  <div style={{ textAlign: "center", padding: "50px 0" }}>
                    <Receipt size={48} color={D ? "#2d3158" : "#e5e7eb"} style={{ marginBottom: 12 }} />
                    <p style={{ color: textMuted, fontSize: 14 }}>No hay recibos generados aún</p>
                    <p style={{ color: textMuted, fontSize: 12 }}>Los recibos se generan automáticamente al confirmar una venta</p>
                  </div>
                ) : (
                  <div>
                    {boletas.map(b => (
                      <div key={b.numero} className="receipt-card" style={{ background: bgCard2, border: `1px solid ${borderColor}` }} onClick={() => setBoletaModal(b)}>
                        <div className="receipt-card-icon" style={{ background: D ? "rgba(215,25,32,0.15)" : "#fff3bf" }}>
                          <Receipt size={20} color="#d71920" />
                        </div>
                        <div className="receipt-card-main">
                          <div className="receipt-card-topline">
                            <p style={{ color: textPrimary }} className="mono receipt-number">#{String(b.numero).padStart(6, "0")}</p>
                            <p className="mono receipt-amount">{fmt(b.total)}</p>
                          </div>
                          <p className="receipt-meta" style={{ color: textMuted }}>{b.fecha}</p>
                          <p className="receipt-seller" style={{ color: textSecondary }}>{b.vendedor || "Admin"}</p>
                          <div className="receipt-card-bottom">
                            <span className="receipt-payment">{String(b.metodoPago || "Efectivo").toLowerCase().includes("transfer") ? "🏦" : String(b.metodoPago || "").toLowerCase().includes("tarj") || String(b.metodoPago || "").toLowerCase().includes("débit") || String(b.metodoPago || "").toLowerCase().includes("debit") ? "💳" : "💵"} {b.metodoPago || "Efectivo"}</span>
                            <span className="receipt-paid">✓ Pagado</span>
                            <button onClick={async e => {
                              e.stopPropagation();
                              if (!window.confirm(`¿Eliminar la venta #${String(b.numero).padStart(6,"0")}? El stock de los productos vendidos se devolverá automáticamente al inventario.`)) return;
                              try {
                                const res = await fetch(`${API}/api/ventas/${b.ventaId}`, {
                                  method: "DELETE",
                                  headers: { "x-usuario": currentUser.usuario, "x-clave": currentUser._clave || "" },
                                });
                                const data = await res.json();
                                if (!res.ok) throw new Error(data.error || "No se pudo eliminar la venta.");

                                const updatedBoletas = boletas.filter(x => x.numero !== b.numero);
                                setBoletas(updatedBoletas); saveBoletas(updatedBoletas);
                                const updatedVentas = ventas.filter(v => String(v.id) !== String(b.ventaId));
                                setVentas(updatedVentas); saveSales(updatedVentas);

                                // Devolver el stock también en pantalla, sin esperar un refetch completo.
                                const ventaBorrada = ventas.find(v => String(v.id) === String(b.ventaId));
                                if (ventaBorrada) {
                                  setProducts(prev => prev.map(prod => {
                                    const item = (ventaBorrada.items || []).find(c => String(c.productoId) === String(prod.id));
                                    if (!item) return prod;
                                    const unidades = Number(item.cantidad || 0) * Number(item.unidadesPorManga || 1);
                                    return { ...prod, stock: Number(prod.stock || 0) + unidades };
                                  }));
                                }
                              } catch (err) {
                                alert("No se pudo eliminar la venta: " + err.message);
                              }
                            }} style={{ padding: "2px 8px", borderRadius: 6, background: "#fff1f2", border: "none", cursor: "pointer", display: "flex", alignItems: "center", gap: 3, color: "#e03131" }}>
                              <Trash2 size={11} />
                            </button>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* ── CAJA ── */}
          {activeNav === "Caja" && (
            <div>
              {/* Modales apertura / cierre */}
              {showAperturaModal && (
                <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.6)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 100, backdropFilter: "blur(4px)" }}>
                  <div className="fade-in" style={{ background: bgCard, borderRadius: 20, padding: 28, width: "92%", maxWidth: 380, boxShadow: "0 24px 60px rgba(0,0,0,0.3)" }}>
                    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 20 }}>
                      <h3 style={{ margin: 0, fontSize: 17, fontWeight: 800, color: textPrimary }}>Abrir Caja</h3>
                      <button onClick={() => setShowAperturaModal(false)} style={{ background: bgCard2, border: "none", cursor: "pointer", width: 32, height: 32, borderRadius: 8, display: "flex", alignItems: "center", justifyContent: "center" }}><X size={16} color={textMuted} /></button>
                    </div>
                    <label style={{ fontSize: 12, fontWeight: 700, color: D ? "#9ca3af" : "#374151", display: "block", marginBottom: 6 }}>Monto de apertura (efectivo en caja)</label>
                    <input type="number" min="0" value={montoApertura} onChange={e => setMontoApertura(e.target.value)} placeholder="Ej: 50000" style={{ ...inp, marginBottom: 16 }} />
                    {cajaError && <div style={{ background: "#fff1f2", color: "#e03131", fontSize: 13, padding: "10px 14px", borderRadius: 8, marginBottom: 14 }}>⚠ {cajaError}</div>}
                    <div style={{ display: "flex", gap: 10 }}>
                      <button onClick={() => { setShowAperturaModal(false); setCajaError(""); }} style={{ flex: 1, padding: "11px", borderRadius: 10, border: `1.5px solid ${borderColor2}`, background: bgCard2, cursor: "pointer", fontSize: 14, color: textSecondary, fontWeight: 600, fontFamily: "inherit" }}>Cancelar</button>
                      <button onClick={handleAbrirCaja} className="btn-primary" style={{ flex: 1, padding: "11px", borderRadius: 10, fontSize: 14 }}>Abrir Caja</button>
                    </div>
                  </div>
                </div>
              )}
              {showCierreModal && (
                <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.6)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 100, backdropFilter: "blur(4px)" }}>
                  <div className="fade-in" style={{ background: bgCard, borderRadius: 20, padding: 28, width: "92%", maxWidth: 420, boxShadow: "0 24px 60px rgba(0,0,0,0.3)" }}>
                    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 20 }}>
                      <h3 style={{ margin: 0, fontSize: 17, fontWeight: 800, color: textPrimary }}>Cerrar Caja</h3>
                      <button onClick={() => setShowCierreModal(false)} style={{ background: bgCard2, border: "none", cursor: "pointer", width: 32, height: 32, borderRadius: 8, display: "flex", alignItems: "center", justifyContent: "center" }}><X size={16} color={textMuted} /></button>
                    </div>
                    {(() => {
                      const inicio = new Date(cajaData.apertura).getTime();
                      const vt = ventas.filter(v => v.timestamp >= inicio);
                      const total = vt.reduce((s, v) => s + v.total, 0);
                      const ef    = vt.filter(v => v.pago === "Efectivo").reduce((s, v) => s + v.total, 0);
                      const tr    = vt.filter(v => v.pago === "Transferencia").reduce((s, v) => s + v.total, 0);
                      return (
                        <div>
                          <div style={{ background: D ? "#1e2235" : "#f8f9ff", borderRadius: 12, padding: "14px 16px", marginBottom: 16 }}>
                            <p style={{ margin: "0 0 10px", fontSize: 13, fontWeight: 700, color: textPrimary }}>Resumen del turno</p>
                            {[
                              { label: "Apertura", val: fmt(cajaData.montoApertura), color: textSecondary },
                              { label: "Ventas totales", val: fmt(total), color: "#10b981" },
                              { label: "— Efectivo", val: fmt(ef), color: textSecondary },
                              { label: "— Transferencia", val: fmt(tr), color: textSecondary },
                              { label: "N° de ventas", val: vt.length, color: textSecondary },
                            ].map(({ label, val, color }) => (
                              <div key={label} style={{ display: "flex", justifyContent: "space-between", fontSize: 13, color, marginBottom: 4 }}>
                                <span>{label}</span><span style={{ fontWeight: 700 }}>{val}</span>
                              </div>
                            ))}
                            <div style={{ borderTop: `1.5px solid ${borderColor2}`, marginTop: 8, paddingTop: 8, display: "flex", justifyContent: "space-between", fontSize: 14, fontWeight: 800, color: textPrimary }}>
                              <span>Efectivo en caja</span>
                              <span style={{ color: "#10b981" }}>{fmt(cajaData.montoApertura + ef)}</span>
                            </div>
                          </div>
                          <label style={{ fontSize: 12, fontWeight: 700, color: D ? "#9ca3af" : "#374151", display: "block", marginBottom: 6 }}>Efectivo contado en caja (opcional)</label>
                          <input type="number" min="0" value={montoContado} onChange={e => setMontoContado(e.target.value)}
                            placeholder={`Esperado: $${(cajaData.montoApertura + ef).toLocaleString("es-CL")}`}
                            style={{ ...inp, marginBottom: 4 }} />
                          {montoContado !== "" && (
                            <p style={{ margin: "0 0 12px", fontSize: 12, fontWeight: 700,
                              color: (+montoContado - (cajaData.montoApertura + ef)) >= 0 ? "#10b981" : "#e03131" }}>
                              Diferencia: {(+montoContado - (cajaData.montoApertura + ef)) >= 0 ? "+" : ""}
                              ${(+montoContado - (cajaData.montoApertura + ef)).toLocaleString("es-CL")}
                            </p>
                          )}
                          <label style={{ fontSize: 12, fontWeight: 700, color: D ? "#9ca3af" : "#374151", display: "block", marginBottom: 6 }}>Notas del cierre (opcional)</label>
                          <textarea value={notasCierre} onChange={e => setNotasCierre(e.target.value)} placeholder="Observaciones, diferencias, incidentes..." rows={3}
                            style={{ ...inp, resize: "vertical", marginBottom: 16 }} />
                          <div style={{ display: "flex", gap: 10 }}>
                            <button onClick={() => setShowCierreModal(false)} style={{ flex: 1, padding: "11px", borderRadius: 10, border: `1.5px solid ${borderColor2}`, background: bgCard2, cursor: "pointer", fontSize: 14, color: textSecondary, fontWeight: 600, fontFamily: "inherit" }}>Cancelar</button>
                            <button disabled={cajaProcesando} onClick={handleCerrarCaja} style={{ flex: 1, padding: "11px", borderRadius: 10, border: "none", background: "linear-gradient(135deg, #e03131, #f03e3e)", cursor: cajaProcesando ? "wait" : "pointer", opacity: cajaProcesando ? 0.7 : 1, fontSize: 14, fontWeight: 700, color: "#fff", fontFamily: "inherit" }}>{cajaProcesando ? "Cerrando..." : "Cerrar Caja"}</button>
                          </div>
                        </div>
                      );
                    })()}
                  </div>
                </div>
              )}

              {/* Header */}
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 18 }}>
                <div>
                  <h2 style={{ margin: 0, fontSize: 18, fontWeight: 800, color: textPrimary }}>Caja</h2>
                  <p style={{ margin: 0, fontSize: 13, color: textMuted }}>Apertura, cierre e historial de turnos</p>
                </div>
                {!cajaAbierta
                  ? <button onClick={() => { setShowAperturaModal(true); setCajaError(""); }} className="btn-primary" style={{ display: "flex", alignItems: "center", gap: 7, padding: "9px 18px", borderRadius: 10, fontSize: 13 }}>
                      <Banknote size={15} /> Abrir Caja
                    </button>
                  : <button onClick={() => setShowCierreModal(true)} style={{ display: "flex", alignItems: "center", gap: 7, padding: "9px 18px", borderRadius: 10, fontSize: 13, border: "none", background: "linear-gradient(135deg, #e03131, #f03e3e)", color: "#fff", cursor: "pointer", fontWeight: 700, fontFamily: "inherit" }}>
                      <X size={15} /> Cerrar Caja
                    </button>
                }
              </div>

              {cajaExito && <div style={{ background: "#ecfdf5", color: "#059669", fontSize: 13, padding: "12px 16px", borderRadius: 10, marginBottom: 16, fontWeight: 600 }}>{cajaExito}</div>}

              {/* Tabs */}
              <div style={{ display: "flex", gap: 8, marginBottom: 18 }}>
                {[{ id: "actual", label: "Turno actual" }, { id: "historial", label: `Historial (${historialCaja.length})` }].map(t => (
                  <button key={t.id} onClick={() => setCajaTab(t.id)}
                    style={{ padding: "8px 18px", borderRadius: 10, border: `1.5px solid ${cajaTab === t.id ? "#d71920" : borderColor2}`, background: cajaTab === t.id ? (D ? "rgba(59,91,219,0.15)" : "#fff3bf") : bgCard2, cursor: "pointer", fontSize: 13, fontWeight: 700, color: cajaTab === t.id ? "#d71920" : textSecondary, fontFamily: "inherit" }}>
                    {t.label}
                  </button>
                ))}
              </div>

              {/* Turno actual */}
              {cajaTab === "actual" && (
                <div>
                  {!cajaAbierta ? (
                    <div style={{ ...card, textAlign: "center", padding: 48 }}>
                      <div style={{ fontSize: 48, marginBottom: 14 }}>🔒</div>
                      <p style={{ margin: "0 0 6px", fontSize: 16, fontWeight: 700, color: textPrimary }}>Caja cerrada</p>
                      <p style={{ margin: "0 0 20px", fontSize: 13, color: textMuted }}>Abre la caja para comenzar a registrar ventas del turno.</p>
                      <button onClick={() => { setShowAperturaModal(true); setCajaError(""); }} className="btn-primary" style={{ padding: "10px 24px", borderRadius: 10, fontSize: 14 }}>
                        <Banknote size={15} style={{ marginRight: 6 }} />Abrir Caja
                      </button>
                    </div>
                  ) : (() => {
                    const inicio = new Date(cajaData.apertura).getTime();
                    const vt = ventas.filter(v => v.timestamp >= inicio);
                    const total = vt.reduce((s, v) => s + v.total, 0);
                    const ef    = vt.filter(v => v.pago === "Efectivo").reduce((s, v) => s + v.total, 0);
                    const tr    = vt.filter(v => v.pago === "Transferencia").reduce((s, v) => s + v.total, 0);
                    const deb   = vt.filter(v => ["Tarjeta", "Débito"].includes(v.pago)).reduce((s, v) => s + v.total, 0);
                    const cred  = vt.filter(v => v.pago === "Crédito").reduce((s, v) => s + v.total, 0);
                    const duracion = Math.floor((Date.now() - inicio) / 60000);
                    const horas = Math.floor(duracion / 60);
                    const mins  = duracion % 60;
                    return (
                      <div>
                        {/* Banner turno abierto */}
                        <div style={{ background: "linear-gradient(135deg, #10b981, #059669)", borderRadius: 16, padding: "18px 22px", marginBottom: 16, display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                          <div>
                            <p style={{ margin: "0 0 2px", fontSize: 13, fontWeight: 600, color: "rgba(255,255,255,0.8)" }}>🟢 Caja abierta</p>
                            <p style={{ margin: "0 0 2px", fontSize: 20, fontWeight: 900, color: "#fff" }}>{fmt(cajaData.montoApertura + ef)}</p>
                            <p style={{ margin: 0, fontSize: 12, color: "rgba(255,255,255,0.7)" }}>Efectivo en caja · Abierta por {cajaData.abiertaPor}</p>
                          </div>
                          <div style={{ textAlign: "right" }}>
                            <p style={{ margin: "0 0 2px", fontSize: 12, color: "rgba(255,255,255,0.7)" }}>Duración</p>
                            <p style={{ margin: 0, fontSize: 18, fontWeight: 800, color: "#fff" }}>{horas}h {mins}m</p>
                            <p style={{ margin: 0, fontSize: 11, color: "rgba(255,255,255,0.7)" }}>{new Date(cajaData.apertura).toLocaleTimeString("es-CL", { hour: "2-digit", minute: "2-digit" })}</p>
                          </div>
                        </div>

                        {/* Cards de resumen */}
                        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(160px, 1fr))", gap: 12, marginBottom: 16 }}>
                          {[
                            { label: "Total vendido", val: fmt(total), icon: "💰", color: "#10b981", bg: D ? "rgba(16,185,129,0.15)" : "#ecfdf5" },
                            { label: "N° ventas",     val: vt.length,  icon: "🧾", color: "#d71920", bg: D ? "rgba(59,91,219,0.15)"  : "#fff3bf" },
                            { label: "Efectivo",      val: fmt(ef),    icon: "💵", color: "#f59e0b", bg: D ? "rgba(245,158,11,0.15)" : "#fffbeb" },
                            { label: "Débito",        val: fmt(deb),   icon: "💳", color: "#f59e0b", bg: D ? "rgba(245,158,11,0.10)" : "#fffbeb" },
                            { label: "Crédito",       val: fmt(cred),  icon: "💳", color: "#e03131", bg: D ? "rgba(224,49,49,0.15)"  : "#fff1f2" },
                            { label: "Transferencia", val: fmt(tr),    icon: "🔁", color: "#8b5cf6", bg: D ? "rgba(139,92,246,0.15)" : "#f5f3ff" },
                            { label: "Apertura",      val: fmt(cajaData.montoApertura), icon: "🔓", color: textSecondary, bg: bgCard2 },
                          ].map(({ label, val, icon, color, bg }) => (
                            <div key={label} style={{ ...card, background: bg, border: "none" }}>
                              <p style={{ margin: "0 0 4px", fontSize: 20 }}>{icon}</p>
                              <p style={{ margin: "0 0 2px", fontSize: 17, fontWeight: 800, color }}>{val}</p>
                              <p style={{ margin: 0, fontSize: 12, color: textMuted }}>{label}</p>
                            </div>
                          ))}
                        </div>

                        {/* Últimas ventas del turno */}
                        {vt.length > 0 && (
                          <div style={card}>
                            <p style={{ margin: "0 0 14px", fontSize: 14, fontWeight: 700, color: textPrimary }}>Últimas ventas del turno</p>
                            {vt.slice(0, 8).map((v, i) => (
                              <div key={v.id} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "10px 0", borderBottom: i < Math.min(vt.length, 8) - 1 ? `1px solid ${borderColor}` : "none" }}>
                                <div>
                                  <p style={{ margin: 0, fontSize: 13, fontWeight: 600, color: textPrimary }}>{(v.items||[]).map(it => it.nombre).join(", ").slice(0, 40)}{(v.items||[]).reduce((s, it) => s + it.nombre.length, 0) > 40 ? "…" : ""}</p>
                                  <p style={{ margin: 0, fontSize: 11, color: textMuted }}>{v.pago} · {v.usuario} · {new Date(v.timestamp).toLocaleTimeString("es-CL", { hour: "2-digit", minute: "2-digit" })}</p>
                                </div>
                                <span style={{ fontSize: 14, fontWeight: 800, color: "#10b981" }} className="mono">{fmt(v.total)}</span>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    );
                  })()}
                </div>
              )}

              {/* Historial */}
              {cajaTab === "historial" && (
                <div>
                  {historialCaja.length > 0 && (
                    <div style={{ display: "flex", justifyContent: "flex-end", marginBottom: 12 }}>
                      <button onClick={() => {
                        if (!window.confirm(`¿Borrar todo el historial de caja? (${historialCaja.length} turnos)`)) return;
                        setHistorialCaja([]); saveHistorialCaja([]);
                      }} className="btn-danger" style={{ padding: "8px 16px", borderRadius: 10, fontSize: 12, fontWeight: 700, display: "flex", alignItems: "center", gap: 6, fontFamily: "inherit" }}>
                        <Trash2 size={13} /> Borrar historial
                      </button>
                    </div>
                  )}
                  {historialCaja.length === 0 ? (
                    <div style={{ ...card, textAlign: "center", padding: 48 }}>
                      <div style={{ fontSize: 40, marginBottom: 12 }}>📋</div>
                      <p style={{ color: textMuted, fontSize: 14 }}>Aún no hay turnos cerrados</p>
                    </div>
                  ) : historialCaja.map((h, i) => {
                    const apertura = new Date(h.apertura);
                    const cierre   = new Date(h.cierre);
                    const minutos  = Math.floor((cierre - apertura) / 60000);
                    const hh = Math.floor(minutos / 60);
                    const mm = minutos % 60;
                    return (
                      <div key={h.id} style={{ ...card, marginBottom: 12 }} className="card-hover">
                        <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: 12 }}>
                          <div>
                            <p style={{ margin: "0 0 2px", fontSize: 15, fontWeight: 800, color: textPrimary }}>
                              Turno #{historialCaja.length - i}
                            </p>
                            <p style={{ margin: 0, fontSize: 12, color: textMuted }}>
                              {apertura.toLocaleDateString("es-CL", { weekday: "long", day: "numeric", month: "long" })}
                            </p>
                          </div>
                          <span style={{ background: "#ecfdf5", color: "#059669", fontSize: 11, fontWeight: 700, padding: "4px 10px", borderRadius: 8 }}>✓ Cerrado</span>
                        </div>
                        <div className="grid-3-mobile-sm" style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 10, marginBottom: h.notas ? 12 : 0 }}>
                          {[
                            { label: "Apertura", val: apertura.toLocaleTimeString("es-CL", { hour: "2-digit", minute: "2-digit" }) },
                            { label: "Cierre", val: cierre.toLocaleTimeString("es-CL", { hour: "2-digit", minute: "2-digit" }) },
                            { label: "Duración", val: `${hh}h ${mm}m` },
                            { label: "Monto apertura", val: fmt(h.montoApertura) },
                            { label: "Total vendido", val: fmt(h.totalTurno || 0) },
                            { label: "Efectivo en caja", val: fmt(h.montoCierre || 0) },
                            { label: "Ventas", val: h.ventasTurno || 0 },
                            { label: "Efectivo", val: fmt(h.efectivoTurno || 0) },
                            { label: "Abierta por", val: h.abiertaPor },
                          ].map(({ label, val }) => (
                            <div key={label} style={{ background: bgCard2, borderRadius: 10, padding: "10px 12px" }}>
                              <p style={{ margin: "0 0 2px", fontSize: 11, color: textMuted }}>{label}</p>
                              <p style={{ margin: 0, fontSize: 13, fontWeight: 700, color: textPrimary }}>{val}</p>
                            </div>
                          ))}
                        </div>
                        {h.notas && (
                          <div style={{ background: D ? "rgba(245,158,11,0.1)" : "#fffbeb", border: `1px solid ${D ? "rgba(245,158,11,0.3)" : "#fde68a"}`, borderRadius: 8, padding: "8px 12px", fontSize: 12, color: D ? "#fbbf24" : "#92400e" }}>
                            📝 {h.notas}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {/* ── MERMAS ── */}
          {activeNav === "Mermas" && (
            <div>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 18 }}>
                <div>
                  <h2 style={{ margin: 0, fontSize: 18, fontWeight: 800, color: textPrimary }}>Registro de Mermas</h2>
                  <p style={{ margin: 0, fontSize: 13, color: textMuted }}>Productos dañados, vencidos o perdidos</p>
                </div>
                <button onClick={() => { setModalMerma(true); setFormMerma({ productoId: "", cantidad: "", motivo: "" }); setMermaError(""); }} className="btn-primary" style={{ display: "flex", alignItems: "center", gap: 7, padding: "9px 18px", borderRadius: 10, fontSize: 13 }}>
                  <Plus size={15} /> Registrar Merma
                </button>
              </div>
              {mermas.length === 0 ? (
                <div style={{ ...card, textAlign: "center", padding: 40 }}>
                  <div style={{ fontSize: 40, marginBottom: 12 }}>📦</div>
                  <p style={{ color: textMuted, fontSize: 14 }}>No hay mermas registradas</p>
                </div>
              ) : (
                <div style={card}>
                  {mermas.map((m, i) => (
                    <div key={m.id} style={{ display: "flex", alignItems: "center", gap: 14, padding: "12px 0", borderBottom: i < mermas.length - 1 ? `1px solid ${borderColor}` : "none" }}>
                      <div style={{ width: 40, height: 40, borderRadius: 12, background: "#fff1f2", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                        <TrendingDown size={18} color="#e03131" />
                      </div>
                      <div style={{ flex: 1 }}>
                        <p style={{ margin: 0, fontSize: 14, fontWeight: 700, color: textPrimary }}>{m.producto}</p>
                        <p style={{ margin: 0, fontSize: 12, color: textMuted }}>{m.motivo} · {m.fecha} · {m.usuario}</p>
                      </div>
                      <span style={{ fontSize: 13, fontWeight: 700, color: "#e03131", background: "#fff1f2", padding: "4px 10px", borderRadius: 8 }}>-{m.cantidad} u.</span>
                      <button onClick={() => { const nuevas = mermas.filter(x => x.id !== m.id); setMermas(nuevas); saveMermas(nuevas); }} style={{ background: "none", border: "none", cursor: "pointer", padding: 4, color: "#e03131", flexShrink: 0 }} title="Eliminar merma"><Trash2 size={15} /></button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* ── USUARIOS ── */}
          {activeNav === "Usuarios" && esGerente && (
            <div>
              <div style={{ ...card, background: D ? "linear-gradient(135deg, #13152a, #1a1d2e)" : "linear-gradient(135deg, #1a1a2e, #2d2d4e)", marginBottom: 18 }}>
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
                    <div style={{ width: 46, height: 46, borderRadius: 14, background: "rgba(215,25,32,0.28)", display: "flex", alignItems: "center", justifyContent: "center" }}>
                      <Shield size={22} color="#748ffc" />
                    </div>
                    <div>
                      <p style={{ margin: 0, fontSize: 16, fontWeight: 800, color: "#fff" }}>Panel de Administración</p>
                      <p style={{ margin: 0, fontSize: 12, color: "#6b7280" }}>Gestión de usuarios · v{APP_VERSION}</p>
                    </div>
                  </div>
                  <button onClick={() => { setModalNuevoUsuario(true); setFormNuevoUsuario({ nombre: "", usuario: "", correo: "", clave: "", rol: "empleado", empresa: currentUser?.empresa || "" }); setNuevoUsuarioError(""); }} className="btn-primary" style={{ display: "flex", alignItems: "center", gap: 7, padding: "10px 18px", borderRadius: 10, fontSize: 13 }}>
                    <UserPlus size={15} /> Nuevo Usuario
                  </button>
                </div>
              </div>

              {/* Agrupar por empresa */}
              {(() => {
                const empresas = [...new Set(usuarios.map(u => u.empresa || "Sin empresa"))].sort();
                return empresas.map(empresa => {
                  const grupoUsuarios = usuarios.filter(u => (u.empresa || "Sin empresa") === empresa);
                  return (
                    <div key={empresa} style={{ marginBottom: 24 }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 12 }}>
                        <Building2 size={16} color={D ? "#748ffc" : "#d71920"} />
                        <span style={{ fontSize: 13, fontWeight: 700, color: D ? "#748ffc" : "#d71920" }}>{empresa}</span>
                        <span style={{ fontSize: 11, padding: "2px 8px", borderRadius: 20, background: D ? "rgba(59,91,219,0.15)" : "#fff3bf", color: D ? "#748ffc" : "#d71920", fontWeight: 600 }}>{grupoUsuarios.length} usuario{grupoUsuarios.length !== 1 ? "s" : ""}</span>
                      </div>
                      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(320px, 1fr))", gap: 14 }}>
                        {loadingUsuarios ? <p style={{ color: textMuted, fontSize: 13 }}>Cargando...</p> : grupoUsuarios.map(u => (
                          <div key={u.usuario} style={{ ...card, opacity: u.blocked ? 0.8 : 1 }} className="card-hover">
                            <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 14 }}>
                              <div style={{ width: 46, height: 46, borderRadius: "50%", background: u.blocked ? (D ? "#2d3158" : "#f3f4f6") : u.rol === "gerente" ? "linear-gradient(135deg, #d71920, #ef2b32)" : "linear-gradient(135deg, #10b981, #34d399)", color: u.blocked ? textMuted : "#fff", display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 800, fontSize: 16 }}>
                                {u.nombre.split(" ").map(p => p[0]).join("").slice(0, 2).toUpperCase()}
                              </div>
                              <div style={{ flex: 1 }}>
                                <p style={{ margin: 0, fontSize: 15, fontWeight: 700, color: textPrimary }}>{u.nombre}</p>
                                <p style={{ margin: 0, fontSize: 12, color: textMuted }}>@{u.usuario}</p>
                              </div>
                              <span className="badge" style={{ background: u.rol === "gerente" ? (D ? "rgba(215,25,32,0.15)" : "#fff3bf") : (D ? "rgba(16,185,129,0.2)" : "#ecfdf5"), color: u.rol === "gerente" ? "#ef2b32" : "#059669" }}>
                                {u.rol === "gerente" ? "👑" : "👤"} {u.rol}
                              </span>
                            </div>
                            {u.correo && <p style={{ margin: "0 0 4px", fontSize: 12, color: textMuted }}>✉ {u.correo}</p>}
                            {u.blocked && <p style={{ margin: "0 0 10px", fontSize: 11, color: "#e03131", fontWeight: 700 }}>🔒 Bloqueado</p>}
                            <div style={{ display: "flex", gap: 8 }}>
                              <button onClick={() => handleEditarUsuario(u)} style={{ padding: "7px 12px", borderRadius: 9, border: `1px solid ${borderColor2}`, background: bgCard2, cursor: "pointer", fontSize: 12, color: textSecondary, fontFamily: "inherit", display: "flex", alignItems: "center", gap: 4 }}>
                                <Pencil size={12} /> Editar
                              </button>
                              {u.usuario !== currentUser.usuario && (
                                <>
                                  <button onClick={() => handleBloquearUsuario(u.usuario, !u.blocked)}
                                    style={{ padding: "7px 12px", borderRadius: 9, border: `1px solid ${u.blocked ? "#a7f3d0" : "#fecaca"}`, background: u.blocked ? "#ecfdf5" : "#fff1f2", cursor: "pointer", fontSize: 12, color: u.blocked ? "#059669" : "#e03131", fontFamily: "inherit" }}>
                                    {u.blocked ? "Desbloquear" : "Bloquear"}
                                  </button>
                                  <button onClick={() => handleEliminarUsuario(u.usuario)} className="btn-danger" style={{ padding: "7px 10px", borderRadius: 9, fontSize: 12, display: "flex", alignItems: "center" }}>
                                    <Trash2 size={13} />
                                  </button>
                                </>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  );
                });
              })()}
            </div>
          )}

          {/* ── CONFIGURACIÓN ── */}
          {activeNav === "Clientes" && (() => {
            const lista = clientes.filter(c => {
              const q = clienteBusqueda.toLowerCase();
              return !q || [c.nombre, c.telefono, c.correo, c.direccion].some(v => String(v || "").toLowerCase().includes(q));
            });
            const totalClientes = clientes.length;
            const totalComprasClientes = clientes.reduce((s,c) => s + Number(c.compras || 0), 0);
            const totalGastadoClientes = clientes.reduce((s,c) => s + Number(c.totalGastado || 0), 0);
            return (
              <div className="fade-in">
                <div className="page-header" style={{ display:"flex", alignItems:"center", justifyContent:"space-between", marginBottom:18 }}>
                  <div>
                    <h2 style={{ margin:0, color:textPrimary, fontSize:22 }}>Clientes frecuentes</h2>
                    <p style={{ margin:"5px 0 0", color:textMuted, fontSize:12 }}>Guarda contactos y lleva un resumen de sus compras sin alterar las boletas existentes.</p>
                  </div>
                </div>

                <div className="stats-grid" style={{ display:"grid", gridTemplateColumns:"repeat(3,1fr)", gap:14, marginBottom:16 }}>
                  {[
                    ["Clientes registrados", totalClientes, Users, "#d71920"],
                    ["Compras registradas", totalComprasClientes, ShoppingBag, "#8b5cf6"],
                    ["Total gastado", fmt(totalGastadoClientes), DollarSign, "#10b981"],
                  ].map(([label,value,Icon,color]) => <div key={label} style={card}><div style={{display:"flex",alignItems:"center",justifyContent:"space-between"}}><div><p style={{margin:0,color:textMuted,fontSize:12}}>{label}</p><p style={{margin:"7px 0 0",color:textPrimary,fontSize:22,fontWeight:800}}>{value}</p></div><div style={{width:42,height:42,borderRadius:12,background:`${color}22`,display:"flex",alignItems:"center",justifyContent:"center"}}><Icon size={19} color={color}/></div></div></div>)}
                </div>

                <div style={{ display:"grid", gridTemplateColumns:"minmax(280px,360px) 1fr", gap:16 }} className="config-layout">
                  <div style={card}>
                    <h3 style={{ margin:"0 0 14px", color:textPrimary, fontSize:15 }}>{clienteEditando ? "Editar cliente" : "Nuevo cliente"}</h3>
                    {[["Nombre de contacto","nombre"],["Razón social","razonSocial"],["RUT","rut"],["Giro","giro"],["Teléfono","telefono"],["Correo","correo"],["Dirección","direccion"],["Comuna","comuna"]].map(([l,k]) => <label key={k} style={{display:"block",marginBottom:11,fontSize:12,color:textSecondary,fontWeight:700}}>{l}<input value={clienteForm[k] || ""} onChange={e=>setClienteForm({...clienteForm,[k]:e.target.value})} style={{...inp,marginTop:6}} /></label>)}
                    <label style={{display:"flex",alignItems:"center",gap:9,marginBottom:13,fontSize:12,color:textSecondary,fontWeight:700}}><input type="checkbox" checked={!!clienteForm.solicitaFactura} onChange={e=>setClienteForm({...clienteForm,solicitaFactura:e.target.checked})}/> Cliente solicita factura habitualmente</label>
                    <label style={{display:"block",marginBottom:11,fontSize:12,color:textSecondary,fontWeight:700}}>Notas<textarea value={clienteForm.notas} onChange={e=>setClienteForm({...clienteForm,notas:e.target.value})} style={{...inp,marginTop:6,minHeight:76,resize:"vertical"}} /></label>
                    {clienteError && <p style={{margin:"0 0 10px",color:"#e03131",fontSize:12,fontWeight:700}}>{clienteError}</p>}
                    <div style={{display:"flex",gap:8}}>
                      {clienteEditando && <button onClick={()=>{setClienteEditando(null);setClienteForm(clienteVacio);}} style={{flex:1,padding:10,borderRadius:10,border:`1px solid ${borderColor2}`,background:bgCard2,color:textSecondary,cursor:"pointer",fontWeight:700}}>Cancelar</button>}
                      <button onClick={guardarCliente} className="btn-primary" style={{flex:1,padding:10,borderRadius:10}}>{clienteEditando ? "Guardar cambios" : "Agregar cliente"}</button>
                    </div>
                  </div>

                  <div style={card}>
                    <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",gap:12,marginBottom:14}}>
                      <h3 style={{margin:0,color:textPrimary,fontSize:15}}>Listado de clientes</h3>
                      <div style={{position:"relative",width:260,maxWidth:"100%"}}><Search size={14} color={textMuted} style={{position:"absolute",left:11,top:11}}/><input placeholder="Buscar cliente..." value={clienteBusqueda} onChange={e=>setClienteBusqueda(e.target.value)} style={{...inp,paddingLeft:34}}/></div>
                    </div>
                    {lista.length===0 ? <div style={{textAlign:"center",padding:34,color:textMuted}}><Users size={32} style={{marginBottom:8}}/><p style={{margin:0,fontSize:13}}>No hay clientes registrados.</p></div> : lista.map((c,i)=><div key={c.id} style={{display:"flex",alignItems:"center",gap:12,padding:"12px 0",borderBottom:i<lista.length-1?`1px solid ${borderColor}`:"none"}}>
                      <div style={{width:40,height:40,borderRadius:12,background:D?"rgba(59,91,219,.16)":"#eef2ff",display:"flex",alignItems:"center",justifyContent:"center",color:"#d71920",fontWeight:800}}>{(c.nombre||"?").slice(0,1).toUpperCase()}</div>
                      <div style={{flex:1,minWidth:0}}><p style={{margin:0,color:textPrimary,fontSize:13,fontWeight:800}}>{c.razonSocial || c.nombre} {c.solicitaFactura && <span style={{fontSize:10,color:"#d71920",background:"#fff1f2",padding:"2px 6px",borderRadius:6}}>FACTURA</span>}</p><p style={{margin:"3px 0 0",color:textMuted,fontSize:11,whiteSpace:"nowrap",overflow:"hidden",textOverflow:"ellipsis"}}>{[c.telefono,c.correo,c.direccion].filter(Boolean).join(" · ") || "Sin datos de contacto"}</p></div>
                      <div style={{textAlign:"right",marginRight:8}}><p style={{margin:0,color:"#10b981",fontSize:12,fontWeight:800}}>{fmt(c.totalGastado||0)}</p><p style={{margin:"2px 0 0",color:textMuted,fontSize:10}}>{c.compras||0} compras</p></div>
                      <button onClick={()=>editarCliente(c)} style={{width:32,height:32,borderRadius:8,border:`1px solid ${borderColor2}`,background:bgCard2,color:textSecondary,cursor:"pointer"}}><Pencil size={13}/></button>
                      <button onClick={()=>eliminarCliente(c.id)} className="btn-danger" style={{width:32,height:32,borderRadius:8,display:"flex",alignItems:"center",justifyContent:"center"}}><Trash2 size={13}/></button>
                    </div>)}
                  </div>
                </div>
              </div>
            );
          })()}

          {activeNav === "Proveedores" && (
            <div className="fade-in empty-state">
              <div style={{ width: 56, height: 56, borderRadius: 16, background: D ? "rgba(79,174,147,0.15)" : "#e4f0ec", display: "flex", alignItems: "center", justifyContent: "center", marginBottom: 16 }}>
                <Building2 size={26} color={D ? "#ffc400" : "#d71920"} strokeWidth={1.8} />
              </div>
              <h3 style={{ margin: "0 0 6px", color: textPrimary, fontSize: 16, fontWeight: 700 }}>Proveedores</h3>
              <p style={{ margin: 0, color: textMuted, fontSize: 13, maxWidth: 320 }}>Este módulo está en construcción. Acá vas a poder registrar tus proveedores y llevar el historial de compras por cada uno.</p>
            </div>
          )}

          {activeNav === "Gastos" && (
            <GastosModule
              currentUser={currentUser}
              products={products}
              categoriasProductos={categorias}
              setProducts={setProducts}
              darkMode={D}
            />
          )}

          {activeNav === "Configuración" && (
            <div className="config-layout" style={{ display: "grid", gridTemplateColumns: "240px 1fr", gap: 20, alignItems: "start" }}>
              <div style={card}>
                <div className="config-nav" style={{ display: "flex", flexDirection: "column" }}>
                  <div style={{ position: "relative", marginBottom: 14 }}>
                    <Search size={14} color={textMuted} style={{ position: "absolute", left: 10, top: "50%", transform: "translateY(-50%)" }} />
                    <input value={configSearch} onChange={e => setConfigSearch(e.target.value)} placeholder="Buscar..." style={{ ...inp, paddingLeft: 32, fontSize: 13 }} />
                  </div>
                  {configSectionsFiltered.map(s => {
                    const Icon = s.icon;
                    if (s.soloGerente && !esGerente) return null;
                    return (
                      <button key={s.id} onClick={() => setConfigTab(s.id)} className={`config-nav-item ${configTab === s.id ? "active" : ""}`}>
                        <Icon size={16} strokeWidth={1.8} />
                        <span>{s.label}</span>
                        {configTab === s.id && <ChevronRight size={14} style={{ marginLeft: "auto" }} />}
                      </button>
                    );
                  })}
                </div>
              </div>

              <div className="fade-in">

                {/* General */}
                {configTab === "general" && (
                  <div style={card}>
                    <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 22, paddingBottom: 16, borderBottom: `1px solid ${borderColor}` }}>
                      <div style={{ width: 40, height: 40, borderRadius: 12, background: D ? "rgba(215,25,32,0.15)" : "#fff3bf", display: "flex", alignItems: "center", justifyContent: "center" }}><Store size={18} color="#d71920" /></div>
                      <div>
                        <h3 style={{ margin: 0, fontSize: 16, fontWeight: 700, color: textPrimary }}>Datos del Negocio</h3>
                        <p style={{ margin: 0, fontSize: 12, color: textMuted }}>Información general de tu empresa</p>
                      </div>
                    </div>
                    {[
                      { label: "Nombre del negocio", key: "negocio", placeholder: "Mi Negocio" },
                      { label: "RUT del negocio", key: "rut", placeholder: "12.345.678-9" },
                      { label: "Dirección", key: "direccion", placeholder: "Calle 123, Ciudad" },
                      { label: "Teléfono", key: "telefono", placeholder: "+56 9 1234 5678" },
                    ].map(({ label, key, placeholder }) => (
                      <div key={key} style={{ marginBottom: 16 }}>
                        <label style={{ fontSize: 12, fontWeight: 700, color: D ? "#9ca3af" : "#374151", display: "block", marginBottom: 6 }}>{label}</label>
                        <input value={config[key] || ""} onChange={e => guardarConfig({ ...config, [key]: e.target.value })} placeholder={placeholder} style={inp} />
                      </div>
                    ))}

                    {/* ── Renombrar Empresa ── */}
                    {esGerente && currentUser?.empresa && (
                      <RenombrarEmpresa
                        empresaActual={currentUser.empresa}
                        products={products}
                        currentUser={currentUser}
                        setCurrentUser={setCurrentUser}
                        setProducts={setProducts}
                        darkMode={D}
                        inp={inp}
                        card={card}
                        borderColor={borderColor}
                        textPrimary={textPrimary}
                        textMuted={textMuted}
                      />
                    )}

                    {/* Logo del negocio */}
                    <div style={{ marginBottom: 16 }}>
                      <label style={{ fontSize: 12, fontWeight: 700, color: D ? "#9ca3af" : "#374151", display: "block", marginBottom: 8 }}>Logo del negocio</label>
                      <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
                        <div style={{ width: 64, height: 64, borderRadius: 14, background: D ? "#252840" : "#f0f2ff", border: `2px dashed ${borderColor2}`, display: "flex", alignItems: "center", justifyContent: "center", overflow: "hidden", flexShrink: 0 }}>
                          {config.logoNegocio
                            ? <img src={config.logoNegocio} alt="logo" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                            : <Store size={24} color={D ? "#ef2b32" : "#d71920"} />}
                        </div>
                        <div style={{ flex: 1 }}>
                          <label style={{ display: "inline-block", padding: "9px 16px", borderRadius: 10, background: D ? "#252840" : "#f0f2ff", border: `1.5px solid ${borderColor2}`, cursor: "pointer", fontSize: 13, color: "#d71920", fontWeight: 600, fontFamily: "inherit" }}>
                            📷 Subir imagen
                            <input type="file" accept="image/*" style={{ display: "none" }} onChange={e => {
                              const file = e.target.files[0];
                              if (!file) return;
                              const reader = new FileReader();
                              reader.onload = ev => guardarConfig({ ...config, logoNegocio: ev.target.result });
                              reader.readAsDataURL(file);
                            }} />
                          </label>
                          {config.logoNegocio && (
                            <button onClick={() => guardarConfig({ ...config, logoNegocio: "" })} style={{ marginLeft: 8, background: "none", border: "none", cursor: "pointer", fontSize: 12, color: "#e03131", fontFamily: "inherit", fontWeight: 600 }}>✕ Quitar</button>
                          )}
                          <p style={{ margin: "6px 0 0", fontSize: 11, color: textMuted }}>PNG, JPG o SVG. Se muestra en el sidebar y la boleta.</p>
                        </div>
                      </div>
                    </div>
                    <div style={{ marginTop: 4, padding: "12px 16px", background: D ? "rgba(59,91,219,0.1)" : "#f0f2ff", borderRadius: 10, fontSize: 13, color: "#d71920" }}>
                      ✓ Los cambios se guardan automáticamente
                    </div>
                  </div>
                )}

                {/* Métodos de Pago */}
                {configTab === "pagos" && (
                  <div style={card}>
                    <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 22, paddingBottom: 16, borderBottom: `1px solid ${borderColor}` }}>
                      <div style={{ width: 40, height: 40, borderRadius: 12, background: D ? "rgba(16,185,129,0.2)" : "#ecfdf5", display: "flex", alignItems: "center", justifyContent: "center" }}><CreditCard size={18} color="#10b981" /></div>
                      <div>
                        <h3 style={{ margin: 0, fontSize: 16, fontWeight: 700, color: textPrimary }}>Métodos de Pago</h3>
                        <p style={{ margin: 0, fontSize: 12, color: textMuted }}>Formas de cobro disponibles en el punto de venta</p>
                      </div>
                    </div>
                    {[
                      { val: "Efectivo", icon: "💵", color: "#10b981", desc: "Pago en efectivo con vuelto automático" },
                      { val: "Débito", icon: "💳", color: "#f59e0b", desc: "Tarjeta de débito" },
                      { val: "Crédito", icon: "💳", color: "#e03131", desc: "Tarjeta de crédito" },
                      { val: "Transferencia", icon: "🔁", color: "#8b5cf6", desc: "Transferencia bancaria" },
                    ].map(({ val, icon, color, desc }) => (
                      <div key={val} style={{ display: "flex", alignItems: "center", gap: 14, padding: "14px 16px", background: D ? "#1e2235" : "#f9fafb", borderRadius: 12, marginBottom: 10, border: `1.5px solid ${borderColor2}` }}>
                        <span style={{ fontSize: 22 }}>{icon}</span>
                        <div style={{ flex: 1 }}>
                          <p style={{ margin: 0, fontSize: 14, fontWeight: 700, color: textPrimary }}>{val}</p>
                          <p style={{ margin: 0, fontSize: 12, color: textMuted }}>{desc}</p>
                        </div>
                        <span style={{ fontSize: 11, fontWeight: 700, padding: "3px 10px", borderRadius: 20, background: D ? `${color}22` : `${color}18`, color }}> ✓ Activo</span>
                      </div>
                    ))}
                    <div style={{ marginTop: 4, padding: "12px 16px", background: D ? "rgba(59,91,219,0.1)" : "#f0f2ff", borderRadius: 10, fontSize: 13, color: "#d71920" }}>
                      ✓ Los métodos de pago están siempre disponibles en el punto de venta
                    </div>
                  </div>
                )}

                {/* SII */}
                {/* Notificaciones */}
                {configTab === "notificaciones" && (
                  <div style={card}>
                    <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 22, paddingBottom: 16, borderBottom: `1px solid ${borderColor}` }}>
                      <div style={{ width: 40, height: 40, borderRadius: 12, background: D ? "rgba(16,185,129,0.2)" : "#ecfdf5", display: "flex", alignItems: "center", justifyContent: "center" }}><Bell size={18} color="#10b981" /></div>
                      <div>
                        <h3 style={{ margin: 0, fontSize: 16, fontWeight: 700, color: textPrimary }}>Notificaciones</h3>
                        <p style={{ margin: 0, fontSize: 12, color: textMuted }}>Configura qué alertas recibir</p>
                      </div>
                    </div>
                    {[
                      { label: "Alertas de stock bajo", key: "notifStockBajo", desc: "Notificar cuando un producto tenga stock bajo" },
                      { label: "Alertas de ventas", key: "notifVentas", desc: "Notificar al registrar cada venta" },
                    ].map(({ label, key, desc }) => (
                      <div key={key} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "16px 0", borderBottom: `1px solid ${borderColor}` }}>
                        <div>
                          <p style={{ margin: 0, fontSize: 14, fontWeight: 600, color: textPrimary }}>{label}</p>
                          <p style={{ margin: 0, fontSize: 12, color: textMuted }}>{desc}</p>
                        </div>
                        <button onClick={() => guardarConfig({ ...config, [key]: !config[key] })} className="toggle-switch" style={{ background: config[key] ? "#d71920" : "#d1d5db" }}>
                          <div className="toggle-thumb" style={{ left: config[key] ? 23 : 3 }} />
                        </button>
                      </div>
                    ))}
                    <div style={{ marginTop: 20 }}>
                      <label style={{ fontSize: 12, fontWeight: 700, color: D ? "#9ca3af" : "#374151", display: "block", marginBottom: 8 }}>Stock mínimo para alertas</label>
                      <input type="number" min="1" value={config.stockMinimo} onChange={e => guardarConfig({ ...config, stockMinimo: +e.target.value })} style={{ ...inp, width: 120 }} />
                    </div>
                  </div>
                )}

                {/* Preferencias */}
                {configTab === "preferencias" && (
                  <div style={card}>
                    <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 22, paddingBottom: 16, borderBottom: `1px solid ${borderColor}` }}>
                      <div style={{ width: 40, height: 40, borderRadius: 12, background: D ? "rgba(139,92,246,0.2)" : "#f5f3ff", display: "flex", alignItems: "center", justifyContent: "center" }}><Sliders size={18} color="#8b5cf6" /></div>
                      <div>
                        <h3 style={{ margin: 0, fontSize: 16, fontWeight: 700, color: textPrimary }}>Preferencias</h3>
                        <p style={{ margin: 0, fontSize: 12, color: textMuted }}>Personalización de la interfaz</p>
                      </div>
                    </div>

                    {/* Dark mode */}
                    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "18px 20px", background: D ? "#252840" : "#f9fafb", borderRadius: 14, marginBottom: 20, border: `1px solid ${borderColor}` }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
                        <div style={{ width: 44, height: 44, borderRadius: 12, background: D ? "#1a1d2e" : "#1a1a2e", display: "flex", alignItems: "center", justifyContent: "center" }}>
                          {D ? <Moon size={20} color="#748ffc" /> : <Moon size={20} color="#e8eaf6" />}
                        </div>
                        <div>
                          <p style={{ margin: 0, fontSize: 15, fontWeight: 700, color: textPrimary }}>Modo Oscuro</p>
                          <p style={{ margin: 0, fontSize: 12, color: textMuted }}>Cambia la apariencia a tema oscuro</p>
                        </div>
                      </div>
                      <button onClick={toggleDark} className="toggle-switch" style={{ background: D ? "#d71920" : "#d1d5db", flexShrink: 0 }}>
                        <div className="toggle-thumb" style={{ left: D ? 23 : 3 }} />
                      </button>
                    </div>

                    <div style={{ padding: "16px", background: D ? "#252840" : "#f0f2ff", borderRadius: 12, display: "flex", alignItems: "center", gap: 12 }}>
                      {D ? <Moon size={18} color="#748ffc" /> : <Sun size={18} color="#f59e0b" />}
                      <p style={{ margin: 0, fontSize: 13, color: D ? "#748ffc" : "#d71920", fontWeight: 600 }}>
                        Actualmente usando el tema {D ? "oscuro 🌙" : "claro ☀️"} — los cambios se aplican inmediatamente.
                      </p>
                    </div>

                    {/* Reset */}
                    <div style={{ marginTop: 24, paddingTop: 24, borderTop: `2px solid ${D ? "#2d3158" : "#fee2e2"}` }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 14 }}>
                        <div style={{ width: 40, height: 40, borderRadius: 12, background: "#fff1f2", display: "flex", alignItems: "center", justifyContent: "center" }}>
                          <RefreshCw size={18} color="#e03131" />
                        </div>
                        <div>
                          <h3 style={{ margin: 0, fontSize: 15, fontWeight: 700, color: "#e03131" }}>Restablecer Ajustes</h3>
                          <p style={{ margin: 0, fontSize: 12, color: textMuted }}>Elimina todo y deja el sistema como instalación limpia</p>
                        </div>
                      </div>
                      <div style={{ background: "#fff1f2", border: "1.5px solid #fecaca", borderRadius: 10, padding: "12px 16px", marginBottom: 14, fontSize: 12, color: "#dc2626" }}>
                        ⚠️ Esta acción borrará permanentemente: todas las ventas, recibos, historial de pagos, configuración del negocio, usuarios guardados localmente y desactivará el modo oscuro.
                      </div>
                      <button onClick={() => setShowResetModal(true)}
                        style={{ width: "100%", padding: "13px", borderRadius: 12, border: "none", background: "linear-gradient(135deg, #e03131, #f03e3e)", cursor: "pointer", fontSize: 14, fontWeight: 700, color: "#fff", fontFamily: "inherit", display: "flex", alignItems: "center", justifyContent: "center", gap: 8, transition: "all 0.15s" }}>
                        <RefreshCw size={16} /> Restablecer Todo el Sistema
                      </button>
                    </div>
                  </div>
                )}

                {/* Respaldo */}
                {configTab === "respaldo" && (
                  <div style={card}>
                    <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 22, paddingBottom: 16, borderBottom: `1px solid ${borderColor}` }}>
                      <div style={{ width: 40, height: 40, borderRadius: 12, background: D ? "rgba(16,185,129,0.2)" : "#ecfdf5", display: "flex", alignItems: "center", justifyContent: "center" }}><Download size={18} color="#10b981" /></div>
                      <div>
                        <h3 style={{ margin: 0, fontSize: 16, fontWeight: 700, color: textPrimary }}>Respaldo de Datos</h3>
                        <p style={{ margin: 0, fontSize: 12, color: textMuted }}>Exporta todo tu sistema como archivo JSON</p>
                      </div>
                    </div>
                    <p style={{ margin: "0 0 18px", fontSize: 13, color: textSecondary, lineHeight: 1.6 }}>
                      Genera un archivo de respaldo con todos tus datos: productos, ventas, recibos, mermas y configuración. Úsalo para restaurar tu sistema si cambias de dispositivo o se pierde el almacenamiento.
                    </p>
                    <div style={{ background: D ? "rgba(16,185,129,0.1)" : "#ecfdf5", border: `1.5px solid ${D ? "#10b98140" : "#a7f3d0"}`, borderRadius: 10, padding: "12px 16px", marginBottom: 20, fontSize: 12, color: "#059669" }}>
                      ✅ Se incluye: productos, categorías, ventas, recibos, mermas, configuración del negocio
                    </div>
                    <button onClick={() => {
                      const backup = {
                        version: APP_VERSION,
                        fecha: new Date().toISOString(),
                        negocio: config.negocio,
                        productos: products,
                        categorias: categorias,
                        ventas: getSales(),
                        boletas: getBoletas(),
                        mermas: getMermas(),
                        clientes: getClientes(),
                        config: getConfig(),
                      };
                      const blob = new Blob([JSON.stringify(backup, null, 2)], { type: "application/json" });
                      const url = URL.createObjectURL(blob);
                      const a = document.createElement("a");
                      a.href = url;
                      a.download = `respaldo-${config.negocio || "inventario"}-${new Date().toLocaleDateString("es-CL").replace(/\//g, "-")}.json`;
                      a.click();
                      URL.revokeObjectURL(url);
                    }} style={{ width: "100%", padding: "13px", borderRadius: 12, border: "none", background: "linear-gradient(135deg, #10b981, #059669)", cursor: "pointer", fontSize: 14, fontWeight: 700, color: "#fff", fontFamily: "inherit", display: "flex", alignItems: "center", justifyContent: "center", gap: 8 }}>
                      <Download size={16} /> Descargar Respaldo JSON
                    </button>
                  </div>
                )}

                {/* Cuenta */}
                {configTab === "cuenta" && (
                  <div style={card}>
                    <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 22, paddingBottom: 16, borderBottom: `1px solid ${borderColor}` }}>
                      <div style={{ width: 40, height: 40, borderRadius: 12, background: D ? "rgba(215,25,32,0.15)" : "#f0f2ff", display: "flex", alignItems: "center", justifyContent: "center" }}><Lock size={18} color="#d71920" /></div>
                      <div>
                        <h3 style={{ margin: 0, fontSize: 16, fontWeight: 700, color: textPrimary }}>Mi Cuenta</h3>
                        <p style={{ margin: 0, fontSize: 12, color: textMuted }}>Información de tu perfil</p>
                      </div>
                    </div>
                    <div style={{ display: "flex", alignItems: "center", gap: 16, padding: "18px", background: D ? "linear-gradient(135deg, #252840, #1e2235)" : "linear-gradient(135deg, #f0f2ff, #fff3bf)", borderRadius: 14, marginBottom: 20 }}>
                      <div style={{ width: 56, height: 56, borderRadius: "50%", background: esGerente ? "linear-gradient(135deg, #d71920, #ef2b32)" : "linear-gradient(135deg, #10b981, #34d399)", color: "#fff", display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 800, fontSize: 20 }}>
                        {iniciales}
                      </div>
                      <div>
                        <p style={{ margin: 0, fontSize: 18, fontWeight: 800, color: textPrimary }}>{currentUser.nombre}</p>
                        <p style={{ margin: 0, fontSize: 13, color: textMuted }}>@{currentUser.usuario}</p>
                        {currentUser.correo && <p style={{ margin: "2px 0 0", fontSize: 12, color: textMuted }}>{currentUser.correo}</p>}
                        <span className="badge" style={{ marginTop: 6, background: esProgramador ? "rgba(124,58,237,0.2)" : esGerente ? (D ? "rgba(215,25,32,0.15)" : "#fff3bf") : (D ? "rgba(16,185,129,0.2)" : "#ecfdf5"), color: esProgramador ? "#a78bfa" : esGerente ? "#ef2b32" : "#059669" }}>
                          {esProgramador ? "🛠️ Programador" : esGerente ? "👑 Gerente" : "👤 Empleado"}
                        </span>
                      </div>
                    </div>
                    <div style={{ display: "flex", gap: 10, marginBottom: 20 }}>
                      <button onClick={() => { setPinInput(""); setPinError(""); setShowPinLock(true); }} disabled={!getPinGuardado()}
                        style={{ flex: 1, padding: "11px", borderRadius: 12, border: `1.5px solid ${borderColor2}`, background: bgCard2, cursor: getPinGuardado() ? "pointer" : "not-allowed", fontSize: 13, color: getPinGuardado() ? "#f59e0b" : textMuted, fontWeight: 700, display: "flex", alignItems: "center", justifyContent: "center", gap: 7, fontFamily: "inherit", opacity: getPinGuardado() ? 1 : 0.5 }}>
                        🔒 Bloquear pantalla
                      </button>
                      <button onClick={() => setCurrentUser(null)}
                        style={{ flex: 1, padding: "11px", borderRadius: 12, border: "1.5px solid #fee2e2", background: "#fff1f2", cursor: "pointer", fontSize: 13, color: "#e03131", fontWeight: 700, display: "flex", alignItems: "center", justifyContent: "center", gap: 7, fontFamily: "inherit" }}>
                        <LogOut size={14} /> Cerrar sesión
                      </button>
                    </div>
                    {/* Configurar PIN */}
                    <div style={{ background: D ? "#1e2235" : "#f8f9ff", borderRadius: 12, padding: "16px", border: `1.5px solid ${borderColor2}` }}>
                      <p style={{ margin: "0 0 12px", fontSize: 13, fontWeight: 700, color: textPrimary }}>🔢 PIN de bloqueo rápido</p>
                      <p style={{ margin: "0 0 12px", fontSize: 12, color: textMuted }}>Configura un PIN de 4 dígitos para bloquear y desbloquear la pantalla sin cerrar sesión.</p>
                      <div style={{ display: "flex", gap: 8, marginBottom: 8 }}>
                        <input type="password" maxLength={4} inputMode="numeric" value={pinNuevo} onChange={e => setPinNuevo(e.target.value.replace(/\D/g,"").slice(0,4))} placeholder="Nuevo PIN (4 dígitos)" style={{ ...inp, flex: 1 }} />
                        <input type="password" maxLength={4} inputMode="numeric" value={pinConfirm} onChange={e => setPinConfirm(e.target.value.replace(/\D/g,"").slice(0,4))} placeholder="Confirmar PIN" style={{ ...inp, flex: 1 }} />
                      </div>
                      {pinMsg && <p style={{ margin: "0 0 8px", fontSize: 12, color: pinMsg.startsWith("✅") ? "#059669" : "#e03131", fontWeight: 600 }}>{pinMsg}</p>}
                      <button onClick={() => {
                        if (pinNuevo.length !== 4) { setPinMsg("El PIN debe tener 4 dígitos."); return; }
                        if (pinNuevo !== pinConfirm) { setPinMsg("Los PINs no coinciden."); return; }
                        localStorage.setItem("inv_pin", pinNuevo);
                        setPinNuevo(""); setPinConfirm(""); setPinMsg("✅ PIN guardado correctamente.");
                        setTimeout(() => setPinMsg(""), 3000);
                      }} className="btn-primary" style={{ width: "100%", padding: "10px", borderRadius: 10, fontSize: 13 }}>
                        Guardar PIN
                      </button>
                      {getPinGuardado() && (
                        <button onClick={() => { localStorage.removeItem("inv_pin"); setPinMsg("PIN eliminado."); setTimeout(() => setPinMsg(""), 2000); }} style={{ width: "100%", marginTop: 8, padding: "9px", borderRadius: 10, border: `1.5px solid ${borderColor2}`, background: "none", cursor: "pointer", fontSize: 12, color: textMuted, fontFamily: "inherit" }}>
                          Eliminar PIN
                        </button>
                      )}
                    </div>
                  </div>
                )}

                {/* Seguridad */}
                {configTab === "seguridad" && esGerente && (
                  <div style={card}>
                    <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 22, paddingBottom: 16, borderBottom: `1px solid ${borderColor}` }}>
                      <div style={{ width: 40, height: 40, borderRadius: 12, background: D ? "rgba(215,25,32,0.15)" : "#fff3bf", display: "flex", alignItems: "center", justifyContent: "center" }}><Shield size={18} color="#d71920" /></div>
                      <div>
                        <h3 style={{ margin: 0, fontSize: 16, fontWeight: 700, color: textPrimary }}>Seguridad y Roles</h3>
                        <p style={{ margin: 0, fontSize: 12, color: textMuted }}>Solo visible para gerentes</p>
                      </div>
                    </div>
                    {[
                      { rol: "Gerente", permisos: ["Crear/editar/eliminar usuarios", "Configuración completa", "Panel de administración", "Exportar reportes"], color: "#d71920", bg: D ? "rgba(59,91,219,0.15)" : "#fff3bf" },
                      { rol: "Empleado", permisos: ["Ver productos e inventario", "Registrar ventas", "Ver estadísticas básicas", "Generar boletas"], color: "#10b981", bg: D ? "rgba(16,185,129,0.15)" : "#ecfdf5" },
                    ].map(({ rol, permisos, color, bg }) => (
                      <div key={rol} style={{ padding: "14px", background: bg, borderRadius: 10, marginBottom: 10 }}>
                        <p style={{ margin: "0 0 8px", fontSize: 14, fontWeight: 700, color }}>{rol}</p>
                        {permisos.map(p => <p key={p} style={{ margin: "0 0 4px", fontSize: 12, color: textSecondary }}>✓ {p}</p>)}
                      </div>
                    ))}
                  </div>
                )}

                {/* Mantenimiento de Stock — corrige ventas viejas que no descontaron stock */}
                {configTab === "seguridad" && esGerente && (
                  <div style={{ ...card, marginTop: 16 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 16, paddingBottom: 16, borderBottom: `1px solid ${borderColor}` }}>
                      <div style={{ width: 40, height: 40, borderRadius: 12, background: D ? "rgba(245,158,11,0.15)" : "#fffbeb", display: "flex", alignItems: "center", justifyContent: "center" }}><RefreshCw size={18} color="#f59e0b" /></div>
                      <div>
                        <h3 style={{ margin: 0, fontSize: 16, fontWeight: 700, color: textPrimary }}>Mantenimiento de Stock</h3>
                        <p style={{ margin: 0, fontSize: 12, color: textMuted }}>Corrige ventas que no descontaron el stock a tiempo</p>
                      </div>
                    </div>
                    <p style={{ margin: "0 0 16px", fontSize: 13, color: textSecondary, lineHeight: 1.6 }}>
                      Revisa el historial de ventas y descuenta el stock de las que quedaron pendientes (por ejemplo, ventas hechas antes de una actualización del sistema). Las ventas que ya tienen su stock aplicado no se tocan, así que es seguro usar este botón más de una vez.
                    </p>
                    <button onClick={handleReconciliarStock} disabled={reconciliando} className="btn-primary" style={{ padding: "11px 18px", borderRadius: 10, fontSize: 13, fontWeight: 700, display: "flex", alignItems: "center", gap: 8, opacity: reconciliando ? 0.7 : 1 }}>
                      <RefreshCw size={14} /> {reconciliando ? "Corrigiendo stock…" : "Corregir stock pendiente"}
                    </button>

                    {resultReconciliacion && (
                      <div style={{ marginTop: 18, padding: "14px", background: bgCard2, borderRadius: 10, border: `1px solid ${borderColor2}` }}>
                        <p style={{ margin: "0 0 10px", fontSize: 13, fontWeight: 700, color: textPrimary }}>
                          ✓ {resultReconciliacion.ventasProcesadas} venta{resultReconciliacion.ventasProcesadas !== 1 ? "s" : ""} revisada{resultReconciliacion.ventasProcesadas !== 1 ? "s" : ""}
                        </p>
                        {Object.keys(resultReconciliacion.resumenPorProducto || {}).length > 0 ? (
                          <div style={{ marginBottom: resultReconciliacion.noAplicados?.length ? 12 : 0 }}>
                            {Object.entries(resultReconciliacion.resumenPorProducto).map(([id, info]) => (
                              <p key={id} style={{ margin: "0 0 4px", fontSize: 12, color: textSecondary }}>
                                📦 {info.nombre}: se descontaron <strong>{info.unidadesDescontadas}</strong> unidades
                              </p>
                            ))}
                          </div>
                        ) : (
                          <p style={{ margin: 0, fontSize: 12, color: textMuted }}>No había stock pendiente por corregir.</p>
                        )}
                        {resultReconciliacion.noAplicados?.length > 0 && (
                          <div style={{ marginTop: 8, padding: "10px 12px", background: "#fff1f2", borderRadius: 8 }}>
                            <p style={{ margin: "0 0 6px", fontSize: 12, fontWeight: 700, color: "#e03131" }}>⚠ {resultReconciliacion.noAplicados.length} ítem{resultReconciliacion.noAplicados.length !== 1 ? "s" : ""} no se pudo{resultReconciliacion.noAplicados.length !== 1 ? "ieron" : ""} corregir automáticamente:</p>
                            {resultReconciliacion.noAplicados.map((n, i) => (
                              <p key={i} style={{ margin: "0 0 3px", fontSize: 11, color: "#dc2626" }}>{n.nombre} — {n.motivo}</p>
                            ))}
                            <p style={{ margin: "6px 0 0", fontSize: 11, color: "#dc2626" }}>Probablemente el producto fue eliminado. Revísalo manualmente si es necesario.</p>
                          </div>
                        )}
                      </div>
                    )}

                    {/* Revertir reconciliación — devuelve el stock restado de más */}
                    <div style={{ marginTop: 20, paddingTop: 16, borderTop: `1px solid ${borderColor}` }}>
                      <p style={{ margin: "0 0 4px", fontSize: 13, fontWeight: 700, color: "#e03131" }}>Revertir reconciliación duplicada</p>
                      <p style={{ margin: "0 0 12px", fontSize: 12, color: textSecondary, lineHeight: 1.6 }}>
                        Si el botón de arriba se corrió antes de que el sistema marcara las ventas como "stock aplicado", pudo restar el stock dos veces a boletas que ya estaban bien. Este botón devuelve exactamente esas unidades. Es seguro usarlo más de una vez.
                      </p>
                      <button onClick={handleRevertirReconciliacion} disabled={revirtiendo} className="btn-danger" style={{ padding: "11px 18px", borderRadius: 10, fontSize: 13, fontWeight: 700, display: "flex", alignItems: "center", gap: 8, opacity: revirtiendo ? 0.7 : 1 }}>
                        <RefreshCw size={14} /> {revirtiendo ? "Revirtiendo…" : "Revertir descuento duplicado"}
                      </button>

                      {resultReversion && (
                        <div style={{ marginTop: 18, padding: "14px", background: bgCard2, borderRadius: 10, border: `1px solid ${borderColor2}` }}>
                          <p style={{ margin: "0 0 10px", fontSize: 13, fontWeight: 700, color: textPrimary }}>
                            ✓ {resultReversion.boletasProcesadas} boleta{resultReversion.boletasProcesadas !== 1 ? "s" : ""} revertida{resultReversion.boletasProcesadas !== 1 ? "s" : ""}
                          </p>
                          {Object.keys(resultReversion.resumenPorProducto || {}).length > 0 ? (
                            <div style={{ marginBottom: resultReversion.noAplicados?.length ? 12 : 0 }}>
                              {Object.entries(resultReversion.resumenPorProducto).map(([id, info]) => (
                                <p key={id} style={{ margin: "0 0 4px", fontSize: 12, color: textSecondary }}>
                                  📦 {info.nombre}: se devolvieron <strong>{info.unidadesDevueltas}</strong> unidades
                                </p>
                              ))}
                            </div>
                          ) : (
                            <p style={{ margin: 0, fontSize: 12, color: textMuted }}>No había boletas pendientes por revertir.</p>
                          )}
                          {resultReversion.noAplicados?.length > 0 && (
                            <div style={{ marginTop: 8, padding: "10px 12px", background: "#fff1f2", borderRadius: 8 }}>
                              <p style={{ margin: "0 0 6px", fontSize: 12, fontWeight: 700, color: "#e03131" }}>⚠ {resultReversion.noAplicados.length} ítem{resultReversion.noAplicados.length !== 1 ? "s" : ""} no se pudo{resultReversion.noAplicados.length !== 1 ? "ieron" : ""} devolver automáticamente:</p>
                              {resultReversion.noAplicados.map((n, i) => (
                                <p key={i} style={{ margin: "0 0 3px", fontSize: 11, color: "#dc2626" }}>{n.nombre} — {n.motivo}</p>
                              ))}
                              <p style={{ margin: "6px 0 0", fontSize: 11, color: "#dc2626" }}>Probablemente el producto fue eliminado. Revísalo manualmente si es necesario.</p>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {/* Gestión de Usuarios en Config */}
                {configTab === "usuarios" && esGerente && (
                  <div style={card}>
                    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 22, paddingBottom: 16, borderBottom: `1px solid ${borderColor}` }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                        <div style={{ width: 40, height: 40, borderRadius: 12, background: D ? "rgba(139,92,246,0.2)" : "#f5f3ff", display: "flex", alignItems: "center", justifyContent: "center" }}><Users size={18} color="#8b5cf6" /></div>
                        <div>
                          <h3 style={{ margin: 0, fontSize: 16, fontWeight: 700, color: textPrimary }}>Gestión de Usuarios</h3>
                          <p style={{ margin: 0, fontSize: 12, color: textMuted }}>{usuarios.length} usuarios registrados</p>
                        </div>
                      </div>
                      <button onClick={() => setActiveNav("Usuarios")} style={{ padding: "8px 16px", borderRadius: 10, border: `1.5px solid ${borderColor2}`, background: bgCard2, cursor: "pointer", fontSize: 13, color: textSecondary, fontFamily: "inherit", display: "flex", alignItems: "center", gap: 6 }}>
                        <Users size={14} /> Ir a Usuarios
                      </button>
                    </div>
                    <p style={{ color: textMuted, fontSize: 13 }}>Ve a la sección "Usuarios" en el menú lateral para gestionar cuentas.</p>
                  </div>
                )}
              </div>
            </div>
          )}
        </main>
      </div>

      {/* ── Modal Producto ── */}
      {modal && (
        <div className="product-modal-overlay" style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.6)", display: "flex", alignItems: "flex-end", justifyContent: "center", zIndex: 10000, backdropFilter: "blur(4px)" }}
          onClick={e => { if (e.target === e.currentTarget) setModal(null); }}>
          <div className="fade-in mobile-bottom-sheet product-modal-sheet" style={{ background: bgCard, borderRadius: "20px 20px 0 0", padding: 0, width: "100%", maxWidth: 500, boxShadow: "0 -8px 40px rgba(0,0,0,0.3)", maxHeight: "100dvh", display: "flex", flexDirection: "column", overflow: "hidden" }}>
            <div className="product-modal-header" style={{ flexShrink: 0, padding: "24px 24px 0" }}>
              {/* Handle bar */}
              <div style={{ width: 40, height: 4, borderRadius: 4, background: borderColor2, margin: "0 auto 20px" }} />
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 22 }}>
                <h3 style={{ margin: 0, fontSize: 18, fontWeight: 800, color: textPrimary }}>{modal === "add" ? "Agregar Producto" : "Editar Producto"}</h3>
                <button onClick={() => setModal(null)} style={{ background: bgCard2, border: "none", cursor: "pointer", width: 32, height: 32, borderRadius: 8, display: "flex", alignItems: "center", justifyContent: "center" }}><X size={16} color={textMuted} /></button>
              </div>
            </div>
            <div className="product-modal-body" style={{ flex: "1 1 auto", minHeight: 0, overflowY: "auto", WebkitOverflowScrolling: "touch", padding: "0 24px", paddingBottom: 120 }}>
            <div style={{ marginBottom: 16 }}>
              <label style={{ fontSize: 12, fontWeight: 700, color: D ? "#9ca3af" : "#374151", display: "block", marginBottom: 6 }}>Nombre</label>
              <input type="text" value={form.nombre || ""} onChange={e => setForm(f => ({ ...f, nombre: e.target.value }))} style={inp} />
            </div>
            <div style={{ marginBottom: 16 }}>
              <label style={{ fontSize: 12, fontWeight: 700, color: D ? "#9ca3af" : "#374151", display: "block", marginBottom: 6 }}>Costo (precio de compra)</label>
              <input type="number" min="0" value={form.costo || ""} onChange={e => {
                const costo = e.target.value;
                setForm(f => ({ ...f, costo, precio: costo && f.incrementoPct !== "" ? String(Math.round(priceFromIncrement(costo, f.incrementoPct))) : f.precio }));
              }} placeholder="Opcional" style={inp} />
            </div>
            <div style={{ marginBottom: 16 }}>
              <label style={{ fontSize: 12, fontWeight: 700, color: D ? "#9ca3af" : "#374151", display: "block", marginBottom: 6 }}>Incremento sobre el costo (%)</label>
              <input type="number" min="-100" step="0.01" value={form.incrementoPct ?? ""} onChange={e => {
                const incrementoPct = e.target.value;
                setForm(f => ({ ...f, incrementoPct, precio: f.costo && incrementoPct !== "" ? String(Math.round(priceFromIncrement(f.costo, incrementoPct))) : f.precio }));
              }} placeholder="Ej: 18" style={inp} />
            </div>
            <div style={{ marginBottom: 16 }}>
              <label style={{ fontSize: 12, fontWeight: 700, color: D ? "#9ca3af" : "#374151", display: "block", marginBottom: 6 }}>Precio de venta</label>
              <input type="number" min="0" value={form.precio || ""} onChange={e => {
                const precio = e.target.value;
                setForm(f => ({ ...f, precio, incrementoPct: f.costo && precio ? calcIncrementPct(f.costo, precio).toFixed(2) : f.incrementoPct }));
              }} style={inp} />
              {+form.costo > 0 && +form.precio > 0 && (
                <div style={{ marginTop: 7, display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, fontSize: 11 }}>
                  <span style={{ color: textMuted }}>Ganancia por unidad: <strong style={{ color: "#10b981" }}>{fmt(+form.precio - +form.costo)}</strong></span>
                  <span style={{ color: textMuted }}>Incremento real: <strong style={{ color: "#10b981" }}>{calcIncrementPct(form.costo, form.precio).toFixed(2)}%</strong></span>
                </div>
              )}
            </div>
            <div style={{ marginBottom: 16 }}>
              <label style={{ fontSize: 12, fontWeight: 700, color: D ? "#9ca3af" : "#374151", display: "block", marginBottom: 6 }}>Stock</label>
              <input type="number" min="0" value={form.stock || ""} onChange={e => setForm(f => ({ ...f, stock: e.target.value }))} style={inp} />
            </div>
            {+form.stock > 0 && +form.precio > 0 && (
              <div style={{ marginBottom: 16, padding: "14px 16px", borderRadius: 12, background: D ? "rgba(16,185,129,0.12)" : "#ecfdf5", border: `1.5px solid ${D ? "rgba(16,185,129,0.35)" : "#a7f3d0"}` }}>
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12 }}>
                  <div>
                    <p style={{ margin: 0, fontSize: 11, color: textMuted }}>Valor total del producto</p>
                    <p style={{ margin: "4px 0 0", fontSize: 12, color: textSecondary }}>{Number(form.stock).toLocaleString("es-CL")} unidades × {fmt(+form.precio)}</p>
                  </div>
                  <strong style={{ fontSize: 22, color: "#10b981" }}>{fmt(+form.stock * +form.precio)}</strong>
                </div>
                {+form.costo > 0 && (
                  <div className="grid-3-mobile-sm" style={{ marginTop: 10, paddingTop: 10, borderTop: `1px solid ${D ? "rgba(16,185,129,0.25)" : "#bbf7d0"}`, display: "grid", gridTemplateColumns: "repeat(2,minmax(0,1fr))", gap: 10 }}>
                    <div>
                      <span style={{ display: "block", fontSize: 10, color: textMuted }}>Costo total</span>
                      <strong style={{ fontSize: 13, color: textPrimary }}>{fmt(+form.stock * +form.costo)}</strong>
                    </div>
                    <div>
                      <span style={{ display: "block", fontSize: 10, color: textMuted }}>Ganancia estimada</span>
                      <strong style={{ fontSize: 13, color: (+form.precio - +form.costo) >= 0 ? "#10b981" : "#e03131" }}>{fmt(+form.stock * (+form.precio - +form.costo))}</strong>
                    </div>
                  </div>
                )}
              </div>
            )}
            <div style={{ marginBottom: 16 }}>
              <label style={{ fontSize: 12, fontWeight: 700, color: D ? "#9ca3af" : "#374151", display: "block", marginBottom: 6 }}>Categoría</label>
              <select value={form.categoria || categorias[0] || ""} onChange={e => setForm(f => ({ ...f, categoria: e.target.value }))} style={{ ...inp }}>
                {categorias.map(c => <option key={c}>{c}</option>)}
              </select>
            </div>
            {/* Código de Barras */}
            <div style={{ marginBottom: 16 }}>
              <label style={{ fontSize: 12, fontWeight: 700, color: D ? "#9ca3af" : "#374151", display: "block", marginBottom: 6 }}>
                🔍 Código de barras
              </label>
              <div style={{ display: "flex", gap: 8 }}>
                <input
                  type="text"
                  value={form.codigoBarra || ""}
                  onChange={e => setForm(f => ({ ...f, codigoBarra: e.target.value }))}
                  placeholder="Escanea o escribe el código"
                  style={{ ...inp, flex: 1 }}
                />
                <button
                  onClick={() => setShowScannerModal(true)}
                  title="Escanear código"
                  style={{ flexShrink: 0, width: 42, height: 42, borderRadius: 10, border: `1.5px solid ${D ? "#2d3158" : "#e5e7eb"}`, background: D ? "#252840" : "#f0f2ff", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", color: "#d71920" }}
                >
                  <Scan size={18} />
                </button>
              </div>
              {form.codigoBarra && (
                <p style={{ margin: "5px 0 0", fontSize: 11, color: "#10b981" }}>✓ Código registrado: <strong>{form.codigoBarra}</strong></p>
              )}
            </div>
            {/* Scanner modal para agregar producto */}
            {showScannerModal && (
              <BarcodeScanner
                darkMode={D}
                onClose={() => setShowScannerModal(false)}
                onScan={(codigo) => {
                  setForm(f => ({ ...f, codigoBarra: codigo }));
                  setShowScannerModal(false);
                }}
              />
            )}
            {/* Imagen del producto */}
            <div style={{ marginBottom: 16 }}>
              <label style={{ fontSize: 12, fontWeight: 700, color: D ? "#9ca3af" : "#374151", display: "block", marginBottom: 6 }}>Imagen del producto</label>
              {form.imagenUrl ? (
                <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 10 }}>
                  <img src={form.imagenUrl} alt="preview" style={{ width: 60, height: 60, borderRadius: 10, objectFit: "cover", border: `1px solid ${borderColor}` }} />
                  <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                    <button onClick={() => setForm(f => ({ ...f, imagenUrl: "" }))} className="btn-danger" style={{ padding: "5px 12px", borderRadius: 8, fontSize: 12 }}>
                      Quitar imagen
                    </button>
                    <label style={{ padding: "5px 12px", borderRadius: 8, border: `1.5px solid ${borderColor2}`, background: bgCard2, cursor: "pointer", fontSize: 12, color: textSecondary, textAlign: "center" }}>
                      Cambiar
                      <input type="file" accept="image/*" style={{ display: "none" }} onChange={e => {
                        const file = e.target.files?.[0];
                        if (file) handleSubirImagen(file, url => setForm(f => ({ ...f, imagenUrl: url })));
                      }} />
                    </label>
                  </div>
                </div>
              ) : (
                <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                  <div style={{ fontSize: 32 }}>{form.img || "📦"}</div>
                  <label style={{ flex: 1, padding: "10px", borderRadius: 10, border: `2px dashed ${borderColor2}`, background: bgCard2, cursor: "pointer", fontSize: 12, color: textSecondary, textAlign: "center", display: "flex", alignItems: "center", justifyContent: "center", gap: 6 }}>
                    <Plus size={14} /> Subir imagen real
                    <input type="file" accept="image/*" style={{ display: "none" }} onChange={e => {
                      const file = e.target.files?.[0];
                      if (file) handleSubirImagen(file, url => setForm(f => ({ ...f, imagenUrl: url })));
                    }} />
                  </label>
                </div>
              )}
              <p style={{ margin: "6px 0 0", fontSize: 11, color: textMuted }}>O elige un emoji como ícono:</p>
              <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginTop: 6 }}>
                {["📦","🧴","🖱️","⌨️","🎧","🧼","🖥️","🪑","📓","🍎","👕","🔧","💊","🎮","📚"].map(e => (
                  <button key={e} onClick={() => setForm(f => ({ ...f, img: e }))} style={{ width: 32, height: 32, borderRadius: 8, border: `1.5px solid ${form.img === e ? "#d71920" : borderColor2}`, background: form.img === e ? (D ? "rgba(215,25,32,0.15)" : "#fff3bf") : bgCard2, fontSize: 16, cursor: "pointer" }}>{e}</button>
                ))}
              </div>
            </div>
            {/* Promoción */}
            {/* Manga / Bulto */}
            <div style={{ marginBottom: 16, background: D ? "#1e2235" : "#fffbeb", borderRadius: 12, padding: "14px 16px", border: `1.5px solid ${form.mangaActiva ? "#f59e0b" : borderColor2}` }}>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: form.mangaActiva ? 12 : 0 }}>
                <div>
                  <p style={{ margin: 0, fontSize: 13, fontWeight: 700, color: textPrimary }}>📦 Venta por manga / bulto</p>
                  <p style={{ margin: 0, fontSize: 11, color: textMuted }}>Permite vender por pack con precio especial</p>
                </div>
                <button onClick={() => setForm(f => ({ ...f, mangaActiva: !f.mangaActiva }))}
                  className="toggle-switch" style={{ background: form.mangaActiva ? "#f59e0b" : (D ? "#2d3158" : "#e5e7eb"), flexShrink: 0 }}>
                  <div className="toggle-thumb" style={{ left: form.mangaActiva ? 23 : 3 }} />
                </button>
              </div>
              {form.mangaActiva && (
                <>
                  <div style={{ display: "flex", gap: 10 }}>
                    <div style={{ flex: 1 }}>
                      <label style={{ fontSize: 11, fontWeight: 700, color: D ? "#9ca3af" : "#374151", display: "block", marginBottom: 4 }}>Unidades por manga</label>
                      <input type="number" min="2" value={form.mangaCantidad || ""} onChange={e => setForm(f => ({ ...f, mangaCantidad: e.target.value }))} placeholder="Ej: 12" style={inp} />
                    </div>
                    <div style={{ flex: 1 }}>
                      <label style={{ fontSize: 11, fontWeight: 700, color: D ? "#9ca3af" : "#374151", display: "block", marginBottom: 4 }}>
                        Precio por manga
                        {form.mangaCantidad && form.mangaPrecio && form.precio && +form.mangaCantidad > 0 && (
                          <span style={{ marginLeft: 6, color: "#10b981", fontWeight: 600 }}>
                            ({fmt(+form.mangaPrecio / +form.mangaCantidad)} c/u)
                          </span>
                        )}
                      </label>
                      <input type="number" min="0" value={form.mangaPrecio || ""} onChange={e => setForm(f => ({ ...f, mangaPrecio: e.target.value }))} placeholder="Ej: 8000" style={inp} />
                    </div>
                  </div>
                  <div style={{ marginTop: 10 }}>
                    <label style={{ fontSize: 11, fontWeight: 700, color: D ? "#9ca3af" : "#374151", display: "block", marginBottom: 4 }}>
                      Precio compra por manga
                      {form.mangaCantidad && form.mangaCostoCompra && +form.mangaCantidad > 0 && (
                        <span style={{ marginLeft: 6, color: "#f59e0b", fontWeight: 600 }}>
                          ({fmt(+form.mangaCostoCompra / +form.mangaCantidad)} c/u)
                        </span>
                      )}
                    </label>
                    <input type="number" min="0" value={form.mangaCostoCompra || ""} onChange={e => setForm(f => ({ ...f, mangaCostoCompra: e.target.value }))} placeholder="Ej: 6400 (lo que pagas por la manga)" style={inp} />
                    <p style={{ margin: "4px 0 0", fontSize: 10, color: textMuted }}>Lo que pagas al proveedor por la manga completa (no lo que cobras al cliente). Se usa para precargar el precio de compra en Gastos.</p>
                  </div>
                </>
              )}
            </div>
            {/* Promoción por cantidad */}
            <div style={{ marginBottom: 16, background: D ? "#1e2235" : "#f8f9ff", borderRadius: 12, padding: "14px 16px", border: `1.5px solid ${form.promoActiva ? "#d71920" : borderColor2}` }}>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: form.promoActiva ? 12 : 0 }}>
                <div>
                  <p style={{ margin: 0, fontSize: 13, fontWeight: 700, color: textPrimary }}>🏷️ Promoción por cantidad</p>
                  <p style={{ margin: 0, fontSize: 11, color: textMuted }}>Precio especial al comprar X o más</p>
                </div>
                <button onClick={() => setForm(f => ({ ...f, promoActiva: !f.promoActiva }))}
                  className="toggle-switch" style={{ background: form.promoActiva ? "#d71920" : (D ? "#2d3158" : "#e5e7eb") }}>
                  <div className="toggle-thumb" style={{ left: form.promoActiva ? 23 : 3 }} />
                </button>
              </div>
              {form.promoActiva && (
                <div style={{ display: "flex", gap: 10 }}>
                  <div style={{ flex: 1 }}>
                    <label style={{ fontSize: 11, fontWeight: 700, color: D ? "#9ca3af" : "#374151", display: "block", marginBottom: 4 }}>Cantidad mínima</label>
                    <input type="number" min="1" value={form.promoCantMin || ""} onChange={e => setForm(f => ({ ...f, promoCantMin: e.target.value }))} placeholder="Ej: 3" style={inp} />
                  </div>
                  <div style={{ flex: 1 }}>
                    <label style={{ fontSize: 11, fontWeight: 700, color: D ? "#9ca3af" : "#374151", display: "block", marginBottom: 4 }}>Precio promocional</label>
                    <input type="number" min="0" value={form.promoPrecio || ""} onChange={e => setForm(f => ({ ...f, promoPrecio: e.target.value }))} placeholder="Ej: 800" style={inp} />
                  </div>
                </div>
              )}
            </div>
            </div>
            <div className="product-modal-footer" style={{ display: "flex", gap: 10, padding: "14px 24px", position: "sticky", bottom: 0, background: bgCard, borderTop: `1px solid ${borderColor}`, zIndex: 20 }}>
              <button onClick={() => setModal(null)} style={{ flex: 1, padding: "11px", borderRadius: 10, border: `1.5px solid ${borderColor2}`, background: bgCard2, cursor: "pointer", fontSize: 14, color: textSecondary, fontWeight: 600, fontFamily: "inherit" }}>Cancelar</button>
              <button onClick={handleSaveProd} className="btn-primary" style={{ flex: 1, padding: "11px", borderRadius: 10, fontSize: 14 }}>{modal === "add" ? "Agregar" : "Guardar"}</button>
            </div>
          </div>
        </div>
      )}

      {/* ── Modal Editar Usuario ── */}
      {modalUsuario && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.6)", display: "flex", alignItems: "flex-end", justifyContent: "center", zIndex: 100, backdropFilter: "blur(4px)" }}
          onClick={e => { if (e.target === e.currentTarget) setModalUsuario(null); }}>
          <div className="fade-in mobile-bottom-sheet" style={{ background: bgCard, borderRadius: "20px 20px 0 0", padding: 24, width: "100%", maxWidth: 500, boxShadow: "0 -8px 40px rgba(0,0,0,0.3)", maxHeight: "92vh", overflowY: "auto" }}>
            <div style={{ width: 40, height: 4, borderRadius: 4, background: borderColor2, margin: "0 auto 20px" }} />
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 22 }}>
              <h3 style={{ margin: 0, fontSize: 18, fontWeight: 800, color: textPrimary }}>Editar Usuario</h3>
              <button onClick={() => setModalUsuario(null)} style={{ background: bgCard2, border: "none", cursor: "pointer", width: 32, height: 32, borderRadius: 8, display: "flex", alignItems: "center", justifyContent: "center" }}><X size={16} color={textMuted} /></button>
            </div>
            {[
              { label: "Nombre", key: "nombre" },
              { label: "Correo", key: "correo", type: "email" },
              { label: "Empresa / Sucursal", key: "empresa" },
            ].map(({ label, key, type }) => (
              <div key={key} style={{ marginBottom: 14 }}>
                <label style={{ fontSize: 12, fontWeight: 700, color: D ? "#9ca3af" : "#374151", display: "block", marginBottom: 6 }}>{label}</label>
                <input type={type || "text"} value={formUsuario[key] || ""} onChange={e => setFormUsuario(f => ({ ...f, [key]: e.target.value }))} autoComplete="off" style={inp} />
              </div>
            ))}
            <div style={{ marginBottom: 14 }}>
              <label style={{ fontSize: 12, fontWeight: 700, color: D ? "#9ca3af" : "#374151", display: "block", marginBottom: 6 }}>Rol</label>
              <select value={formUsuario.rol || "empleado"} onChange={e => setFormUsuario(f => ({ ...f, rol: e.target.value }))} style={inp}>
                <option value="empleado">👤 Empleado</option>
                <option value="gerente">👑 Gerente</option>
              </select>
            </div>
            <div style={{ height: 1, background: borderColor2, margin: "6px 0 18px" }} />
            <p style={{ margin: "0 0 14px", fontSize: 12, fontWeight: 700, color: textMuted, textTransform: "uppercase", letterSpacing: "0.5px" }}>Cambiar acceso (opcional)</p>
            <div style={{ marginBottom: 14 }}>
              <label style={{ fontSize: 12, fontWeight: 700, color: D ? "#9ca3af" : "#374151", display: "block", marginBottom: 6 }}>Nombre de usuario</label>
              <input type="text" value={formUsuario.nuevoUsuario || ""} onChange={e => setFormUsuario(f => ({ ...f, nuevoUsuario: e.target.value }))} placeholder="Dejar igual si no cambia" autoComplete="off" style={inp} />
            </div>
            <div style={{ marginBottom: 14 }}>
              <label style={{ fontSize: 12, fontWeight: 700, color: D ? "#9ca3af" : "#374151", display: "block", marginBottom: 6 }}>Nueva contraseña</label>
              <input type="password" value={formUsuario.nuevaClave || ""} onChange={e => setFormUsuario(f => ({ ...f, nuevaClave: e.target.value }))} placeholder="Dejar vacío para no cambiar" autoComplete="new-password" style={inp} />
            </div>
            {usuarioError && <p style={{ color: "#e03131", fontSize: 13, marginBottom: 10 }}>{usuarioError}</p>}
            <div style={{ display: "flex", gap: 10 }}>
              <button onClick={() => setModalUsuario(null)} style={{ flex: 1, padding: "11px", borderRadius: 10, border: `1.5px solid ${borderColor2}`, background: bgCard2, cursor: "pointer", fontSize: 14, color: textSecondary, fontWeight: 600, fontFamily: "inherit" }}>Cancelar</button>
              <button onClick={handleGuardarUsuario} className="btn-primary" style={{ flex: 1, padding: "11px", borderRadius: 10, fontSize: 14 }}>Guardar</button>
            </div>
          </div>
        </div>
      )}

      {/* ── Modal Nuevo Usuario ── */}
      {modalNuevoUsuario && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.6)", display: "flex", alignItems: "flex-end", justifyContent: "center", zIndex: 100, backdropFilter: "blur(4px)" }}
          onClick={e => { if (e.target === e.currentTarget) setModalNuevoUsuario(false); }}>
          <div className="fade-in mobile-bottom-sheet" style={{ background: bgCard, borderRadius: "20px 20px 0 0", padding: 24, width: "100%", maxWidth: 500, boxShadow: "0 -8px 40px rgba(0,0,0,0.3)", maxHeight: "92vh", overflowY: "auto" }}>
            <div style={{ width: 40, height: 4, borderRadius: 4, background: borderColor2, margin: "0 auto 20px" }} />
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 22 }}>
              <h3 style={{ margin: 0, fontSize: 18, fontWeight: 800, color: textPrimary }}>Crear Nuevo Usuario</h3>
              <button onClick={() => setModalNuevoUsuario(false)} style={{ background: bgCard2, border: "none", cursor: "pointer", width: 32, height: 32, borderRadius: 8, display: "flex", alignItems: "center", justifyContent: "center" }}><X size={16} color={textMuted} /></button>
            </div>
            {[
              { label: "Nombre completo", key: "nombre", type: "text", ac: "off" },
              { label: "Correo electrónico", key: "correo", type: "email", ac: "off" },
              { label: "Empresa / Sucursal", key: "empresa", type: "text", ac: "off" },
              { label: "Usuario", key: "usuario", type: "text", ac: "off" },
              { label: "Contraseña", key: "clave", type: "password", ac: "new-password" },
            ].map(({ label, key, type, ac }) => (
              <div key={key} style={{ marginBottom: 14 }}>
                <label style={{ fontSize: 12, fontWeight: 700, color: D ? "#9ca3af" : "#374151", display: "block", marginBottom: 6 }}>{label}</label>
                <input type={type} value={formNuevoUsuario[key] || ""} onChange={e => setFormNuevoUsuario(f => ({ ...f, [key]: e.target.value }))} autoComplete={ac} style={inp} />
              </div>
            ))}
            <div style={{ marginBottom: 14 }}>
              <label style={{ fontSize: 12, fontWeight: 700, color: D ? "#9ca3af" : "#374151", display: "block", marginBottom: 6 }}>Rol</label>
              <select value={formNuevoUsuario.rol} onChange={e => setFormNuevoUsuario(f => ({ ...f, rol: e.target.value }))} style={inp}>
                <option value="empleado">👤 Empleado</option>
                <option value="gerente">👑 Gerente</option>
              </select>
            </div>
            {nuevoUsuarioError && <div style={{ background: "#fff1f2", color: "#e03131", fontSize: 13, padding: "10px 14px", borderRadius: 8, marginBottom: 14 }}>⚠ {nuevoUsuarioError}</div>}
            <div style={{ display: "flex", gap: 10 }}>
              <button onClick={() => setModalNuevoUsuario(false)} style={{ flex: 1, padding: "11px", borderRadius: 10, border: `1.5px solid ${borderColor2}`, background: bgCard2, cursor: "pointer", fontSize: 14, color: textSecondary, fontWeight: 600, fontFamily: "inherit" }}>Cancelar</button>
              <button onClick={handleCrearUsuario} className="btn-primary" style={{ flex: 1, padding: "11px", borderRadius: 10, fontSize: 14 }}>Crear Usuario</button>
            </div>
          </div>
        </div>
      )}

      {/* ── Modal Ícono Categoría ── */}
      {modalIconoCat && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.6)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 100, backdropFilter: "blur(4px)" }}>
          <div className="fade-in" style={{ background: bgCard, borderRadius: 20, padding: 24, width: "92%", maxWidth: 420, boxShadow: "0 24px 60px rgba(0,0,0,0.3)" }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 18 }}>
              <h3 style={{ margin: 0, fontSize: 16, fontWeight: 800, color: textPrimary }}>Cambiar Ícono: {modalIconoCat.nombre}</h3>
              <button onClick={() => setModalIconoCat(null)} style={{ background: bgCard2, border: "none", cursor: "pointer", width: 32, height: 32, borderRadius: 8, display: "flex", alignItems: "center", justifyContent: "center" }}><X size={16} color={textMuted} /></button>
            </div>
            <div className="emoji-grid">
              {EMOJI_LIST.map(emoji => (
                <button key={emoji} className={`emoji-btn ${catIconos[modalIconoCat.nombre] === emoji ? "selected" : ""}`} onClick={() => handleCambiarIcono(modalIconoCat.nombre, emoji)}>{emoji}</button>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* ── Modal Mover Producto ── */}
      {modalMover && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.6)", display: "flex", alignItems: "flex-end", justifyContent: "center", zIndex: 100, backdropFilter: "blur(4px)" }}
          onClick={e => { if (e.target === e.currentTarget) setModalMover(null); }}>
          <div className="fade-in mobile-bottom-sheet" style={{ background: bgCard, borderRadius: "20px 20px 0 0", padding: 24, width: "100%", maxWidth: 500, boxShadow: "0 -8px 40px rgba(0,0,0,0.3)", maxHeight: "70vh", overflowY: "auto" }}>
            <div style={{ width: 40, height: 4, borderRadius: 4, background: borderColor2, margin: "0 auto 20px" }} />
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 20 }}>
              <div>
                <h3 style={{ margin: 0, fontSize: 17, fontWeight: 800, color: textPrimary }}>🏢 Mover Producto</h3>
                <p style={{ margin: "4px 0 0", fontSize: 13, color: textMuted }}>{modalMover.nombre}</p>
              </div>
              <button onClick={() => setModalMover(null)} style={{ background: bgCard2, border: "none", cursor: "pointer", width: 32, height: 32, borderRadius: 8, display: "flex", alignItems: "center", justifyContent: "center" }}><X size={16} color={textMuted} /></button>
            </div>
            <p style={{ margin: "0 0 6px", fontSize: 12, color: textMuted }}>Empresa actual: <strong style={{ color: textPrimary }}>{modalMover.empresa || "Sin empresa"}</strong></p>
            <p style={{ margin: "0 0 16px", fontSize: 12, color: textMuted }}>Selecciona la empresa destino:</p>
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              {[...new Set(products.map(p => p.empresa).filter(Boolean))].map(emp => (
                <button key={emp} onClick={() => handleMoverProducto(modalMover, emp)}
                  style={{ padding: "14px 16px", borderRadius: 12, border: `2px solid ${modalMover.empresa === emp ? "#7c3aed" : borderColor}`, background: modalMover.empresa === emp ? (D ? "rgba(124,58,237,0.15)" : "#f3f0ff") : bgCard2, color: modalMover.empresa === emp ? "#7c3aed" : textPrimary, fontWeight: 700, fontSize: 14, cursor: "pointer", fontFamily: "inherit", textAlign: "left", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                  <span>🏢 {emp}</span>
                  {modalMover.empresa === emp && <span style={{ fontSize: 12, color: "#7c3aed" }}>✓ Actual</span>}
                </button>
              ))}
              <button onClick={() => handleMoverProducto(modalMover, "")}
                style={{ padding: "14px 16px", borderRadius: 12, border: `2px solid ${!modalMover.empresa ? "#7c3aed" : borderColor}`, background: !modalMover.empresa ? (D ? "rgba(124,58,237,0.15)" : "#f3f0ff") : bgCard2, color: !modalMover.empresa ? "#7c3aed" : textMuted, fontWeight: 600, fontSize: 13, cursor: "pointer", fontFamily: "inherit", textAlign: "left" }}>
                🚫 Sin empresa
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Modal Ajuste de Stock ── */}
      {modalStock && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.6)", display: "flex", alignItems: "flex-end", justifyContent: "center", zIndex: 100, backdropFilter: "blur(4px)" }}
          onClick={e => { if (e.target === e.currentTarget) setModalStock(null); }}>
          <div className="fade-in mobile-bottom-sheet" style={{ background: bgCard, borderRadius: "20px 20px 0 0", padding: 24, width: "100%", maxWidth: 500, boxShadow: "0 -8px 40px rgba(0,0,0,0.3)", maxHeight: "92vh", overflowY: "auto" }}>
            <div style={{ width: 40, height: 4, borderRadius: 4, background: borderColor2, margin: "0 auto 20px" }} />
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 20 }}>
              <h3 style={{ margin: 0, fontSize: 17, fontWeight: 800, color: textPrimary }}>Ajustar Stock</h3>
              <button onClick={() => setModalStock(null)} style={{ background: bgCard2, border: "none", cursor: "pointer", width: 32, height: 32, borderRadius: 8, display: "flex", alignItems: "center", justifyContent: "center" }}><X size={16} color={textMuted} /></button>
            </div>
            <p style={{ margin: "0 0 16px", fontSize: 14, color: textSecondary }}>
              <strong style={{ color: textPrimary }}>{modalStock.nombre}</strong> · Stock actual: <strong style={{ color: "#10b981" }}>{modalStock.stock}</strong>
            </p>
            <div style={{ display: "flex", gap: 8, marginBottom: 16 }}>
              <button onClick={() => setStockTipo("agregar")} style={{ flex: 1, padding: "9px", borderRadius: 10, border: `2px solid ${stockTipo === "agregar" ? "#10b981" : borderColor2}`, background: stockTipo === "agregar" ? (D ? "rgba(16,185,129,0.15)" : "#ecfdf5") : bgCard2, cursor: "pointer", fontSize: 13, fontWeight: 700, color: stockTipo === "agregar" ? "#10b981" : textSecondary, fontFamily: "inherit" }}>+ Agregar</button>
              <button onClick={() => setStockTipo("quitar")} style={{ flex: 1, padding: "9px", borderRadius: 10, border: `2px solid ${stockTipo === "quitar" ? "#e03131" : borderColor2}`, background: stockTipo === "quitar" ? "#fff1f2" : bgCard2, cursor: "pointer", fontSize: 13, fontWeight: 700, color: stockTipo === "quitar" ? "#e03131" : textSecondary, fontFamily: "inherit" }}>- Quitar</button>
            </div>
            <label style={{ fontSize: 12, fontWeight: 700, color: D ? "#9ca3af" : "#374151", display: "block", marginBottom: 6 }}>Cantidad</label>
            <input type="number" min="1" value={stockAjuste} onChange={e => setStockAjuste(e.target.value)} placeholder="Ej: 10" style={{ ...inp, marginBottom: 16 }} />
            <div style={{ display: "flex", gap: 10 }}>
              <button onClick={() => setModalStock(null)} style={{ flex: 1, padding: "11px", borderRadius: 10, border: `1.5px solid ${borderColor2}`, background: bgCard2, cursor: "pointer", fontSize: 14, color: textSecondary, fontWeight: 600, fontFamily: "inherit" }}>Cancelar</button>
              <button onClick={handleAjustarStock} className="btn-primary" style={{ flex: 1, padding: "11px", borderRadius: 10, fontSize: 14 }}>Guardar</button>
            </div>
          </div>
        </div>
      )}

      {/* ── Modal Registrar Merma ── */}
      {modalMerma && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.6)", display: "flex", alignItems: "flex-end", justifyContent: "center", zIndex: 100, backdropFilter: "blur(4px)" }}
          onClick={e => { if (e.target === e.currentTarget) setModalMerma(null); }}>
          <div className="fade-in mobile-bottom-sheet" style={{ background: bgCard, borderRadius: "20px 20px 0 0", padding: 24, width: "100%", maxWidth: 500, boxShadow: "0 -8px 40px rgba(0,0,0,0.3)", maxHeight: "92vh", overflowY: "auto" }}>
            <div style={{ width: 40, height: 4, borderRadius: 4, background: borderColor2, margin: "0 auto 20px" }} />
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 20 }}>
              <h3 style={{ margin: 0, fontSize: 17, fontWeight: 800, color: textPrimary }}>Registrar Merma</h3>
              <button onClick={() => setModalMerma(null)} style={{ background: bgCard2, border: "none", cursor: "pointer", width: 32, height: 32, borderRadius: 8, display: "flex", alignItems: "center", justifyContent: "center" }}><X size={16} color={textMuted} /></button>
            </div>
            <div style={{ marginBottom: 14 }}>
              <label style={{ fontSize: 12, fontWeight: 700, color: D ? "#9ca3af" : "#374151", display: "block", marginBottom: 6 }}>Producto</label>
              <select value={formMerma.productoId} onChange={e => setFormMerma(f => ({ ...f, productoId: e.target.value }))} style={inp}>
                <option value="">Seleccionar producto...</option>
                {products.map(p => <option key={p.id} value={p.id}>{p.nombre} (Stock: {p.stock})</option>)}
              </select>
            </div>
            <div style={{ marginBottom: 14 }}>
              <label style={{ fontSize: 12, fontWeight: 700, color: D ? "#9ca3af" : "#374151", display: "block", marginBottom: 6 }}>Cantidad</label>
              <input type="number" min="1" value={formMerma.cantidad} onChange={e => setFormMerma(f => ({ ...f, cantidad: e.target.value }))} placeholder="Ej: 3" style={inp} />
            </div>
            <div style={{ marginBottom: 14 }}>
              <label style={{ fontSize: 12, fontWeight: 700, color: D ? "#9ca3af" : "#374151", display: "block", marginBottom: 6 }}>Motivo</label>
              <select value={formMerma.motivo} onChange={e => setFormMerma(f => ({ ...f, motivo: e.target.value }))} style={inp}>
                <option value="">Seleccionar motivo...</option>
                <option value="Vencido">Vencido</option>
                <option value="Dañado">Dañado</option>
                <option value="Robo">Robo</option>
                <option value="Error de inventario">Error de inventario</option>
                <option value="Otro">Otro</option>
              </select>
            </div>
            {mermaError && <div style={{ background: "#fff1f2", color: "#e03131", fontSize: 13, padding: "10px 14px", borderRadius: 8, marginBottom: 14 }}>⚠ {mermaError}</div>}
            <div style={{ display: "flex", gap: 10 }}>
              <button onClick={() => setModalMerma(null)} style={{ flex: 1, padding: "11px", borderRadius: 10, border: `1.5px solid ${borderColor2}`, background: bgCard2, cursor: "pointer", fontSize: 14, color: textSecondary, fontWeight: 600, fontFamily: "inherit" }}>Cancelar</button>
              <button onClick={handleRegistrarMerma} style={{ flex: 1, padding: "11px", borderRadius: 10, border: "none", background: "linear-gradient(135deg, #e03131, #f03e3e)", cursor: "pointer", fontSize: 14, fontWeight: 700, color: "#fff", fontFamily: "inherit" }}>Registrar</button>
            </div>
          </div>
        </div>
      )}

      {/* ── Modal Papelera de Productos ── */}
      {modalPapelera && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.6)", display: "flex", alignItems: "flex-end", justifyContent: "center", zIndex: 100, backdropFilter: "blur(4px)" }}
          onClick={e => { if (e.target === e.currentTarget) setModalPapelera(false); }}>
          <div className="fade-in mobile-bottom-sheet" style={{ background: bgCard, borderRadius: "20px 20px 0 0", padding: 24, width: "100%", maxWidth: 560, boxShadow: "0 -8px 40px rgba(0,0,0,0.3)", maxHeight: "88vh", overflowY: "auto" }}>
            <div style={{ width: 40, height: 4, borderRadius: 4, background: borderColor2, margin: "0 auto 20px" }} />
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 6 }}>
              <h3 style={{ margin: 0, fontSize: 17, fontWeight: 800, color: textPrimary, display: "flex", alignItems: "center", gap: 8 }}>
                <Trash2 size={18} /> Papelera
              </h3>
              <button onClick={() => setModalPapelera(false)} style={{ background: bgCard2, border: "none", cursor: "pointer", width: 32, height: 32, borderRadius: 8, display: "flex", alignItems: "center", justifyContent: "center" }}><X size={16} color={textMuted} /></button>
            </div>
            <p style={{ margin: "0 0 18px", fontSize: 13, color: textMuted, lineHeight: 1.5 }}>
              Productos borrados desde este dispositivo. Puedes restaurarlos al inventario o eliminarlos para siempre.
            </p>

            {papelera.length === 0 ? (
              <div style={{ textAlign: "center", padding: "30px 10px", color: textMuted, fontSize: 14 }}>
                La papelera está vacía.
              </div>
            ) : (
              <>
                <div style={{ display: "flex", flexDirection: "column", gap: 10, marginBottom: 18 }}>
                  {papelera.map((item, i) => (
                    <div key={`${item.nombre}-${item.eliminadoEn}-${i}`} style={{ display: "flex", alignItems: "center", gap: 12, padding: "10px 12px", borderRadius: 12, border: `1px solid ${borderColor2}`, background: bgCard2 }}>
                      <div style={{ width: 40, height: 40, borderRadius: 10, background: D ? "#1e2235" : "#f4f5fb", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, fontSize: 20 }}>
                        {item.imagenUrl ? <img src={item.imagenUrl} alt={item.nombre} style={{ width: "100%", height: "100%", objectFit: "contain", borderRadius: 10 }} /> : item.img}
                      </div>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <p style={{ margin: "0 0 2px", fontSize: 14, fontWeight: 700, color: textPrimary, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{item.nombre}</p>
                        <p style={{ margin: 0, fontSize: 11, color: textMuted }}>
                          {item.categoria} · Eliminado {item.eliminadoEn ? new Date(item.eliminadoEn).toLocaleString("es-CL", { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" }) : ""}
                        </p>
                      </div>
                      <button onClick={() => handleRestaurarProd(item)} title="Restaurar al inventario" style={{ padding: "7px 12px", borderRadius: 9, border: "none", background: "linear-gradient(135deg,#10b981,#059669)", color: "#fff", fontWeight: 700, fontSize: 12, cursor: "pointer", fontFamily: "inherit", display: "flex", alignItems: "center", gap: 6, flexShrink: 0 }}>
                        <RefreshCw size={12} /> Restaurar
                      </button>
                      <button onClick={() => handleEliminarDefinitivo(item)} title="Eliminar definitivamente" className="btn-danger" style={{ padding: "7px 9px", borderRadius: 9, fontSize: 12, display: "flex", flexShrink: 0 }}>
                        <Trash2 size={13} />
                      </button>
                    </div>
                  ))}
                </div>
                <button onClick={handleVaciarPapelera} style={{ width: "100%", padding: "11px", borderRadius: 10, border: `1.5px solid ${borderColor2}`, background: bgCard2, cursor: "pointer", fontSize: 13, color: "#e03131", fontWeight: 700, fontFamily: "inherit" }}>
                  Vaciar papelera
                </button>
              </>
            )}
          </div>
        </div>
      )}

      {/* ── Modal Confirmar Eliminar Categoría ── */}
      {confirmDeleteCat && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.6)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 100, backdropFilter: "blur(4px)" }}>
          <div className="fade-in" style={{ background: bgCard, borderRadius: 20, padding: 30, width: "92%", maxWidth: 390, boxShadow: "0 24px 60px rgba(0,0,0,0.3)" }}>
            <div style={{ textAlign: "center", marginBottom: 22 }}>
              <div style={{ width: 60, height: 60, borderRadius: "50%", background: "#fff1f2", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 14px" }}>
                <AlertTriangle size={28} color="#e03131" />
              </div>
              <h3 style={{ margin: "0 0 8px", fontSize: 18, fontWeight: 800, color: textPrimary }}>¿Eliminar categoría?</h3>
              <p style={{ margin: 0, fontSize: 14, color: textSecondary, lineHeight: 1.5 }}>
                <strong>"{confirmDeleteCat.nombre}"</strong> tiene <strong>{confirmDeleteCat.count} producto{confirmDeleteCat.count !== 1 ? "s" : ""}</strong>. Se moverán a "Sin categoría".
              </p>
            </div>
            <div style={{ display: "flex", gap: 10 }}>
              <button onClick={() => setConfirmDeleteCat(null)} style={{ flex: 1, padding: "11px", borderRadius: 10, border: `1.5px solid ${borderColor2}`, background: bgCard2, cursor: "pointer", fontSize: 14, color: textSecondary, fontWeight: 600, fontFamily: "inherit" }}>Cancelar</button>
              <button onClick={confirmarEliminarCat} style={{ flex: 1, padding: "11px", borderRadius: 10, border: "none", background: "linear-gradient(135deg, #e03131, #f03e3e)", cursor: "pointer", fontSize: 14, fontWeight: 700, color: "#fff", fontFamily: "inherit" }}>Eliminar</button>
            </div>
          </div>
        </div>
      )}

      {/* ── Pantalla Bloqueada (PIN) ── */}
      {showPinLock && (
        <div style={{ position: "fixed", inset: 0, background: D ? "rgba(10,11,20,0.97)" : "rgba(30,34,54,0.97)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 500, backdropFilter: "blur(8px)" }}>
          <div className="fade-in" style={{ background: bgCard, borderRadius: 24, padding: "36px 24px", width: "92%", maxWidth: 320, boxShadow: "0 30px 80px rgba(0,0,0,0.5)", textAlign: "center" }}>
            <div style={{ width: 64, height: 64, borderRadius: "50%", background: "linear-gradient(135deg, #d71920, #ef2b32)", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 20px" }}>
              <Lock size={28} color="#fff" />
            </div>
            <h2 style={{ margin: "0 0 4px", fontSize: 20, fontWeight: 800, color: textPrimary }}>Pantalla Bloqueada</h2>
            <p style={{ margin: "0 0 24px", fontSize: 13, color: textMuted }}>{currentUser.nombre}</p>
            <div style={{ display: "flex", justifyContent: "center", gap: 10, marginBottom: 20 }}>
              {[0,1,2,3].map(i => (
                <div key={i} style={{ width: 14, height: 14, borderRadius: "50%", background: pinInput.length > i ? "#d71920" : (D ? "#2d3158" : "#e5e7eb"), transition: "background 0.15s" }} />
              ))}
            </div>
            <div className="grid-3-mobile" style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 10, marginBottom: 16 }}>
              {[1,2,3,4,5,6,7,8,9,"",0,"⌫"].map((k, i) => (
                <button key={i} onClick={() => {
                  if (k === "⌫") { setPinInput(p => p.slice(0,-1)); setPinError(""); }
                  else if (k !== "" && pinInput.length < 4) {
                    const nuevo = pinInput + k;
                    setPinInput(nuevo);
                    if (nuevo.length === 4) {
                      if (nuevo === getPinGuardado()) { setShowPinLock(false); setPinInput(""); setPinError(""); }
                      else { setPinError("PIN incorrecto"); setTimeout(() => { setPinInput(""); setPinError(""); }, 800); }
                    }
                  }
                }} style={{ padding: "16px", borderRadius: 12, border: `1.5px solid ${borderColor2}`, background: k === "" ? "transparent" : bgCard2, cursor: k === "" ? "default" : "pointer", fontSize: k === "⌫" ? 18 : 20, fontWeight: 700, color: textPrimary, fontFamily: "inherit", transition: "all 0.1s" }}>
                  {k}
                </button>
              ))}
            </div>
            {pinError && <p style={{ margin: "0 0 12px", fontSize: 13, color: "#e03131", fontWeight: 700 }}>{pinError}</p>}
            <button onClick={() => { setShowPinLock(false); setCurrentUser(null); }} style={{ background: "none", border: "none", color: textMuted, cursor: "pointer", fontSize: 12, fontFamily: "inherit" }}>
              Cerrar sesión completa
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
