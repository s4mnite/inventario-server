import React, { useState } from "react";
import {
  Menu,
  Bell,
  Moon,
  DollarSign,
  ShoppingBasket,
  Egg,
  TrendingUp,
  ArrowDownCircle,
  ArrowUpCircle,
  Wallet,
  ShoppingCart,
  Package,
  BarChart3,
  ScanLine,
  ChevronRight,
  AlertTriangle,
  Archive,
  FileWarning,
  Target,
} from "lucide-react";

// ---------------------------------------------
// Rey del Huevo — Inicio (rediseño)
// Solo UI. No toca lógica, datos, ni backend.
// ---------------------------------------------

const money = (n) =>
  "$" + n.toLocaleString("es-CL", { maximumFractionDigits: 0 });

function greeting(hour) {
  if (hour < 12) return "Buenos días";
  if (hour < 19) return "Buenas tardes";
  return "Buenas noches";
}

const SummaryCard = ({ icon: Icon, iconBg, iconColor, label, value, delta }) => (
  <div className="bg-white rounded-3xl shadow-[0_2px_16px_rgba(20,20,20,0.06)] p-5 flex flex-col gap-4">
    <div
      className="w-12 h-12 rounded-2xl flex items-center justify-center"
      style={{ backgroundColor: iconBg }}
    >
      <Icon size={22} color={iconColor} strokeWidth={2.2} />
    </div>
    <div className="flex flex-col gap-1">
      <span className="text-[13px] text-neutral-500 font-medium leading-tight">
        {label}
      </span>
      <span className="text-[22px] font-extrabold text-neutral-900 leading-tight tabular-nums">
        {value}
      </span>
      {delta != null && (
        <span
          className={`text-[12px] font-semibold ${
            delta >= 0 ? "text-emerald-600" : "text-red-500"
          }`}
        >
          {delta >= 0 ? "↑" : "↓"} {Math.abs(delta)}% vs ayer
        </span>
      )}
    </div>
  </div>
);

const FinanceCard = ({ icon: Icon, iconBg, iconColor, label, value, valueColor, sub }) => (
  <div className="bg-white rounded-3xl shadow-[0_2px_16px_rgba(20,20,20,0.06)] p-5 flex items-center gap-4">
    <div
      className="w-14 h-14 rounded-2xl flex items-center justify-center shrink-0"
      style={{ backgroundColor: iconBg }}
    >
      <Icon size={24} color={iconColor} strokeWidth={2.2} />
    </div>
    <div className="flex flex-col gap-0.5 min-w-0">
      <span className="text-[13px] text-neutral-500 font-medium">{label}</span>
      <span
        className="text-[24px] font-extrabold leading-tight tabular-nums"
        style={{ color: valueColor }}
      >
        {value}
      </span>
      <span className="text-[12px] text-neutral-400">{sub}</span>
    </div>
  </div>
);

const QuickAction = ({ icon: Icon, iconBg, iconColor, title, sub }) => (
  <button className="bg-white rounded-3xl shadow-[0_2px_16px_rgba(20,20,20,0.06)] p-5 flex flex-col gap-4 text-left active:scale-[0.98] transition-transform">
    <div
      className="w-11 h-11 rounded-2xl flex items-center justify-center"
      style={{ backgroundColor: iconBg }}
    >
      <Icon size={20} color={iconColor} strokeWidth={2.2} />
    </div>
    <div className="flex flex-col gap-0.5">
      <span className="text-[15px] font-bold text-neutral-900 leading-tight">
        {title}
      </span>
      <span className="text-[12.5px] text-neutral-500">{sub}</span>
    </div>
  </button>
);

const MovementRow = ({ icon: Icon, iconBg, iconColor, title, sub, time, amount, positive }) => (
  <button className="w-full flex items-center gap-4 py-4 active:bg-neutral-50 rounded-2xl -mx-2 px-2 transition-colors">
    <div
      className="w-11 h-11 rounded-full flex items-center justify-center shrink-0"
      style={{ backgroundColor: iconBg }}
    >
      <Icon size={19} color={iconColor} strokeWidth={2.2} />
    </div>
    <div className="flex-1 min-w-0 text-left">
      <div className="text-[14.5px] font-bold text-neutral-900 truncate">{title}</div>
      <div className="text-[12.5px] text-neutral-500 truncate">{sub}</div>
    </div>
    <div className="flex flex-col items-end gap-0.5 shrink-0">
      <span className="text-[12px] text-neutral-400">{time}</span>
      <span
        className={`text-[14.5px] font-bold tabular-nums ${
          positive ? "text-emerald-600" : "text-red-500"
        }`}
      >
        {positive ? "+" : "-"}
        {money(Math.abs(amount))}
      </span>
    </div>
    <ChevronRight size={18} className="text-neutral-300 shrink-0" />
  </button>
);

