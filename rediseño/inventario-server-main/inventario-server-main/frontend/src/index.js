const express = require("express");
const cors = require("cors");
require("dotenv").config();

// ─── Resend (envío de correos) ────────────────────────────────────────────────
const enviarCorreo = async (to, subject, html) => {
  try {
    console.log(`📤 Intentando enviar correo a ${to}...`);
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${process.env.RESEND_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: "Inventario Pro <onboarding@resend.dev>",
        to: [to],
        subject,
        html,
      }),
    });
    const data = await res.json();
    if (!res.ok) {
      console.error("❌ Error Resend:", JSON.stringify(data));
    } else {
      console.log(`✅ Correo enviado a ${to} — ID: ${data.id}`);
    }
  } catch (e) {
    console.error("❌ Error enviando correo:", e.message);
  }
};

// ─── Red de seguridad a nivel de proceso ──────────────────────────────────────
// Si algo lanza un error no controlado en cualquier parte del código, lo
// registramos en el log de Render en vez de dejar que tumbe el servidor
// en silencio (así, si "se cae", vamos a tener el motivo exacto en los logs).
process.on("uncaughtException", (e) => console.error("❌ uncaughtException:", e));
process.on("unhandledRejection", (e) => console.error("❌ unhandledRejection:", e));

const app = express();
app.use(cors({ origin: "*", methods: ["GET","POST","PUT","DELETE","PATCH","OPTIONS"], allowedHeaders: ["Content-Type","x-admin-user","x-admin-clave","x-usuario","x-clave"] }));
app.use(express.json());

// ─── MongoDB ──────────────────────────────────────────────────────────────────
const { MongoClient, ObjectId } = require("mongodb");
const MONGO_URI = process.env.MONGODB_URI;
let db;

async function conectarDB() {
  if (!MONGO_URI) { console.log("⚠️  Sin MONGODB_URI, usando memoria"); return; }
  try {
    const client = new MongoClient(MONGO_URI, {
      serverSelectionTimeoutMS: 8000, // si Mongo no responde en 8s, falla en vez de colgar la request
      socketTimeoutMS: 20000,
      connectTimeoutMS: 8000,
    });
    await client.connect();
    db = client.db("inventario");
    console.log("✅ MongoDB conectado");
    client.on("close", () => console.error("⚠️  Conexión a MongoDB cerrada"));
    client.on("serverHeartbeatFailed", () => console.error("⚠️  Heartbeat de MongoDB falló"));
  } catch (e) {
    console.error("❌ Error MongoDB:", e.message);
  }
}

// ─── Base de datos en memoria (fallback) ──────────────────────────────────────
let usuarios = [
  { nombre: "Admin", usuario: "admin", clave: "admin1234", rol: "gerente", correo: "admin@negocio.cl", blocked: false },
  { nombre: "Empleado 1", usuario: "empleado1", clave: "emp1234", rol: "empleado", correo: "", blocked: false },
  { nombre: "Programador", usuario: "dev", clave: "dev2024$", rol: "programador", correo: "dev@sistema.cl", blocked: false },
];
const codigos = {};

// ─── Middleware auth ──────────────────────────────────────────────────────────
const authAdmin = (req, res, next) => {
  const adminUser = req.headers["x-admin-user"];
  const adminClave = req.headers["x-admin-clave"];
  const user = usuarios.find(u => u.usuario === adminUser && u.clave === adminClave && (u.rol === "gerente" || u.rol === "programador"));
  if (!user) return res.status(401).json({ error: "No autorizado" });
  req.adminUser = user;
  next();
};

// ─── AUTH ─────────────────────────────────────────────────────────────────────
app.post("/api/auth/login", (req, res) => {
  const { usuario, clave } = req.body;
  const user = usuarios.find(u => u.usuario === usuario && u.clave === clave);
  if (!user) return res.status(401).json({ error: "Usuario o contraseña incorrectos" });
  if (user.blocked) return res.status(403).json({ error: "Usuario bloqueado" });
  const { clave: _, ...userSinClave } = user;
  res.json({ user: userSinClave });
});

