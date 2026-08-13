import React from "react";
import {
  Menu, Bell, Moon, Sun, DollarSign, ShoppingBasket, Egg, TrendingUp,
  ArrowDown, ArrowUp, Wallet, ShoppingCart, Package, BarChart3,
  ScanLine, ChevronRight, AlertTriangle, Target, Banknote, CreditCard, Landmark
} from "lucide-react";

const money = (n) => "$" + Math.round(Number(n || 0)).toLocaleString("es-CL");

const cardShadow = "0 8px 24px rgba(23, 28, 40, .08)";
const styles = {
  root: { width: "calc(100% + 48px)", margin: "-20px -24px 0", background: "#f7f8fb", minHeight: "100%", paddingBottom: 110, color: "#171923" },
  header: { position: "relative", overflow: "hidden", padding: "22px 20px 78px", borderRadius: "0 0 30px 30px", background: "linear-gradient(135deg,#ffd83d,#ffc400)" },
  top: { display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12 },
  brand: { display: "flex", alignItems: "center", gap: 10, minWidth: 0 },
  logo: { width: 48, height: 48, borderRadius: "50%", background: "#fff", display: "grid", placeItems: "center", fontSize: 25, boxShadow: cardShadow },
  iconButton: { width: 44, height: 44, border: 0, borderRadius: 15, background: "rgba(255,255,255,.92)", display: "grid", placeItems: "center", cursor: "pointer", boxShadow: "0 5px 16px rgba(0,0,0,.08)" },
  section: { padding: "0 18px", marginTop: 28 },
  title: { margin: "0 0 14px", fontSize: 20, fontWeight: 850 },
  grid2: { display: "grid", gridTemplateColumns: "repeat(2,minmax(0,1fr))", gap: 14 },
  stat: { background: "#fff", borderRadius: 23, padding: 18, minHeight: 148, boxShadow: cardShadow },
  finance: { borderRadius: 22, padding: 18, minHeight: 128, border: "1px solid transparent" },
  quick: { border: "1px solid #eceef3", borderRadius: 18, padding: 14, background: "#fff", display: "flex", alignItems: "center", gap: 12, textAlign: "left", cursor: "pointer", minHeight: 76 },
  iconCircle: { width: 43, height: 43, borderRadius: "50%", display: "grid", placeItems: "center", flexShrink: 0 },
};

function Stat({ Icon, bg, color, label, value, delta }) {
  const positive = Number(delta || 0) >= 0;
  return <div style={styles.stat}>
    <div style={{ ...styles.iconCircle, background: bg }}><Icon size={21} color={color}/></div>
    <div style={{ color: "#7d8492", marginTop: 17, fontSize: 14 }}>{label}</div>
    <div style={{ fontSize: 25, fontWeight: 900, marginTop: 4, lineHeight: 1.1 }}>{value}</div>
    <div style={{ color: positive ? "#159447" : "#d92d3a", marginTop: 10, fontSize: 13, fontWeight: 750 }}>{positive ? "↑" : "↓"} {Math.abs(Number(delta || 0)).toLocaleString("es-CL", { maximumFractionDigits: 1 })}% vs ayer</div>
  </div>;
}

function Finance({ Icon, label, value, sub, bg, border, color, iconBg }) {
  return <div style={{ ...styles.finance, background: bg, borderColor: border }}>
    <div style={{ ...styles.iconCircle, background: iconBg }}><Icon size={20} color="#fff"/></div>
    <div style={{ color: "#646b78", marginTop: 13, fontSize: 14 }}>{label}</div>
    <div style={{ color, fontSize: 23, fontWeight: 900, marginTop: 3 }}>{money(value)}</div>
    <div style={{ color: "#8b919c", marginTop: 5, fontSize: 12 }}>{sub}</div>
  </div>;
}

function Quick({ Icon, title, sub, color, bg, onClick }) {
  return <button style={styles.quick} onClick={onClick}>
    <span style={{ ...styles.iconCircle, background: bg }}><Icon size={20} color={color}/></span>
    <span style={{ minWidth: 0 }}><b style={{ display: "block", fontSize: 14 }}>{title}</b><small style={{ color: "#7b8290", fontSize: 12 }}>{sub}</small></span>
  </button>;
}

