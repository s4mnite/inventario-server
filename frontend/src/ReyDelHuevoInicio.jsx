import React, { useState, useEffect } from "react";
import {
  Menu, Bell, Moon, Sun, DollarSign, ShoppingBasket, Egg, TrendingUp,
  Wallet, ShoppingCart, Package, BarChart3, ScanLine, ChevronRight,
  AlertTriangle, Target, Banknote, CreditCard, Landmark, X, RefreshCw, Pencil, Check,
} from "lucide-react";

const money = (n) => "$" + Math.round(Number(n || 0)).toLocaleString("es-CL");

// Carga la tipografía de marca una sola vez (Archivo Black para números/títulos,
// Manrope para el resto). Si ya está cargada en el documento no la duplica.
function useBrandFonts() {
  useEffect(() => {
    if (document.getElementById("rey-del-huevo-fonts")) return;
    const link = document.createElement("link");
    link.id = "rey-del-huevo-fonts";
    link.rel = "stylesheet";
    link.href = "https://fonts.googleapis.com/css2?family=Archivo+Black&family=Manrope:wght@500;600;700;800;900&display=swap";
    document.head.appendChild(link);
  }, []);
}

export default function ReyDelHuevoInicio({
  currentUser, saludo, fecha, ventasHoy = 0, bandejasHoy = 0, huevosHoy = 0,
  gananciaHoy = 0, deltaVentas = 0, deltaBandejas = 0, deltaHuevos = 0, deltaGanancia = 0,
  egresosHoy = 0, efectivoHoy = 0, debitoHoy = 0, transferenciaHoy = 0,
  movimientos = [], stockBajo = 0, notificaciones = [],
  dark = false, onToggleDark, onNotifications, onNavigate, onVentaHuevos, onMenu, onVerAlertaStock,
  meta = 600000, onMetaChange, onRefresh,
}) {
  useBrandFonts();
  const [notifOpen, setNotifOpen] = useState(false);
  const [editandoMeta, setEditandoMeta] = useState(false);
  const [metaTemp, setMetaTemp] = useState(String(meta));
  const [refrescando, setRefrescando] = useState(false);

  const listaNotif = Array.isArray(notificaciones) ? notificaciones : [];
  const nombre = String(currentUser?.nombre || "Usuario").split(" ")[0];
  const balance = Number(ventasHoy || 0) - Number(egresosHoy || 0);
  const progreso = Math.max(0, Math.min(100, meta > 0 ? Math.round((Number(ventasHoy || 0) / meta) * 100) : 0));
  const circ = 2 * Math.PI * 26;

  // Paleta de marca — cáscara/tablero oscuro por defecto, claro si el usuario prefiere
  const c = dark
    ? { bg: "#121110", panel: "#1C1A17", text: "#FAF8F3", sub: "#8C8678", border: "#2A2723" }
    : { bg: "#F2F1EC", panel: "#FFFFFF", text: "#14120E", sub: "#6B6558", border: "#E4E1D6" };
  const yolk = "#FF9F1C", red = "#E63946", teal = "#2EC4B6", violet = "#8E7CC3";
  const display = "'Archivo Black', sans-serif";
  const sans = "'Manrope', system-ui, sans-serif";

  const confirmarMeta = () => {
    const n = parseInt(String(metaTemp).replace(/\D/g, ""), 10);
    if (!isNaN(n) && n > 0) onMetaChange?.(n);
    setEditandoMeta(false);
  };
  const doRefresh = () => {
    setRefrescando(true);
    onRefresh?.();
    setTimeout(() => setRefrescando(false), 700);
  };

  return (
    <div style={{ marginLeft: -14, marginRight: -14, marginTop: -16, background: c.bg, minHeight: "100%", paddingBottom: 110, color: c.text, fontFamily: sans, transition: "background .3s" }}>

      {/* Header — placa de rótulo plana, sin degradado */}
      <header style={{ padding: "calc(18px + env(safe-area-inset-top, 0px)) 18px 0", background: "#241E17" }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10 }}>
          <button style={iconBtn("transparent")} aria-label="Menú" onClick={() => onMenu?.()}><Menu size={23} color="#F5EDDD" /></button>
          <div style={{ display: "flex", alignItems: "center", gap: 9, minWidth: 0 }}>
            <div style={{ width: 40, height: 40, borderRadius: "50%", border: `2px solid ${yolk}`, display: "grid", placeItems: "center", fontSize: 19, background: "#1C1712", flexShrink: 0 }}>🐔</div>
            <div style={{ fontFamily: display, fontSize: 13.5, color: "#F5EDDD", letterSpacing: 0.3, whiteSpace: "nowrap" }}>REY <span style={{ color: yolk }}>DEL HUEVO</span></div>
          </div>
          <div style={{ display: "flex", gap: 6 }}>
            <button onClick={doRefresh} style={iconBtn("rgba(255,255,255,.08)")} aria-label="Actualizar">
              <RefreshCw size={16} color="#F5EDDD" style={{ transition: "transform .6s", transform: refrescando ? "rotate(360deg)" : "none" }} />
            </button>
            <div style={{ position: "relative" }}>
              <button style={{ ...iconBtn("rgba(255,255,255,.08)"), position: "relative" }} onClick={() => { setNotifOpen(o => !o); onNotifications?.(); }}>
                <Bell size={16} color="#F5EDDD" />
                {listaNotif.length > 0 && <span style={{ position: "absolute", right: -2, top: -3, minWidth: 16, height: 16, borderRadius: 8, background: red, color: "#fff", fontSize: 9, display: "grid", placeItems: "center", fontWeight: 900 }}>{Math.min(listaNotif.length, 9)}</span>}
              </button>
              {notifOpen && (
                <div style={{ position: "absolute", right: 0, top: 44, width: "min(300px, 82vw)", background: c.panel, zIndex: 60, overflow: "hidden", border: `2px solid ${c.text}` }}>
                  <div style={{ padding: "11px 14px", borderBottom: `2px solid ${c.text}`, display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                    <p style={{ margin: 0, fontSize: 12, fontWeight: 900, color: c.text }}>NOTIFICACIONES</p>
                    <button onClick={() => setNotifOpen(false)} style={{ background: "none", border: "none", cursor: "pointer", color: c.sub }}><X size={14} /></button>
                  </div>
                  {listaNotif.length === 0
                    ? <p style={{ padding: "22px", textAlign: "center", color: c.sub, fontSize: 13 }}>Sin notificaciones 🎉</p>
                    : listaNotif.map((n, i) => (
                      <div key={i} style={{ padding: "11px 14px", borderBottom: i < listaNotif.length - 1 ? `1px solid ${c.border}` : "none", display: "flex", alignItems: "flex-start", gap: 8 }}>
                        <div style={{ width: 6, height: 6, background: n.color || yolk, flexShrink: 0, marginTop: 6 }} />
                        <p style={{ margin: 0, fontSize: 13, color: c.text, lineHeight: 1.5 }}>{n.msg}</p>
                      </div>
                    ))}
                </div>
              )}
            </div>
            <button style={iconBtn("rgba(255,255,255,.08)")} onClick={onToggleDark}>{dark ? <Sun size={16} color="#F5EDDD" /> : <Moon size={16} color="#F5EDDD" />}</button>
          </div>
        </div>
        <div style={{ marginTop: 20, paddingBottom: 20 }}>
          <div style={{ fontSize: 12, color: "#B5A791", fontWeight: 700, letterSpacing: 0.3, textTransform: "uppercase" }}>{fecha} · {saludo}, {nombre}</div>
        </div>
      </header>

      {/* Bento: hero de ventas + ganancia/meta */}
      <section style={{ padding: "16px 18px 0" }}>
        <div style={{ display: "grid", gridTemplateColumns: "1.4fr 1fr", gap: 3 }}>
          <div style={{ background: yolk, padding: 18, minHeight: 168, display: "flex", flexDirection: "column", justifyContent: "space-between" }}>
            <div>
              <div style={{ fontSize: 11, fontWeight: 800, color: "#5C4B12" }}>VENTAS DE HOY</div>
              <div style={{ fontFamily: display, fontSize: 28, color: "#14120E", marginTop: 8, lineHeight: 1 }}>{money(ventasHoy)}</div>
              <Delta value={deltaVentas} color="#5C4B12" />
            </div>
            <div style={{ display: "flex", gap: 14, marginTop: 10 }}>
              <span style={{ fontSize: 11, color: "#5C4B12" }}><b style={{ fontSize: 13, color: "#14120E" }}>{Number(bandejasHoy).toLocaleString("es-CL")}</b> bandejas</span>
              <span style={{ fontSize: 11, color: "#5C4B12" }}><b style={{ fontSize: 13, color: "#14120E" }}>{Number(huevosHoy).toLocaleString("es-CL")}</b> huevos</span>
            </div>
          </div>
          <div style={{ display: "grid", gridTemplateRows: "1fr 1fr", gap: 3 }}>
            <div style={{ background: violet, padding: 14, display: "flex", flexDirection: "column", justifyContent: "center" }}>
              <TrendingUp size={16} color="#fff" />
              <div style={{ fontSize: 10, color: "#fff", opacity: 0.85, marginTop: 8, fontWeight: 700 }}>GANANCIA</div>
              <div style={{ fontFamily: display, fontSize: 14, color: "#fff", marginTop: 2 }}>{money(gananciaHoy)}</div>
            </div>
            <div style={{ background: c.panel, border: `2px solid ${c.border}`, padding: 12, display: "flex", alignItems: "center", justifyContent: "center", gap: 8 }}>
              <svg width="48" height="48" viewBox="0 0 60 60">
                <circle cx="30" cy="30" r="26" fill="none" stroke={c.border} strokeWidth="6" />
                <circle cx="30" cy="30" r="26" fill="none" stroke={teal} strokeWidth="6" strokeDasharray={circ} strokeDashoffset={circ - (circ * progreso) / 100} strokeLinecap="round" transform="rotate(-90 30 30)" />
              </svg>
              <div style={{ fontFamily: display, fontSize: 13, color: c.text }}>{progreso}%</div>
            </div>
          </div>
        </div>
        {/* Segunda fila: bandejas y huevos con su propio delta (antes compartían el mismo dato) */}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 3, marginTop: 3 }}>
          <MiniStat icon={<ShoppingBasket size={16} color="#fff" />} bg={red} label="BANDEJAS" delta={deltaBandejas} />
          <MiniStat icon={<Egg size={16} color="#14120E" />} bg={teal} label="HUEVOS" delta={deltaHuevos} dark />
        </div>
      </section>

      {/* Pagos de hoy */}
      <section style={{ padding: "22px 18px 0" }}>
        <SectionTitle display={display} c={c}>PAGOS DE HOY</SectionTitle>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 3 }}>
          <PagoBlock icon={<Banknote size={15} color="#14120E" />} bg={teal} label="Efectivo" value={money(efectivoHoy)} />
          <PagoBlock icon={<CreditCard size={15} color="#14120E" />} bg={yolk} label="Débito" value={money(debitoHoy)} />
          <PagoBlock icon={<Landmark size={15} color="#fff" />} bg={violet} label="Transfer." value={money(transferenciaHoy)} tone="#fff" />
        </div>
      </section>

      {/* Resumen financiero */}
      <section style={{ padding: "22px 18px 0" }}>
        <SectionTitle display={display} c={c}>RESUMEN FINANCIERO</SectionTitle>
        <div style={{ border: `2px solid ${c.text}`, background: c.panel }}>
          <FinRow c={c} label="INGRESOS" value={ventasHoy} tone={teal} />
          <FinRow c={c} label="EGRESOS" value={egresosHoy} tone={red} negative />
          <FinRow c={c} label="BALANCE" value={balance} tone={balance >= 0 ? teal : red} strong last />
        </div>
      </section>

      {/* Accesos rápidos */}
      <section style={{ padding: "22px 18px 0" }}>
        <SectionTitle display={display} c={c}>ACCESOS RÁPIDOS</SectionTitle>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 3 }}>
          <QuickTile icon={<Egg size={19} color="#14120E" />} title="Venta huevos" bg={yolk} onClick={onVentaHuevos} />
          <QuickTile icon={<ShoppingCart size={19} color="#fff" />} title="Venta" bg={red} onClick={() => onNavigate?.("Ventas")} />
          <QuickTile icon={<Package size={19} color="#fff" />} title="Stock" bg={violet} onClick={() => onNavigate?.("Productos")} />
          <QuickTile icon={<Wallet size={19} color="#14120E" />} title="Gasto" bg={teal} onClick={() => onNavigate?.("Gastos")} />
          <QuickTile icon={<BarChart3 size={19} color={c.text} />} title="Reportes" bg={c.panel} border={c.border} textColor={c.text} onClick={() => onNavigate?.("Reportes")} />
          <QuickTile icon={<ScanLine size={19} color={c.text} />} title="Escanear" bg={c.panel} border={c.border} textColor={c.text} onClick={() => onNavigate?.("Ventas")} />
        </div>
      </section>

      {/* Actividad reciente */}
      <section style={{ padding: "22px 18px 0" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
          <SectionTitle display={display} c={c} noMargin>ACTIVIDAD RECIENTE</SectionTitle>
          <button onClick={() => onNavigate?.("Ventas")} style={{ border: 0, background: "none", color: yolk, fontWeight: 900, fontSize: 12 }}>VER TODO →</button>
        </div>
        <div style={{ border: `2px solid ${c.text}`, background: c.panel }}>
          {movimientos.slice(0, 5).map((m, i) => {
            const cantidad = Math.min(movimientos.length, 5);
            return (
              <div key={m.id || i} style={{ display: "flex", alignItems: "center", gap: 10, padding: "12px 14px", borderBottom: i < cantidad - 1 ? `1px solid ${c.border}` : 0 }}>
                <span style={{ width: 30, height: 30, background: m.positivo ? teal : red, display: "grid", placeItems: "center", flexShrink: 0 }}>
                  {m.tipo === "gasto" ? <Wallet size={14} color="#fff" /> : <DollarSign size={14} color="#14120E" />}
                </span>
                <span style={{ flex: 1, minWidth: 0 }}>
                  <b style={{ display: "block", fontSize: 13, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", color: c.text }}>{m.titulo}</b>
                  <small style={{ color: c.sub }}>{m.detalle} · {m.hora}</small>
                </span>
                <b style={{ color: m.positivo ? teal : red, fontFamily: display, fontSize: 13 }}>{m.positivo ? "+" : "−"}{money(m.monto)}</b>
              </div>
            );
          })}
          {!movimientos.length && <div style={{ padding: 24, textAlign: "center", color: c.sub, fontSize: 13 }}>Aún no hay movimientos hoy.</div>}
        </div>
      </section>

      {stockBajo > 0 && (
        <section style={{ padding: "22px 18px 0" }}>
          <SectionTitle display={display} c={c}>ALERTAS IMPORTANTES</SectionTitle>
          <button onClick={() => (onVerAlertaStock ? onVerAlertaStock() : onNavigate?.("Productos"))} style={{ width: "100%", border: `2px solid ${red}`, background: dark ? "#241315" : "#FDEEEF", padding: 15, display: "flex", alignItems: "center", gap: 12, textAlign: "left", color: c.text, cursor: "pointer" }}>
            <AlertTriangle color={red} size={20} />
            <span><b style={{ display: "block", fontSize: 13.5, fontFamily: display }}>BAJO STOCK</b><small style={{ color: c.sub }}>{stockBajo} productos requieren atención</small></span>
            <ChevronRight style={{ marginLeft: "auto" }} size={18} />
          </button>
        </section>
      )}

      {/* Meta diaria — editable */}
      <section style={{ padding: "22px 18px 0" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
          <SectionTitle display={display} c={c} noMargin>META DIARIA</SectionTitle>
          {!editandoMeta && (
            <button onClick={() => { setMetaTemp(String(meta)); setEditandoMeta(true); }} style={{ border: "none", background: "none", color: yolk, display: "flex", alignItems: "center", gap: 4, fontSize: 11, fontWeight: 900 }}>
              <Pencil size={12} /> EDITAR
            </button>
          )}
        </div>
        <div style={{ border: `2px solid ${c.text}`, background: c.panel, padding: 16 }}>
          {editandoMeta ? (
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <span style={{ fontWeight: 900, color: c.text }}>$</span>
              <input autoFocus value={metaTemp} onChange={e => setMetaTemp(e.target.value.replace(/\D/g, ""))} onKeyDown={e => e.key === "Enter" && confirmarMeta()}
                style={{ flex: 1, fontSize: 18, fontWeight: 800, border: "none", borderBottom: `2px solid ${yolk}`, outline: "none", background: "transparent", color: c.text }} />
              <button onClick={confirmarMeta} style={{ background: teal, border: "none", width: 30, height: 30, display: "grid", placeItems: "center" }}><Check size={16} color="#14120E" /></button>
            </div>
          ) : (
            <>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline" }}>
                <b style={{ fontSize: 17, fontFamily: display, color: c.text }}>{money(ventasHoy)} <small style={{ color: c.sub, fontWeight: 500, fontFamily: sans }}>de {money(meta)}</small></b>
                <b style={{ fontFamily: display, color: yolk }}>{progreso}%</b>
              </div>
              <div style={{ height: 10, background: c.border, marginTop: 11, overflow: "hidden" }}>
                <div style={{ width: `${progreso}%`, height: "100%", background: yolk, transition: "width .4s" }} />
              </div>
            </>
          )}
        </div>
      </section>
    </div>
  );
}

function iconBtn(bg) {
  return { width: 38, height: 38, border: 0, borderRadius: 0, background: bg, display: "grid", placeItems: "center", cursor: "pointer" };
}

function SectionTitle({ children, display, c, noMargin }) {
  return <h2 style={{ fontFamily: display, margin: noMargin ? 0 : "0 0 10px", fontSize: 13, letterSpacing: 0.6, color: c.text }}>{children}</h2>;
}

function Delta({ value, color }) {
  const positive = Number(value || 0) >= 0;
  return <div style={{ color, marginTop: 6, fontSize: 12, fontWeight: 800 }}>{positive ? "↑" : "↓"} {Math.abs(Number(value || 0)).toLocaleString("es-CL", { maximumFractionDigits: 1 })}% vs ayer</div>;
}

function MiniStat({ icon, bg, label, delta, dark }) {
  const positive = Number(delta || 0) >= 0;
  const color = dark ? "#14120E" : "#fff";
  return (
    <div style={{ background: bg, padding: "12px 14px", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
        {icon}
        <span style={{ fontSize: 10.5, fontWeight: 800, color, opacity: 0.9 }}>{label}</span>
      </div>
      <span style={{ fontSize: 11.5, fontWeight: 800, color }}>{positive ? "↑" : "↓"} {Math.abs(Number(delta || 0)).toLocaleString("es-CL", { maximumFractionDigits: 1 })}%</span>
    </div>
  );
}

function PagoBlock({ icon, bg, label, value, tone }) {
  return (
    <div style={{ background: bg, padding: "12px 8px", display: "flex", flexDirection: "column", alignItems: "center", textAlign: "center", color: tone || "#14120E" }}>
      {icon}
      <div style={{ fontSize: 10, opacity: 0.85, marginTop: 6 }}>{label}</div>
      <div style={{ fontSize: 12.5, fontWeight: 800, marginTop: 2 }}>{value}</div>
    </div>
  );
}

function FinRow({ c, label, value, tone, negative, strong, last }) {
  return (
    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "14px 15px", borderBottom: last ? "none" : `1px solid ${c.border}` }}>
      <span style={{ fontSize: 12.5, fontWeight: strong ? 800 : 600, color: c.text, letterSpacing: 0.3 }}>{label}</span>
      <b style={{ color: tone, fontSize: strong ? 18 : 15 }}>{negative ? "−" : ""}{money(Math.abs(value))}</b>
    </div>
  );
}

function QuickTile({ icon, title, bg, border, textColor, onClick }) {
  return (
    <button onClick={onClick} style={{ background: bg, border: border ? `2px solid ${border}` : "none", padding: "14px 6px", display: "flex", flexDirection: "column", alignItems: "center", gap: 8, cursor: "pointer", color: textColor || "#fff" }}>
      {icon}
      <span style={{ fontSize: 10.5, fontWeight: 700, textAlign: "center" }}>{title}</span>
    </button>
  );
}
