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
} from "lucide-react";

// ─── Constantes ───────────────────────────────────────────────────────────────
const APP_VERSION = "3.0.0";

const salesData = [
  { day: "1", ventas: 5000 }, { day: "5", ventas: 18000 },
  { day: "8", ventas: 22000 }, { day: "10", ventas: 20000 },
  { day: "12", ventas: 28000 }, { day: "15", ventas: 32000 },
  { day: "18", ventas: 24000 }, { day: "20", ventas: 22000 },
  { day: "22", ventas: 26000 }, { day: "25", ventas: 30000 },
  { day: "28", ventas: 35000 }, { day: "31", ventas: 41000 },
];

const initialProducts = [];

const initialCategorias = [];
const defaultCatIcons = {};

const EMOJI_LIST = [
  "📦","💻","🧹","🏠","🍎","👕","🎮","📚","🔧","🌿","🛒","🎯","🔑","💊","🚗","🍕","🎵","📱",
  "🖥️","⌨️","🖱️","🎧","🧴","🧼","🪑","📓","🔌","💡","🔦","🧰","🪛","🔩","🎨","✏️","📏","🗂️",
  "🧲","⚙️","🏭","🛠️","🧪","🔬","📡","💾","📷","🎥","📺","📻","🎸","🎹","🎺","🎻","🎲",
];

const fmt = (n) => `$${Number(n || 0).toLocaleString("es-CL")}`;
const fmtIVA = (n) => `$${Math.round(Number(n || 0)).toLocaleString("es-CL")}`;

// ─── Storage helpers ──────────────────────────────────────────────────────────
const getSales   = () => JSON.parse(localStorage.getItem("inv_sales") || "[]");
const saveSales  = (s) => localStorage.setItem("inv_sales", JSON.stringify(s));
const getBoletas = () => JSON.parse(localStorage.getItem("inv_boletas") || "[]");
const saveBoletas= (b) => localStorage.setItem("inv_boletas", JSON.stringify(b));
const getConfig  = () => JSON.parse(localStorage.getItem("inv_config") || JSON.stringify({
  negocio: "Mi Negocio", direccion: "", telefono: "", moneda: "CLP", rut: "",
  notifStockBajo: true, notifVentas: true, stockMinimo: 5, tema: "claro",
  mpAccessToken: "", mpPublicKey: "",
  siiModo: "simulado", siiRut: "", siiClave: "",
}));
const saveConfig  = (c) => localStorage.setItem("inv_config", JSON.stringify(c));
const getCatIcons = () => JSON.parse(localStorage.getItem("inv_catIcons") || JSON.stringify(defaultCatIcons));
const saveCatIcons= (c) => localStorage.setItem("inv_catIcons", JSON.stringify(c));
const getDarkMode = () => localStorage.getItem("inv_dark") === "true";
const saveDarkMode= (v) => localStorage.setItem("inv_dark", String(v));

// ─── MercadoPago Checkout Pro (Producción) ────────────────────────────────────
// Crea preferencia real en el backend Node.js/Express
const crearPreferenciaMP = async (items, total, ventaId, negocio) => {
  const res = await fetch(`${API}/api/mp/crear-preferencia`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      items: items.map(i => ({
        title: i.nombre,
        quantity: i.cantidad,
        unit_price: i.precio,
        currency_id: "CLP",
      })),
      external_reference: String(ventaId),
      negocio: negocio || "Mi Negocio",
    }),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || "Error al crear preferencia MP");
  return data; // { id, init_point }
};

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

// Genera número de boleta único
const generarNumeroBoleta = () => {
  const boletas = getBoletas();
  const ultimo = boletas.length > 0 ? Math.max(...boletas.map(b => b.numero || 0)) : 0;
  return ultimo + 1;
};

// ─── Dark Mode CSS ──────────────────────────────────────────────────────────── 
const getDarkVars = () => `
  :root {
    --bg-main: #0f1117;
    --bg-card: #1a1d2e;
    --bg-card2: #1e2235;
    --bg-hover: #252840;
    --bg-input: #1a1d2e;
    --border: #2d3158;
    --border2: #343860;
    --text-primary: #e8eaf6;
    --text-secondary: #9ca3af;
    --text-muted: #6b7280;
    --sidebar-bg: #13152a;
    --header-bg: #13152a;
    --shadow: rgba(0,0,0,0.4);
    --accent: #4c6ef5;
    --accent-bg: rgba(76,110,245,0.15);
  }
`;
const getLightVars = () => `
  :root {
    --bg-main: #f4f5fb;
    --bg-card: #ffffff;
    --bg-card2: #f9fafb;
    --bg-hover: #f0f2ff;
    --bg-input: #fafafa;
    --border: #eef0f7;
    --border2: #e5e7eb;
    --text-primary: #1a1a2e;
    --text-secondary: #6b7280;
    --text-muted: #9ca3af;
    --sidebar-bg: #ffffff;
    --header-bg: #ffffff;
    --shadow: rgba(0,0,0,0.04);
    --accent: #3b5bdb;
    --accent-bg: #e8f0fe;
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
  .nav-btn.active { background: linear-gradient(135deg, #3b5bdb, #4c6ef5) !important; color: #fff !important; box-shadow: 0 4px 12px rgba(59,91,219,0.3); }
  .card-hover { transition: box-shadow 0.2s, transform 0.2s; }
  .card-hover:hover { box-shadow: 0 8px 24px var(--shadow); transform: translateY(-2px); }
  .btn-primary { background: linear-gradient(135deg, #3b5bdb, #4c6ef5); color: #fff; border: none; cursor: pointer; font-weight: 600; transition: all 0.15s; }
  .btn-primary:hover { box-shadow: 0 4px 12px rgba(59,91,219,0.4); transform: translateY(-1px); }
  .btn-danger { background: #fff1f2; color: #e03131; border: 1px solid #fecaca; cursor: pointer; transition: all 0.15s; }
  .btn-danger:hover { background: #e03131; color: #fff; }
  .btn-success { background: #ecfdf5; color: #059669; border: 1px solid #a7f3d0; cursor: pointer; transition: all 0.15s; font-weight: 600; }
  .btn-success:hover { background: #059669; color: #fff; }
  .btn-mp { background: linear-gradient(135deg, #009ee3, #00b4e6); color: #fff; border: none; cursor: pointer; font-weight: 700; transition: all 0.15s; border-radius: 10px; }
  .btn-mp:hover { box-shadow: 0 4px 14px rgba(0,158,227,0.45); transform: translateY(-1px); }
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
  .stat-card { background: var(--bg-card); border-radius: 16px; padding: 20px 22px; border: 1px solid var(--border); box-shadow: 0 2px 8px var(--shadow); }
  @keyframes pulse { 0%,100% { opacity: 1; } 50% { opacity: 0.5; } }
  .pulse { animation: pulse 1.5s infinite; }
  @keyframes spin { to { transform: rotate(360deg); } }
  .spin { animation: spin 1s linear infinite; }
  .boleta-print { background: #fff !important; color: #000 !important; }
  @media print { .no-print { display: none !important; } }
  .step-line { width: 2px; background: var(--border2); margin: 0 auto; }
  .step-dot { width: 10px; height: 10px; border-radius: 50%; flex-shrink: 0; }

  /* ── INICIO MÓVIL REY DEL HUEVO ── */
  .rey-mobile-home { display: none; }
  .rey-home-shell { max-width: 520px; margin: 0 auto; }
  .rey-home-hero {
    position: relative; overflow: hidden; border-radius: 0 0 28px 28px;
    padding: 22px 18px 25px; color: #351800;
    background: linear-gradient(135deg, #ffc400 0%, #ffda52 100%);
    box-shadow: 0 10px 28px rgba(226, 164, 0, .2);
  }
  .rey-home-hero::after {
    content: ''; position: absolute; width: 150px; height: 150px; border-radius: 50%;
    right: -48px; top: -62px; background: rgba(255,255,255,.25);
  }
  .rey-home-brand { display: flex; align-items: center; gap: 12px; position: relative; z-index: 1; }
  .rey-home-logo { width: 55px; height: 55px; border-radius: 18px; background: rgba(255,255,255,.78); display:flex; align-items:center; justify-content:center; font-size:31px; box-shadow:0 5px 14px rgba(120,60,0,.12); }
  .rey-home-greeting { font-size: 21px; line-height: 1.15; font-weight: 800; color: #c9141e; margin: 0; }
  .rey-home-date { margin: 5px 0 0; font-size: 12px; font-weight: 600; color: rgba(53,24,0,.68); text-transform: capitalize; }
  .rey-mobile-body { padding: 14px 14px 22px; }
  .rey-section-title { font-size: 17px; font-weight: 800; color: var(--text-primary); margin: 5px 2px 11px; }
  .rey-profit-card { border-radius: 24px; padding: 19px; background: linear-gradient(145deg,#fff9dd,#fff1ac); border: 1px solid #ffe376; box-shadow: 0 8px 24px rgba(113,75,0,.10); }
  .rey-profit-top { display:flex; align-items:center; gap:12px; }
  .rey-profit-icon { width: 50px; height: 50px; border-radius:16px; background:#ffc400; display:flex; align-items:center; justify-content:center; color:#a20c15; }
  .rey-profit-label { font-size: 12px; font-weight: 700; color:#795b00; margin:0 0 3px; }
  .rey-profit-value { font-size: 32px; letter-spacing:-1px; line-height:1.05; font-weight: 800; color:#c9141e; margin:0; }
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
    .stat-card { padding: 14px 16px !important; }
    .dashboard-grid { grid-template-columns: 1fr 1fr !important; gap: 10px !important; }
    .dashboard-charts { grid-template-columns: 1fr !important; }
    .mobile-topbar { padding: 0 14px !important; height: 54px !important; }
    .mobile-topbar h1 { font-size: 16px !important; }
    .mobile-main { padding: 14px !important; }
    .mobile-modal { width: calc(100vw - 24px) !important; max-width: 100% !important; max-height: 85vh !important; overflow-y: auto !important; border-radius: 20px 20px 16px 16px !important; }
    .mobile-modal-full { width: 100vw !important; height: 100vh !important; border-radius: 0 !important; }
    .mobile-bottom-sheet { position: fixed !important; bottom: 0 !important; left: 0 !important; right: 0 !important; border-radius: 20px 20px 0 0 !important; max-height: 92vh !important; overflow-y: auto !important; }
    .products-grid { grid-template-columns: 1fr 1fr !important; gap: 10px !important; }
    .cat-filters { overflow-x: auto !important; flex-wrap: nowrap !important; padding-bottom: 4px !important; -webkit-overflow-scrolling: touch; scrollbar-width: none; }
    .cat-filters::-webkit-scrollbar { display: none; }
    .page-header { flex-direction: column !important; align-items: flex-start !important; gap: 10px !important; margin-bottom: 14px !important; }
    .page-header-actions { width: 100% !important; display: flex !important; justify-content: flex-end !important; }
    .ventas-grid { grid-template-columns: 1fr !important; }
    .stats-grid { grid-template-columns: 1fr 1fr !important; gap: 10px !important; }
    .config-layout { grid-template-columns: 1fr !important; }
    .config-nav { flex-direction: row !important; overflow-x: auto !important; flex-wrap: nowrap !important; gap: 6px !important; padding: 12px !important; -webkit-overflow-scrolling: touch; }
    .config-nav::-webkit-scrollbar { display: none; }
    .config-nav-item { white-space: nowrap !important; padding: 8px 12px !important; font-size: 12px !important; }
    .stats-grid { grid-template-columns: 1fr 1fr !important; gap: 10px !important; }
    .chart-section { grid-template-columns: 1fr !important; }
    .boleta-print-modal { width: 100vw !important; height: 100vh !important; padding: 16px !important; border-radius: 0 !important; }
    input, select, textarea { font-size: 16px !important; }
    .table-scroll { overflow-x: auto !important; -webkit-overflow-scrolling: touch; }
    .notif-panel { right: -4px !important; width: calc(100vw - 16px) !important; max-width: 340px !important; }
    .dashboard-stat-value { font-size: 20px !important; }

    /* Ajustes móviles generales */
    .mobile-main { overflow-x: hidden !important; }
    .mobile-main > div, .mobile-main section, .mobile-main article { min-width: 0 !important; max-width: 100% !important; }
    .mobile-main * { box-sizing: border-box; }

    /* Configuración: pestañas legibles y sin corte lateral */
    .config-layout { width: 100% !important; gap: 12px !important; }
    .config-layout > div:first-child { width: 100% !important; padding: 10px !important; overflow: hidden !important; }
    .config-nav {
      display: grid !important;
      grid-template-columns: repeat(2, minmax(0, 1fr)) !important;
      gap: 8px !important;
      overflow: visible !important;
      padding: 0 !important;
      width: 100% !important;
    }
    .config-nav > div:first-child { grid-column: 1 / -1 !important; margin-bottom: 2px !important; }
    .config-nav-item {
      width: 100% !important; min-width: 0 !important; min-height: 48px !important;
      padding: 10px !important; white-space: normal !important; line-height: 1.15 !important;
      justify-content: flex-start !important; text-align: left !important; font-size: 11px !important;
    }
    .config-layout .fade-in > div { padding: 16px !important; width: 100% !important; }
    .config-layout input, .config-layout select, .config-layout textarea { width: 100% !important; }

    /* Ventas: cifras, formulario e historial en una sola columna */
    .mobile-sales-page { width: 100% !important; overflow-x: hidden !important; }
    .mobile-sales-summary { grid-template-columns: 1fr !important; gap: 10px !important; }
    .mobile-sales-summary > div { width: 100% !important; padding: 16px !important; }
    .mobile-sales-summary .mono { font-size: clamp(19px, 7vw, 28px) !important; overflow-wrap: anywhere !important; }
    .mobile-sales-layout { grid-template-columns: 1fr !important; width: 100% !important; gap: 12px !important; }
    .mobile-sales-layout > div { width: 100% !important; max-width: 100% !important; padding: 16px !important; overflow: hidden !important; }
    .mobile-sales-page input, .mobile-sales-page select { width: 100% !important; max-width: 100% !important; }
    .mobile-sales-page .cat-filters { display: grid !important; grid-template-columns: repeat(2,minmax(0,1fr)) !important; overflow: visible !important; }
    .mobile-sales-page .cat-filters > * { width: 100% !important; min-width: 0 !important; }

    /* Boletas / recibos */
    .mobile-receipts-page { width: 100% !important; overflow-x: hidden !important; }
    .mobile-receipt-summary { grid-template-columns: 1fr !important; gap: 10px !important; }
    .mobile-receipt-list { padding: 14px !important; width: 100% !important; }
    .mobile-receipt-row {
      display: grid !important;
      grid-template-columns: 44px minmax(0,1fr) !important;
      gap: 10px !important; padding: 13px !important; width: 100% !important;
    }
    .mobile-receipt-row > div:last-child { grid-column: 2 !important; text-align: left !important; }
    .mobile-receipt-row .mono { font-size: 17px !important; overflow-wrap: anywhere !important; }
    .mobile-receipt-row .badge { max-width: 100% !important; white-space: normal !important; }

    /* Mermas / gastos */
    .mobile-loss-page > div:first-child { flex-direction: column !important; align-items: stretch !important; gap: 12px !important; }
    .mobile-loss-page > div:first-child button { width: 100% !important; justify-content: center !important; min-height: 48px !important; }
    .mobile-loss-page [style*="display: flex"] { min-width: 0 !important; }

    /* Evitar textos y montos saliendo de las tarjetas */
    .mono { overflow-wrap: anywhere; word-break: break-word; }
    button, input, select, textarea { max-width: 100%; }
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
  .bottom-nav-btn.active svg { filter: drop-shadow(0 2px 4px rgba(59,91,219,0.4)); }
  .bottom-nav-icon { width: 32px; height: 26px; display: flex; align-items: center; justify-content: center; border-radius: 8px; transition: background 0.15s; }
  .more-menu-overlay { position: fixed; inset: 0; z-index: 190; background: rgba(0,0,0,0.5); backdrop-filter: blur(3px); }
  .more-menu-panel { position: fixed; bottom: 76px; left: 8px; right: 8px; z-index: 195; border-radius: 18px; padding: 14px; box-shadow: 0 -8px 40px rgba(0,0,0,0.2); display: grid; grid-template-columns: repeat(3, 1fr); gap: 8px; }
  .more-menu-btn { display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 6px; padding: 14px 8px; border-radius: 14px; border: none; cursor: pointer; font-family: 'Sora', sans-serif; font-size: 11px; font-weight: 600; transition: all 0.15s; }
  .more-menu-btn:active { transform: scale(0.94); }
`;

