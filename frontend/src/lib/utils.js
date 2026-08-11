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

// fetch con límite de tiempo. Si el celular estuvo bloqueado/dormido un rato,
// el navegador puede dejar una petición "colgada" sin resolver nunca. Este
// helper la aborta a los `ms` y lanza un error claro, para que las pantallas
// de sincronización (caja, ventas, productos) puedan reintentar solas en vez
// de quedar pegadas esperando una respuesta que no va a llegar.
export const fetchConTimeout = (url, options = {}, ms = 12000) => {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), ms);
  return fetch(url, { ...options, signal: controller.signal }).finally(() => clearTimeout(timeoutId));
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