app.post("/api/auth/send-code", async (req, res) => {
  const { correo, nombre } = req.body;
  const codigo = Math.floor(100000 + Math.random() * 900000).toString();
  codigos[correo] = codigo;
  console.log(`📧 Código para ${correo}: ${codigo}`);

  await enviarCorreo(
    correo,
    "Código de verificación — Inventario Pro",
    `
    <div style="font-family: Arial, sans-serif; max-width: 480px; margin: 0 auto; padding: 32px; background: #f9fafb; border-radius: 12px;">
      <h2 style="color: #1a1a2e; margin-bottom: 8px;">Hola${nombre ? ", " + nombre : ""}! 👋</h2>
      <p style="color: #6b7280; margin-bottom: 24px;">Tu código de verificación para activar tu cuenta es:</p>
      <div style="background: #3b5bdb; color: #fff; font-size: 36px; font-weight: 800; letter-spacing: 10px; text-align: center; padding: 20px; border-radius: 12px; margin-bottom: 24px;">
        ${codigo}
      </div>
      <p style="color: #9ca3af; font-size: 13px;">Este código expira en 10 minutos. Si no solicitaste esto, ignora este correo.</p>
    </div>
    `
  );

  res.json({ ok: true, mensaje: "Código enviado al correo" });
});

app.post("/api/auth/verify-code", (req, res) => {
  const { correo, codigo } = req.body;
  if (codigos[correo] !== codigo) return res.status(400).json({ error: "Código incorrecto" });
  res.json({ ok: true });
});

app.post("/api/auth/register", (req, res) => {
  const { nombre, empresa, usuario, correo, clave, codigo } = req.body;
  if (codigos[correo] !== codigo) return res.status(400).json({ error: "Código incorrecto" });
  if (usuarios.find(u => u.usuario === usuario)) return res.status(400).json({ error: "Usuario ya existe" });
  const nuevoUser = { nombre, empresa: empresa || "", usuario, clave, correo, rol: "empleado", blocked: false };
  usuarios.push(nuevoUser);
  delete codigos[correo];
  const { clave: _, ...userSinClave } = nuevoUser;
  res.json({ user: userSinClave });
});

app.post("/api/auth/forgot-password", async (req, res) => {
  const { correo } = req.body;
  const user = usuarios.find(u => u.correo === correo);
  if (!user) return res.status(404).json({ error: "Correo no encontrado" });
  const codigo = Math.floor(100000 + Math.random() * 900000).toString();
  codigos[correo] = codigo;
  console.log(`🔑 Código recuperación para ${correo}: ${codigo}`);

  await enviarCorreo(
    correo,
    "Recuperación de contraseña — Inventario Pro",
    `
    <div style="font-family: Arial, sans-serif; max-width: 480px; margin: 0 auto; padding: 32px; background: #f9fafb; border-radius: 12px;">
      <h2 style="color: #1a1a2e; margin-bottom: 8px;">Recupera tu contraseña 🔑</h2>
      <p style="color: #6b7280; margin-bottom: 24px;">Tu código de recuperación es:</p>
      <div style="background: #e03131; color: #fff; font-size: 36px; font-weight: 800; letter-spacing: 10px; text-align: center; padding: 20px; border-radius: 12px; margin-bottom: 24px;">
        ${codigo}
      </div>
      <p style="color: #9ca3af; font-size: 13px;">Este código expira en 10 minutos. Si no solicitaste esto, ignora este correo.</p>
    </div>
    `
  );

  res.json({ ok: true });
});

app.post("/api/auth/verify-reset-code", (req, res) => {
  const { correo, codigo } = req.body;
  if (codigos[correo] !== codigo) return res.status(400).json({ error: "Código incorrecto" });
  res.json({ ok: true });
});

app.post("/api/auth/reset-password", (req, res) => {
  const { correo, codigo, nuevaClave } = req.body;
  if (codigos[correo] !== codigo) return res.status(400).json({ error: "Código incorrecto" });
  const user = usuarios.find(u => u.correo === correo);
  if (!user) return res.status(404).json({ error: "Usuario no encontrado" });
  user.clave = nuevaClave;
  delete codigos[correo];
  res.json({ ok: true });
});

// ─── USUARIOS ─────────────────────────────────────────────────────────────────
app.get("/api/users", authAdmin, (req, res) => {
  res.json(usuarios.map(({ clave, ...u }) => u));
});