// ─── API helpers ──────────────────────────────────────────────────────────────
const API = import.meta.env.VITE_API_URL || "https://inventario-backend-ftw6.onrender.com";
const authHeaders = (user, json = false) => ({
  ...(json ? { "Content-Type": "application/json" } : {}),
  "x-usuario": user?.usuario || "",
  "x-clave": user?._clave || "",
});
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
  const total = boleta.total;

  const handlePrint = () => window.print();

  const metodoPagoLabel = {
    "Efectivo": "💵 EFECTIVO",
    "Débito": "💳 DÉBITO",
    "Crédito": "💳 CRÉDITO",
    "Transferencia": "🔁 TRANSFERENCIA",
    "MercadoPago": "📱 MERCADOPAGO",
  }[boleta.metodoPago] || boleta.metodoPago;

  const ticketCSS = `
    @media print {
      body * { visibility: hidden !important; }
      #ticket-print, #ticket-print * { visibility: visible !important; }
      #ticket-print {
        position: fixed !important;
        top: 0; left: 0;
        width: 72mm !important;
        font-family: 'Courier New', monospace !important;
        font-size: 10px !important;
        color: #000 !important;
        background: #fff !important;
        padding: 4mm !important;
      }
    }
  `;

  return (
    <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.6)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 200, backdropFilter: "blur(6px)" }}>
      <style>{ticketCSS}</style>
      <div className="fade-in" style={{ background: darkMode ? "#1a1d2e" : "#fff", borderRadius: 20, width: 460, maxHeight: "90vh", overflow: "auto", boxShadow: "0 30px 80px rgba(0,0,0,0.35)" }}>
        {/* Header modal */}
        <div className="no-print" style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "16px 20px", borderBottom: `1px solid ${darkMode ? "#2d3158" : "#f0f0f4"}` }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <Receipt size={18} color="#3b5bdb" />
            <span style={{ fontWeight: 800, fontSize: 15, color: darkMode ? "#e8eaf6" : "#1a1a2e" }}>Ticket #{String(boleta.numero).padStart(6, "0")}</span>
          </div>
          <div style={{ display: "flex", gap: 8 }}>
            <button onClick={handlePrint} style={{ padding: "7px 14px", borderRadius: 8, border: `1px solid ${darkMode ? "#2d3158" : "#e5e7eb"}`, background: darkMode ? "#252840" : "#f9fafb", cursor: "pointer", fontSize: 12, color: darkMode ? "#e8eaf6" : "#374151", display: "flex", alignItems: "center", gap: 5, fontFamily: "inherit" }}>
              <Printer size={13} /> Imprimir
            </button>
            <button onClick={onClose} style={{ background: darkMode ? "#252840" : "#f3f4f6", border: "none", cursor: "pointer", width: 32, height: 32, borderRadius: 8, display: "flex", alignItems: "center", justifyContent: "center" }}>
              <X size={16} color={darkMode ? "#9ca3af" : "#6b7280"} />
            </button>
          </div>
        </div>

        {/* Ticket imprimible */}
        <div id="ticket-print" style={{ padding: "20px 24px", fontFamily: "'Courier New', monospace", fontSize: 12, color: darkMode ? "#e8eaf6" : "#000", background: darkMode ? "#1a1d2e" : "#fff" }}>
          {/* Encabezado negocio */}
          <div style={{ textAlign: "center", marginBottom: 12, borderBottom: `2px dashed ${darkMode ? "#2d3158" : "#ccc"}`, paddingBottom: 12 }}>
            {config.logoNegocio && (
              <img src={config.logoNegocio} alt="logo" style={{ width: 60, height: 60, objectFit: "cover", borderRadius: 10, marginBottom: 8, display: "block", margin: "0 auto 8px" }} />
            )}
            <div style={{ fontSize: 18, fontWeight: 900, letterSpacing: 1, marginBottom: 4 }}>{(config.negocio || "MI NEGOCIO").toUpperCase()}</div>
            {config.direccion && <div style={{ fontSize: 11, color: darkMode ? "#9ca3af" : "#444" }}>{config.direccion}</div>}
            {config.telefono && <div style={{ fontSize: 11, color: darkMode ? "#9ca3af" : "#444" }}>Tel: {config.telefono}</div>}
            {config.rut && <div style={{ fontSize: 11, color: darkMode ? "#9ca3af" : "#444" }}>RUT: {config.rut}</div>}
          </div>

          {/* Número y fecha */}
          <div style={{ textAlign: "center", marginBottom: 10, borderBottom: `1px dashed ${darkMode ? "#2d3158" : "#ccc"}`, paddingBottom: 10 }}>
            <div style={{ fontSize: 13, fontWeight: 700 }}>TICKET DE VENTA</div>
            <div style={{ fontSize: 11, color: darkMode ? "#9ca3af" : "#555" }}>N° {String(boleta.numero).padStart(8, "0")}</div>
            <div style={{ fontSize: 11 }}>
              {(() => {
                const d = boleta.timestamp ? new Date(boleta.timestamp) : new Date();
                const fecha = d.toLocaleDateString("es-CL");
                const hora = d.toLocaleTimeString("es-CL", { hour: "2-digit", minute: "2-digit", second: "2-digit" });
                return `${fecha}  ${hora}`;
              })()}
            </div>
          </div>

          {/* Productos */}
          <div style={{ marginBottom: 10 }}>
            {/* Cabecera tabla */}
            <div style={{ display: "flex", justifyContent: "space-between", fontWeight: 700, borderBottom: `1px solid ${darkMode ? "#2d3158" : "#ccc"}`, paddingBottom: 4, marginBottom: 4, fontSize: 11 }}>
              <span style={{ flex: 2 }}>PRODUCTO</span>
              <span style={{ textAlign: "center", flex: 1 }}>CANT</span>
              <span style={{ textAlign: "right", flex: 1 }}>P.UNIT</span>
              <span style={{ textAlign: "right", flex: 1 }}>TOTAL</span>
            </div>
            {boleta.items.map((item, i) => (
              <div key={i} style={{ marginBottom: 4 }}>
                <div style={{ fontSize: 11, fontWeight: 600, color: darkMode ? "#e8eaf6" : "#000", marginBottom: 2 }}>
                  {item.nombre.toUpperCase()}
                </div>
                <div style={{ display: "flex", justifyContent: "space-between", fontSize: 11, color: darkMode ? "#9ca3af" : "#333" }}>
                  <span style={{ flex: 2 }}></span>
                  <span style={{ textAlign: "center", flex: 1 }}>{item.cantidad}</span>
                  <span style={{ textAlign: "right", flex: 1 }}>${Number(item.precio).toLocaleString("es-CL")}</span>
                  <span style={{ textAlign: "right", flex: 1, fontWeight: 700, color: darkMode ? "#e8eaf6" : "#000" }}>${Number(item.subtotal).toLocaleString("es-CL")}</span>
                </div>
              </div>
            ))}
          </div>

          {/* Separador */}
          <div style={{ borderTop: `2px dashed ${darkMode ? "#2d3158" : "#ccc"}`, marginBottom: 10 }} />

          {/* Totales */}
          <div style={{ marginBottom: 10 }}>
            <div style={{ display: "flex", justifyContent: "space-between", fontSize: 11, marginBottom: 3 }}>
              <span>SUBTOTAL NETO:</span>
              <span>${Math.round(total / 1.19).toLocaleString("es-CL")}</span>
            </div>
            <div style={{ display: "flex", justifyContent: "space-between", fontSize: 11, marginBottom: 3 }}>
              <span>IVA (19%):</span>
              <span>${Math.round(total - total / 1.19).toLocaleString("es-CL")}</span>
            </div>
            <div style={{ borderTop: `1px solid ${darkMode ? "#2d3158" : "#000"}`, marginTop: 4, paddingTop: 4, display: "flex", justifyContent: "space-between", fontSize: 15, fontWeight: 900 }}>
              <span>TOTAL:</span>
              <span>${total.toLocaleString("es-CL")}</span>
            </div>
          </div>

          {/* Método de pago */}
          <div style={{ borderTop: `1px dashed ${darkMode ? "#2d3158" : "#ccc"}`, paddingTop: 8, marginBottom: 8 }}>
            <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12, fontWeight: 700 }}>
              <span>PAGO:</span>
              <span>{metodoPagoLabel}</span>
            </div>
            {boleta.mpPaymentId && (
              <div style={{ fontSize: 10, color: darkMode ? "#9ca3af" : "#555", marginTop: 3 }}>
                REF MP: {boleta.mpPaymentId}
              </div>
            )}
          </div>

          {/* Pie */}
          <div style={{ borderTop: `2px dashed ${darkMode ? "#2d3158" : "#ccc"}`, paddingTop: 10, textAlign: "center" }}>
            <div style={{ fontSize: 12, fontWeight: 700, marginBottom: 4 }}>¡GRACIAS POR SU COMPRA!</div>
            <div style={{ fontSize: 10, color: darkMode ? "#9ca3af" : "#555", marginBottom: 2 }}>Vendedor: {boleta.vendedor}</div>
            <div style={{ fontSize: 10, color: darkMode ? "#9ca3af" : "#555" }}>Documento no tributario</div>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Componente: Checkout Pro MercadoPago (Producción) ────────────────────────
