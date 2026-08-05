// ─── Utilidades compartidas ─────────────────────────────────────────────────
// Usadas tanto por App.jsx como por los módulos separados (HuevosModule, etc.)
// para evitar duplicar lógica y que quede una sola fuente de verdad.

export const API = import.meta.env.VITE_API_URL || "https://inventario-backend-ftw6.onrender.com";

export const fmt = (n) => `$${Number(n || 0).toLocaleString("es-CL")}`;
export const fmtIVA = (n) => `$${Math.round(Number(n || 0)).toLocaleString("es-CL")}`;

export const todayLocalISO = () => {
  const now = new Date();
  const offset = now.getTimezoneOffset();
  return new Date(now.getTime() - offset * 60000).toISOString().slice(0, 10);
};


// Incremento/recargo sobre el costo (no margen sobre la venta).
export const calcIncrementPct = (costo, precio) => {
  const c = Number(costo || 0);
  const p = Number(precio || 0);
  if (c <= 0) return 0;
  return ((p - c) / c) * 100;
};

export const priceFromIncrement = (costo, incrementoPct) => {
  const c = Number(costo || 0);
  const i = Number(incrementoPct || 0);
  if (c <= 0) return 0;
  return c * (1 + i / 100);
};