app.put("/api/users/:usuario", authAdmin, (req, res) => {
  const user = usuarios.find(u => u.usuario === req.params.usuario);
  if (!user) return res.status(404).json({ error: "Usuario no encontrado" });
  const { nombre, rol, correo, empresa, nuevaClave } = req.body;
  if (nombre) user.nombre = nombre;
  if (rol) user.rol = rol;
  if (correo !== undefined) user.correo = correo;
  if (empresa !== undefined) user.empresa = empresa;
  if (nuevaClave) user.clave = nuevaClave;
  const { clave, ...userSinClave } = user;
  res.json(userSinClave);
});

app.delete("/api/users/:usuario", authAdmin, (req, res) => {
  const idx = usuarios.findIndex(u => u.usuario === req.params.usuario);
  if (idx === -1) return res.status(404).json({ error: "Usuario no encontrado" });
  usuarios.splice(idx, 1);
  res.json({ ok: true });
});

app.patch("/api/users/:usuario/block", authAdmin, (req, res) => {
  const user = usuarios.find(u => u.usuario === req.params.usuario);
  if (!user) return res.status(404).json({ error: "Usuario no encontrado" });
  user.blocked = req.body.blocked;
  res.json({ ok: true });
});

app.post("/api/users", authAdmin, (req, res) => {
  const { nombre, empresa, usuario, correo, clave, rol } = req.body;
  if (usuarios.find(u => u.usuario === usuario)) return res.status(400).json({ error: "Usuario ya existe" });
  const nuevoUser = { nombre, empresa: empresa || "", usuario, clave, correo, rol: rol || "empleado", blocked: false };
  usuarios.push(nuevoUser);
  const { clave: _, ...userSinClave } = nuevoUser;
  res.json(userSinClave);
});

// ─── PRODUCTOS (MongoDB) ──────────────────────────────────────────────────────
app.get("/api/productos", async (req, res) => {
  try {
    if (!db) return res.json([]);
    const productos = await db.collection("productos").find().toArray();
    res.json(productos.map(p => ({ ...p, id: p._id.toString() })));
  } catch (e) { res.status(500).json({ error: e.message }); }
});