function MPCheckoutModal({ carrito, total, config, darkMode, currentUser, onPagoConfirmado, onClose }) {
  const [step, setStep] = useState("resumen"); // resumen | creando | abierto | esperando | confirmado | error
  const [mpData, setMpData] = useState(null);
  const [error, setError] = useState("");
  const ventaId = useRef(Date.now());
  const pollingRef = useRef(null);

  const iniciarPago = async () => {
    setStep("creando");
    setError("");
    try {
      const pref = await crearPreferenciaMP(carrito, total, ventaId.current, config.negocio);
      setMpData(pref);
      setStep("abierto");
      // Abrir Checkout Pro en nueva pestaña
      window.open(pref.init_point, "_blank");
      // Iniciar polling para verificar pago
      iniciarPolling(ventaId.current);
    } catch (e) {
      setStep("error");
      setError(e.message || "Error al conectar con MercadoPago");
    }
  };

  const iniciarPolling = (extRef) => {
    // Polling cada 5s al backend para verificar si el pago fue confirmado
    pollingRef.current = setInterval(async () => {
      try {
        const res = await fetch(`${API}/api/mp/verificar-pago?external_reference=${extRef}`);
        const data = await res.json();
        if (data.status === "approved") {
          clearInterval(pollingRef.current);
          setStep("confirmado");
          onPagoConfirmado({
            id: data.payment_id || `MP_${extRef}`,
            status: "approved",
            status_detail: "accredited",
            external_reference: String(extRef),
            transaction_amount: total,
            date_approved: new Date().toISOString(),
          });
        } else if (data.status === "rejected") {
          clearInterval(pollingRef.current);
          setStep("error");
          setError("Pago rechazado por MercadoPago");
        }
      } catch (_) { /* seguir polling */ }
    }, 5000);
    // Timeout de 10 minutos
    setTimeout(() => {
      if (pollingRef.current) {
        clearInterval(pollingRef.current);
        setStep("error");
        setError("Tiempo de espera agotado. Si pagaste, recarga la página.");
      }
    }, 600000);
  };

  useEffect(() => {
    return () => { if (pollingRef.current) clearInterval(pollingRef.current); };
  }, []);

  const cardStyle = { background: darkMode ? "#1e2235" : "#fff", borderRadius: 20, padding: 28, width: 520, boxShadow: "0 30px 80px rgba(0,0,0,0.35)" };

  return (
    <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.6)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 150, backdropFilter: "blur(6px)" }}>
      <div className="fade-in" style={cardStyle}>
        {/* Header */}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 24 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <div style={{ background: "linear-gradient(135deg, #009ee3, #00b4e6)", borderRadius: 12, width: 42, height: 42, display: "flex", alignItems: "center", justifyContent: "center" }}>
              <CreditCard size={20} color="#fff" />
            </div>
            <div>
              <p style={{ margin: 0, fontWeight: 800, fontSize: 16, color: darkMode ? "#e8eaf6" : "#1a1a2e" }}>MercadoPago</p>
              <p style={{ margin: 0, fontSize: 11, color: "#059669", fontWeight: 600 }}>🟢 Checkout Pro — Producción</p>
            </div>
          </div>
          {(step === "resumen" || step === "error") && (
            <button onClick={() => { if (pollingRef.current) clearInterval(pollingRef.current); onClose(); }} style={{ background: darkMode ? "#252840" : "#f3f4f6", border: "none", cursor: "pointer", width: 32, height: 32, borderRadius: 8, display: "flex", alignItems: "center", justifyContent: "center" }}>
              <X size={16} color={darkMode ? "#9ca3af" : "#6b7280"} />
            </button>
          )}
        </div>

        {/* Resumen */}
        {step === "resumen" && (
          <>
            <div style={{ background: darkMode ? "#252840" : "#f9fafb", borderRadius: 14, padding: 16, marginBottom: 20 }}>
              <p style={{ margin: "0 0 12px", fontSize: 12, fontWeight: 700, color: darkMode ? "#9ca3af" : "#6b7280", textTransform: "uppercase", letterSpacing: "0.5px" }}>Resumen del pago</p>
              {carrito.map((item, i) => (
                <div key={i} style={{ display: "flex", justifyContent: "space-between", marginBottom: 6, fontSize: 13, color: darkMode ? "#e8eaf6" : "#374151" }}>
                  <span>{item.img} {item.nombre} ×{item.cantidad}</span>
                  <span className="mono" style={{ fontWeight: 600 }}>{fmt(item.subtotal)}</span>
                </div>
              ))}
              <div style={{ borderTop: `2px solid ${darkMode ? "#2d3158" : "#e5e7eb"}`, marginTop: 12, paddingTop: 12, display: "flex", justifyContent: "space-between" }}>
                <span style={{ fontWeight: 800, fontSize: 16, color: darkMode ? "#e8eaf6" : "#1a1a2e" }}>Total</span>
                <span style={{ fontWeight: 800, fontSize: 20, color: "#10b981" }} className="mono">{fmt(total)}</span>
              </div>
            </div>
            <div style={{ background: "#f0f9ff", border: "1.5px solid #bae6fd", borderRadius: 10, padding: "12px 16px", marginBottom: 20, fontSize: 13, color: "#0369a1" }}>
              🔒 Pago seguro. El cliente puede pagar con saldo MP, débito, crédito o transferencia. Se abrirá MercadoPago en una nueva ventana.
            </div>
            <button onClick={iniciarPago} className="btn-mp" style={{ width: "100%", padding: "14px", fontSize: 15, fontWeight: 800 }}>
              Cobrar {fmt(total)} con MercadoPago
            </button>
          </>
        )}

        {/* Creando preferencia */}
        {step === "creando" && (
          <div style={{ textAlign: "center", padding: "30px 0" }}>
            <div style={{ width: 60, height: 60, borderRadius: "50%", background: "#e0f2fe", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 20px" }}>
              <RefreshCw size={28} color="#009ee3" className="spin" />
            </div>
            <p style={{ margin: 0, fontWeight: 700, fontSize: 16, color: darkMode ? "#e8eaf6" : "#1a1a2e" }}>Creando preferencia de pago...</p>
            <p style={{ margin: "8px 0 0", fontSize: 13, color: darkMode ? "#9ca3af" : "#6b7280" }}>Conectando con MercadoPago</p>
          </div>
        )}

        {/* Checkout abierto — esperando pago */}
        {step === "abierto" && (
          <div style={{ textAlign: "center", padding: "30px 0" }}>
            <div style={{ width: 60, height: 60, borderRadius: "50%", background: "#f0f9ff", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 20px" }}>
              <ExternalLink size={28} color="#009ee3" />
            </div>
            <p style={{ margin: "0 0 8px", fontWeight: 800, fontSize: 16, color: darkMode ? "#e8eaf6" : "#1a1a2e" }}>Checkout abierto en nueva ventana</p>
            <p style={{ margin: "0 0 20px", fontSize: 13, color: darkMode ? "#9ca3af" : "#6b7280" }}>El cliente debe completar el pago en MercadoPago.</p>
            <div style={{ display: "flex", alignItems: "center", gap: 8, justifyContent: "center", marginBottom: 20 }}>
              <RefreshCw size={14} color="#009ee3" className="spin" />
              <span style={{ fontSize: 12, color: "#009ee3", fontWeight: 600 }}>Verificando pago automáticamente...</span>
            </div>
            {mpData && (
              <button onClick={() => window.open(mpData.init_point, "_blank")} className="btn-mp" style={{ padding: "10px 20px", fontSize: 13 }}>
                Reabrir ventana de pago
              </button>
            )}
            <div style={{ marginTop: 16 }}>
              <button onClick={() => { if (pollingRef.current) clearInterval(pollingRef.current); onClose(); }} style={{ background: "none", border: "none", color: darkMode ? "#6b7280" : "#9ca3af", cursor: "pointer", fontSize: 12, fontFamily: "inherit" }}>
                Cancelar
              </button>
            </div>
          </div>
        )}

        {/* Confirmado */}
        {step === "confirmado" && (
          <div style={{ textAlign: "center", padding: "20px 0" }}>
            <div style={{ width: 70, height: 70, borderRadius: "50%", background: "#ecfdf5", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 20px", boxShadow: "0 0 0 10px #ecfdf520" }}>
              <CheckCircle size={36} color="#10b981" />
            </div>
            <p style={{ margin: "0 0 6px", fontWeight: 800, fontSize: 18, color: "#059669" }}>¡Pago Confirmado!</p>
            <p style={{ margin: "0 0 20px", fontSize: 13, color: darkMode ? "#9ca3af" : "#6b7280" }}>Pago verificado con MercadoPago ✓</p>
            <p style={{ fontSize: 13, color: "#059669", fontWeight: 600 }}>🧾 Generando boleta automáticamente...</p>
          </div>
        )}

        {/* Error */}
        {step === "error" && (
          <div style={{ textAlign: "center", padding: "20px 0" }}>
            <div style={{ width: 60, height: 60, borderRadius: "50%", background: "#fff1f2", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 20px" }}>
              <AlertCircle size={30} color="#e03131" />
            </div>
            <p style={{ margin: "0 0 8px", fontWeight: 700, fontSize: 16, color: "#e03131" }}>Error en el pago</p>
            <p style={{ margin: "0 0 20px", fontSize: 13, color: darkMode ? "#9ca3af" : "#6b7280" }}>{error}</p>
            <div style={{ display: "flex", gap: 10 }}>
              <button onClick={onClose} style={{ flex: 1, padding: "11px", borderRadius: 10, border: `1.5px solid ${darkMode ? "#2d3158" : "#e5e7eb"}`, background: darkMode ? "#252840" : "#fff", cursor: "pointer", fontSize: 14, color: darkMode ? "#e8eaf6" : "#6b7280", fontWeight: 600, fontFamily: "inherit" }}>Cancelar</button>
              <button onClick={() => { setStep("resumen"); setError(""); }} className="btn-mp" style={{ flex: 1, padding: "11px", fontSize: 14 }}>Reintentar</button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Admin Panel ──────────────────────────────────────────────────────────────
function AdminPanel({ onBack, darkMode }) {
  const [usuario, setUsuario] = useState("");
  const [clave, setClave] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [adminUser, setAdminUser] = useState(null);
  const [adminClave, setAdminClave] = useState("");
  const [usuarios, setUsuarios] = useState([]);
  const [accionMsg, setAccionMsg] = useState("");

  const inp = {
    width: "100%", padding: "10px 13px", borderRadius: 10, border: "1.5px solid #2d3458",
    fontSize: 13, outline: "none", background: "#1a1f35", color: "#e5e7eb", fontFamily: "Sora, sans-serif",
  };

  const handleLogin = async () => {
    setError(""); setLoading(true);
    try {
      const data = await apiPost("/api/auth/login", { usuario, clave });
      if (data.user.rol !== "gerente") { setError("Solo gerentes."); setLoading(false); return; }
      setAdminUser(data.user); setAdminClave(clave);
      const d = await apiGet("/api/users", data.user.usuario, clave);
      setUsuarios(d);
    } catch (e) { setError(e.message); }
    setLoading(false);
  };

  return (
    <div style={{ width: "100vw", height: "100vh", background: "linear-gradient(135deg, #0f1117, #1a1a2e)", display: "flex", alignItems: "center", justifyContent: "center" }}>
      <style>{getLightVars()}{css}</style>
      <div style={{ width: 460, background: "#13152a", borderRadius: 24, padding: 36, boxShadow: "0 20px 60px rgba(0,0,0,0.5)" }}>
        <button onClick={onBack} style={{ background: "none", border: "none", color: "#6b7280", cursor: "pointer", fontSize: 13, marginBottom: 20, display: "flex", alignItems: "center", gap: 6, fontFamily: "inherit" }}>← Volver</button>
        <div style={{ textAlign: "center", marginBottom: 28 }}>
          <div style={{ width: 56, height: 56, borderRadius: 16, background: "linear-gradient(135deg, #3b5bdb, #4c6ef5)", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 14px" }}>
            <Shield size={26} color="#fff" />
          </div>
          <h2 style={{ margin: 0, fontSize: 22, fontWeight: 800, color: "#e8eaf6" }}>Panel de Gerencia</h2>
        </div>
        {!adminUser ? (
          <>
            {[{ label: "Usuario", val: usuario, set: setUsuario, type: "text" }, { label: "Contraseña", val: clave, set: setClave, type: "password" }].map(({ label, val, set, type }) => (
              <div key={label} style={{ marginBottom: 14 }}>
                <label style={{ fontSize: 12, fontWeight: 600, color: "#9ca3af", display: "block", marginBottom: 6 }}>{label}</label>
                <input type={type} value={val} onChange={e => set(e.target.value)} style={inp} />
              </div>
            ))}
            {error && <div style={{ background: "#450a0a", color: "#fca5a5", fontSize: 13, padding: "10px 14px", borderRadius: 8, marginBottom: 14 }}>⚠ {error}</div>}
            <button onClick={handleLogin} disabled={loading} className="btn-primary" style={{ width: "100%", padding: "13px", borderRadius: 12, fontSize: 15, fontWeight: 700 }}>
              {loading ? "Verificando..." : "Acceder"}
            </button>
          </>
        ) : (
          <div>
            <p style={{ color: "#e8eaf6", fontWeight: 700, marginBottom: 16 }}>✓ Sesión iniciada como {adminUser.nombre}</p>
            {usuarios.map(u => (
              <div key={u.usuario} style={{ padding: "12px 16px", background: "#1e2235", borderRadius: 12, marginBottom: 8, display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                <div>
                  <span style={{ color: "#e8eaf6", fontSize: 14 }}>@{u.usuario} — <span style={{ color: u.rol === "gerente" ? "#748ffc" : "#34d399" }}>{u.rol}</span></span>
                  {u.empresa && <p style={{ margin: "3px 0 0", fontSize: 12, color: "#6b7280" }}>🏢 {u.empresa}</p>}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Auth Screen ──────────────────────────────────────────────────────────────
function AuthScreen({ onLogin, onAdmin, darkMode }) {
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
      <div style={{ width: 430, background: cardBg, borderRadius: 24, padding: "40px", boxShadow: darkMode ? "0 20px 60px rgba(0,0,0,0.5)" : "0 20px 60px rgba(59,91,219,0.15)" }} className="fade-in">
        <div style={{ textAlign: "center", marginBottom: 28 }}>
          <div style={{ width: 60, height: 60, borderRadius: 18, background: "linear-gradient(135deg, #3b5bdb, #4c6ef5)", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 14px", boxShadow: "0 8px 20px rgba(59,91,219,0.3)" }}>
            <Package size={28} color="#fff" strokeWidth={1.8} />
          </div>
          <h2 style={{ fontSize: 24, fontWeight: 800, color: textPrimary, marginBottom: 4 }}>Inventario Pro</h2>
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
            <div style={{ background: darkMode ? "#1e2235" : "#f0f2ff", borderRadius: 12, padding: "12px 16px", marginBottom: 18, fontSize: 13, color: darkMode ? "#9ca3af" : "#3b5bdb" }}>
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
              <button onClick={() => { setModo("login"); setError(""); }} style={{ background: "none", border: "none", color: "#3b5bdb", cursor: "pointer", fontSize: 13, fontFamily: "inherit" }}>
                ← Volver al login
              </button>
            </div>
          </>
        )}

        {/* ── Recuperar: ingresar código ── */}
        {modo === "recuperar-codigo" && (
          <>
            <div style={{ background: darkMode ? "#1e2235" : "#f0f2ff", borderRadius: 12, padding: "12px 16px", marginBottom: 18, fontSize: 13, color: darkMode ? "#9ca3af" : "#3b5bdb" }}>
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
              <button onClick={() => { setModo("recuperar"); setError(""); setCodigoIngresado(""); }} style={{ background: "none", border: "none", color: "#3b5bdb", cursor: "pointer", fontSize: 13, fontFamily: "inherit" }}>
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

        {/* ── Login y Registro ── */}
        {(modo === "login" || modo === "registro") && (
          <>
            {modo === "registro" && (
              <>
                {[{ label: "Nombre completo", val: nombre, set: setNombre }, { label: "Nombre de la empresa", val: empresa, set: setEmpresa }, { label: "Correo electrónico", val: correo, set: setCorreo, type: "email" }].map(({ label, val, set, type }) => (
                  <div key={label} style={{ marginBottom: 14 }}>
                    <label style={{ fontSize: 12, fontWeight: 600, color: darkMode ? "#9ca3af" : "#374151", display: "block", marginBottom: 6 }}>{label}</label>
                    <input type={type || "text"} value={val} onChange={e => set(e.target.value)} style={inp} />
                  </div>
                ))}
              </>
            )}
            {[{ label: "Usuario", val: usuario, set: setUsuario }, { label: "Contraseña", val: clave, set: setClave, type: "password" }].map(({ label, val, set, type }) => (
              <div key={label} style={{ marginBottom: 14 }}>
                <label style={{ fontSize: 12, fontWeight: 600, color: darkMode ? "#9ca3af" : "#374151", display: "block", marginBottom: 6 }}>{label}</label>
                <div style={{ position: "relative" }}>
                  <input type={type === "password" ? (showPass ? "text" : "password") : "text"} value={val} onChange={e => set(e.target.value)}
                    onKeyDown={e => e.key === "Enter" && modo === "login" && handleLogin()} style={inp} />
                  {type === "password" && (
                    <button onClick={() => setShowPass(!showPass)} style={{ position: "absolute", right: 12, top: "50%", transform: "translateY(-50%)", background: "none", border: "none", cursor: "pointer", color: darkMode ? "#6b7280" : "#9ca3af" }}>
                      {showPass ? <EyeOff size={16} /> : <Eye size={16} />}
                    </button>
                  )}
                </div>
              </div>
            ))}
            {error && <div style={{ background: "#fff1f2", color: "#e03131", fontSize: 13, padding: "10px 14px", borderRadius: 10, marginBottom: 14 }}>⚠ {error}</div>}
            <button onClick={modo === "login" ? handleLogin : handleRegistro} disabled={loading} className="btn-primary" style={{ width: "100%", padding: "13px", borderRadius: 12, fontSize: 15, fontWeight: 700, marginBottom: 12 }}>
              {loading ? "Cargando..." : modo === "login" ? "Iniciar sesión" : "Crear cuenta"}
            </button>
            {modo === "login" && (
              <div style={{ textAlign: "center", marginBottom: 8 }}>
                <button onClick={() => { setModo("recuperar"); setError(""); }} style={{ background: "none", border: "none", color: darkMode ? "#6b7280" : "#9ca3af", cursor: "pointer", fontSize: 12, fontFamily: "inherit" }}>
                  ¿Olvidaste tu contraseña?
                </button>
              </div>
            )}
            <div style={{ textAlign: "center" }}>
              <button onClick={() => { setModo(modo === "login" ? "registro" : "login"); setError(""); }} style={{ background: "none", border: "none", color: "#3b5bdb", cursor: "pointer", fontSize: 13, fontFamily: "inherit" }}>
                {modo === "login" ? "¿No tienes cuenta? Regístrate" : "¿Ya tienes cuenta? Inicia sesión"}
              </button>
            </div>
            <div style={{ textAlign: "center", marginTop: 12 }}>
              <button onClick={onAdmin} style={{ background: "none", border: "none", color: darkMode ? "#6b7280" : "#9ca3af", cursor: "pointer", fontSize: 11, fontFamily: "inherit" }}>
                🔐 Panel de Gerencia
              </button>
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

  const [currentUser, setCurrentUser] = useState(null);
  const [showAdmin, setShowAdmin] = useState(false);
  const [activeNav, setActiveNav] = useState("Dashboard");
  const [products, setProducts] = useState(initialProducts);
  const [categorias, setCategorias] = useState(initialCategorias);
  const [catIconos, setCatIconos] = useState(getCatIcons);
  const [search, setSearch] = useState("");
  const [catFilter, setCatFilter] = useState("Todos");
  const [modal, setModal] = useState(null);
  const [form, setForm] = useState({});
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [config, setConfig] = useState(getConfig);

  // Ventas & Carrito
  const [ventas, setVentas] = useState(getSales);
  const [boletas, setBoletas] = useState(getBoletas);
  const [carrito, setCarrito] = useState([]);
  const [busquedaVenta, setBusquedaVenta] = useState("");
  const [showBusquedaDropdown, setShowBusquedaDropdown] = useState(false);
  const [productoSeleccionadoVenta, setProductoSeleccionadoVenta] = useState(null);
  const [carritoCantidad, setCarritoCantidad] = useState("1");
  const [carritoError, setCarritoError] = useState("");
  const [pago, setPago] = useState("Efectivo");
  const [dineroRecibido, setDineroRecibido] = useState("");
  const [ventaError, setVentaError] = useState("");
  const [ventaExito, setVentaExito] = useState("");
  const [filtroPago, setFiltroPago] = useState("Todos");
  const busquedaRef = useRef(null);

  // MercadoPago
  const [showMPCheckout, setShowMPCheckout] = useState(false);
  const [mpProcessing, setMpProcessing] = useState(false);

  // Boletas
  const [boletaModal, setBoletaModal] = useState(null);
  const [boletaGenerando, setBoletaGenerando] = useState(false);

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
  const [formNuevoUsuario, setFormNuevoUsuario] = useState({ nombre: "", usuario: "", correo: "", clave: "", rol: "empleado" });
  const [nuevoUsuarioError, setNuevoUsuarioError] = useState("");

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

  // Búsqueda historial
  const [busquedaHistorial, setBusquedaHistorial] = useState("");
  const [fechaHistorial, setFechaHistorial] = useState("");

  // Caja
  const getCaja = () => JSON.parse(localStorage.getItem("inv_caja") || "{}");
  const saveCaja = (c) => localStorage.setItem("inv_caja", JSON.stringify(c));
  const [cajaData, setCajaData] = useState(getCaja);
  const [showCierreCaja, setShowCierreCaja] = useState(false);
  const [montoApertura, setMontoApertura] = useState("");

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
  const [stockAjuste, setStockAjuste] = useState("");
  const [stockTipo, setStockTipo] = useState("agregar"); // agregar | quitar

  const filtered = useMemo(() =>
    products.filter(p => p.nombre.toLowerCase().includes(search.toLowerCase()) && (catFilter === "Todos" || p.categoria === catFilter)),
    [products, search, catFilter]);

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
    if (activeNav === "Usuarios" && esGerente) refreshUsuarios();
  }, [activeNav]);

  // Cargar productos y categorias desde el backend
  useEffect(() => {
    if (!currentUser) return;
    const headers = authHeaders(currentUser);
    fetch(API + "/api/productos", { headers }).then(r => r.json()).then(data => {
      if (Array.isArray(data)) setProducts(data.map(p => ({ ...p, id: p.id || p._id })));
    }).catch(() => {});
    fetch(API + "/api/categorias", { headers }).then(r => r.json()).then(data => {
      if (Array.isArray(data)) {
        setCategorias(data.map(c => c.nombre));
        const icons = {};
        data.forEach(c => { if (c.icono) icons[c.nombre] = c.icono; });
        setCatIconos(icons);
      }
    }).catch(() => {});
    Promise.all([
      fetch(API + "/api/ventas", { headers }).then(r => r.ok ? r.json() : Promise.reject()),
      fetch(API + "/api/boletas", { headers }).then(r => r.ok ? r.json() : Promise.reject()),
    ]).then(([ventasNube, boletasNube]) => {
      if (Array.isArray(ventasNube)) { setVentas(ventasNube); saveSales(ventasNube); }
      if (Array.isArray(boletasNube)) { setBoletas(boletasNube); saveBoletas(boletasNube); }
    }).catch(() => {
      setVentaError("No se pudo cargar el historial desde la nube. Se muestran los datos guardados en este dispositivo.");
    });
  }, [currentUser]);

  if (!currentUser) {
    if (showAdmin) return <AdminPanel onBack={() => setShowAdmin(false)} darkMode={darkMode} />;
    return <AuthScreen onLogin={setCurrentUser} onAdmin={() => setShowAdmin(true)} darkMode={darkMode} />;
  }

  const esGerente = currentUser.rol === "gerente";
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
    { name: "Dashboard", icon: LayoutDashboard },
    { name: "Productos", icon: Package },
    { name: "Categorías", icon: Tag },
    { name: "Estadísticas", icon: BarChart2 },
    { name: "Ventas", icon: ShoppingCart },
    { name: "Boletas", icon: Receipt },
    { name: "Mermas", icon: TrendingDown },
    ...(esGerente ? [{ name: "Usuarios", icon: Users }] : []),
    { name: "Configuración", icon: Settings },
  ];

  // ── Productos ──
  const openAdd = () => { setForm({ nombre: "", categoria: categorias[0] || "", precio: "", stock: "", img: "📦", imagenUrl: "", promoActiva: false, promoCantMin: "", promoPrecio: "" }); setModal("add"); };
  const openEdit = (p) => { setForm({ ...p }); setModal("edit"); };
  const handleDeleteProd = async (id) => {
    try {
      await fetch(API + "/api/productos/" + id, { method: "DELETE" });
      setProducts(prev => prev.filter(p => p.id !== id));
    } catch (e) { alert("Error al eliminar: " + e.message); }
  };
  const handleSaveProd = async () => {
    if (!form.nombre || !form.precio || !form.stock) return;
    const data = { ...form, precio: +form.precio, stock: +form.stock };
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
      const res = await fetch(API + "/api/categorias", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ nombre, icono: "📦" }) });
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
      // Buscar el _id de la categoría desde el backend
      const res = await fetch(API + "/api/categorias");
      const cats = await res.json();
      const cat = cats.find(c => c.nombre === nombre);
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
  const handleAjustarStock = async () => {
    if (!modalStock || !stockAjuste || +stockAjuste <= 0) return;
    const cantidad = +stockAjuste;
    const nuevoStock = stockTipo === "agregar"
      ? modalStock.stock + cantidad
      : Math.max(0, modalStock.stock - cantidad);
    try {
      await fetch(API + "/api/productos/" + modalStock.id, { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ ...modalStock, stock: nuevoStock }) });
      setProducts(prev => prev.map(p => p.id === modalStock.id ? { ...p, stock: nuevoStock } : p));
      setModalStock(null); setStockAjuste("");
    } catch (e) { alert("Error: " + e.message); }
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
    const cant = +carritoCantidad;
    if (cant <= 0) { setCarritoError("Cantidad inválida."); return; }
    const yaEnCarrito = carrito.find(c => c.productoId === prod.id);
    const cantidadTotal = (yaEnCarrito?.cantidad || 0) + cant;
    if (cantidadTotal > prod.stock) { setCarritoError(`Stock insuficiente. Disponible: ${prod.stock}.`); return; }
    const enPromo = prod.promoActiva && prod.promoCantMin && prod.promoPrecio && cantidadTotal >= +prod.promoCantMin;
    const precioAplicado = enPromo ? +prod.promoPrecio / +prod.promoCantMin : prod.precio;
    const promoLabel = (prod.promoActiva && prod.promoCantMin && prod.promoPrecio) ? `${prod.promoCantMin}x${fmt(+prod.promoPrecio)}` : null;
    if (yaEnCarrito) {
      setCarrito(prev => prev.map(c => c.productoId === prod.id ? { ...c, cantidad: cantidadTotal, precio: precioAplicado, subtotal: precioAplicado * cantidadTotal, enPromo: precioAplicado !== prod.precio, promoLabel } : c));
    } else {
      setCarrito(prev => [...prev, { productoId: prod.id, nombre: prod.nombre, img: prod.img, precio: precioAplicado, precioNormal: prod.precio, cantidad: cant, subtotal: precioAplicado * cant, enPromo: precioAplicado !== prod.precio, promoLabel }]);
    }
    const stockRestante = prod.stock - cantidadTotal;
    if (stockRestante <= 2 && stockRestante >= 0) setStockWarning(`⚠️ Quedan solo ${stockRestante} unidad${stockRestante !== 1 ? "es" : ""} de "${prod.nombre}"`);
    setProductoSeleccionadoVenta(null); setBusquedaVenta(""); setCarritoCantidad("1");
  };

  const quitarDelCarrito = (productoId) => setCarrito(prev => prev.filter(c => c.productoId !== productoId));
  const cambiarCantidadCarrito = (productoId, nuevaCant) => {
    const prod = products.find(p => p.id === productoId);
    if (!prod || nuevaCant < 1 || nuevaCant > prod.stock) return;
    const precioAplicado = (prod.promoActiva && prod.promoCantMin && prod.promoPrecio && nuevaCant >= +prod.promoCantMin)
      ? +prod.promoPrecio / +prod.promoCantMin : prod.precio;
    setCarrito(prev => prev.map(c => c.productoId === productoId ? { ...c, cantidad: nuevaCant, precio: precioAplicado, subtotal: precioAplicado * nuevaCant, enPromo: precioAplicado !== prod.precio } : c));
  };
  const totalCarrito = carrito.reduce((s, c) => s + c.subtotal, 0);
  const vuelto = dineroRecibido !== "" ? (+dineroRecibido - totalCarrito) : null;

  // ── Guardar venta y boleta permanentemente en MongoDB ──
  const guardarVentaEnNube = async (nuevaVenta, mpPaymentId = null) => {
    setBoletaGenerando(true);
    const ahora = new Date();
    const nuevaBoleta = {
      numero: String(generarNumeroBoleta()),
      ventaId: String(nuevaVenta.id),
      fecha: ahora.toLocaleString("es-CL"),
      timestamp: ahora.getTime(),
      items: nuevaVenta.items,
      total: nuevaVenta.total,
      subtotal: nuevaVenta.total,
      metodoPago: nuevaVenta.pago,
      estadoPago: "confirmado",
      vendedor: nuevaVenta.usuario,
      mpPaymentId: mpPaymentId || nuevaVenta.mpPaymentId || null,
      negocio: config.negocio,
    };

    const res = await fetch(API + "/api/ventas", {
      method: "POST",
      headers: authHeaders(currentUser, true),
      body: JSON.stringify({ venta: { ...nuevaVenta, id: String(nuevaVenta.id) }, boleta: nuevaBoleta }),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || "No se pudo guardar la venta.");

    const ventaGuardada = { ...data.venta, id: String(data.venta.id) };
    const boletaGuardada = data.boleta;
    setVentas(prev => {
      const next = [ventaGuardada, ...prev.filter(v => String(v.id) !== String(ventaGuardada.id))];
      saveSales(next);
      return next;
    });
    setBoletas(prev => {
      const next = [boletaGuardada, ...prev.filter(b => String(b.ventaId) !== String(ventaGuardada.id))];
      saveBoletas(next);
      return next;
    });
    setProducts(prev => prev.map(p => {
      const item = nuevaVenta.items.find(c => String(c.productoId) === String(p.id));
      return item ? { ...p, stock: p.stock - item.cantidad } : p;
    }));
    setBoletaGenerando(false);
    return boletaGuardada;
  };

  // ── Flujo de pago completo: Efectivo/Transferencia/Débito/Crédito ──
  const handleVentaDirecta = async () => {
    setVentaError(""); setVentaExito("");
    if (carrito.length === 0) { setVentaError("Agrega al menos un producto."); return; }
    if (pago === "Efectivo" && dineroRecibido !== "" && +dineroRecibido < totalCarrito) { setVentaError("El dinero recibido es menor al total."); return; }

    const ahora = new Date();
    const nuevaVenta = {
      id: String(Date.now()), items: [...carrito], total: totalCarrito, pago,
      dineroRecibido: dineroRecibido !== "" ? +dineroRecibido : totalCarrito,
      vuelto: vuelto !== null && vuelto > 0 ? vuelto : 0,
      fecha: ahora.toLocaleString("es-CL"), timestamp: ahora.getTime(),
      usuario: currentUser.nombre, estadoPago: "confirmado",
    };

    try {
      await guardarVentaEnNube(nuevaVenta, null);
      setCarrito([]); setDineroRecibido(""); setPago("Efectivo");
      setVentaExito("✓ Venta y boleta guardadas permanentemente.");
      setTimeout(() => setVentaExito(""), 5000);
    } catch (err) {
      setBoletaGenerando(false);
      setVentaError(err.message + " No se descontó el stock.");
    }
  };

  // ── Flujo MercadoPago ──
  const handleIniciarMP = () => {
    setVentaError("");
    if (carrito.length === 0) { setVentaError("Agrega al menos un producto."); return; }
    setShowMPCheckout(true);
  };

  const handlePagoMPConfirmado = async (mpPago) => {
    const ahora = new Date();
    const ventaId = String(mpPago.external_reference || Date.now());
    const nuevaVenta = {
      id: ventaId, items: [...carrito], total: totalCarrito, pago: "MercadoPago",
      dineroRecibido: totalCarrito, vuelto: 0,
      fecha: ahora.toLocaleString("es-CL"), timestamp: ahora.getTime(),
      usuario: currentUser.nombre, estadoPago: "confirmado",
      mpPaymentId: String(mpPago.id || ""), mpStatus: mpPago.status,
    };

    try {
      const boleta = await guardarVentaEnNube(nuevaVenta, mpPago.id);
      setCarrito([]); setDineroRecibido(""); setShowMPCheckout(false);
      setBoletaModal(boleta);
      setVentaExito("✓ Pago confirmado y guardado permanentemente.");
      setTimeout(() => setVentaExito(""), 6000);
    } catch (err) {
      setBoletaGenerando(false);
      setVentaError(err.message);
    }
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
  const totalMesTransferencia = ventasMes.filter(v => v.pago === "Transferencia").reduce((s, v) => s + v.total, 0);
  const totalMesMP = ventasMes.filter(v => v.pago === "MercadoPago").reduce((s, v) => s + v.total, 0);
  const ticketPromedio = ventasMes.length > 0 ? Math.round(totalMes / ventasMes.length) : 0;

  const productosVendidosMap = {};
  ventasMes.forEach(v => {
    v.items.forEach(item => {
      if (!productosVendidosMap[item.nombre]) productosVendidosMap[item.nombre] = { nombre: item.nombre, img: item.img || "📦", cantidad: 0, ingresos: 0 };
      productosVendidosMap[item.nombre].cantidad += item.cantidad;
      productosVendidosMap[item.nombre].ingresos += item.subtotal;
    });
  });
  const productosMasVendidos = Object.values(productosVendidosMap).sort((a, b) => b.cantidad - a.cantidad);
  const barColors = ["#3b5bdb", "#4c6ef5", "#748ffc", "#91a7ff", "#bac8ff", "#dee2ff"];

  const totalEfectivo = ventas.filter(v => v.pago === "Efectivo").reduce((s, v) => s + v.total, 0);
  const totalTransferencia = ventas.filter(v => v.pago === "Transferencia").reduce((s, v) => s + v.total, 0);
  const totalMP = ventas.filter(v => v.pago === "MercadoPago").reduce((s, v) => s + v.total, 0);
  const totalGeneral = totalEfectivo + totalTransferencia + totalMP;


  // Ganancias reales del inicio móvil: ventas menos costo actual de cada producto.
  // Si una venta ya trae costo guardado, se utiliza ese valor primero.
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
    const cantidad = Number(item.cantidad || 0);
    const ingreso = Number(item.subtotal ?? (Number(item.precio || 0) * cantidad));
    const costoUnitario = Number(item.costo ?? item.precioCosto ?? costoProductoPorNombre.get(String(item.nombre || "").trim().toLowerCase()) ?? 0);
    return acc + ingreso - (costoUnitario * cantidad);
  }, 0);
  const fechaVentaClave = (venta) => fechaLocalClave(venta.timestamp || venta.createdAt || venta.fechaISO || venta.fecha);
  const gananciasHoy = ventas.filter(v => fechaVentaClave(v) === hoyClave).reduce((sum, v) => sum + gananciaVenta(v), 0);
  const gananciasAyer = ventas.filter(v => fechaVentaClave(v) === ayerClave).reduce((sum, v) => sum + gananciaVenta(v), 0);
  const diferenciaGanancias = gananciasHoy - gananciasAyer;
  const porcentajeGanancias = gananciasAyer > 0 ? (diferenciaGanancias / gananciasAyer) * 100 : (gananciasHoy > 0 ? 100 : 0);
  const saludoHora = hoyDate.getHours() < 12 ? "Buenos días" : hoyDate.getHours() < 19 ? "Buenas tardes" : "Buenas noches";
  const fechaInicio = hoyDate.toLocaleDateString("es-CL", { weekday: "long", day: "numeric", month: "long" });
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
  const handleEditarUsuario = (u) => { setFormUsuario({ ...u, nuevaClave: "" }); setModalUsuario("edit"); setUsuarioError(""); };
  const handleGuardarUsuario = async () => {
    setUsuarioError("");
    try {
      await apiPut(`/api/users/${formUsuario.usuario}`, { nombre: formUsuario.nombre, rol: formUsuario.rol, correo: formUsuario.correo, nuevaClave: formUsuario.nuevaClave || undefined }, currentUser.usuario, currentUser._clave);
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
    try {
      const res = await fetch(`${API}/api/users`, { method: "POST", headers: { "Content-Type": "application/json", "x-admin-user": currentUser.usuario, "x-admin-clave": currentUser._clave }, body: JSON.stringify(formNuevoUsuario) });
      const d = await res.json();
      if (!res.ok) { setNuevoUsuarioError(d.error); return; }
      await refreshUsuarios(); setModalNuevoUsuario(false); setFormNuevoUsuario({ nombre: "", usuario: "", correo: "", clave: "", rol: "empleado" });
    } catch (e) { setNuevoUsuarioError(e.message); }
  };

  // ── Config ──
  const guardarConfig = (nuevaConfig) => { setConfig(nuevaConfig); saveConfig(nuevaConfig); };

  // ── RESET COMPLETO ──
  const handleResetCompleto = () => {
    if (resetConfirmText !== "RESTABLECER") return;
    // Borrar todo
    localStorage.removeItem("inv_sales");
    localStorage.removeItem("inv_boletas");
    localStorage.removeItem("inv_config");
    localStorage.removeItem("inv_catIcons");
    saveDarkMode(false);
    // Resetear estado con sistema LIMPIO (sin datos de ejemplo)
    setVentas([]); setBoletas([]);
    setProducts([]); setCategorias([]);
    setCatIconos({}); saveCatIcons({});
    const defaultConfig = { negocio: "Mi Negocio", direccion: "", telefono: "", moneda: "CLP", rut: "", notifStockBajo: true, notifVentas: true, stockMinimo: 5, tema: "claro", mpAccessToken: "", mpPublicKey: "", siiModo: "simulado", siiRut: "", siiClave: "" };
    setConfig(defaultConfig); saveConfig(defaultConfig);
    setDarkMode(false);
    setShowResetModal(false);
    setResetConfirmText("");
    setActiveNav("Dashboard");
  };

  const configSections = [
    { id: "general", label: "General", icon: Store, desc: "Datos del negocio" },
    { id: "pagos", label: "MercadoPago", icon: CreditCard, desc: "Integración de pagos" },
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
    const ws1 = XLSX.utils.aoa_to_sheet([["RESUMEN MENSUAL"],[],["Total", totalMes],["Ventas", ventasMes.length],["Ticket Prom.", ticketPromedio]]);
    XLSX.utils.book_append_sheet(wb, ws1, "Resumen");
    const ws2 = XLSX.utils.aoa_to_sheet([["#","Fecha","Vendedor","Productos","Pago","Total ($)"],...ventasMes.map((v,i)=>[i+1,v.fecha,v.usuario,v.items.map(it=>`${it.nombre}×${it.cantidad}`).join("|"),v.pago,v.total])]);
    XLSX.utils.book_append_sheet(wb, ws2, "Ventas");
    const ws3 = XLSX.utils.aoa_to_sheet([["N°","Fecha","Método","Total"],...boletas.map((b,i)=>[b.numero,b.fecha,b.metodoPago,b.total])]);
    XLSX.utils.book_append_sheet(wb, ws3, "Boletas");
    XLSX.writeFile(wb, `reporte-${mesStr.replace(" ","-")}.xlsx`);
  };

  // ─── RENDER ───────────────────────────────────────────────────────────────────
  return (
    <div style={{ display: "flex", width: "100vw", height: "100vh", fontFamily: "'Sora', sans-serif", background: bgMain, overflow: "hidden" }}>
      <style>{D ? getDarkVars() : getLightVars()}{css}</style>

      {/* MercadoPago Checkout Modal */}
      {showMPCheckout && (
        <MPCheckoutModal
          carrito={carrito} total={totalCarrito} config={config}
          darkMode={D} currentUser={currentUser}
          onPagoConfirmado={handlePagoMPConfirmado}
          onClose={() => setShowMPCheckout(false)}
        />
      )}

      {/* Boleta Modal */}
      {boletaModal && <BoletaModal boleta={boletaModal} config={config} darkMode={D} onClose={() => setBoletaModal(null)} />}

      {/* Reset Modal */}
      {showResetModal && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.7)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 300, backdropFilter: "blur(6px)" }}>
          <div className="fade-in" style={{ background: D ? "#1a1d2e" : "#fff", borderRadius: 20, padding: 32, width: 440, boxShadow: "0 30px 80px rgba(0,0,0,0.4)" }}>
            <div style={{ textAlign: "center", marginBottom: 22 }}>
              <div style={{ width: 64, height: 64, borderRadius: "50%", background: "#fff1f2", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 14px" }}>
                <AlertTriangle size={30} color="#e03131" />
              </div>
              <h3 style={{ margin: "0 0 10px", fontSize: 20, fontWeight: 800, color: D ? "#e8eaf6" : "#1a1a2e" }}>⚠ Restablecer el sistema</h3>
              <p style={{ margin: 0, fontSize: 14, color: D ? "#9ca3af" : "#6b7280", lineHeight: 1.6 }}>
                Esta acción es <strong style={{ color: "#e03131" }}>irreversible</strong>. Se borrarán <strong>todas las ventas, boletas, configuración</strong> y el sistema volverá al estado inicial.
              </p>
            </div>
            <div style={{ background: "#fff1f2", border: "1.5px solid #fecaca", borderRadius: 10, padding: "12px 16px", marginBottom: 20 }}>
              <p style={{ margin: "0 0 8px", fontSize: 13, fontWeight: 700, color: "#e03131" }}>Se eliminará permanentemente:</p>
              {["Todas las ventas registradas", "Todas las boletas generadas", "Historial de transacciones MP", "Configuración del sistema", "Datos del negocio y SII"].map(item => (
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
      <aside className="sidebar-desktop" style={{ width: sidebarOpen ? 228 : 66, transition: "width 0.25s cubic-bezier(0.4,0,0.2,1)", flexShrink: 0, background: D ? "#13152a" : "#fff", borderRight: `1px solid ${borderColor}`, display: "flex", flexDirection: "column", overflow: "hidden", boxShadow: `2px 0 12px ${D ? "rgba(0,0,0,0.3)" : "rgba(0,0,0,0.04)"}` }}>
        <div style={{ padding: "18px 14px 14px", display: "flex", alignItems: "center", gap: 10, cursor: "pointer", borderBottom: `1px solid ${borderColor}` }} onClick={() => setSidebarOpen(!sidebarOpen)}>
          <div style={{ width: 38, height: 38, borderRadius: 12, background: config.logoNegocio ? "transparent" : "linear-gradient(135deg, #3b5bdb, #4c6ef5)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, boxShadow: config.logoNegocio ? "none" : "0 4px 10px rgba(59,91,219,0.25)", overflow: "hidden" }}>
            {config.logoNegocio
              ? <img src={config.logoNegocio} alt="logo" style={{ width: "100%", height: "100%", objectFit: "cover", borderRadius: 12 }} />
              : <Package size={18} color="#fff" strokeWidth={2} />}
          </div>
          {sidebarOpen && <div>
            <p style={{ margin: 0, fontWeight: 800, fontSize: 15, color: textPrimary, whiteSpace: "nowrap" }}>{config.negocio}</p>
            <p style={{ margin: 0, fontSize: 10, color: textMuted, fontWeight: 500, textTransform: "uppercase", letterSpacing: "0.5px" }}>Sistema POS</p>
          </div>}
        </div>
        <nav style={{ flex: 1, padding: "10px 8px", overflowY: "auto" }}>
          {navItems.map(({ name, icon: Icon }) => (
            <button key={name} onClick={() => setActiveNav(name)} className={`nav-btn ${activeNav === name ? "active" : ""}`}
              style={{ display: "flex", alignItems: "center", gap: 11, width: "100%", padding: "10px 12px", borderRadius: 12, border: "none", cursor: "pointer", fontSize: 14, marginBottom: 3, whiteSpace: "nowrap", fontFamily: "inherit", fontWeight: 500, background: "none" }}>
              <Icon size={17} strokeWidth={1.8} style={{ flexShrink: 0 }} />
              {sidebarOpen && <span>{name}</span>}

            </button>
          ))}
        </nav>
        <div style={{ padding: "12px 10px", borderTop: `1px solid ${borderColor}`, display: "flex", alignItems: "center", gap: 10 }}>
          <div style={{ width: 36, height: 36, borderRadius: "50%", background: esGerente ? "linear-gradient(135deg, #3b5bdb, #4c6ef5)" : "linear-gradient(135deg, #10b981, #34d399)", color: "#fff", display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 700, fontSize: 12, flexShrink: 0 }}>
            {iniciales}
          </div>
          {sidebarOpen && <>
            <div style={{ flex: 1, minWidth: 0 }}>
              <p style={{ margin: 0, fontSize: 13, fontWeight: 700, color: textPrimary, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{currentUser.nombre}</p>
              <p style={{ margin: 0, fontSize: 11, color: esGerente ? "#4c6ef5" : "#10b981", fontWeight: 600 }}>{esGerente ? "Gerente" : "Empleado"}</p>
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
            {navItems.slice(4).map(({ name, icon: Icon }) => (
              <button key={name} onClick={() => { setActiveNav(name); setMoreMenuOpen(false); }}
                className="more-menu-btn"
                style={{ background: activeNav === name ? (D ? "rgba(59,91,219,0.2)" : "#e8f0fe") : bgCard2, color: activeNav === name ? "#3b5bdb" : textSecondary, border: `1px solid ${borderColor}` }}>
                <Icon size={22} strokeWidth={1.8} />
                {name}
              </button>
            ))}
            <button onClick={() => { setCurrentUser(null); setMoreMenuOpen(false); }}
              className="more-menu-btn"
              style={{ background: "#fff1f2", color: "#e03131", border: "1px solid #fecaca" }}>
              <LogOut size={22} strokeWidth={1.8} />
              Salir
            </button>
          </div>
        </>
      )}
      <nav className="bottom-nav">
        {navItems.slice(0, 4).map(({ name, icon: Icon }) => (
          <button key={name} onClick={() => { setActiveNav(name); setMoreMenuOpen(false); }} className={`bottom-nav-btn ${activeNav === name ? "active" : ""}`}>
            <span className="bottom-nav-icon"><Icon size={20} strokeWidth={1.8} /></span>
            <span>{name === "Dashboard" ? "Inicio" : name === "Productos" ? "Stock" : name === "Ventas" ? "Ventas" : name}</span>
          </button>
        ))}
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
        <header className="mobile-topbar" style={{ background: D ? "#13152a" : "#fff", borderBottom: `1px solid ${borderColor}`, padding: "0 24px", height: 62, display: "flex", alignItems: "center", gap: 12, flexShrink: 0 }}>
          <div style={{ flex: 1, minWidth: 0 }}>
            <h1 style={{ margin: 0, fontSize: 18, fontWeight: 800, color: textPrimary, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{activeNav}</h1>
            <p className="header-date" style={{ margin: 0, fontSize: 12, color: textMuted }}>{new Date().toLocaleDateString("es-CL", { weekday: "long", year: "numeric", month: "long", day: "numeric" })}</p>
          </div>
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
            <button onClick={() => setNotifOpen(!notifOpen)} style={{ background: notifOpen ? (D ? "#252840" : "#e8f0fe") : (D ? "#1e2235" : "#f4f5fb"), border: `1px solid ${borderColor}`, cursor: "pointer", width: 38, height: 38, borderRadius: 10, display: "flex", alignItems: "center", justifyContent: "center", position: "relative" }}>
              <Bell size={17} color={notifOpen ? "#3b5bdb" : textMuted} />
              {notificaciones.length > 0 && <span style={{ position: "absolute", top: 6, right: 6, width: 8, height: 8, borderRadius: "50%", background: "#ef4444", border: `2px solid ${D ? "#13152a" : "#fff"}` }} />}
            </button>
            {notifOpen && (
              <div className="fade-in notif-panel" style={{ position: "absolute", right: 0, top: 46, width: 320, background: bgCard, borderRadius: 16, boxShadow: `0 12px 40px ${D ? "rgba(0,0,0,0.5)" : "rgba(0,0,0,0.12)"}`, border: `1px solid ${borderColor}`, zIndex: 50, overflow: "hidden" }}>
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
          <div style={{ width: 36, height: 36, borderRadius: "50%", background: esGerente ? "linear-gradient(135deg, #3b5bdb, #4c6ef5)" : "linear-gradient(135deg, #10b981, #34d399)", color: "#fff", display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 700, fontSize: 12 }}>
            {iniciales}
          </div>
        </header>

        <main className="fade-in mobile-main" style={{ flex: 1, overflow: "auto", padding: "20px 24px" }}>

          {/* ── DASHBOARD ── */}
          {activeNav === "Dashboard" && (
            <div className="rey-mobile-home">
              <div className="rey-home-shell">
                <section className="rey-home-hero">
                  <div className="rey-home-brand">
                    <div className="rey-home-logo">🐓</div>
                    <div>
                      <p className="rey-home-greeting">{saludoHora}, {currentUser.nombre.split(" ")[0]} 👋</p>
                      <p className="rey-home-date">{fechaInicio} · Rey del Huevo</p>
                    </div>
                  </div>
                </section>

                <div className="rey-mobile-body">
                  <h2 className="rey-section-title">Ganancias vs ayer</h2>
                  <section className="rey-profit-card">
                    <div className="rey-profit-top">
                      <div className="rey-profit-icon"><Award size={25} strokeWidth={2.2} /></div>
                      <div>
                        <p className="rey-profit-label">Ganancias de hoy</p>
                        <p className="rey-profit-value mono">{fmt(gananciasHoy)}</p>
                      </div>
                    </div>
                    <div className="rey-profit-compare">
                      <span className={`rey-profit-badge ${diferenciaGanancias >= 0 ? "up" : "down"}`}>
                        {diferenciaGanancias >= 0 ? "↑" : "↓"} {Math.abs(porcentajeGanancias).toLocaleString("es-CL", { maximumFractionDigits: 1 })}%
                      </span>
                      <div className="rey-yesterday">
                        Ayer <strong>{fmt(gananciasAyer)}</strong><br />
                        <span style={{ color: diferenciaGanancias >= 0 ? "#138a3d" : "#d01b27", fontWeight: 700 }}>
                          {diferenciaGanancias >= 0 ? "+" : "−"}{fmt(Math.abs(diferenciaGanancias))} {diferenciaGanancias >= 0 ? "más" : "menos"}
                        </span>
                      </div>
                    </div>
                  </section>

                  <h2 className="rey-section-title" style={{ marginTop: 20 }}>Resumen del negocio</h2>
                  <div className="rey-summary-grid">
                    <div className="rey-summary-card">
                      <div className="rey-summary-icon">📦</div>
                      <p className="rey-summary-label">Productos</p>
                      <p className="rey-summary-value">{products.length}</p>
                      <div className="rey-summary-sub">{categorias.length} categorías</div>
                    </div>
                    <div className="rey-summary-card">
                      <div className="rey-summary-icon">⚠️</div>
                      <p className="rey-summary-label">Stock bajo</p>
                      <p className="rey-summary-value">{lowStock.length}</p>
                      <div className="rey-summary-sub">requieren atención</div>
                    </div>
                    <div className="rey-summary-card wide">
                      <div className="rey-summary-icon">💰</div>
                      <p className="rey-summary-label">Valor del inventario general</p>
                      <p className="rey-summary-value mono">{fmt(valorInventarioReal)}</p>
                    </div>
                  </div>

                  <h2 className="rey-section-title" style={{ marginTop: 20 }}>Accesos rápidos</h2>
                  <div className="rey-actions-grid">
                    <button className="rey-action-card yellow" onClick={() => setActiveNav("Huevos")}>
                      <span>🥚</span><span>Huevos</span><small>Stock y lotes</small>
                    </button>
                    <button className="rey-action-card red" onClick={() => setActiveNav("Productos")}>
                      <span>📦</span><span>Inventario</span><small>Otros productos</small>
                    </button>
                  </div>
                  <button className="rey-sale-button" onClick={() => setActiveNav("Ventas")}>🛒 Registrar venta</button>

                  <h2 className="rey-section-title" style={{ marginTop: 20 }}>Últimas ventas</h2>
                  <div className="rey-activity-card">
                    {ventas.length === 0 ? (
                      <div style={{ padding: 22, textAlign: "center", color: textMuted, fontSize: 12 }}>Todavía no hay ventas registradas.</div>
                    ) : ventas.slice(0, 4).map((venta, index) => (
                      <div className="rey-activity-row" key={venta.id || venta._id || index}>
                        <div className="rey-activity-dot"><ShoppingCart size={18} /></div>
                        <div className="rey-activity-main">
                          <p className="rey-activity-name">{venta.items?.map(i => i.nombre).join(", ") || "Venta registrada"}</p>
                          <p className="rey-activity-meta">{venta.fecha || (venta.timestamp ? new Date(venta.timestamp).toLocaleString("es-CL") : "")}</p>
                        </div>
                        <div className="rey-activity-total mono">{fmt(venta.total)}</div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          )}

          {activeNav === "Dashboard" && (
            <div className="rey-desktop-dashboard">
              <div className="dashboard-grid" style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 16, marginBottom: 20 }}>
                {[
                  { icon: Package, label: "Productos", value: products.length, sub: `${categorias.length} categorías`, color: "#3b82f6", bg: D ? "rgba(59,130,246,0.15)" : "#eff6ff" },
                  { icon: AlertTriangle, label: "Stock Bajo", value: lowStock.length, sub: "requieren atención", color: "#f59e0b", bg: D ? "rgba(245,158,11,0.15)" : "#fffbeb" },
                  { icon: DollarSign, label: "Total Ventas", value: fmt(totalGeneral), sub: "acumulado", color: "#10b981", bg: D ? "rgba(16,185,129,0.15)" : "#ecfdf5" },
                  { icon: Receipt, label: "Boletas Generadas", value: boletas.length, sub: `${boletas.length} generadas este mes`, color: "#8b5cf6", bg: D ? "rgba(139,92,246,0.15)" : "#f5f3ff" },
                ].map(({ icon: Icon, label, value, sub, color, bg }) => (
                  <div key={label} style={card} className="card-hover">
                    <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: 14 }}>
                      <div style={{ width: 42, height: 42, borderRadius: 12, background: bg, display: "flex", alignItems: "center", justifyContent: "center" }}>
                        <Icon size={20} color={color} strokeWidth={1.8} />
                      </div>
                    </div>
                    <p className="dashboard-stat-value" style={{ margin: "0 0 2px", fontSize: 26, fontWeight: 800, color: textPrimary }}>{value}</p>
                    <p style={{ margin: "0 0 4px", fontSize: 13, color: textSecondary }}>{label}</p>
                    <p style={{ margin: 0, fontSize: 11, color: textMuted }}>{sub}</p>
                  </div>
                ))}
              </div>
              <div className="dashboard-charts" style={{ display: "grid", gridTemplateColumns: "1fr 300px", gap: 16, marginBottom: 16 }}>
                <div style={card}>
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 16 }}>
                    <h3 style={{ margin: 0, fontSize: 15, fontWeight: 700, color: textPrimary }}>Tendencia de Ventas</h3>
                    <span style={{ fontSize: 12, color: "#3b5bdb", background: D ? "rgba(59,91,219,0.2)" : "#e8f0fe", padding: "4px 12px", borderRadius: 8, fontWeight: 600 }}>{mesNombre.charAt(0).toUpperCase() + mesNombre.slice(1)}</span>
                  </div>
                  <ResponsiveContainer width="100%" height={200}>
                    <AreaChart data={salesData} margin={{ top: 4, right: 4, left: -20, bottom: 0 }}>
                      <defs><linearGradient id="g" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor="#3b5bdb" stopOpacity={D ? 0.3 : 0.2} /><stop offset="95%" stopColor="#3b5bdb" stopOpacity={0} /></linearGradient></defs>
                      <CartesianGrid strokeDasharray="3 3" stroke={D ? "#2d3158" : "#f0f0f0"} vertical={false} />
                      <XAxis dataKey="day" tick={{ fontSize: 10, fill: textMuted, fontFamily: "Sora" }} tickLine={false} axisLine={false} />
                      <YAxis tick={{ fontSize: 10, fill: textMuted }} tickLine={false} axisLine={false} tickFormatter={v => `${v / 1000}K`} />
                      <Tooltip formatter={v => [`$${v.toLocaleString()}`, "Ventas"]} contentStyle={{ fontSize: 12, borderRadius: 10, fontFamily: "Sora", border: `1px solid ${borderColor}`, background: bgCard, color: textPrimary }} />
                      <Area type="monotone" dataKey="ventas" stroke="#3b5bdb" strokeWidth={2.5} fill="url(#g)" dot={false} activeDot={{ r: 5, fill: "#3b5bdb" }} />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
                <div style={card}>
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 14 }}>
                    <h3 style={{ margin: 0, fontSize: 15, fontWeight: 700, color: textPrimary }}>Stock Crítico</h3>
                    <button onClick={() => setActiveNav("Productos")} style={{ fontSize: 12, color: "#3b5bdb", background: "none", border: "none", cursor: "pointer", fontWeight: 600 }}>Ver todos →</button>
                  </div>
                  {lowStock.slice(0, 5).map(p => (
                    <div key={p.id} style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 10 }}>
                      <span style={{ fontSize: 22 }}>{p.img}</span>
                      <div style={{ flex: 1 }}>
                        <p style={{ margin: 0, fontSize: 13, fontWeight: 600, color: textPrimary }}>{p.nombre}</p>
                        <p style={{ margin: 0, fontSize: 11, color: textMuted }}>{p.categoria}</p>
                      </div>
                      <p style={{ margin: 0, fontSize: 16, fontWeight: 800, color: p.stock === 0 ? "#e03131" : "#f59e0b" }}>{p.stock}</p>
                    </div>
                  ))}
                  {lowStock.length === 0 && <p style={{ color: textMuted, fontSize: 13, textAlign: "center", marginTop: 20 }}>¡Sin stock bajo! 🎉</p>}
                </div>
              </div>
              {/* Últimas boletas en dashboard */}
              <div style={card}>
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 14 }}>
                  <h3 style={{ margin: 0, fontSize: 15, fontWeight: 700, color: textPrimary }}>Últimas Boletas</h3>
                  <button onClick={() => setActiveNav("Boletas")} style={{ fontSize: 12, color: "#3b5bdb", background: "none", border: "none", cursor: "pointer", fontWeight: 600 }}>Ver todas →</button>
                </div>
                {boletas.length === 0
                  ? <p style={{ color: textMuted, fontSize: 13, textAlign: "center", padding: "16px 0" }}>No hay tickets generados aún.</p>
                  : boletas.slice(0, 4).map(b => (
                    <div key={b.numero} style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 10, padding: "10px 14px", background: bgCard2, borderRadius: 12, cursor: "pointer" }} onClick={() => setBoletaModal(b)}>
                      <div style={{ width: 36, height: 36, borderRadius: 10, background: D ? "rgba(59,91,219,0.2)" : "#e8f0fe", display: "flex", alignItems: "center", justifyContent: "center" }}>
                        <Receipt size={16} color="#3b5bdb" />
                      </div>
                      <div style={{ flex: 1 }}>
                        <p style={{ margin: 0, fontSize: 13, fontWeight: 700, color: textPrimary }}>Ticket #{String(b.numero).padStart(6, "0")}</p>
                        <p style={{ margin: 0, fontSize: 11, color: textMuted }}>{b.fecha} · {b.metodoPago}</p>
                      </div>
                      <div style={{ textAlign: "right" }}>
                        <p style={{ margin: 0, fontSize: 16, fontWeight: 800, color: "#10b981" }} className="mono">{fmt(b.total)}</p>
                        <span style={{ fontSize: 10, fontWeight: 700, padding: "2px 8px", borderRadius: 6, background: "#ecfdf5", color: "#059669" }}>✓ Pagado</span>
                      </div>
                    </div>
                  ))}
              </div>
            </div>
          )}

          {/* ── PRODUCTOS ── */}
          {activeNav === "Productos" && (
            <div>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 18 }}>
                <div className="cat-filters" style={{ display: "flex", gap: 8 }}>
                  {["Todos", ...categorias].map(cat => (
                    <button key={cat} onClick={() => setCatFilter(cat)}
                      style={{ padding: "7px 14px", borderRadius: 8, border: `1.5px solid ${catFilter === cat ? "#3b5bdb" : borderColor2}`, background: catFilter === cat ? "#3b5bdb" : bgCard, color: catFilter === cat ? "#fff" : textSecondary, cursor: "pointer", fontSize: 13, fontWeight: 600, fontFamily: "inherit", transition: "all 0.15s" }}>
                      {cat}
                    </button>
                  ))}
                </div>
                <button onClick={openAdd} className="btn-primary" style={{ display: "flex", alignItems: "center", gap: 7, padding: "9px 18px", borderRadius: 10, fontSize: 13 }}>
                  <Plus size={15} /> Nuevo Producto
                </button>
              </div>
              <div className="products-grid" style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(240px, 1fr))", gap: 14 }}>
                {filtered.map(p => (
                  <div key={p.id} style={{ ...card, cursor: "default" }} className="card-hover">
                    <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: 12 }}>
                      {p.imagenUrl
                        ? <img src={p.imagenUrl} alt={p.nombre} style={{ width: 52, height: 52, borderRadius: 12, objectFit: "cover", border: `1px solid ${borderColor}` }} />
                        : <div style={{ fontSize: 36 }}>{p.img}</div>
                      }
                      <div style={{ display: "flex", gap: 6 }}>
                        <button onClick={() => { setModalStock(p); setStockAjuste(""); setStockTipo("agregar"); }} style={{ padding: "5px 8px", borderRadius: 8, border: `1px solid ${borderColor2}`, background: bgCard2, cursor: "pointer", color: "#10b981", display: "flex", title: "Ajustar stock" }}><Plus size={13} /></button>
                        <button onClick={() => openEdit(p)} style={{ padding: "5px 8px", borderRadius: 8, border: `1px solid ${borderColor2}`, background: bgCard2, cursor: "pointer", color: textSecondary, display: "flex" }}><Pencil size={13} /></button>
                        <button onClick={() => handleDeleteProd(p.id)} className="btn-danger" style={{ padding: "5px 8px", borderRadius: 8, fontSize: 12, display: "flex" }}><Trash2 size={13} /></button>
                      </div>
                    </div>
                    <p style={{ margin: "0 0 4px", fontSize: 15, fontWeight: 700, color: textPrimary }}>{p.nombre}</p>
                    <p style={{ margin: "0 0 10px", fontSize: 12, color: textMuted }}>{p.categoria}</p>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                      <span style={{ fontSize: 18, fontWeight: 800, color: "#10b981" }} className="mono">{fmt(p.precio)}</span>
                      <span style={{ fontSize: 12, fontWeight: 700, padding: "4px 10px", borderRadius: 8, background: p.stock === 0 ? "#fff1f2" : p.stock <= (config.stockMinimo || 5) ? "#fffbeb" : D ? "rgba(16,185,129,0.15)" : "#ecfdf5", color: p.stock === 0 ? "#e03131" : p.stock <= (config.stockMinimo || 5) ? "#d97706" : "#059669" }}>
                        Stock: {p.stock}
                      </span>
                    </div>
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
                    <button onClick={() => setModalIconoCat({ nombre: cat })} style={{ fontSize: 26, background: "none", border: "none", cursor: "pointer", width: 44, height: 44, borderRadius: 12, background: bgCard, display: "flex", alignItems: "center", justifyContent: "center" }}>
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
                  { label: "Ventas realizadas", value: ventasMes.length, icon: ShoppingCart, color: "#3b5bdb", bg: D ? "rgba(59,91,219,0.15)" : "#e8f0fe" },
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
                      { icon: Banknote, label: "Efectivo", value: totalMesEfectivo, color: "#10b981", bg: D ? "rgba(16,185,129,0.15)" : "#ecfdf5" },
                      { icon: CreditCard, label: "Transferencia", value: totalMesTransferencia, color: "#8b5cf6", bg: D ? "rgba(139,92,246,0.15)" : "#f5f3ff" },
                      { icon: CreditCard, label: "MercadoPago", value: totalMesMP, color: "#009ee3", bg: D ? "rgba(0,158,227,0.15)" : "#f0f9ff" },
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

          {/* ── VENTAS (POS) ── */}
          {activeNav === "Ventas" && (
            <div className="mobile-sales-page">
              <div className="dashboard-grid mobile-sales-summary" style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 16, marginBottom: 20 }}>
                {[
                  { icon: DollarSign, label: "Total General", value: fmt(totalGeneral), color: "#3b5bdb", bg: D ? "rgba(59,91,219,0.15)" : "#e8f0fe" },
                  { icon: Banknote, label: "Efectivo + Transf.", value: fmt(totalEfectivo + totalTransferencia), color: "#10b981", bg: D ? "rgba(16,185,129,0.15)" : "#ecfdf5" },
                  { icon: CreditCard, label: "MercadoPago", value: fmt(totalMP), color: "#009ee3", bg: D ? "rgba(0,158,227,0.15)" : "#f0f9ff" },
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

              <div className="ventas-grid mobile-sales-layout" style={{ display: "grid", gridTemplateColumns: "440px 1fr", gap: 18 }}>
                {/* ── Formulario Nueva Venta ── */}
                <div style={{ ...card, height: "fit-content" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 18 }}>
                    <div style={{ width: 36, height: 36, borderRadius: 10, background: "linear-gradient(135deg, #3b5bdb, #4c6ef5)", display: "flex", alignItems: "center", justifyContent: "center" }}>
                      <ShoppingBag size={16} color="#fff" />
                    </div>
                    <h3 style={{ margin: 0, fontSize: 15, fontWeight: 700, color: textPrimary }}>Nueva Venta</h3>
                    {boletaGenerando && <span style={{ fontSize: 11, color: "#3b5bdb", background: D ? "rgba(59,91,219,0.2)" : "#e8f0fe", padding: "3px 8px", borderRadius: 6, fontWeight: 600 }} className="pulse">Generando boleta...</span>}
                  </div>

                  {ventaExito && <div style={{ background: "#ecfdf5", color: "#059669", fontSize: 13, padding: "11px 14px", borderRadius: 10, marginBottom: 14, fontWeight: 600 }}>{ventaExito}</div>}
                  {ventaError && <div style={{ background: "#fff1f2", color: "#e03131", fontSize: 13, padding: "11px 14px", borderRadius: 10, marginBottom: 14, fontWeight: 600 }}>⚠ {ventaError}</div>}

                  {/* Buscador */}
                  <div style={{ background: bgCard2, borderRadius: 12, padding: "14px 16px", marginBottom: 16, border: `1px solid ${borderColor}` }}>
                    <p style={{ margin: "0 0 10px", fontSize: 12, fontWeight: 700, color: textSecondary, textTransform: "uppercase", letterSpacing: "0.5px" }}>Buscar producto</p>
                    <div style={{ position: "relative" }} ref={busquedaRef}>
                      <div style={{ position: "relative", display: "flex", alignItems: "center" }}>
                        <Search size={14} color={textMuted} style={{ position: "absolute", left: 12, pointerEvents: "none" }} />
                        <input value={busquedaVenta} onChange={e => { setBusquedaVenta(e.target.value); setShowBusquedaDropdown(true); if (!e.target.value) setProductoSeleccionadoVenta(null); }} onFocus={() => setShowBusquedaDropdown(true)} placeholder="Escribe para buscar..." style={{ ...inp, paddingLeft: 36 }} />
                        {busquedaVenta && <button onClick={() => { setBusquedaVenta(""); setProductoSeleccionadoVenta(null); setShowBusquedaDropdown(false); }} style={{ position: "absolute", right: 10, background: "none", border: "none", cursor: "pointer", color: textMuted, padding: 2 }}><X size={14} /></button>}
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
                      <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "10px 12px", background: D ? "rgba(59,91,219,0.15)" : "#e8f0fe", borderRadius: 10, marginTop: 10, border: `1.5px solid ${D ? "#3b5bdb40" : "#bac8ff"}` }}>
                        <span style={{ fontSize: 22 }}>{productoSeleccionadoVenta.img}</span>
                        <div style={{ flex: 1 }}>
                          <p style={{ margin: 0, fontSize: 13, fontWeight: 700, color: "#3b5bdb" }}>{productoSeleccionadoVenta.nombre}</p>
                          <p style={{ margin: 0, fontSize: 11, color: "#4c6ef5" }}>{fmt(productoSeleccionadoVenta.precio)} c/u</p>
                        </div>
                      </div>
                    )}
                    <div style={{ display: "flex", gap: 8, marginTop: 10 }}>
                      <input type="number" min="1" value={carritoCantidad} onChange={e => setCarritoCantidad(e.target.value)} placeholder="Cantidad" style={{ ...inp, flex: 1 }} />
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
                        <div key={item.productoId} style={{ display: "flex", alignItems: "center", gap: 8, padding: "8px 12px", background: bgCard2, borderRadius: 10, marginBottom: 6, border: `1px solid ${borderColor}` }}>
                          <span style={{ fontSize: 18 }}>{item.img}</span>
                          <div style={{ flex: 1, minWidth: 0 }}>
                            <p style={{ margin: 0, fontSize: 12, fontWeight: 600, color: textPrimary, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{item.nombre}</p>
                            <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                              <p style={{ margin: 0, fontSize: 11, color: textMuted }}>{fmt(item.precio)} c/u</p>
                              {item.enPromo && item.promoLabel && (
                                <span style={{ fontSize: 10, fontWeight: 700, color: "#3b5bdb", background: "#e8f0fe", padding: "1px 6px", borderRadius: 6 }}>🏷️ {item.promoLabel}</span>
                              )}
                            </div>
                          </div>
                          <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                            <button onClick={() => cambiarCantidadCarrito(item.productoId, item.cantidad - 1)} style={{ width: 24, height: 24, borderRadius: 6, border: `1px solid ${borderColor2}`, background: bgCard, cursor: "pointer", color: textSecondary, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 14 }}>−</button>
                            <span style={{ fontSize: 13, fontWeight: 700, minWidth: 20, textAlign: "center", color: textPrimary }}>{item.cantidad}</span>
                            <button onClick={() => cambiarCantidadCarrito(item.productoId, item.cantidad + 1)} style={{ width: 24, height: 24, borderRadius: 6, border: `1px solid ${borderColor2}`, background: bgCard, cursor: "pointer", color: textSecondary, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 14 }}>+</button>
                          </div>
                          <span style={{ fontSize: 13, fontWeight: 800, color: "#10b981", minWidth: 70, textAlign: "right" }} className="mono">{fmt(item.subtotal)}</span>
                          <button onClick={() => quitarDelCarrito(item.productoId)} style={{ background: "none", border: "none", cursor: "pointer", color: "#e03131", padding: 2 }}><X size={14} /></button>
                        </div>
                      ))}
                      <div style={{ display: "flex", justifyContent: "space-between", padding: "10px 12px", background: D ? "rgba(16,185,129,0.15)" : "#ecfdf5", borderRadius: 10, marginTop: 6 }}>
                        <span style={{ fontWeight: 700, color: textPrimary }}>Total</span>
                        <span style={{ fontWeight: 800, fontSize: 18, color: "#10b981" }} className="mono">{fmt(totalCarrito)}</span>
                      </div>
                    </div>
                  )}

                  {/* Método de pago */}
                  {carrito.length > 0 && (
                    <div style={{ marginBottom: 16 }}>
                      <p style={{ margin: "0 0 10px", fontSize: 12, fontWeight: 700, color: textSecondary, textTransform: "uppercase", letterSpacing: "0.5px" }}>Método de pago</p>
                      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 6, marginBottom: 12 }}>
                        {[
                          { val: "Efectivo", icon: Banknote, color: "#10b981" },
                          { val: "Débito", icon: CreditCard, color: "#f59e0b" },
                          { val: "Crédito", icon: CreditCard, color: "#e03131" },
                          { val: "Transferencia", icon: CreditCard, color: "#8b5cf6" },
                          { val: "MercadoPago", icon: CreditCard, color: "#009ee3" },
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

                      {/* Botones de acción */}
                      {pago === "MercadoPago" ? (
                        <button onClick={handleIniciarMP} className="btn-mp" style={{ width: "100%", padding: "13px", fontSize: 15, fontWeight: 800, display: "flex", alignItems: "center", justifyContent: "center", gap: 8 }}>
                          <CreditCard size={18} /> Pagar con MercadoPago
                        </button>
                      ) : (
                        <button onClick={handleVentaDirecta} className="btn-primary" style={{ width: "100%", padding: "13px", borderRadius: 10, fontSize: 14, fontWeight: 700, display: "flex", alignItems: "center", justifyContent: "center", gap: 8 }}>
                          <Check size={16} /> Confirmar Venta
                        </button>
                      )}
                    </div>
                  )}
                </div>

                {/* ── Lista de Ventas ── */}
                <div style={card}>
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 16 }}>
                    <h3 style={{ margin: 0, fontSize: 15, fontWeight: 700, color: textPrimary }}>Historial de Ventas</h3>
                    <div style={{ display: "flex", gap: 6 }}>
                      {["Todos", "Efectivo", "Débito", "Crédito", "Transferencia", "MercadoPago"].map(f => (
                        <button key={f} onClick={() => setFiltroPago(f)}
                          style={{ padding: "5px 12px", borderRadius: 8, border: `1.5px solid ${filtroPago === f ? "#3b5bdb" : borderColor2}`, background: filtroPago === f ? "#3b5bdb" : bgCard2, color: filtroPago === f ? "#fff" : textSecondary, cursor: "pointer", fontSize: 11, fontWeight: 600, fontFamily: "inherit" }}>
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
                          <div style={{ width: 38, height: 38, borderRadius: 10, background: v.pago === "Efectivo" ? (D ? "rgba(16,185,129,0.2)" : "#ecfdf5") : v.pago === "MercadoPago" ? (D ? "rgba(0,158,227,0.2)" : "#f0f9ff") : v.pago === "Débito" ? (D ? "rgba(245,158,11,0.2)" : "#fffbeb") : v.pago === "Crédito" ? (D ? "rgba(224,49,49,0.2)" : "#fff1f2") : (D ? "rgba(139,92,246,0.2)" : "#f5f3ff"), display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                            {v.pago === "Efectivo" ? <Banknote size={18} color="#10b981" /> : v.pago === "MercadoPago" ? <CreditCard size={18} color="#009ee3" /> : v.pago === "Débito" ? <CreditCard size={18} color="#f59e0b" /> : v.pago === "Crédito" ? <CreditCard size={18} color="#e03131" /> : <CreditCard size={18} color="#8b5cf6" />}
                          </div>
                          <div style={{ flex: 1 }}>
                            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 6 }}>
                              <div>
                                <p style={{ margin: 0, fontSize: 14, fontWeight: 700, color: textPrimary }}>{v.items.length} producto{v.items.length !== 1 ? "s" : ""}</p>
                                <p style={{ margin: 0, fontSize: 11, color: textMuted }}>{v.fecha} · {v.usuario}</p>
                              </div>
                              <div style={{ textAlign: "right" }}>
                                <p style={{ margin: 0, fontSize: 18, fontWeight: 800, color: "#10b981" }} className="mono">{fmt(v.total)}</p>
                                <span className="badge" style={{ background: v.pago === "Efectivo" ? "#ecfdf5" : v.pago === "MercadoPago" ? "#f0f9ff" : v.pago === "Débito" ? "#fffbeb" : v.pago === "Crédito" ? "#fff1f2" : "#f5f3ff", color: v.pago === "Efectivo" ? "#059669" : v.pago === "MercadoPago" ? "#009ee3" : v.pago === "Débito" ? "#f59e0b" : v.pago === "Crédito" ? "#e03131" : "#8b5cf6" }}>{v.pago}</span>
                              </div>
                            </div>
                            <div style={{ display: "flex", flexWrap: "wrap", gap: 5 }}>
                              {v.items.map(item => (
                                <span key={item.productoId} style={{ fontSize: 11, background: D ? "#2d3158" : "#f3f4f6", color: textSecondary, padding: "2px 8px", borderRadius: 5, fontWeight: 500 }}>
                                  {item.img} {item.nombre} ×{item.cantidad}
                                </span>
                              ))}
                            </div>
                            {/* Boleta asociada */}
                            {(() => { const b = boletas.find(b => b.ventaId === v.id); return b ? (
                              <button onClick={() => setBoletaModal(b)} style={{ marginTop: 8, padding: "4px 10px", borderRadius: 7, border: `1px solid ${D ? "#2d3158" : "#e5e7eb"}`, background: "none", cursor: "pointer", fontSize: 11, color: "#3b5bdb", display: "flex", alignItems: "center", gap: 5, fontFamily: "inherit" }}>
                                <Receipt size={12} /> Boleta #{String(b.numero).padStart(6, "0")}
                              </button>
                            ) : null; })()}
                          </div>
                          <button onClick={async () => {
                            if (!window.confirm("¿Eliminar esta venta y su boleta del historial?")) return;
                            try {
                              const res = await fetch(API + "/api/ventas/" + encodeURIComponent(String(v.id)), { method: "DELETE", headers: authHeaders(currentUser) });
                              const data = await res.json();
                              if (!res.ok) throw new Error(data.error || "No se pudo eliminar.");
                              setVentas(prev => { const next = prev.filter(x => String(x.id) !== String(v.id)); saveSales(next); return next; });
                              setBoletas(prev => { const next = prev.filter(b => String(b.ventaId) !== String(v.id)); saveBoletas(next); return next; });
                            } catch (err) { alert(err.message); }
                          }} style={{ background: "none", border: "none", cursor: "pointer", padding: "4px", color: "#e03131", alignSelf: "flex-start", flexShrink: 0 }} title="Eliminar venta"><Trash2 size={15} /></button>
                        </div>
                      </div>
                    ))}
                </div>
              </div>
            </div>
          )}

          {/* ── BOLETAS ── */}
          {activeNav === "Boletas" && (
            <div className="mobile-receipts-page">
              <div className="mobile-receipt-summary" style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14, marginBottom: 20 }}>
                <div style={{ ...card, display: "flex", alignItems: "center", gap: 14 }} className="card-hover">
                  <div style={{ width: 42, height: 42, borderRadius: 12, background: D ? "rgba(59,91,219,0.15)" : "#e8f0fe", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                    <Receipt size={20} color="#3b5bdb" />
                  </div>
                  <div>
                    <p style={{ margin: 0, fontSize: 24, fontWeight: 800, color: textPrimary }}>{boletas.length}</p>
                    <p style={{ margin: 0, fontSize: 12, color: textMuted }}>Total Boletas</p>
                  </div>
                </div>
                <div style={{ ...card, display: "flex", alignItems: "center", gap: 14 }} className="card-hover">
                  <div style={{ width: 42, height: 42, borderRadius: 12, background: D ? "rgba(16,185,129,0.15)" : "#ecfdf5", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                    <DollarSign size={20} color="#10b981" />
                  </div>
                  <div>
                    <p style={{ margin: 0, fontSize: 20, fontWeight: 800, color: textPrimary }} className="mono">{fmt(boletas.reduce((s, b) => s + b.total, 0))}</p>
                    <p style={{ margin: 0, fontSize: 12, color: textMuted }}>Monto Total</p>
                  </div>
                </div>
              </div>

              <div className="mobile-receipt-list" style={card}>
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 16 }}>
                  <h3 style={{ margin: 0, fontSize: 15, fontWeight: 700, color: textPrimary }}>Todas las Boletas</h3>

                </div>

                {boletas.length === 0 ? (
                  <div style={{ textAlign: "center", padding: "50px 0" }}>
                    <Receipt size={48} color={D ? "#2d3158" : "#e5e7eb"} style={{ marginBottom: 12 }} />
                    <p style={{ color: textMuted, fontSize: 14 }}>No hay boletas generadas aún</p>
                    <p style={{ color: textMuted, fontSize: 12 }}>Las boletas se generan automáticamente al confirmar una venta</p>
                  </div>
                ) : (
                  <div>
                    {boletas.map(b => (
                      <div key={b.numero} className="mobile-receipt-row" style={{ display: "flex", alignItems: "center", gap: 14, padding: "14px 16px", background: bgCard2, borderRadius: 12, marginBottom: 10, border: `1px solid ${borderColor}`, cursor: "pointer" }} onClick={() => setBoletaModal(b)}>
                        <div style={{ width: 42, height: 42, borderRadius: 12, background: D ? "rgba(59,91,219,0.2)" : "#e8f0fe", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                          <Receipt size={18} color="#3b5bdb" />
                        </div>
                        <div style={{ flex: 1 }}>
                          <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 4 }}>
                            <p style={{ margin: 0, fontSize: 15, fontWeight: 800, color: textPrimary }} className="mono">#{String(b.numero).padStart(6, "0")}</p>
                            <span className="badge" style={{ background: b.metodoPago === "MercadoPago" ? "#f0f9ff" : "#f3f4f6", color: b.metodoPago === "MercadoPago" ? "#009ee3" : textSecondary }}>
                              {b.metodoPago}
                            </span>
                            {b.mpPaymentId && <span style={{ fontSize: 10, color: "#009ee3", fontFamily: "monospace" }}>MP</span>}
                          </div>
                          <p style={{ margin: 0, fontSize: 11, color: textMuted }}>{b.fecha} · {b.vendedor}</p>
                        </div>
                        <div style={{ textAlign: "right" }}>
                          <p style={{ margin: 0, fontSize: 18, fontWeight: 800, color: "#10b981" }} className="mono">{fmt(b.total)}</p>
                          <div style={{ display: "flex", gap: 6, justifyContent: "flex-end", marginTop: 4 }}>
                            <span style={{ fontSize: 10, fontWeight: 700, padding: "2px 8px", borderRadius: 6, background: "#ecfdf5", color: "#059669" }}>✓ Pagado</span>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* ── MERMAS ── */}
          {activeNav === "Mermas" && (
            <div className="mobile-loss-page">
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
                    <div style={{ width: 46, height: 46, borderRadius: 14, background: "rgba(59,91,219,0.3)", display: "flex", alignItems: "center", justifyContent: "center" }}>
                      <Shield size={22} color="#748ffc" />
                    </div>
                    <div>
                      <p style={{ margin: 0, fontSize: 16, fontWeight: 800, color: "#fff" }}>Panel de Administración</p>
                      <p style={{ margin: 0, fontSize: 12, color: "#6b7280" }}>Gestión de usuarios · v{APP_VERSION}</p>
                    </div>
                  </div>
                  <button onClick={() => { setModalNuevoUsuario(true); setFormNuevoUsuario({ nombre: "", usuario: "", correo: "", clave: "", rol: "empleado" }); setNuevoUsuarioError(""); }} className="btn-primary" style={{ display: "flex", alignItems: "center", gap: 7, padding: "10px 18px", borderRadius: 10, fontSize: 13 }}>
                    <UserPlus size={15} /> Nuevo Usuario
                  </button>
                </div>
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(320px, 1fr))", gap: 14 }}>
                {loadingUsuarios ? <p style={{ color: textMuted, fontSize: 13 }}>Cargando...</p> : usuarios.map(u => (
                  <div key={u.usuario} style={{ ...card, opacity: u.blocked ? 0.8 : 1 }} className="card-hover">
                    <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 14 }}>
                      <div style={{ width: 46, height: 46, borderRadius: "50%", background: u.blocked ? (D ? "#2d3158" : "#f3f4f6") : u.rol === "gerente" ? "linear-gradient(135deg, #3b5bdb, #4c6ef5)" : "linear-gradient(135deg, #10b981, #34d399)", color: u.blocked ? textMuted : "#fff", display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 800, fontSize: 16 }}>
                        {u.nombre.split(" ").map(p => p[0]).join("").slice(0, 2).toUpperCase()}
                      </div>
                      <div style={{ flex: 1 }}>
                        <p style={{ margin: 0, fontSize: 15, fontWeight: 700, color: textPrimary }}>{u.nombre}</p>
                        <p style={{ margin: 0, fontSize: 12, color: textMuted }}>@{u.usuario}</p>
                      </div>
                      <span className="badge" style={{ background: u.rol === "gerente" ? (D ? "rgba(59,91,219,0.2)" : "#e8f0fe") : (D ? "rgba(16,185,129,0.2)" : "#ecfdf5"), color: u.rol === "gerente" ? "#4c6ef5" : "#059669" }}>
                        {u.rol === "gerente" ? "👑" : "👤"} {u.rol}
                      </span>
                    </div>
                    {u.correo && <p style={{ margin: "0 0 4px", fontSize: 12, color: textMuted }}>{u.correo}</p>}
                    {u.empresa && <p style={{ margin: "0 0 12px", fontSize: 12, color: textMuted }}>🏢 {u.empresa}</p>}
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
          )}

          {/* ── CONFIGURACIÓN ── */}
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
                      <div style={{ width: 40, height: 40, borderRadius: 12, background: D ? "rgba(59,91,219,0.2)" : "#e8f0fe", display: "flex", alignItems: "center", justifyContent: "center" }}><Store size={18} color="#3b5bdb" /></div>
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

                    {/* Logo del negocio */}
                    <div style={{ marginBottom: 16 }}>
                      <label style={{ fontSize: 12, fontWeight: 700, color: D ? "#9ca3af" : "#374151", display: "block", marginBottom: 8 }}>Logo del negocio</label>
                      <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
                        <div style={{ width: 64, height: 64, borderRadius: 14, background: D ? "#252840" : "#f0f2ff", border: `2px dashed ${borderColor2}`, display: "flex", alignItems: "center", justifyContent: "center", overflow: "hidden", flexShrink: 0 }}>
                          {config.logoNegocio
                            ? <img src={config.logoNegocio} alt="logo" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                            : <Store size={24} color={D ? "#4c6ef5" : "#3b5bdb"} />}
                        </div>
                        <div style={{ flex: 1 }}>
                          <label style={{ display: "inline-block", padding: "9px 16px", borderRadius: 10, background: D ? "#252840" : "#f0f2ff", border: `1.5px solid ${borderColor2}`, cursor: "pointer", fontSize: 13, color: "#3b5bdb", fontWeight: 600, fontFamily: "inherit" }}>
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
                    <div style={{ marginTop: 4, padding: "12px 16px", background: D ? "rgba(59,91,219,0.1)" : "#f0f2ff", borderRadius: 10, fontSize: 13, color: "#3b5bdb" }}>
                      ✓ Los cambios se guardan automáticamente
                    </div>
                  </div>
                )}

                {/* MercadoPago */}
                {configTab === "pagos" && (
                  <div style={card}>
                    <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 22, paddingBottom: 16, borderBottom: `1px solid ${borderColor}` }}>
                      <div style={{ width: 40, height: 40, borderRadius: 12, background: D ? "rgba(0,158,227,0.2)" : "#f0f9ff", display: "flex", alignItems: "center", justifyContent: "center" }}><CreditCard size={18} color="#009ee3" /></div>
                      <div>
                        <h3 style={{ margin: 0, fontSize: 16, fontWeight: 700, color: textPrimary }}>MercadoPago</h3>
                        <p style={{ margin: 0, fontSize: 12, color: textMuted }}>Checkout Pro — Producción real</p>
                      </div>
                    </div>

                    <div style={{ background: "#ecfdf5", border: "1.5px solid #a7f3d0", borderRadius: 12, padding: "12px 16px", marginBottom: 20, fontSize: 13, color: "#065f46", fontWeight: 600 }}>
                      🟢 Modo Producción — Se procesarán pagos reales. Usa tus credenciales APP_USR.
                    </div>

                    {[
                      { label: "Access Token (APP_USR-...)", key: "mpAccessToken", placeholder: "APP_USR-xxxx-xxx..." },
                      { label: "Public Key (APP_USR-...)", key: "mpPublicKey", placeholder: "APP_USR-xxxx-xxx..." },
                    ].map(({ label, key, placeholder }) => (
                      <div key={key} style={{ marginBottom: 16 }}>
                        <label style={{ fontSize: 12, fontWeight: 700, color: D ? "#9ca3af" : "#374151", display: "block", marginBottom: 6 }}>{label}</label>
                        <input type="password" value={config[key] || ""} onChange={e => guardarConfig({ ...config, [key]: e.target.value })} placeholder={placeholder} style={inp} />
                      </div>
                    ))}

                    <div style={{ padding: "14px 16px", background: D ? "#252840" : "#f9fafb", borderRadius: 12, marginTop: 4 }}>
                      <p style={{ margin: "0 0 8px", fontSize: 13, fontWeight: 700, color: textPrimary }}>Métodos de pago disponibles para clientes:</p>
                      {["💰 Saldo MercadoPago", "💳 Tarjeta de débito", "💳 Tarjeta de crédito", "🏦 Transferencia bancaria"].map(m => (
                        <p key={m} style={{ margin: "0 0 4px", fontSize: 12, color: textSecondary }}>✓ {m}</p>
                      ))}
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
                        <button onClick={() => guardarConfig({ ...config, [key]: !config[key] })} className="toggle-switch" style={{ background: config[key] ? "#3b5bdb" : "#d1d5db" }}>
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
                      <button onClick={toggleDark} className="toggle-switch" style={{ background: D ? "#3b5bdb" : "#d1d5db", flexShrink: 0 }}>
                        <div className="toggle-thumb" style={{ left: D ? 23 : 3 }} />
                      </button>
                    </div>

                    <div style={{ padding: "16px", background: D ? "#252840" : "#f0f2ff", borderRadius: 12, display: "flex", alignItems: "center", gap: 12 }}>
                      {D ? <Moon size={18} color="#748ffc" /> : <Sun size={18} color="#f59e0b" />}
                      <p style={{ margin: 0, fontSize: 13, color: D ? "#748ffc" : "#3b5bdb", fontWeight: 600 }}>
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
                        ⚠️ Esta acción borrará permanentemente: todas las ventas, boletas, historial de pagos, configuración del negocio, usuarios guardados localmente y desactivará el modo oscuro.
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
                      Genera un archivo de respaldo con todos tus datos: productos, ventas, boletas, mermas y configuración. Úsalo para restaurar tu sistema si cambias de dispositivo o se pierde el almacenamiento.
                    </p>
                    <div style={{ background: D ? "rgba(16,185,129,0.1)" : "#ecfdf5", border: `1.5px solid ${D ? "#10b98140" : "#a7f3d0"}`, borderRadius: 10, padding: "12px 16px", marginBottom: 20, fontSize: 12, color: "#059669" }}>
                      ✅ Se incluye: productos, categorías, ventas, boletas, mermas, configuración del negocio
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
                      <div style={{ width: 40, height: 40, borderRadius: 12, background: D ? "rgba(59,91,219,0.2)" : "#f0f2ff", display: "flex", alignItems: "center", justifyContent: "center" }}><Lock size={18} color="#3b5bdb" /></div>
                      <div>
                        <h3 style={{ margin: 0, fontSize: 16, fontWeight: 700, color: textPrimary }}>Mi Cuenta</h3>
                        <p style={{ margin: 0, fontSize: 12, color: textMuted }}>Información de tu perfil</p>
                      </div>
                    </div>
                    <div style={{ display: "flex", alignItems: "center", gap: 16, padding: "18px", background: D ? "linear-gradient(135deg, #252840, #1e2235)" : "linear-gradient(135deg, #f0f2ff, #e8f0fe)", borderRadius: 14, marginBottom: 20 }}>
                      <div style={{ width: 56, height: 56, borderRadius: "50%", background: esGerente ? "linear-gradient(135deg, #3b5bdb, #4c6ef5)" : "linear-gradient(135deg, #10b981, #34d399)", color: "#fff", display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 800, fontSize: 20 }}>
                        {iniciales}
                      </div>
                      <div>
                        <p style={{ margin: 0, fontSize: 18, fontWeight: 800, color: textPrimary }}>{currentUser.nombre}</p>
                        <p style={{ margin: 0, fontSize: 13, color: textMuted }}>@{currentUser.usuario}</p>
                        {currentUser.correo && <p style={{ margin: "2px 0 0", fontSize: 12, color: textMuted }}>{currentUser.correo}</p>}
                        <span className="badge" style={{ marginTop: 6, background: esGerente ? (D ? "rgba(59,91,219,0.2)" : "#e8f0fe") : (D ? "rgba(16,185,129,0.2)" : "#ecfdf5"), color: esGerente ? "#4c6ef5" : "#059669" }}>
                          {esGerente ? "👑 Gerente" : "👤 Empleado"}
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
                      <div style={{ width: 40, height: 40, borderRadius: 12, background: D ? "rgba(59,91,219,0.2)" : "#e8f0fe", display: "flex", alignItems: "center", justifyContent: "center" }}><Shield size={18} color="#3b5bdb" /></div>
                      <div>
                        <h3 style={{ margin: 0, fontSize: 16, fontWeight: 700, color: textPrimary }}>Seguridad y Roles</h3>
                        <p style={{ margin: 0, fontSize: 12, color: textMuted }}>Solo visible para gerentes</p>
                      </div>
                    </div>
                    {[
                      { rol: "Gerente", permisos: ["Crear/editar/eliminar usuarios", "Configuración completa", "Panel de administración", "Gestión MercadoPago y SII", "Exportar reportes"], color: "#3b5bdb", bg: D ? "rgba(59,91,219,0.15)" : "#e8f0fe" },
                      { rol: "Empleado", permisos: ["Ver productos e inventario", "Registrar ventas", "Ver estadísticas básicas", "Generar boletas"], color: "#10b981", bg: D ? "rgba(16,185,129,0.15)" : "#ecfdf5" },
                    ].map(({ rol, permisos, color, bg }) => (
                      <div key={rol} style={{ padding: "14px", background: bg, borderRadius: 10, marginBottom: 10 }}>
                        <p style={{ margin: "0 0 8px", fontSize: 14, fontWeight: 700, color }}>{rol}</p>
                        {permisos.map(p => <p key={p} style={{ margin: "0 0 4px", fontSize: 12, color: textSecondary }}>✓ {p}</p>)}
                      </div>
                    ))}
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
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.6)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 100, backdropFilter: "blur(4px)" }}>
          <div className="fade-in" style={{ background: bgCard, borderRadius: 20, padding: 28, width: 430, boxShadow: "0 24px 60px rgba(0,0,0,0.3)", maxHeight: "90vh", overflowY: "auto" }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 22 }}>
              <h3 style={{ margin: 0, fontSize: 18, fontWeight: 800, color: textPrimary }}>{modal === "add" ? "Agregar Producto" : "Editar Producto"}</h3>
              <button onClick={() => setModal(null)} style={{ background: bgCard2, border: "none", cursor: "pointer", width: 32, height: 32, borderRadius: 8, display: "flex", alignItems: "center", justifyContent: "center" }}><X size={16} color={textMuted} /></button>
            </div>
            {[{ label: "Nombre", key: "nombre", type: "text" }, { label: "Precio", key: "precio", type: "number" }, { label: "Stock", key: "stock", type: "number" }].map(({ label, key, type }) => (
              <div key={key} style={{ marginBottom: 16 }}>
                <label style={{ fontSize: 12, fontWeight: 700, color: D ? "#9ca3af" : "#374151", display: "block", marginBottom: 6 }}>{label}</label>
                <input type={type} value={form[key] || ""} onChange={e => setForm(f => ({ ...f, [key]: e.target.value }))} style={inp} />
              </div>
            ))}
            <div style={{ marginBottom: 16 }}>
              <label style={{ fontSize: 12, fontWeight: 700, color: D ? "#9ca3af" : "#374151", display: "block", marginBottom: 6 }}>Categoría</label>
              <select value={form.categoria || categorias[0] || ""} onChange={e => setForm(f => ({ ...f, categoria: e.target.value }))} style={{ ...inp }}>
                {categorias.map(c => <option key={c}>{c}</option>)}
              </select>
            </div>
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
                  <button key={e} onClick={() => setForm(f => ({ ...f, img: e }))} style={{ width: 32, height: 32, borderRadius: 8, border: `1.5px solid ${form.img === e ? "#3b5bdb" : borderColor2}`, background: form.img === e ? (D ? "rgba(59,91,219,0.2)" : "#e8f0fe") : bgCard2, fontSize: 16, cursor: "pointer" }}>{e}</button>
                ))}
              </div>
            </div>
            {/* Promoción */}
            <div style={{ marginBottom: 16, background: D ? "#1e2235" : "#f8f9ff", borderRadius: 12, padding: "14px 16px", border: `1.5px solid ${form.promoActiva ? "#3b5bdb" : borderColor2}` }}>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: form.promoActiva ? 12 : 0 }}>
                <div>
                  <p style={{ margin: 0, fontSize: 13, fontWeight: 700, color: textPrimary }}>🏷️ Promoción por cantidad</p>
                  <p style={{ margin: 0, fontSize: 11, color: textMuted }}>Precio especial al comprar X o más</p>
                </div>
                <button onClick={() => setForm(f => ({ ...f, promoActiva: !f.promoActiva }))}
                  className="toggle-switch" style={{ background: form.promoActiva ? "#3b5bdb" : (D ? "#2d3158" : "#e5e7eb") }}>
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
            <div style={{ display: "flex", gap: 10 }}>
              <button onClick={() => setModal(null)} style={{ flex: 1, padding: "11px", borderRadius: 10, border: `1.5px solid ${borderColor2}`, background: bgCard2, cursor: "pointer", fontSize: 14, color: textSecondary, fontWeight: 600, fontFamily: "inherit" }}>Cancelar</button>
              <button onClick={handleSaveProd} className="btn-primary" style={{ flex: 1, padding: "11px", borderRadius: 10, fontSize: 14 }}>{modal === "add" ? "Agregar" : "Guardar"}</button>
            </div>
          </div>
        </div>
      )}

      {/* ── Modal Editar Usuario ── */}
      {modalUsuario && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.6)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 100, backdropFilter: "blur(4px)" }}>
          <div className="fade-in" style={{ background: bgCard, borderRadius: 20, padding: 28, width: 440, boxShadow: "0 24px 60px rgba(0,0,0,0.3)" }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 22 }}>
              <h3 style={{ margin: 0, fontSize: 18, fontWeight: 800, color: textPrimary }}>Editar Usuario</h3>
              <button onClick={() => setModalUsuario(null)} style={{ background: bgCard2, border: "none", cursor: "pointer", width: 32, height: 32, borderRadius: 8, display: "flex", alignItems: "center", justifyContent: "center" }}><X size={16} color={textMuted} /></button>
            </div>
            {[{ label: "Nombre", key: "nombre" }, { label: "Correo", key: "correo", type: "email" }].map(({ label, key, type }) => (
              <div key={key} style={{ marginBottom: 14 }}>
                <label style={{ fontSize: 12, fontWeight: 700, color: D ? "#9ca3af" : "#374151", display: "block", marginBottom: 6 }}>{label}</label>
                <input type={type || "text"} value={formUsuario[key] || ""} onChange={e => setFormUsuario(f => ({ ...f, [key]: e.target.value }))} style={inp} />
              </div>
            ))}
            <div style={{ marginBottom: 14 }}>
              <label style={{ fontSize: 12, fontWeight: 700, color: D ? "#9ca3af" : "#374151", display: "block", marginBottom: 6 }}>Rol</label>
              <select value={formUsuario.rol || "empleado"} onChange={e => setFormUsuario(f => ({ ...f, rol: e.target.value }))} style={inp}>
                <option value="empleado">👤 Empleado</option>
                <option value="gerente">👑 Gerente</option>
              </select>
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
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.6)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 100, backdropFilter: "blur(4px)" }}>
          <div className="fade-in" style={{ background: bgCard, borderRadius: 20, padding: 28, width: 440, boxShadow: "0 24px 60px rgba(0,0,0,0.3)" }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 22 }}>
              <h3 style={{ margin: 0, fontSize: 18, fontWeight: 800, color: textPrimary }}>Crear Nuevo Usuario</h3>
              <button onClick={() => setModalNuevoUsuario(false)} style={{ background: bgCard2, border: "none", cursor: "pointer", width: 32, height: 32, borderRadius: 8, display: "flex", alignItems: "center", justifyContent: "center" }}><X size={16} color={textMuted} /></button>
            </div>
            {[
              { label: "Nombre completo", key: "nombre", type: "text" },
              { label: "Correo electrónico", key: "correo", type: "email" },
              { label: "Usuario", key: "usuario", type: "text" },
              { label: "Contraseña", key: "clave", type: "password" },
            ].map(({ label, key, type }) => (
              <div key={key} style={{ marginBottom: 14 }}>
                <label style={{ fontSize: 12, fontWeight: 700, color: D ? "#9ca3af" : "#374151", display: "block", marginBottom: 6 }}>{label}</label>
                <input type={type} value={formNuevoUsuario[key] || ""} onChange={e => setFormNuevoUsuario(f => ({ ...f, [key]: e.target.value }))} style={inp} />
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
          <div className="fade-in" style={{ background: bgCard, borderRadius: 20, padding: 24, width: 420, boxShadow: "0 24px 60px rgba(0,0,0,0.3)" }}>
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

      {/* ── Modal Ajuste de Stock ── */}
      {modalStock && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.6)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 100, backdropFilter: "blur(4px)" }}>
          <div className="fade-in" style={{ background: bgCard, borderRadius: 20, padding: 28, width: 380, boxShadow: "0 24px 60px rgba(0,0,0,0.3)" }}>
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
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.6)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 100, backdropFilter: "blur(4px)" }}>
          <div className="fade-in" style={{ background: bgCard, borderRadius: 20, padding: 28, width: 400, boxShadow: "0 24px 60px rgba(0,0,0,0.3)" }}>
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

      {/* ── Modal Confirmar Eliminar Categoría ── */}
      {confirmDeleteCat && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.6)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 100, backdropFilter: "blur(4px)" }}>
          <div className="fade-in" style={{ background: bgCard, borderRadius: 20, padding: 30, width: 390, boxShadow: "0 24px 60px rgba(0,0,0,0.3)" }}>
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
          <div className="fade-in" style={{ background: bgCard, borderRadius: 24, padding: 36, width: 320, boxShadow: "0 30px 80px rgba(0,0,0,0.5)", textAlign: "center" }}>
            <div style={{ width: 64, height: 64, borderRadius: "50%", background: "linear-gradient(135deg, #3b5bdb, #4c6ef5)", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 20px" }}>
              <Lock size={28} color="#fff" />
            </div>
            <h2 style={{ margin: "0 0 4px", fontSize: 20, fontWeight: 800, color: textPrimary }}>Pantalla Bloqueada</h2>
            <p style={{ margin: "0 0 24px", fontSize: 13, color: textMuted }}>{currentUser.nombre}</p>
            <div style={{ display: "flex", justifyContent: "center", gap: 10, marginBottom: 20 }}>
              {[0,1,2,3].map(i => (
                <div key={i} style={{ width: 14, height: 14, borderRadius: "50%", background: pinInput.length > i ? "#3b5bdb" : (D ? "#2d3158" : "#e5e7eb"), transition: "background 0.15s" }} />
              ))}
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 10, marginBottom: 16 }}>
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
