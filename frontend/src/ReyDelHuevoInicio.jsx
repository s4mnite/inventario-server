import React from "react";
import {
  Menu,
  Bell,
  Moon,
  DollarSign,
  ShoppingBasket,
  Egg,
  TrendingUp,
  ArrowDown,
  ArrowUp,
  Wallet,
  ShoppingCart,
  Package,
  BarChart3,
  ScanLine,
  ChevronRight,
  AlertTriangle,
  Box,
  FileText,
  Target,
  Calendar,
} from "lucide-react";

// ---------------------------------------------
// Rey del Huevo — Inicio
// Réplica fiel del diseño original (imagen de referencia)
// ---------------------------------------------

const money = (n) => "$" + n.toLocaleString("es-CL", { maximumFractionDigits: 0 });

const StatCard = ({ icon: Icon, iconBg, iconColor, label, value, delta }) => (
  <div className="bg-white rounded-2xl shadow-sm p-4 flex flex-col gap-3 min-w-[150px]">
    <div
      className="w-10 h-10 rounded-full flex items-center justify-center"
      style={{ backgroundColor: iconBg }}
    >
      <Icon size={18} color={iconColor} strokeWidth={2.3} />
    </div>
    <div className="flex flex-col gap-0.5">
      <span className="text-[13px] text-neutral-500">{label}</span>
      <span className="text-[19px] font-extrabold text-neutral-900 leading-tight tabular-nums">
        {value}
      </span>
      <span className="text-[12px] font-semibold text-emerald-600 flex items-center gap-0.5">
        ↑ {delta}% vs ayer
      </span>
    </div>
  </div>
);

const FinanceCard = ({ icon: Icon, iconBg, iconColor, bg, border, label, value, valueColor, sub }) => (
  <div
    className="rounded-2xl p-4 flex flex-col gap-3 flex-1 border"
    style={{ backgroundColor: bg, borderColor: border }}
  >
    <div
      className="w-9 h-9 rounded-full flex items-center justify-center"
      style={{ backgroundColor: iconBg }}
    >
      <Icon size={16} color={iconColor} strokeWidth={2.3} />
    </div>
    <div className="flex flex-col gap-0.5">
      <span className="text-[13px] text-neutral-600">{label}</span>
      <span
        className="text-[19px] font-extrabold leading-tight tabular-nums"
        style={{ color: valueColor }}
      >
        {value}
      </span>
      <span className="text-[12px] text-neutral-400">{sub}</span>
    </div>
  </div>
);

const QuickAction = ({ icon: Icon, iconBg, iconColor, bg, border, title, sub }) => (
  <button
    className="rounded-2xl p-3.5 flex items-center gap-3 border text-left active:scale-[0.98] transition-transform"
    style={{ backgroundColor: bg, borderColor: border }}
  >
    <div
      className="w-9 h-9 rounded-full flex items-center justify-center shrink-0"
      style={{ backgroundColor: iconBg }}
    >
      <Icon size={16} color={iconColor} strokeWidth={2.3} />
    </div>
    <div className="flex flex-col min-w-0">
      <span className="text-[13.5px] font-bold text-neutral-900 leading-tight truncate">
        {title}
      </span>
      <span className="text-[12px] text-neutral-500 truncate">{sub}</span>
    </div>
  </button>
);

const MovementRow = ({ icon: Icon, iconBg, iconColor, title, sub, time, amount, positive }) => (
  <div className="flex items-center gap-3 py-3">
    <div
      className="w-10 h-10 rounded-full flex items-center justify-center shrink-0"
      style={{ backgroundColor: iconBg }}
    >
      <Icon size={17} color={iconColor} strokeWidth={2.3} />
    </div>
    <div className="flex-1 min-w-0">
      <div className="text-[14px] font-bold text-neutral-900 truncate">{title}</div>
      <div className="text-[12.5px] text-neutral-500 truncate">{sub}</div>
    </div>
    <div className="flex flex-col items-end gap-0.5 shrink-0">
      <span className="text-[11.5px] text-neutral-400">{time}</span>
      <span
        className={`text-[14px] font-bold tabular-nums ${
          positive ? "text-emerald-600" : "text-red-500"
        }`}
      >
        {positive ? "+" : "-"}
        {money(Math.abs(amount))}
      </span>
    </div>
    <ChevronRight size={16} className="text-neutral-300 shrink-0" />
  </div>
);