const AlertPill = ({ icon: Icon, iconColor, iconBg, title, sub, cta }) => (
  <div
    className="min-w-[168px] rounded-3xl p-4 flex flex-col gap-3 shrink-0 border"
    style={{ backgroundColor: iconBg + "14", borderColor: iconBg + "30" }}
  >
    <div
      className="w-9 h-9 rounded-xl flex items-center justify-center"
      style={{ backgroundColor: "white" }}
    >
      <Icon size={17} color={iconColor} strokeWidth={2.3} />
    </div>
    <div className="flex flex-col gap-0.5">
      <span className="text-[13.5px] font-bold text-neutral-900 leading-tight">
        {title}
      </span>
      <span className="text-[12px] text-neutral-500 leading-snug">{sub}</span>
    </div>
    <span className="text-[12.5px] font-bold" style={{ color: iconColor }}>
      {cta} →
    </span>
  </div>
);

export default function ReyDelHuevoInicio() {
  const [dark, setDark] = useState(false);
  const hour = 9;

  const goalCurrent = 420000;
  const goalTarget = 600000;
  const goalPct = Math.round((goalCurrent / goalTarget) * 100);

  return (
    <div className="min-h-screen bg-neutral-50 pb-28 max-w-md mx-auto font-sans">
      {/* ---------- HEADER ---------- */}
      <div
        className="px-6 pt-6 pb-8 rounded-b-[36px]"
        style={{ background: "linear-gradient(135deg,#FFC22A 0%,#FFB800 100%)" }}
      >
        <div className="flex items-center justify-between mb-6">
          <button className="w-10 h-10 rounded-full bg-white/30 flex items-center justify-center backdrop-blur-sm">
            <Menu size={20} color="#3D2B00" strokeWidth={2.4} />
          </button>

          <div className="flex items-center gap-2.5">
            <button className="relative w-10 h-10 rounded-full bg-white flex items-center justify-center shadow-sm">
              <Bell size={18} color="#3D2B00" strokeWidth={2.2} />
              <span className="absolute -top-1 -right-1 w-4.5 h-4.5 min-w-[18px] h-[18px] rounded-full bg-red-500 text-white text-[10px] font-bold flex items-center justify-center border-2 border-white">
                3
              </span>
            </button>
            <button
              onClick={() => setDark(!dark)}
              className="w-10 h-10 rounded-full bg-white flex items-center justify-center shadow-sm"
            >
              <Moon size={18} color="#3D2B00" strokeWidth={2.2} />
            </button>
            <div className="w-10 h-10 rounded-full bg-neutral-800 overflow-hidden ring-2 ring-white shadow-sm flex items-center justify-center text-white text-[13px] font-bold">
              M
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2.5 mb-1">
          <div className="w-9 h-9 rounded-full bg-white/40 flex items-center justify-center text-lg">
            🐔
          </div>
          <span className="text-[20px] font-extrabold text-[#3D2B00] leading-none">
            Rey del Huevo
          </span>
        </div>

        <h1 className="text-[26px] font-extrabold text-[#2A1D00] mt-4 leading-tight">
          {greeting(hour)}, Matías 👋
        </h1>
        <p className="text-[14px] text-[#5C4300] font-medium mt-1">
          martes, 5 de agosto de 2026
        </p>
      </div>

      {/* ---------- RESUMEN DEL DÍA ---------- */}
      <div className="px-6 mt-7">
        <div className="grid grid-cols-2 gap-4">
          <SummaryCard
            icon={DollarSign}
            iconBg="#E7F8EF"
            iconColor="#16A34A"
            label="Ventas de hoy"
            value={money(1439750)}
            delta={18}
          />
          <SummaryCard
            icon={Egg}
            iconBg="#FFF1DE"
            iconColor="#EA7A1E"
            label="Huevos vendidos"
            value="2.280"
            delta={15}
          />
          <SummaryCard
            icon={ShoppingBasket}
            iconBg="#E9F0FF"
            iconColor="#2563EB"
            label="Bandejas vendidas"
            value="76"
            delta={12}
          />
          <SummaryCard
            icon={TrendingUp}
            iconBg="#F2EBFF"
            iconColor="#7C3AED"
            label="Ganancia estimada"
            value={money(192060)}
            delta={21}
          />
        </div>
      </div>

      {/* ---------- RESUMEN FINANCIERO ---------- */}
      <div className="px-6 mt-10">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-[18px] font-extrabold text-neutral-900">
            Resumen financiero
          </h2>
          <button className="text-[13px] font-semibold text-neutral-500 bg-white px-3.5 py-1.5 rounded-full shadow-sm">
            Hoy ⌄
          </button>
        </div>
        <div className="flex flex-col gap-4">
          <FinanceCard
            icon={ArrowDownCircle}
            iconBg="#E7F8EF"
            iconColor="#16A34A"
            label="Ingresos"
            value={money(1439750)}
            valueColor="#16A34A"
            sub="Ventas netas"
          />
          <FinanceCard
            icon={ArrowUpCircle}
            iconBg="#FDE8E8"
            iconColor="#E23B3B"
            label="Egresos"
            value={money(185000)}
            valueColor="#E23B3B"
            sub="Gastos y compras"
          />
          <FinanceCard
            icon={Wallet}
            iconBg="#FFF3D6"
            iconColor="#C98A00"
            label="Balance"
            value={money(1254750)}
            valueColor="#2A1D00"
            sub="Ingresos - Egresos"
          />
        </div>
      </div>

      {/* ---------- ACCESOS RÁPIDOS ---------- */}
      <div className="px-6 mt-10">
        <h2 className="text-[18px] font-extrabold text-neutral-900 mb-4">
          Accesos rápidos
        </h2>
        <div className="grid grid-cols-2 gap-4">
          <QuickAction
            icon={Egg}
            iconBg="#FFF1DE"
            iconColor="#EA7A1E"
            title="Registrar venta"
            sub="Huevos"
          />
          <QuickAction
            icon={ShoppingCart}
            iconBg="#FDE8E8"
            iconColor="#E23B3B"
            title="Venta"
            sub="Inventario"
          />
          <QuickAction
            icon={Package}
            iconBg="#E9F0FF"
            iconColor="#2563EB"
            title="Agregar stock"
            sub="Inventario"
          />
          <QuickAction
            icon={Wallet}
            iconBg="#E7F8EF"
            iconColor="#16A34A"
            title="Registrar gasto"
            sub="Compras y egresos"
          />
          <QuickAction
            icon={BarChart3}
            iconBg="#F2EBFF"
            iconColor="#7C3AED"
            title="Reportes"
            sub="Ver estadísticas"
          />
          <QuickAction
            icon={ScanLine}
            iconBg="#FFF1DE"
            iconColor="#EA7A1E"
            title="Escanear"
            sub="Código de barras"
          />
        </div>
      </div>

      {/* ---------- MOVIMIENTOS RECIENTES ---------- */}
      <div className="px-6 mt-10">
        <div className="flex items-center justify-between mb-2">
          <h2 className="text-[18px] font-extrabold text-neutral-900">
            Movimientos recientes
          </h2>
          <button className="text-[13px] font-bold text-red-500">Ver todo</button>
        </div>
        <div className="bg-white rounded-3xl shadow-[0_2px_16px_rgba(20,20,20,0.06)] px-4 divide-y divide-neutral-100">
          <MovementRow
            icon={DollarSign}
            iconBg="#E7F8EF"
            iconColor="#16A34A"
            title="Venta de huevos"
            sub="Bandeja Extra (30 huevos)"
            time="09:35"
            amount={6000}
            positive
          />
          <MovementRow
            icon={ShoppingCart}
            iconBg="#FDE8E8"
            iconColor="#E23B3B"
            title="Venta de inventario"
            sub="Servilletas Elite x 2"
            time="09:12"
            amount={2400}
            positive
          />
          <MovementRow
            icon={Package}
            iconBg="#FFEFE0"
            iconColor="#EA7A1E"
            title="Compra registrada"
            sub="Papel Elite 5 paquetes"
            time="08:45"
            amount={18500}
          />
          <MovementRow
            icon={Wallet}
            iconBg="#F2EBFF"
            iconColor="#7C3AED"
            title="Gasto registrado"
            sub="Transporte"
            time="08:20"
            amount={5000}
          />
        </div>
      </div>

      {/* ---------- ALERTAS ---------- */}
      <div className="mt-10">
        <h2 className="text-[18px] font-extrabold text-neutral-900 mb-4 px-6">
          Alertas importantes
        </h2>
        <div className="flex gap-4 overflow-x-auto px-6 pb-2 scrollbar-hide">
          <AlertPill
            icon={AlertTriangle}
            iconColor="#C98A00"
            iconBg="#FFB800"
            title="Bajo stock"
            sub="6 productos con stock bajo"
            cta="Ver productos"
          />
          <AlertPill
            icon={Egg}
            iconColor="#EA7A1E"
            iconBg="#EA7A1E"
            title="Lotes por terminar"
            sub="3 lotes de huevos"
            cta="Ver lotes"
          />
          <AlertPill
            icon={Archive}
            iconColor="#2563EB"
            iconBg="#2563EB"
            title="Caja abierta"
            sub="Caja #3 desde 08:05"
            cta="Ir a caja"
          />
          <AlertPill
            icon={FileWarning}
            iconColor="#E23B3B"
            iconBg="#E23B3B"
            title="Gastos pendientes"
            sub="2 sin comprobante"
            cta="Ver gastos"
          />
        </div>
      </div>

      {/* ---------- META DEL DÍA ---------- */}
      <div className="px-6 mt-10">
        <div className="bg-white rounded-3xl shadow-[0_2px_16px_rgba(20,20,20,0.06)] p-6">
          <div className="flex items-center justify-between mb-5">
            <div className="flex items-center gap-3">
              <div className="w-11 h-11 rounded-2xl bg-[#FFF1DE] flex items-center justify-center">
                <Target size={20} color="#EA7A1E" strokeWidth={2.2} />
              </div>
              <span className="text-[16px] font-extrabold text-neutral-900">
                Meta diaria de ventas
              </span>
            </div>
            <span className="text-[11.5px] text-neutral-400">Hace 5 min</span>
          </div>

          <div className="flex items-end justify-between mb-3">
            <span className="text-[24px] font-extrabold text-neutral-900 tabular-nums">
              {money(goalCurrent)}
              <span className="text-[14px] font-semibold text-neutral-400">
                {" "}de {money(goalTarget)}
              </span>
            </span>
            <span className="text-[20px] font-extrabold text-[#EA7A1E]">
              {goalPct}%
            </span>
          </div>

          <div className="w-full h-3 rounded-full bg-neutral-100 overflow-hidden">
            <div
              className="h-full rounded-full"
              style={{
                width: `${goalPct}%`,
                background: "linear-gradient(90deg,#FFC22A,#EA7A1E)",
              }}
            />
          </div>
          <p className="text-[13px] text-neutral-500 mt-3 font-medium">
            ¡Vamos por esa meta! 💪
          </p>
        </div>
      </div>

      {/* ---------- BOTTOM NAV (sin cambios de lógica) ---------- */}
      <div className="fixed bottom-0 left-0 right-0 max-w-md mx-auto bg-white border-t border-neutral-100 px-2 pt-2 pb-6 flex items-center justify-between shadow-[0_-4px_20px_rgba(0,0,0,0.04)]">
        {[
          { label: "Inicio", icon: "🏠", active: true },
          { label: "Inventario", icon: "📦" },
          { label: "Huevos", icon: "🥚" },
          { label: "Ventas", icon: "🛒" },
          { label: "Más", icon: "⋯" },
        ].map((item) => (
          <button
            key={item.label}
            className="flex-1 flex flex-col items-center gap-1 py-1"
          >
            <span className={`text-[19px] ${item.active ? "" : "opacity-40"}`}>
              {item.icon}
            </span>
            <span
              className={`text-[11px] font-semibold ${
                item.active ? "text-red-500" : "text-neutral-400"
              }`}
            >
              {item.label}
            </span>
          </button>
        ))}
      </div>
    </div>
  );
}