export default function ReyDelHuevoInicio({
  currentUser, saludo, fecha, ventasHoy = 0, bandejasHoy = 0, huevosHoy = 0,
  gananciaHoy = 0, deltaVentas = 0, deltaHuevos = 0, deltaGanancia = 0,
  egresosHoy = 0, efectivoHoy = 0, debitoHoy = 0, transferenciaHoy = 0,
  movimientos = [], stockBajo = 0, notificaciones = 0,
  dark = false, onToggleDark, onNotifications, onNavigate, onVentaHuevos
}) {
  const nombre = String(currentUser?.nombre || "Usuario").split(" ")[0];
  const balance = Number(ventasHoy || 0) - Number(egresosHoy || 0);
  const meta = 600000;
  const progreso = Math.max(0, Math.min(100, Math.round((Number(ventasHoy || 0) / meta) * 100)));
  return <div style={styles.root}>
    <header style={styles.header}>
      <div style={{ position: "absolute", right: -20, bottom: -35, fontSize: 150, opacity: .13 }}>👑</div>
      <div style={styles.top}>
        <button style={{ ...styles.iconButton, background: "transparent", boxShadow: "none" }} aria-label="Menú"><Menu size={27}/></button>
        <div style={styles.brand}>
          <div style={styles.logo}>🐔</div>
          <div><div style={{ fontWeight: 950, fontSize: 20, lineHeight: 1 }}><span>REY </span><span style={{ color: "#d71920" }}>DEL HUEVO</span></div><small style={{ fontSize: 10 }}>Los mejores huevos de Rancagua</small></div>
        </div>
        <div style={{ display: "flex", gap: 8 }}>
          <button style={{ ...styles.iconButton, position: "relative" }} onClick={onNotifications}><Bell size={21}/>{notificaciones > 0 && <span style={{ position: "absolute", right: -3, top: -4, minWidth: 20, height: 20, borderRadius: 10, background: "#e31d2b", color: "white", fontSize: 11, display: "grid", placeItems: "center", fontWeight: 800 }}>{Math.min(notificaciones, 9)}</span>}</button>
          <button style={styles.iconButton} onClick={onToggleDark}>{dark ? <Sun size={21}/> : <Moon size={21}/>}</button>
        </div>
      </div>
      <h1 style={{ position: "relative", margin: "34px 0 5px", fontSize: 27, fontWeight: 950 }}>¡{saludo}, {nombre}! 👋</h1>
      <p style={{ position: "relative", margin: 0, color: "#514512", fontSize: 15 }}>{fecha}</p>
    </header>

    <section style={{ ...styles.section, marginTop: -48, position: "relative" }}><div style={styles.grid2}>
      <Stat Icon={DollarSign} bg="#dcfce7" color="#16a34a" label="Ventas de hoy" value={money(ventasHoy)} delta={deltaVentas}/>
      <Stat Icon={ShoppingBasket} bg="#dbeafe" color="#2563eb" label="Bandejas hoy" value={Number(bandejasHoy).toLocaleString("es-CL")} delta={deltaHuevos}/>
      <Stat Icon={Egg} bg="#ffedd5" color="#ea580c" label="Huevos hoy" value={Number(huevosHoy).toLocaleString("es-CL")} delta={deltaHuevos}/>
      <Stat Icon={TrendingUp} bg="#ede9fe" color="#7c3aed" label="Ganancia estimada" value={money(gananciaHoy)} delta={deltaGanancia}/>
    </div></section>

    <section style={styles.section}>
      <h2 style={styles.title}>Resumen financiero</h2>
      <div style={{ display: "grid", gridTemplateColumns: "1fr", gap: 13 }}>
        <Finance Icon={ArrowDown} label="Ingresos" value={ventasHoy} sub="Ventas netas" bg="#f0fdf4" border="#bbf7d0" color="#148a43" iconBg="#16a34a"/>
        <Finance Icon={ArrowUp} label="Egresos" value={egresosHoy} sub="Gastos y compras" bg="#fff4f4" border="#fecaca" color="#d71920" iconBg="#dc2626"/>
        <Finance Icon={Wallet} label="Balance" value={balance} sub="Ingresos - Egresos" bg="#fffbeb" border="#fde68a" color={balance >= 0 ? "#148a43" : "#d71920"} iconBg="#f5b700"/>
      </div>
    </section>

    <section style={styles.section}>
      <h2 style={styles.title}>Pagos de hoy</h2>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(3,minmax(0,1fr))", gap: 10 }}>
        <div style={{ background: "#fff", borderRadius: 18, padding: "14px 10px", boxShadow: cardShadow, textAlign: "center" }}>
          <div style={{ ...styles.iconCircle, width: 36, height: 36, margin: "0 auto 8px", background: "#dcfce7" }}><Banknote size={17} color="#16a34a"/></div>
          <div style={{ color: "#7d8492", fontSize: 12 }}>Efectivo</div>
          <div style={{ fontSize: 15, fontWeight: 850, marginTop: 2 }}>{money(efectivoHoy)}</div>
        </div>
        <div style={{ background: "#fff", borderRadius: 18, padding: "14px 10px", boxShadow: cardShadow, textAlign: "center" }}>
          <div style={{ ...styles.iconCircle, width: 36, height: 36, margin: "0 auto 8px", background: "#dbeafe" }}><CreditCard size={17} color="#2563eb"/></div>
          <div style={{ color: "#7d8492", fontSize: 12 }}>Débito/Tarjeta</div>
          <div style={{ fontSize: 15, fontWeight: 850, marginTop: 2 }}>{money(debitoHoy)}</div>
        </div>
        <div style={{ background: "#fff", borderRadius: 18, padding: "14px 10px", boxShadow: cardShadow, textAlign: "center" }}>
          <div style={{ ...styles.iconCircle, width: 36, height: 36, margin: "0 auto 8px", background: "#ede9fe" }}><Landmark size={17} color="#7c3aed"/></div>
          <div style={{ color: "#7d8492", fontSize: 12 }}>Transferencia</div>
          <div style={{ fontSize: 15, fontWeight: 850, marginTop: 2 }}>{money(transferenciaHoy)}</div>
        </div>
      </div>
    </section>

    <section style={styles.section}><h2 style={styles.title}>Accesos rápidos</h2><div style={styles.grid2}>
      <Quick Icon={Egg} title="Registrar venta" sub="Huevos" color="#fff" bg="#f4b400" onClick={onVentaHuevos}/>
      <Quick Icon={ShoppingCart} title="Venta" sub="Inventario" color="#fff" bg="#dc2626" onClick={() => onNavigate?.("Ventas")}/>
      <Quick Icon={Package} title="Agregar stock" sub="Inventario" color="#fff" bg="#2563eb" onClick={() => onNavigate?.("Productos")}/>
      <Quick Icon={Wallet} title="Registrar gasto" sub="Compras y egresos" color="#fff" bg="#16a34a" onClick={() => onNavigate?.("Gastos")}/>
      <Quick Icon={BarChart3} title="Reportes" sub="Ver estadísticas" color="#fff" bg="#7c3aed" onClick={() => onNavigate?.("Reportes")}/>
      <Quick Icon={ScanLine} title="Escanear" sub="Código de barras" color="#fff" bg="#ea580c" onClick={() => onNavigate?.("Ventas")}/>
    </div></section>

    <section style={styles.section}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}><h2 style={styles.title}>Actividad reciente</h2><button onClick={() => onNavigate?.("Ventas")} style={{ border: 0, background: "none", color: "#d71920", fontWeight: 800 }}>Ver todo <ChevronRight size={14} style={{ verticalAlign: -2 }}/></button></div>
      <div style={{ background: "#fff", borderRadius: 22, padding: "3px 16px", boxShadow: cardShadow }}>
        {movimientos.slice(0, 5).map((m, i) => <div key={m.id || i} style={{ display: "flex", alignItems: "center", gap: 12, padding: "14px 0", borderBottom: i < Math.min(movimientos.length,5)-1 ? "1px solid #eef0f4" : 0 }}>
          <span style={{ ...styles.iconCircle, width: 38, height: 38, background: m.positivo ? "#dcfce7" : "#fee2e2" }}>{m.tipo === "gasto" ? <Wallet size={18} color="#dc2626"/> : <DollarSign size={18} color="#16a34a"/>}</span>
          <span style={{ flex: 1, minWidth: 0 }}><b style={{ display: "block", fontSize: 14, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{m.titulo}</b><small style={{ color: "#7c8390" }}>{m.detalle}</small></span>
          <span style={{ textAlign: "right" }}><small style={{ display: "block", color: "#8b919c" }}>{m.hora}</small><b style={{ color: m.positivo ? "#16a34a" : "#dc2626" }}>{m.positivo ? "+" : "-"}{money(m.monto)}</b></span>
        </div>)}
        {!movimientos.length && <div style={{ padding: 24, textAlign: "center", color: "#8b919c" }}>Aún no hay movimientos hoy.</div>}
      </div>
    </section>

    {stockBajo > 0 && <section style={styles.section}><h2 style={styles.title}>Alertas importantes</h2><button onClick={() => onNavigate?.("Productos")} style={{ width: "100%", border: "1px solid #fde68a", background: "#fffbeb", borderRadius: 20, padding: 17, display: "flex", alignItems: "center", gap: 13, textAlign: "left" }}><AlertTriangle color="#e3a008"/><span><b style={{ display: "block" }}>Bajo stock</b><small style={{ color: "#7c8390" }}>{stockBajo} productos requieren atención</small></span><ChevronRight style={{ marginLeft: "auto" }}/></button></section>}

    <section style={styles.section}><h2 style={styles.title}>Meta diaria de ventas</h2><div style={{ background: "#fff", borderRadius: 22, padding: 18, boxShadow: cardShadow, display: "flex", gap: 14, alignItems: "center" }}><span style={{ ...styles.iconCircle, width: 52, height: 52, background: "linear-gradient(135deg,#ffd42a,#f97316)" }}><Target color="#fff"/></span><div style={{ flex: 1 }}><div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline" }}><b style={{ fontSize: 20 }}>{money(ventasHoy)} <small style={{ color: "#8b919c", fontWeight: 500 }}>de {money(meta)}</small></b><b>{progreso}%</b></div><div style={{ height: 10, borderRadius: 10, background: "#eef0f4", overflow: "hidden", marginTop: 11 }}><div style={{ width: `${progreso}%`, height: "100%", background: "#ffc400", borderRadius: 10 }}/></div></div></div></section>
  </div>;
}