const AlertCard = ({ icon: Icon, iconColor, title, sub, cta }) => (
  <div className="bg-white rounded-2xl p-4 flex flex-col gap-2 border border-neutral-100">
    <Icon size={20} color={iconColor} strokeWidth={2.2} />
    <span className="text-[13.5px] font-bold text-neutral-900 leading-tight">
      {title}
    </span>
    <span className="text-[12px] text-neutral-500 leading-snug">{sub}</span>
    <span className="text-[12.5px] font-bold text-red-500 mt-1">{cta}</span>
  </div>
);

export default function ReyDelHuevoInicio() {
  const goalCurrent = 420000;
  const goalTarget = 600000;
  const goalPct = Math.round((goalCurrent / goalTarget) * 100);

  return (
    <div className="min-h-screen bg-neutral-50 pb-24 max-w-md mx-auto font-sans">
      {/* ---------- HEADER ---------- */}
      <div
        className="relative px-5 pt-5 pb-16 overflow-hidden rounded-b-[28px]"
        style={{ background: "linear-gradient(135deg,#FFD23F 0%,#FFC107 100%)" }}
      >
        {/* Corona decorativa de fondo */}
        <div className="absolute -right-6 top-16 opacity-25 text-[130px] leading-none select-none pointer-events-none">
          👑
        </div>

        <div className="flex items-center justify-between mb-5 relative z-10">
          <button className="w-9 h-9 flex items-center justify-center">
            <Menu size={22} color="#2A1D00" strokeWidth={2.4} />
          </button>

          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-full bg-white flex items-center justify-center text-lg">
              🐔
            </div>
            <div>
              <div className="text-[20px] font-extrabold leading-none">
                <span className="text-neutral-900">REY</span>
                <span className="text-red-600"> DEL HUEVO</span>
              </div>
              <div className="text-[10px] text-neutral-700 font-medium">
                Los mejores huevos de Rancagua
              </div>
            </div>
          </div>

          <div className="w-9" />
        </div>

        <div className="flex items-center justify-end gap-2.5 mb-6 relative z-10">
          <button className="relative w-10 h-10 rounded-full bg-white flex items-center justify-center shadow-sm">
            <Bell size={18} color="#2A1D00" strokeWidth={2.2} />
            <span className="absolute -top-1 -right-1 w-4.5 h-4.5 min-w-[18px] h-[18px] rounded-full bg-red-500 text-white text-[10px] font-bold flex items-center justify-center border-2 border-white">
              3
            </span>
          </button>
          <button className="w-10 h-10 rounded-full bg-white flex items-center justify-center shadow-sm">
            <Moon size={18} color="#2A1D00" strokeWidth={2.2} />
          </button>
          <div className="w-10 h-10 rounded-full bg-neutral-800 ring-2 ring-white shadow-sm flex items-center justify-center text-white text-[13px] font-bold">
            M
          </div>
        </div>

        <h1 className="text-[26px] font-extrabold text-neutral-900 leading-tight relative z-10">
          ¡Buenos días, Matías! 👋
        </h1>
        <p className="text-[14px] text-neutral-700 font-medium mt-1 relative z-10">
          martes, 5 de agosto de 2026
        </p>
      </div>

      {/* ---------- RESUMEN DEL DÍA (4 en fila, superpuesto al header) ---------- */}
      <div className="px-5 -mt-10 relative z-10">
        <div className="grid grid-cols-2 gap-3">
          <StatCard
            icon={DollarSign}
            iconBg="#DCFCE7"
            iconColor="#16A34A"
            label="Ventas de hoy"
            value={money(1439750)}
            delta={18}
          />
          <StatCard
            icon={ShoppingBasket}
            iconBg="#DBEAFE"
            iconColor="#2563EB"
            label="Bandejas hoy"
            value="76"
            delta={12}
          />
          <StatCard
            icon={Egg}
            iconBg="#FFEDD5"
            iconColor="#EA580C"
            label="Huevos hoy"
            value="2.280"
            delta={15}
          />
          <StatCard
            icon={TrendingUp}
            iconBg="#EDE9FE"
            iconColor="#7C3AED"
            label="Ganancia estimada"
            value={money(192060)}
            delta={21}
          />
        </div>
      </div>

      {/* ---------- RESUMEN FINANCIERO ---------- */}
      <div className="px-5 mt-7">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-[16px] font-extrabold text-neutral-900">
            Resumen financiero
          </h2>
          <button className="text-[12.5px] font-semibold text-neutral-600 bg-white px-3 py-1.5 rounded-full shadow-sm flex items-center gap-1 border border-neutral-100">
            <Calendar size={13} /> Hoy ⌄
          </button>
        </div>
        <div className="flex gap-3">
          <FinanceCard
            icon={ArrowDown}
            iconBg="#16A34A"
            iconColor="#fff"
            bg="#F0FDF4"
            border="#DCFCE7"
            label="Ingresos"
            value={money(1439750)}
            valueColor="#16A34A"
            sub="Ventas netas"
          />
          <FinanceCard
            icon={ArrowUp}
            iconBg="#DC2626"
            iconColor="#fff"
            bg="#FEF2F2"
            border="#FEE2E2"
            label="Egresos"
            value={money(185000)}
            valueColor="#DC2626"
            sub="Gastos y compras"
          />
          <FinanceCard
            icon={Wallet}
            iconBg="#F59E0B"
            iconColor="#fff"
            bg="#FFFBEB"
            border="#FEF3C7"
            label="Balance"
            value={money(1254750)}
            valueColor="#2A1D00"
            sub="Ingresos - Egresos"
          />
        </div>
      </div>

      {/* ---------- ACCESOS RÁPIDOS ---------- */}
      <div className="px-5 mt-7">
        <h2 className="text-[16px] font-extrabold text-neutral-900 mb-3">
          Accesos rápidos
        </h2>
        <div className="grid grid-cols-2 gap-3">
          <QuickAction
            icon={Egg}
            iconBg="#F59E0B"
            iconColor="#fff"
            bg="#FFFBEB"
            border="#FEF3C7"
            title="Registrar venta"
            sub="Huevos"
          />
          <QuickAction
            icon={ShoppingCart}
            iconBg="#DC2626"
            iconColor="#fff"
            bg="#FEF2F2"
            border="#FEE2E2"
            title="Venta"
            sub="Inventario"
          />
          <QuickAction
            icon={Package}
            iconBg="#2563EB"
            iconColor="#fff"
            bg="#EFF6FF"
            border="#DBEAFE"
            title="Agregar stock"
            sub="Inventario"
          />
          <QuickAction
            icon={Wallet}
            iconBg="#16A34A"
            iconColor="#fff"
            bg="#F0FDF4"
            border="#DCFCE7"
            title="Registrar gasto"
            sub="Compras y egresos"
          />
          <QuickAction
            icon={BarChart3}
            iconBg="#7C3AED"
            iconColor="#fff"
            bg="#F5F3FF"
            border="#EDE9FE"
            title="Reportes"
            sub="Ver estadísticas"
          />
          <QuickAction
            icon={ScanLine}
            iconBg="#EA580C"
            iconColor="#fff"
            bg="#FFF7ED"
            border="#FFEDD5"
            title="Escanear"
            sub="Código de barras"
          />
        </div>
      </div>

      {/* ---------- ACTIVIDAD RECIENTE ---------- */}
      <div className="px-5 mt-7">
        <div className="flex items-center justify-between mb-1">
          <h2 className="text-[16px] font-extrabold text-neutral-900">
            Actividad reciente
          </h2>
          <button className="text-[12.5px] font-bold text-red-500 flex items-center gap-0.5">
            Ver todo <ChevronRight size={14} />
          </button>
        </div>
        <div className="bg-white rounded-2xl shadow-sm px-4 divide-y divide-neutral-100">
          <MovementRow
            icon={DollarSign}
            iconBg="#DCFCE7"
            iconColor="#16A34A"
            title="Venta de huevos"
            sub="Bandeja Extra (30 huevos)"
            time="09:35"
            amount={6000}
            positive
          />
          <MovementRow
            icon={ShoppingCart}
            iconBg="#FEE2E2"
            iconColor="#DC2626"
            title="Venta de inventario"
            sub="Servilletas Elite x 2"
            time="09:12"
            amount={2400}
            positive
          />
          <MovementRow
            icon={Package}
            iconBg="#FFEDD5"
            iconColor="#EA580C"
            title="Compra registrada"
            sub="Papel Elite 5 paquetes"
            time="08:45"
            amount={18500}
          />
          <MovementRow
            icon={Wallet}
            iconBg="#EDE9FE"
            iconColor="#7C3AED"
            title="Gasto registrado"
            sub="Transporte"
            time="08:20"
            amount={5000}
          />
        </div>
      </div>

      {/* ---------- ALERTAS IMPORTANTES ---------- */}
      <div className="px-5 mt-7">
        <h2 className="text-[16px] font-extrabold text-neutral-900 mb-3">
          Alertas importantes
        </h2>
        <div className="grid grid-cols-2 gap-3">
          <AlertCard
            icon={AlertTriangle}
            iconColor="#F59E0B"
            title="Bajo stock"
            sub="6 productos con stock bajo"
            cta="Ver productos"
          />
          <AlertCard
            icon={Egg}
            iconColor="#EA580C"
            title="Lotes por terminar"
            sub="3 lotes de huevos por terminar"
            cta="Ver lotes"
          />
          <AlertCard
            icon={Box}
            iconColor="#64748B"
            title="Caja abierta"
            sub="Caja #3 abierta desde 08:05"
            cta="Ir a caja"
          />
          <AlertCard
            icon={FileText}
            iconColor="#DC2626"
            title="Gastos pendientes"
            sub="2 gastos sin comprobante"
            cta="Ver gastos"
          />
        </div>
      </div>

      {/* ---------- META DIARIA DE VENTAS ---------- */}
      <div className="px-5 mt-7">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-[16px] font-extrabold text-neutral-900">
            Meta diaria de ventas
          </h2>
          <span className="text-[11.5px] text-neutral-400">Actualizado hace 5 min</span>
        </div>
        <div className="bg-white rounded-2xl shadow-sm p-4 flex items-center gap-4">
          <div className="w-12 h-12 rounded-full bg-gradient-to-br from-yellow-400 to-orange-500 flex items-center justify-center shrink-0">
            <Target size={22} color="#fff" strokeWidth={2.3} />
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-baseline justify-between mb-2">
              <span className="text-[17px] font-extrabold text-neutral-900 tabular-nums">
                {money(goalCurrent)}{" "}
                <span className="text-[13px] font-medium text-neutral-400">
                  de {money(goalTarget)}
                </span>
              </span>
              <span className="text-[16px] font-extrabold text-neutral-900">
                {goalPct}%
              </span>
            </div>
            <div className="w-full h-2.5 rounded-full bg-neutral-100 overflow-hidden">
              <div
                className="h-full rounded-full bg-amber-400"
                style={{ width: `${goalPct}%` }}
              />
            </div>
            <p className="text-[12.5px] text-neutral-500 mt-2">¡Vamos por esa meta! 💪</p>
          </div>
        </div>
      </div>

      {/* ---------- BOTTOM NAV ---------- */}
      <div className="fixed bottom-0 left-0 right-0 max-w-md mx-auto bg-white border-t border-neutral-100 px-2 pt-2 pb-5 flex items-center justify-between shadow-[0_-4px_20px_rgba(0,0,0,0.04)]">
        {[
          { label: "Inicio", icon: "🏠", active: true },
          { label: "Inventario", icon: "📦" },
          { label: "Huevos", icon: "🥚" },
          { label: "Ventas", icon: "🛒" },
          { label: "Más", icon: "⋯" },
        ].map((item) => (
          <button key={item.label} className="flex-1 flex flex-col items-center gap-1 py-1">
            <span className={`text-[18px] ${item.active ? "" : "opacity-40"}`}>
              {item.icon}
            </span>
            <span
              className={`text-[10.5px] font-semibold ${
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