app.post("/api/productos", async (req, res) => {
  try {
    if (!db) return res.status(503).json({ error: "Sin base de datos" });
    const producto = { ...req.body, creadoEn: new Date() };
    const result = await db.collection("productos").insertOne(producto);
    res.json({ ...producto, id: result.insertedId.toString() });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

app.put("/api/productos/:id", async (req, res) => {
  try {
    if (!db) return res.status(503).json({ error: "Sin base de datos" });
    const { _id, id, ...data } = req.body;
    await db.collection("productos").updateOne({ _id: new ObjectId(req.params.id) }, { $set: data });
    res.json({ ok: true });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

app.delete("/api/productos/:id", async (req, res) => {
  try {
    if (!db) return res.status(503).json({ error: "Sin base de datos" });
    await db.collection("productos").deleteOne({ _id: new ObjectId(req.params.id) });
    res.json({ ok: true });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// ─── CATEGORÍAS (MongoDB) ─────────────────────────────────────────────────────
app.get("/api/categorias", async (req, res) => {
  try {
    if (!db) return res.json([]);
    const cats = await db.collection("categorias").find().toArray();
    res.json(cats);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

app.post("/api/categorias", async (req, res) => {
  try {
    if (!db) return res.status(503).json({ error: "Sin base de datos" });
    const { nombre, icono } = req.body;
    const existe = await db.collection("categorias").findOne({ nombre });
    if (existe) return res.status(400).json({ error: "Ya existe" });
    const result = await db.collection("categorias").insertOne({ nombre, icono: icono || "📦" });
    res.json({ _id: result.insertedId, nombre, icono: icono || "📦" });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

app.put("/api/categorias/:id", async (req, res) => {
  try {
    if (!db) return res.status(503).json({ error: "Sin base de datos" });
    await db.collection("categorias").updateOne({ _id: new ObjectId(req.params.id) }, { $set: req.body });
    res.json({ ok: true });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

app.delete("/api/categorias/:id", async (req, res) => {
  try {
    if (!db) return res.status(503).json({ error: "Sin base de datos" });
    await db.collection("categorias").deleteOne({ _id: new ObjectId(req.params.id) });
    res.json({ ok: true });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// ─── VENTAS (MongoDB) ─────────────────────────────────────────────────────────
app.get("/api/ventas", async (req, res) => {
  try {
    if (!db) return res.json([]);
    const filtro = req.query.empresa ? { empresa: req.query.empresa } : {};
    const ventas = await db.collection("ventas").find(filtro).sort({ timestamp: -1 }).toArray();
    res.json(ventas.map(v => ({ ...v, id: v._id.toString() })));
  } catch (e) { res.status(500).json({ error: e.message }); }
});

app.post("/api/ventas", async (req, res) => {
  try {
    if (!db) return res.status(503).json({ error: "Sin base de datos" });

    // El frontend manda { venta, boleta } juntos en un solo POST. Antes esto
    // se guardaba tal cual (anidado) en la colección "ventas", sin separar
    // nada y sin descontar stock real — por eso las ventas parecían no
    // guardarse bien. Ahora se separan y se guardan en su colección correcta.
    const { venta, boleta } = req.body;
    if (!venta) return res.status(400).json({ error: "Falta el objeto 'venta'" });

    const ventaDoc = { ...venta, creadoEn: new Date() };
    delete ventaDoc.id; // el id real lo define Mongo
    const ventaResult = await db.collection("ventas").insertOne(ventaDoc);
    const ventaGuardada = { ...ventaDoc, id: ventaResult.insertedId.toString() };

    let boletaGuardada = null;
    if (boleta) {
      const boletaDoc = { ...boleta, ventaId: ventaGuardada.id, creadoEn: new Date() };
      delete boletaDoc.id;
      const boletaResult = await db.collection("boletas").insertOne(boletaDoc);
      boletaGuardada = { ...boletaDoc, id: boletaResult.insertedId.toString() };
    }

    // Descontar el stock real de productos (no huevos, esos tienen su propio
    // flujo en /api/huevos) directamente aquí, para que quede atómico con el
    // guardado de la venta y no dependa de que el navegador lo haga solo.
    const items = Array.isArray(venta.items) ? venta.items : [];
    let stockActualizados = 0;
    for (const item of items) {
      if (!item.productoId) {
        console.error(`⚠️  Venta ${ventaGuardada.id}: item "${item.nombre || "?"}" sin productoId, no se descontó stock.`);
        continue;
      }
      const unidades = Number(item.cantidad || 0) * Number(item.unidadesPorManga || 1);
      if (unidades <= 0) continue;
      try {
        const r = await db.collection("productos").updateOne(
          { _id: new ObjectId(item.productoId) },
          { $inc: { stock: -unidades } }
        );
        if (r.matchedCount === 0) {
          console.error(`⚠️  Venta ${ventaGuardada.id}: no se encontró producto con id "${item.productoId}" ("${item.nombre || "?"}"), stock no descontado.`);
        } else {
          stockActualizados++;
        }
      } catch (e) {
        console.error(`❌ Venta ${ventaGuardada.id}: error al descontar stock de "${item.productoId}" ("${item.nombre || "?"}"): ${e.message}`);
      }
    }
    console.log(`🛒 Venta ${ventaGuardada.id} guardada — stock descontado en ${stockActualizados}/${items.length} ítems.`);

    // Marca la venta como "stock ya aplicado" para que la reconciliación
    // retroactiva (POST /api/productos/reconciliar-stock) nunca vuelva a
    // tocarla y así no se reste el stock dos veces.
    const stockAplicado = stockActualizados === items.length;
    await db.collection("ventas").updateOne(
      { _id: ventaResult.insertedId },
      { $set: { stockAplicado, stockAplicadoDetalle: { actualizados: stockActualizados, total: items.length } } }
    );
    ventaGuardada.stockAplicado = stockAplicado;
    // La reconciliación retroactiva (POST /api/productos/reconciliar-stock) lee
    // de "boletas", así que la boleta recién creada también queda marcada aquí
    // para que nunca se vuelva a tocar y no se reste el stock dos veces.
    if (boletaGuardada) {
      await db.collection("boletas").updateOne(
        { _id: new ObjectId(boletaGuardada.id) },
        { $set: { stockAplicado } }
      );
      boletaGuardada.stockAplicado = stockAplicado;
    }

    res.json({ venta: ventaGuardada, boleta: boletaGuardada, stockActualizados, itemsTotal: items.length });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

app.delete("/api/ventas/:id", async (req, res) => {
  try {
    if (!db) return res.status(503).json({ error: "Sin base de datos" });

    // Requiere sesión válida (cualquier usuario logueado, no solo admin) —
    // igual que el resto de las acciones de venta.
    const usuario = req.headers["x-usuario"];
    const clave = req.headers["x-clave"];
    const user = usuarios.find(u => u.usuario === usuario && u.clave === clave && !u.blocked);
    if (!user) return res.status(401).json({ error: "Credenciales inválidas" });

    const venta = await db.collection("ventas").findOne({ _id: new ObjectId(req.params.id) });
    if (!venta) return res.status(404).json({ error: "Venta no encontrada" });

    // Devolver el stock de cada producto de la venta al inventario.
    const items = Array.isArray(venta.items) ? venta.items : [];
    let stockRevertidos = 0;
    for (const item of items) {
      if (!item.productoId) {
        console.error(`⚠️  Borrado venta ${req.params.id}: item "${item.nombre || "?"}" sin productoId, no se devolvió stock.`);
        continue;
      }
      const unidades = Number(item.cantidad || 0) * Number(item.unidadesPorManga || 1);
      if (unidades <= 0) continue;
      try {
        const r = await db.collection("productos").updateOne(
          { _id: new ObjectId(item.productoId) },
          { $inc: { stock: unidades } }
        );
        if (r.matchedCount === 0) {
          console.error(`⚠️  Borrado venta ${req.params.id}: no se encontró producto con id "${item.productoId}" ("${item.nombre || "?"}"), stock no devuelto (¿producto eliminado?).`);
        } else {
          stockRevertidos++;
        }
      } catch (e) {
        console.error(`❌ Borrado venta ${req.params.id}: error al devolver stock de "${item.productoId}" ("${item.nombre || "?"}"): ${e.message}`);
      }
    }

    await db.collection("ventas").deleteOne({ _id: new ObjectId(req.params.id) });
    // Borra también el recibo asociado, para que no quede huérfano.
    await db.collection("boletas").deleteOne({ ventaId: req.params.id });

    console.log(`🗑️  Venta ${req.params.id} eliminada por "${usuario}" — stock devuelto en ${stockRevertidos}/${items.length} ítems`);
    res.json({ ok: true, itemsRevertidos: items.length, stockRevertidos });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

app.delete("/api/ventas", authAdmin, async (req, res) => {
  try {
    if (!db) return res.status(503).json({ error: "Sin base de datos" });
    if (!req.query.empresa) {
      return res.status(400).json({ error: "Falta especificar 'empresa'. Por seguridad, no se permite borrar ventas de todas las empresas a la vez." });
    }
    const filtro = { empresa: req.query.empresa };
    const result = await db.collection("ventas").deleteMany(filtro);
    console.log(`🗑️  DELETE /api/ventas — empresa="${req.query.empresa}" — por usuario="${req.adminUser.usuario}" — ${result.deletedCount} documentos borrados`);
    res.json({ ok: true, deletedCount: result.deletedCount });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// ─── RECONCILIAR STOCK (retroactivo, una sola vez por boleta) ────────────────
// Usa las BOLETAS como fuente (guardan sus items de forma confiable, a
// diferencia de ventas antiguas que en versiones previas del sistema podían
// quedar guardadas de forma anidada). Por cada boleta pendiente: revisa cada
// producto vendido, comprueba si TODAVÍA EXISTE en la colección "productos"
// y, si existe, le descuenta el stock correspondiente. Marca cada boleta con
// stockAplicado=true para que nunca se vuelva a tocar, aunque esta ruta se
// llame más de una vez. Requiere login de gerente/programador.
// Uso: POST /api/productos/reconciliar-stock  body opcional: { "empresa": "..." }
app.post("/api/productos/reconciliar-stock", authAdmin, async (req, res) => {
  try {
    if (!db) return res.status(503).json({ error: "Sin base de datos" });
    const filtro = { stockAplicado: { $ne: true } };
    if (req.body?.empresa) filtro.empresa = req.body.empresa;
    const boletasPendientes = await db.collection("boletas").find(filtro).toArray();

    const resumenPorProducto = {}; // productoId -> { nombre, unidadesDescontadas }
    const noAplicados = []; // ítems cuyo producto ya no existe, o sin productoId
    let ventasProcesadas = 0;

    for (const boleta of boletasPendientes) {
      const items = Array.isArray(boleta.items) ? boleta.items : [];
      let todosOk = true;
      for (const item of items) {
        if (!item.productoId) {
          todosOk = false;
          noAplicados.push({ boletaNumero: boleta.numero, nombre: item.nombre || "?", motivo: "sin productoId" });
          continue;
        }
        const unidades = Number(item.cantidad || 0) * Number(item.unidadesPorManga || 1);
        if (unidades <= 0) continue;
        try {
          // Primero comprueba si el producto EXISTE antes de tocar nada.
          const existe = await db.collection("productos").findOne(
            { _id: new ObjectId(item.productoId) },
            { projection: { _id: 1 } }
          );
          if (!existe) {
            todosOk = false;
            noAplicados.push({ boletaNumero: boleta.numero, nombre: item.nombre || "?", productoId: item.productoId, motivo: "producto no encontrado (¿fue eliminado?)" });
            continue;
          }
          await db.collection("productos").updateOne(
            { _id: new ObjectId(item.productoId) },
            { $inc: { stock: -unidades } }
          );
          const key = item.productoId;
          if (!resumenPorProducto[key]) resumenPorProducto[key] = { nombre: item.nombre || "?", unidadesDescontadas: 0 };
          resumenPorProducto[key].unidadesDescontadas += unidades;
        } catch (e) {
          todosOk = false;
          noAplicados.push({ boletaNumero: boleta.numero, nombre: item.nombre || "?", productoId: item.productoId, motivo: e.message });
        }
      }
      await db.collection("boletas").updateOne(
        { _id: boleta._id },
        { $set: { stockAplicado: true, stockReconciliadoEn: new Date(), stockReconciliadoCompleto: todosOk } }
      );
      ventasProcesadas++;
    }

    console.log(`🔧 Reconciliación de stock (por boletas): ${ventasProcesadas} boletas procesadas, ${noAplicados.length} ítems sin poder descontar.`);
    res.json({ ok: true, ventasProcesadas, resumenPorProducto, noAplicados });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// ─── BOLETAS (MongoDB) ────────────────────────────────────────────────────────
app.get("/api/boletas", async (req, res) => {
  try {
    if (!db) return res.json([]);
    const filtro = req.query.empresa ? { empresa: req.query.empresa } : {};
    const boletas = await db.collection("boletas").find(filtro).sort({ timestamp: -1 }).toArray();
    res.json(boletas.map(b => ({ ...b, id: b._id.toString() })));
  } catch (e) { res.status(500).json({ error: e.message }); }
});

app.post("/api/boletas", async (req, res) => {
  try {
    if (!db) return res.status(503).json({ error: "Sin base de datos" });
    const boleta = { ...req.body, creadoEn: new Date() };
    const result = await db.collection("boletas").insertOne(boleta);
    res.json({ ...boleta, id: result.insertedId.toString() });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

app.delete("/api/boletas/:id", async (req, res) => {
  try {
    if (!db) return res.status(503).json({ error: "Sin base de datos" });
    const { ObjectId } = require("mongodb");
    await db.collection("boletas").deleteOne({ _id: new ObjectId(req.params.id) });
    res.json({ ok: true });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

app.delete("/api/boletas", authAdmin, async (req, res) => {
  try {
    if (!db) return res.status(503).json({ error: "Sin base de datos" });
    if (!req.query.empresa) {
      return res.status(400).json({ error: "Falta especificar 'empresa'. Por seguridad, no se permite borrar boletas de todas las empresas a la vez." });
    }
    const filtro = { empresa: req.query.empresa };
    const result = await db.collection("boletas").deleteMany(filtro);
    console.log(`🗑️  DELETE /api/boletas — empresa="${req.query.empresa}" — por usuario="${req.adminUser.usuario}" — ${result.deletedCount} documentos borrados`);
    res.json({ ok: true, deletedCount: result.deletedCount });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// ─── HUEVOS (MongoDB, sincronizados entre dispositivos) ───────────────────────
const authHuevos = (req, res, next) => {
  const usuario = req.headers["x-usuario"];
  const clave = req.headers["x-clave"];
  const user = usuarios.find(u => u.usuario === usuario && u.clave === clave && !u.blocked);
  if (!user) return res.status(401).json({ error: "Credenciales inválidas para huevos" });
  req.eggUser = user;
  req.eggKey = (user.empresa && String(user.empresa).trim()) || user.usuario;
  next();
};

const inventarioHuevosInicial = [
  { id: "super", nombre: "Súper Extra", stockHuevos: 0, costoCaja: 0, precioCaja: 0, precioBandeja: 0, stockMinimoCajas: 2 },
  { id: "extra", nombre: "Extra", stockHuevos: 0, costoCaja: 0, precioCaja: 0, precioBandeja: 0, stockMinimoCajas: 2 },
  { id: "primera", nombre: "Primera", stockHuevos: 0, costoCaja: 0, precioCaja: 0, precioBandeja: 0, stockMinimoCajas: 2 },
  { id: "segunda", nombre: "Segunda", stockHuevos: 0, costoCaja: 0, precioCaja: 0, precioBandeja: 0, stockMinimoCajas: 2 },
  { id: "tercera", nombre: "Tercera", stockHuevos: 0, costoCaja: 0, precioCaja: 0, precioBandeja: 0, stockMinimoCajas: 2 },
];

const limpiarInventarioHuevos = (inventory) => {
  if (!Array.isArray(inventory)) return inventarioHuevosInicial;
  return inventory.map(q => ({
    ...q,
    id: String(q.id || ""),
    nombre: String(q.nombre || "Sin nombre"),
    stockHuevos: Math.max(0, Number(q.stockHuevos || 0)),
    costoCaja: Math.max(0, Number(q.costoCaja || 0)),
    precioCaja: Math.max(0, Number(q.precioCaja || 0)),
    precioBandeja: Math.max(0, Number(q.precioBandeja || 0)),
    stockMinimoCajas: Math.max(0, Number(q.stockMinimoCajas || 0)),
  }));
};

app.get("/api/huevos", authHuevos, async (req, res) => {
  try {
    if (!db) return res.status(503).json({ error: "Sin base de datos" });
    const doc = await db.collection("huevos").findOne({ key: req.eggKey });
    res.json({
      inventory: doc?.inventory || inventarioHuevosInicial,
      movements: doc?.movements || [],
    });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

app.put("/api/huevos/inventario", authHuevos, async (req, res) => {
  try {
    if (!db) return res.status(503).json({ error: "Sin base de datos" });
    const inventory = limpiarInventarioHuevos(req.body?.inventory);
    await db.collection("huevos").updateOne(
      { key: req.eggKey },
      { $set: { inventory, usuario: req.eggUser.usuario, empresa: req.eggUser.empresa || "", actualizadoEn: new Date() }, $setOnInsert: { movements: [], creadoEn: new Date() } },
      { upsert: true }
    );
    res.json({ ok: true, inventory });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

app.post("/api/huevos/movimientos", authHuevos, async (req, res) => {
  try {
    if (!db) return res.status(503).json({ error: "Sin base de datos" });
    const inventory = limpiarInventarioHuevos(req.body?.inventory);
    // Acepta un solo movimiento (compatibilidad) o varios en una sola escritura
    // atómica — necesario para "entrada + transferencia automática de lote".
    const incoming = Array.isArray(req.body?.movements)
      ? req.body.movements
      : (req.body?.movement ? [req.body.movement] : []);
    const doc = await db.collection("huevos").findOne({ key: req.eggKey });
    let movements = Array.isArray(doc?.movements) ? doc.movements : [];
    if (incoming.length) {
      const stamped = incoming.map(m => ({ ...m, guardadoEn: new Date().toISOString() }));
      movements = [...stamped, ...movements].slice(0, 5000);
    }
    await db.collection("huevos").updateOne(
      { key: req.eggKey },
      { $set: { inventory, movements, usuario: req.eggUser.usuario, empresa: req.eggUser.empresa || "", actualizadoEn: new Date() }, $setOnInsert: { creadoEn: new Date() } },
      { upsert: true }
    );
    res.json({ ok: true, inventory, movements });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

app.post("/api/huevos/reset", authHuevos, async (req, res) => {
  try {
    if (!db) return res.status(503).json({ error: "Sin base de datos" });
    // Restablece SOLO la colección de huevos (lotes, stock, movimientos,
    // ventas, mermas, costos, ganancias) para esta empresa/usuario. No toca
    // productos, categorías, usuarios ni configuración — esas viven en otras
    // colecciones y esta ruta nunca las consulta.
    const inventory = limpiarInventarioHuevos(req.body?.inventory);
    await db.collection("huevos").updateOne(
      { key: req.eggKey },
      { $set: { inventory, movements: [], usuario: req.eggUser.usuario, empresa: req.eggUser.empresa || "", actualizadoEn: new Date() }, $setOnInsert: { creadoEn: new Date() } },
      { upsert: true }
    );
    res.json({ ok: true, inventory, movements: [] });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

app.delete("/api/huevos/movimientos/:id", authHuevos, async (req, res) => {
  try {
    if (!db) return res.status(503).json({ error: "Sin base de datos" });
    const inventory = limpiarInventarioHuevos(req.body?.inventory);
    const doc = await db.collection("huevos").findOne({ key: req.eggKey });
    let movements = Array.isArray(doc?.movements) ? doc.movements : [];
    movements = movements.filter(m => String(m.id) !== String(req.params.id));
    await db.collection("huevos").updateOne(
      { key: req.eggKey },
      { $set: { inventory, movements, usuario: req.eggUser.usuario, empresa: req.eggUser.empresa || "", actualizadoEn: new Date() } },
      { upsert: true }
    );
    res.json({ ok: true, inventory, movements });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

app.post("/api/huevos/migrar", authHuevos, async (req, res) => {
  try {
    if (!db) return res.status(503).json({ error: "Sin base de datos" });
    const existente = await db.collection("huevos").findOne({ key: req.eggKey });
    const tieneDatos = existente && (
      (Array.isArray(existente.movements) && existente.movements.length > 0) ||
      (Array.isArray(existente.inventory) && existente.inventory.some(q => Number(q.stockHuevos || 0) > 0))
    );
    if (tieneDatos) {
      return res.json({ ok: true, migrated: false, inventory: existente.inventory, movements: existente.movements || [] });
    }
    const inventory = limpiarInventarioHuevos(req.body?.inventory);
    const movements = Array.isArray(req.body?.movements) ? req.body.movements.slice(0, 5000) : [];
    await db.collection("huevos").updateOne(
      { key: req.eggKey },
      { $set: { inventory, movements, usuario: req.eggUser.usuario, empresa: req.eggUser.empresa || "", actualizadoEn: new Date() }, $setOnInsert: { creadoEn: new Date() } },
      { upsert: true }
    );
    res.json({ ok: true, migrated: true, inventory, movements });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// ─── PING ─────────────────────────────────────────────────────────────────────
app.get("/ping", (req, res) => res.json({ ok: true }));

// ─── UPLOAD IMÁGENES (Cloudinary) ────────────────────────────────────────────
try {
  const multer = require("multer");
  const cloudinary = require("cloudinary").v2;

  cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key:    process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET,
  });

  // Usar memoria en vez de disco — el archivo va directo a Cloudinary
  const upload = multer({ storage: multer.memoryStorage() });

  app.post("/api/productos/upload-imagen", upload.single("imagen"), async (req, res) => {
    if (!req.file) return res.status(400).json({ error: "No se recibió imagen" });
    try {
      const result = await new Promise((resolve, reject) => {
        const stream = cloudinary.uploader.upload_stream(
          { folder: "inventario-productos" },
          (error, result) => error ? reject(error) : resolve(result)
        );
        stream.end(req.file.buffer);
      });
      res.json({ url: result.secure_url });
    } catch (e) {
      console.error("❌ Error Cloudinary:", e.message);
      res.status(500).json({ error: "Error al subir imagen a Cloudinary" });
    }
  });

  console.log("☁️  Upload de imágenes habilitado (Cloudinary)");
} catch (e) {
  console.log("⚠️  multer/cloudinary no instalado, upload deshabilitado:", e.message);
}

// ─── START ────────────────────────────────────────────────────────────────────
const PORT = process.env.PORT || 3001;
conectarDB().then(() => {
  app.listen(PORT, () => console.log(`✅ Servidor corriendo en http://localhost:${PORT}`));
});
