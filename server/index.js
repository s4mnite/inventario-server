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
app.use(cors({ origin: "*", methods: ["GET","POST","PUT","DELETE","PATCH","OPTIONS"], allowedHeaders: ["Content-Type","x-admin-user","x-admin-clave","x-usuario","x-clave","Cache-Control","Pragma"] }));
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
    // Índices: sin esto, cada consulta escanea la colección entera en vez de
    // ir directo al documento. Se crean una sola vez al arrancar; si ya
    // existen, MongoDB simplemente no hace nada (operación segura de repetir).
    try {
      await db.collection("huevos").createIndex({ key: 1 }, { unique: true });
      await db.collection("boletas").createIndex({ numero: -1 });
      await db.collection("ventas").createIndex({ empresa: 1, timestamp: -1 });
      await db.collection("productos").createIndex({ empresa: 1 });
      console.log("✅ Índices verificados");
    } catch (e) {
      console.error("⚠️  No se pudieron crear los índices:", e.message);
    }
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


const escapeRegex = value => String(value || "").replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
const empresaQuery = empresa => ({ $regex: `^${escapeRegex(String(empresa || "").trim())}$`, $options: "i" });
const cajaAbiertaEstadoQuery = {
  cierre: { $in: [null, ""] },
  $or: [
    { estado: "abierta" },
    { abierta: true },
    { estado: { $exists: false } },
  ],
};
const cajaAbiertaPorEmpresaQuery = empresa => ({
  empresa: empresaQuery(empresa),
  ...cajaAbiertaEstadoQuery,
});

const DEFAULT_EMPRESA = String(process.env.DEFAULT_EMPRESA || "Rey del Huevo").trim();
const obtenerEmpresa = value => String(value || DEFAULT_EMPRESA).trim();

// La identidad del módulo Huevos debe ser idéntica en inventario, ventas y
// eliminación de ventas. Para usuarios sin empresa (como admin), la clave
// estable es el nombre de usuario; esto coincide con /api/huevos.
const obtenerUsuarioPeticion = req => {
  const usuario = String(req.headers["x-usuario"] || "").trim();
  const clave = String(req.headers["x-clave"] || "");
  return usuarios.find(u => u.usuario === usuario && u.clave === clave && !u.blocked) || null;
};
const obtenerClaveHuevos = user => String((user?.empresa && String(user.empresa).trim()) || user?.usuario || "").trim();

// ─── CAJA Y CLIENTES DE FACTURACIÓN ─────────────────────────────────────────
app.get("/api/caja/actual", async (req, res) => {
  try {
    if (!db) return res.status(503).json({ error: "Sin base de datos" });
    const empresa = obtenerEmpresa(req.query.empresa);
    const id = String(req.query.id || "").trim();
    if (!empresa && !id) return res.status(400).json({ error: "Falta identificar el negocio o la caja" });

    let caja = null;
    if (id && ObjectId.isValid(id)) {
      caja = await db.collection("cajas").findOne({
        _id: new ObjectId(id),
        ...cajaAbiertaEstadoQuery,
      });
    }
    if (!caja && empresa) {
      caja = await db.collection("cajas").findOne(
        cajaAbiertaPorEmpresaQuery(empresa),
        { sort: { apertura: -1, creadoEn: -1 } }
      );
    }

    res.set("Cache-Control", "no-store, no-cache, must-revalidate, private");
    res.json(caja ? { ...caja, id: caja._id.toString() } : null);
  } catch (e) { res.status(500).json({ error: e.message }); }
});
app.get("/api/caja/historial", async (req, res) => {
  try {
    if (!db) return res.status(503).json({ error: "Sin base de datos" });
    const empresa = obtenerEmpresa(req.query.empresa);
    if (!empresa) return res.status(400).json({ error: "Falta identificar el negocio" });
    const limit = Math.min(Math.max(Number(req.query.limit) || 100, 1), 500);
    const cajas = await db.collection("cajas")
      .find({ empresa: empresaQuery(empresa), estado: "cerrada" })
      .sort({ cierre: -1, apertura: -1 })
      .limit(limit)
      .toArray();
    res.set("Cache-Control", "no-store");
    res.json(cajas.map(c => ({ ...c, id: c._id.toString() })));
  } catch (e) { res.status(500).json({ error: e.message }); }
});
app.post("/api/caja/abrir", async (req, res) => {
  try {
    if (!db) return res.status(503).json({ error: "Sin base de datos" });
    const empresa = obtenerEmpresa(req.body.empresa);
    if (!empresa) return res.status(400).json({ error: "Falta identificar el negocio" });
    const existe = await db.collection("cajas").findOne(cajaAbiertaPorEmpresaQuery(empresa));
    if (existe) return res.status(409).json({ error: "Ya existe una caja abierta para este negocio" });
    const doc = { ...req.body, empresa, estado: "abierta", apertura: req.body.apertura || new Date().toISOString(), creadoEn: new Date() };
    delete doc.id;
    const r = await db.collection("cajas").insertOne(doc);
    res.json({ caja: { ...doc, id: r.insertedId.toString() } });
  } catch (e) { res.status(500).json({ error: e.message }); }
});
app.post("/api/caja/cerrar", async (req, res) => {
  try {
    if (!db) return res.status(503).json({ error: "Sin base de datos" });
    const empresa = obtenerEmpresa(req.body?.empresa);
    if (!empresa) return res.status(400).json({ error: "Falta identificar el negocio" });

    let caja = null;
    const id = String(req.body?.id || "").trim();
    if (id && ObjectId.isValid(id)) {
      caja = await db.collection("cajas").findOne({
        _id: new ObjectId(id),
        ...cajaAbiertaEstadoQuery,
      });
    }
    if (!caja) {
      caja = await db.collection("cajas").findOne(
        cajaAbiertaPorEmpresaQuery(empresa),
        { sort: { apertura: -1, creadoEn: -1 } }
      );
    }

    const cambios = {
      cierre: req.body?.cierre || new Date().toISOString(),
      montoCierre: Number(req.body?.montoCierre || 0),
      cerradaPor: req.body?.cerradaPor || "Usuario",
      notas: req.body?.notas || "",
      ventasTurno: Number(req.body?.ventasTurno || 0),
      totalTurno: Number(req.body?.totalTurno || 0),
      efectivoTurno: Number(req.body?.efectivoTurno || 0),
      efectivoEsperado: Number(req.body?.efectivoEsperado || 0),
      diferencia: Number(req.body?.diferencia || 0),
      empresa: caja?.empresa || empresa,
      estado: "cerrada",
      abierta: false,
      actualizadoEn: new Date(),
    };

    let cerrada = null;
    let migradaDesdeRespaldo = false;

    if (caja) {
      // Cerramos primero la caja exacta que seleccionó la app.
      // Usamos updateOne para ser compatibles con distintas versiones del driver MongoDB.
      const result = await db.collection("cajas").updateOne(
        { _id: caja._id, ...cajaAbiertaEstadoQuery },
        { $set: cambios }
      );
      if (!result.matchedCount) {
        return res.status(409).json({ error: "La caja ya estaba cerrada o cambió en otro dispositivo" });
      }
      cerrada = await db.collection("cajas").findOne({ _id: caja._id });

      // Algunas versiones anteriores podían dejar más de una caja abierta para el
      // mismo negocio. Si queda una duplicada, /api/caja/actual la vuelve a mostrar
      // y la interfaz parece no haber cerrado. Las cerramos también, conservando
      // todos sus documentos e historial; no se elimina ninguna caja.
      await db.collection("cajas").updateMany(
        {
          _id: { $ne: caja._id },
          empresa: empresaQuery(empresa),
          ...cajaAbiertaEstadoQuery,
        },
        {
          $set: {
            ...cambios,
            notas: req.body?.notas
              ? `${req.body.notas} | Caja duplicada cerrada automáticamente`
              : "Caja duplicada cerrada automáticamente",
          },
        }
      );
    } else {
      // Compatibilidad con cajas antiguas que solo quedaron en localStorage.
      // Se conserva la apertura y se crea directamente el registro cerrado en MongoDB.
      const apertura = req.body?.apertura;
      if (!apertura) return res.status(404).json({ error: "No se encontró una caja abierta para este negocio" });

      const legacyDoc = {
        empresa,
        apertura,
        montoApertura: Number(req.body?.montoApertura || 0),
        abiertaPor: req.body?.abiertaPor || "Usuario",
        creadoEn: new Date(apertura),
        ...cambios,
        migradaDesdeRespaldo: true,
      };
      const insert = await db.collection("cajas").insertOne(legacyDoc);
      cerrada = { ...legacyDoc, _id: insert.insertedId };
      migradaDesdeRespaldo = true;
    }

    res.set("Cache-Control", "no-store, no-cache, must-revalidate, private");
    res.json({
      caja: { ...cerrada, id: cerrada._id.toString() },
      migradaDesdeRespaldo,
      mensaje: migradaDesdeRespaldo
        ? "Caja antigua cerrada y respaldada en MongoDB sin borrar sus datos"
        : "Caja cerrada correctamente",
    });
  } catch (e) {
    console.error("Error cerrando caja:", e);
    res.status(500).json({ error: e.message || "No se pudo cerrar la caja" });
  }
});

// ─── VENTAS (MongoDB) ─────────────────────────────────────────────────────────
app.get("/api/ventas", async (req, res) => {
  res.set("Cache-Control", "no-store, no-cache, must-revalidate, private");
  try {
    if (!db) return res.json([]);
    const empresa = obtenerEmpresa(req.query.empresa);
    const filtro = empresa ? { empresa: empresaQuery(empresa) } : {};
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
    const empresaVenta = obtenerEmpresa(venta.empresa);
    const cajaIdVenta = String(venta.cajaId || "").trim();
    let cajaAbierta = null;

    // Primero se valida la caja exacta que la app tiene abierta. Esto evita que
    // una sesión antigua sin `empresa` haga parecer que la caja está cerrada.
    if (cajaIdVenta && ObjectId.isValid(cajaIdVenta)) {
      cajaAbierta = await db.collection("cajas").findOne({
        _id: new ObjectId(cajaIdVenta),
        ...cajaAbiertaEstadoQuery,
      });
    }
    if (!cajaAbierta) {
      cajaAbierta = await db.collection("cajas").findOne(
        cajaAbiertaPorEmpresaQuery(empresaVenta),
        { sort: { apertura: -1, creadoEn: -1 } }
      );
    }
    if (!cajaAbierta) return res.status(409).json({ error: "Debes abrir caja antes de registrar una venta" });

    venta.empresa = cajaAbierta.empresa || empresaVenta;
    venta.cajaId = cajaAbierta._id.toString();
    if (venta.requiereFactura) {
      const c = venta.cliente || {};
      if (!c.rut || !(c.razonSocial || c.nombre) || !c.giro || !c.direccion || !c.comuna) {
        return res.status(400).json({ error: "Faltan datos obligatorios del cliente para factura" });
      }
    }

    const eggItems = Array.isArray(venta.eggItems)
      ? venta.eggItems.filter(item => item && item.tipoItem === "huevo")
      : (Array.isArray(venta.items) ? venta.items.filter(item => item && item.tipoItem === "huevo") : []);
    const empresaConfirmada = obtenerEmpresa(cajaAbierta.empresa || empresaVenta);
    const usuarioVenta = obtenerUsuarioPeticion(req);
    if (!usuarioVenta) return res.status(401).json({ error: "Credenciales inválidas" });
    const eggKey = obtenerClaveHuevos(usuarioVenta);
    let eggDoc = null;
    let eggInventoryActual = null;
    if (eggItems.length) {
      eggDoc = await db.collection("huevos").findOne({ key: eggKey });
      eggInventoryActual = limpiarInventarioHuevos(eggDoc?.inventory || inventarioHuevosInicial);
      for (const item of eggItems) {
        const quality = eggInventoryActual.find(q => String(q.id) === String(item.calidadId));
        const units = Number(item.huevos || 0);
        if (!quality) return res.status(400).json({ error: `Categoría de huevos no encontrada: ${item.calidad || item.calidadId}` });
        if (units <= 0) return res.status(400).json({ error: `Cantidad inválida para ${quality.nombre}` });
        // El stock no bloquea la venta: si no alcanza, el inventario de huevos
        // queda en negativo (se regulariza con una entrada posterior).
      }
    }

    const ventaDoc = { ...venta, creadoEn: new Date() };
    delete ventaDoc.id; // el id real lo define Mongo
    const ventaResult = await db.collection("ventas").insertOne(ventaDoc);
    const ventaGuardada = { ...ventaDoc, id: ventaResult.insertedId.toString() };

    let boletaGuardada = null;
    if (boleta) {
      // El número de boleta lo asigna el servidor de forma atómica (nunca el
      // navegador), porque calcularlo en el frontend como "máximo actual + 1"
      // puede chocar si dos ventas se registran casi al mismo tiempo desde
      // dispositivos distintos (dos boletas con el mismo número).
      const contadorExistente = await db.collection("contadores").findOne({ _id: "numeroBoleta" });
      if (!contadorExistente) {
        // Primera vez que corre este contador: arranca desde el número más
        // alto que ya exista, para no repetir boletas viejas.
        const ultimaBoleta = await db.collection("boletas").find({}).sort({ numero: -1 }).limit(1).toArray();
        const valorInicial = Number(ultimaBoleta[0]?.numero || 0);
        try {
          await db.collection("contadores").insertOne({ _id: "numeroBoleta", valor: valorInicial });
        } catch (e) {
          // Otra petición ganó la carrera y ya lo creó justo antes; no pasa nada.
          if (e.code !== 11000) throw e;
        }
      }
      const contador = await db.collection("contadores").findOneAndUpdate(
        { _id: "numeroBoleta" },
        { $inc: { valor: 1 } },
        { upsert: true, returnDocument: "after" }
      );
      const numeroAsignado = contador?.value?.valor ?? contador?.valor;
      const boletaDoc = { ...boleta, numero: numeroAsignado, ventaId: ventaGuardada.id, creadoEn: new Date() };
      delete boletaDoc.id;
      const boletaResult = await db.collection("boletas").insertOne(boletaDoc);
      boletaGuardada = { ...boletaDoc, id: boletaResult.insertedId.toString() };
    }

    // Descontar el stock real de productos (no huevos, esos tienen su propio
    // flujo en /api/huevos) directamente aquí, para que quede atómico con el
    // guardado de la venta y no dependa de que el navegador lo haga solo.
    const items = (Array.isArray(venta.items) ? venta.items : []).filter(item => item?.tipoItem !== "huevo");
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
    let eggInventory = null;
    if (eggItems.length) {
      const now = new Date();
      const chileDateParts = new Intl.DateTimeFormat("en-US", {
        timeZone: "America/Santiago", year: "numeric", month: "2-digit", day: "2-digit"
      }).formatToParts(now).reduce((acc, p) => ({ ...acc, [p.type]: p.value }), {});
      const chileDate = `${chileDateParts.year}-${chileDateParts.month}-${chileDateParts.day}`;
      eggInventory = eggInventoryActual.map(q => {
        const soldUnits = eggItems.filter(item => String(item.calidadId) === String(q.id)).reduce((sum, item) => sum + Number(item.huevos || 0), 0);
        return soldUnits ? { ...q, stockHuevos: Number(q.stockHuevos || 0) - soldUnits } : q;
      });
      const eggMovements = eggItems.map((item, index) => {
        const ingreso = Number(item.subtotal || 0);
        const costo = (Number(item.huevos || 0) / 180) * Number(item.costoCaja || 0);
        return {
          id: Number(`${Date.now()}${index}`),
          fechaIngreso: chileDate,
          fecha: now.toISOString(),
          tipo: "venta",
          calidadId: item.calidadId,
          calidad: item.calidad,
          formato: item.formato,
          cantidadFormatos: Number(item.cantidadFormatos || item.cantidad || 0),
          cajas: item.formato === "caja" ? Number(item.cantidadFormatos || item.cantidad || 0) : 0,
          bandejas: item.formato === "bandeja" ? Number(item.cantidadFormatos || item.cantidad || 0) : 0,
          unidades: Number(item.huevos || 0),
          huevos: Number(item.huevos || 0),
          motivo: "Venta libre",
          observaciones: `Venta libre vinculada a boleta ${boletaGuardada?.numero || ""}`,
          usuario: venta.usuario || req.headers["x-usuario"] || "Usuario",
          ingreso,
          costo,
          ganancia: ingreso - costo,
          precioCaja: Number(item.precioCaja || 0),
          precioBandeja: Number(item.precioBandeja || 0),
          precioUnidad: Number(item.huevos || 0) > 0 ? ingreso / Number(item.huevos || 0) : 0,
          descuento: 0,
          metodoPago: venta.pago || "Efectivo",
          ventaId: ventaGuardada.id,
          boletaNumero: boletaGuardada?.numero || "",
          guardadoEn: now.toISOString(),
        };
      });
      const previousMovements = Array.isArray(eggDoc?.movements) ? eggDoc.movements : [];
      const movements = [...eggMovements, ...previousMovements].slice(0, 5000);
      await db.collection("huevos").updateOne(
        { key: eggKey },
        { $set: { inventory: eggInventory, movements, usuario: usuarioVenta.usuario, empresa: usuarioVenta.empresa || empresaConfirmada, actualizadoEn: new Date() }, $setOnInsert: { creadoEn: new Date() } },
        { upsert: true }
      );
    }

    console.log(`🛒 Venta ${ventaGuardada.id} guardada — stock descontado en ${stockActualizados}/${items.length} productos y ${eggItems.length} categorías de huevos.`);

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

    res.json({ venta: ventaGuardada, boleta: boletaGuardada, stockActualizados, itemsTotal: items.length, eggInventory });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

app.delete("/api/ventas/:id", async (req, res) => {
  try {
    if (!db) return res.status(503).json({ error: "Sin base de datos" });

    // Requiere sesión válida (cualquier usuario logueado, no solo admin) —
    // igual que el resto de las acciones de venta.
    const user = obtenerUsuarioPeticion(req);
    if (!user) return res.status(401).json({ error: "Credenciales inválidas" });
    const usuario = user.usuario;

    const venta = await db.collection("ventas").findOne({ _id: new ObjectId(req.params.id) });
    if (!venta) return res.status(404).json({ error: "Venta no encontrada" });

    // Devolver el stock de cada producto de la venta al inventario.
    const todosLosItems = Array.isArray(venta.items) ? venta.items : [];
    const items = todosLosItems.filter(item => item?.tipoItem !== "huevo");
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

    // Si la venta incluía huevos, también se revierte el inventario central de
    // huevos y se elimina su movimiento vinculado. Esto evita que PC, web y
    // Android queden mostrando datos distintos después de borrar una venta.
    const eggItems = Array.isArray(venta.eggItems) && venta.eggItems.length
      ? venta.eggItems.filter(item => item?.tipoItem === "huevo")
      : todosLosItems.filter(item => item?.tipoItem === "huevo");
    let huevosRevertidos = 0;
    if (eggItems.length) {
      const eggKey = obtenerClaveHuevos(user);
      // Preferimos el documento del usuario. Para ventas antiguas con una clave
      // distinta, buscamos el movimiento vinculado por ventaId sin tocar otros documentos.
      const eggDoc = await db.collection("huevos").findOne({
        $or: [
          { key: eggKey },
          { "movements.ventaId": String(req.params.id) },
        ],
      });
      if (eggDoc) {
        const inventario = limpiarInventarioHuevos(eggDoc.inventory || inventarioHuevosInicial).map(q => {
          const devolver = eggItems
            .filter(item => String(item.calidadId) === String(q.id))
            .reduce((sum, item) => sum + Number(item.huevos || 0), 0);
          huevosRevertidos += devolver;
          return devolver ? { ...q, stockHuevos: Number(q.stockHuevos || 0) + devolver } : q;
        });
        const movimientos = (Array.isArray(eggDoc.movements) ? eggDoc.movements : [])
          .filter(m => String(m.ventaId || "") !== String(req.params.id));
        await db.collection("huevos").updateOne(
          { _id: eggDoc._id },
          { $set: { inventory: inventario, movements: movimientos, actualizadoEn: new Date() } }
        );
      }
    }

    await db.collection("ventas").deleteOne({ _id: new ObjectId(req.params.id) });
    // Borra también el recibo asociado, para que no quede huérfano.
    await db.collection("boletas").deleteOne({ ventaId: req.params.id });

    console.log(`🗑️  Venta ${req.params.id} eliminada por "${usuario}" — stock devuelto en ${stockRevertidos}/${items.length} ítems; huevos devueltos: ${huevosRevertidos}`);
    res.json({ ok: true, itemsRevertidos: items.length, stockRevertidos, huevosRevertidos });
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

// ─── REVERTIR RECONCILIACIÓN (corrige el descuento duplicado) ────────────────
// Bug histórico: la reconciliación de arriba se corrió una vez ANTES de que
// /api/ventas marcara stockAplicado al crear la venta. Como resultado, boletas
// que YA tenían su stock bien descontado al momento de la venta fueron
// tratadas como "pendientes" y se les restó el stock una segunda vez.
// Esta ruta busca las boletas que fueron tocadas por esa reconciliación
// (tienen stockReconciliadoEn) y les devuelve exactamente las unidades que se
// les restó de más. Marca cada boleta con stockRevertido=true para que esta
// ruta también sea segura de correr más de una vez.
// Uso: POST /api/productos/revertir-reconciliacion  body opcional: { "empresa": "..." }
app.post("/api/productos/revertir-reconciliacion", authAdmin, async (req, res) => {
  try {
    if (!db) return res.status(503).json({ error: "Sin base de datos" });
    const filtro = { stockReconciliadoEn: { $exists: true }, stockRevertido: { $ne: true } };
    if (req.body?.empresa) filtro.empresa = req.body.empresa;
    const boletasATocar = await db.collection("boletas").find(filtro).toArray();

    const resumenPorProducto = {}; // productoId -> { nombre, unidadesDevueltas }
    const noAplicados = [];
    let boletasProcesadas = 0;

    for (const boleta of boletasATocar) {
      const items = Array.isArray(boleta.items) ? boleta.items : [];
      for (const item of items) {
        if (!item.productoId) continue;
        const unidades = Number(item.cantidad || 0) * Number(item.unidadesPorManga || 1);
        if (unidades <= 0) continue;
        try {
          const r = await db.collection("productos").updateOne(
            { _id: new ObjectId(item.productoId) },
            { $inc: { stock: unidades } }
          );
          if (r.matchedCount === 0) {
            noAplicados.push({ boletaNumero: boleta.numero, nombre: item.nombre || "?", productoId: item.productoId, motivo: "producto no encontrado (¿fue eliminado?)" });
            continue;
          }
          const key = item.productoId;
          if (!resumenPorProducto[key]) resumenPorProducto[key] = { nombre: item.nombre || "?", unidadesDevueltas: 0 };
          resumenPorProducto[key].unidadesDevueltas += unidades;
        } catch (e) {
          noAplicados.push({ boletaNumero: boleta.numero, nombre: item.nombre || "?", productoId: item.productoId, motivo: e.message });
        }
      }
      await db.collection("boletas").updateOne(
        { _id: boleta._id },
        { $set: { stockRevertido: true, stockRevertidoEn: new Date() } }
      );
      boletasProcesadas++;
    }

    console.log(`↩️  Reversión de reconciliación: ${boletasProcesadas} boletas procesadas, ${noAplicados.length} ítems sin poder devolver.`);
    res.json({ ok: true, boletasProcesadas, resumenPorProducto, noAplicados });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// ─── BOLETAS (MongoDB) ────────────────────────────────────────────────────────
app.get("/api/boletas", async (req, res) => {
  res.set("Cache-Control", "no-store, no-cache, must-revalidate, private");
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


// ─── GASTOS Y COMPRAS DEL LOCAL (MongoDB) ────────────────────────────────────
// Usa la misma autenticación de usuario que Huevos. La empresa del usuario
// separa los gastos para evitar mezclar datos entre negocios.
const authGastos = (req, res, next) => {
  const usuario = req.headers["x-usuario"];
  const clave = req.headers["x-clave"];
  const user = usuarios.find(u => u.usuario === usuario && u.clave === clave && !u.blocked);
  if (!user) return res.status(401).json({ error: "Credenciales inválidas para gastos" });
  req.gastoUser = user;
  req.gastoEmpresa = (user.empresa && String(user.empresa).trim()) || user.usuario;
  next();
};

const normalizarGasto = (body = {}) => ({
  comercio: String(body.comercio || "").trim(),
  fecha: String(body.fecha || new Date().toISOString().slice(0, 10)).slice(0, 10),
  total: Math.max(0, Number(body.total || 0)),
  iva: Math.max(0, Number(body.iva || 0)),
  categoria: String(body.categoria || "otros"),
  metodoPago: String(body.metodoPago || "Efectivo"),
  numeroDocumento: String(body.numeroDocumento || ""),
  notas: String(body.notas || ""),
  imagenUrl: String(body.imagenUrl || ""),
  textoOCR: String(body.textoOCR || ""),
  itemsInventario: Array.isArray(body.itemsInventario) ? body.itemsInventario : [],
});

app.get("/api/gastos", authGastos, async (req, res) => {
  try {
    if (!db) return res.status(503).json({ error: "Sin base de datos" });
    const gastos = await db.collection("gastos")
      .find({ empresa: req.gastoEmpresa })
      .sort({ fecha: -1, creadoEn: -1 })
      .toArray();
    res.json(gastos.map(g => ({ ...g, id: g._id.toString() })));
  } catch (e) {
    console.error("❌ GET /api/gastos:", e);
    res.status(500).json({ error: e.message });
  }
});

app.post("/api/gastos", authGastos, async (req, res) => {
  try {
    if (!db) return res.status(503).json({ error: "Sin base de datos" });
    const datos = normalizarGasto(req.body);
    if (!datos.comercio) return res.status(400).json({ error: "Falta comercio o descripción" });
    if (datos.total <= 0) return res.status(400).json({ error: "El total debe ser mayor que cero" });

    const itemsLimpios = [];
    for (const raw of datos.itemsInventario) {
      const productoId = String(raw.productoId || "");
      const cantidad = Math.max(0, Number(raw.cantidad || 0));
      const costoUnitario = Math.max(0, Number(raw.costoUnitario || 0));
      // Si viene explícitamente en false, el ítem se registra en el gasto
      // (nombre, cantidad, costo) pero no toca el stock ni el costo promedio
      // del producto. Por defecto (undefined/true) sí actualiza el stock,
      // igual que el comportamiento original.
      const actualizarStock = raw.actualizarStock !== false;
      if (!productoId || cantidad <= 0) continue;
      let oid;
      try { oid = new ObjectId(productoId); } catch { continue; }

      const producto = await db.collection("productos").findOne({ _id: oid });
      if (!producto) continue;

      if (actualizarStock) {
        // Promedio ponderado: conserva el costo del stock anterior y suma la compra.
        const stockAnterior = Math.max(0, Number(producto.stock || 0));
        const costoAnterior = Math.max(0, Number(producto.costo || 0));
        const stockNuevo = stockAnterior + cantidad;
        const costoNuevo = stockNuevo > 0
          ? ((stockAnterior * costoAnterior) + (cantidad * costoUnitario)) / stockNuevo
          : costoUnitario;
        await db.collection("productos").updateOne(
          { _id: oid },
          { $set: { stock: stockNuevo, costo: costoNuevo, actualizadoEn: new Date() } }
        );
      }
      itemsLimpios.push({ productoId, nombre: producto.nombre || "", cantidad, costoUnitario, actualizarStock });
    }

    const doc = {
      ...datos,
      itemsInventario: itemsLimpios,
      usuario: req.gastoUser.usuario,
      empresa: req.gastoEmpresa,
      creadoEn: new Date(),
      actualizadoEn: new Date(),
    };
    const result = await db.collection("gastos").insertOne(doc);
    const productos = await db.collection("productos")
      .find(req.gastoUser.empresa ? { empresa: req.gastoUser.empresa } : {})
      .toArray();
    res.status(201).json({
      gasto: { ...doc, id: result.insertedId.toString() },
      productos: productos.map(x => ({ ...x, id: x._id.toString() })),
    });
  } catch (e) {
    console.error("❌ POST /api/gastos:", e);
    res.status(500).json({ error: e.message });
  }
});

app.put("/api/gastos/:id", authGastos, async (req, res) => {
  try {
    if (!db) return res.status(503).json({ error: "Sin base de datos" });
    let oid;
    try { oid = new ObjectId(req.params.id); }
    catch { return res.status(400).json({ error: "ID de gasto inválido" }); }

    const gastoActual = await db.collection("gastos").findOne({ _id: oid, empresa: req.gastoEmpresa });
    if (!gastoActual) return res.status(404).json({ error: "Gasto no encontrado" });

    const datos = normalizarGasto(req.body);
    if (!datos.comercio) return res.status(400).json({ error: "Falta comercio o descripción" });
    if (datos.total <= 0) return res.status(400).json({ error: "El total debe ser mayor que cero" });

    // 1) Revertir del inventario la compra original de este gasto (antes de aplicar la edición).
    //    Se recalcula el stock y el costo promedio como si esa compra nunca se hubiera hecho.
    for (const anterior of (gastoActual.itemsInventario || [])) {
      const productoId = String(anterior.productoId || "");
      const cantidadVieja = Math.max(0, Number(anterior.cantidad || 0));
      const costoViejo = Math.max(0, Number(anterior.costoUnitario || 0));
      // Si ese ítem no había actualizado stock al crearse, tampoco hay nada
      // que revertir ahora.
      if (anterior.actualizarStock === false) continue;
      if (!productoId || cantidadVieja <= 0) continue;
      let poid;
      try { poid = new ObjectId(productoId); } catch { continue; }

      const producto = await db.collection("productos").findOne({ _id: poid });
      if (!producto) continue; // el producto pudo haber sido eliminado; no hay nada que revertir
      const stockActual = Math.max(0, Number(producto.stock || 0));
      const costoActualProd = Math.max(0, Number(producto.costo || 0));
      const stockRevertido = Math.max(0, stockActual - cantidadVieja);
      const valorTotalActual = stockActual * costoActualProd;
      const valorRevertido = Math.max(0, valorTotalActual - (cantidadVieja * costoViejo));
      const costoRevertido = stockRevertido > 0 ? valorRevertido / stockRevertido : 0;
      await db.collection("productos").updateOne(
        { _id: poid },
        { $set: { stock: stockRevertido, costo: costoRevertido, actualizadoEn: new Date() } }
      );
    }

    // 2) Aplicar las nuevas cantidades editadas (mismo cálculo de promedio ponderado que al crear).
    const itemsLimpios = [];
    for (const raw of datos.itemsInventario) {
      const productoId = String(raw.productoId || "");
      const cantidad = Math.max(0, Number(raw.cantidad || 0));
      const costoUnitario = Math.max(0, Number(raw.costoUnitario || 0));
      const actualizarStock = raw.actualizarStock !== false;
      if (!productoId || cantidad <= 0) continue;
      let poid;
      try { poid = new ObjectId(productoId); } catch { continue; }

      const producto = await db.collection("productos").findOne({ _id: poid });
      if (!producto) continue;

      if (actualizarStock) {
        const stockAnterior = Math.max(0, Number(producto.stock || 0));
        const costoAnterior = Math.max(0, Number(producto.costo || 0));
        const stockNuevo = stockAnterior + cantidad;
        const costoNuevo = stockNuevo > 0
          ? ((stockAnterior * costoAnterior) + (cantidad * costoUnitario)) / stockNuevo
          : costoUnitario;
        await db.collection("productos").updateOne(
          { _id: poid },
          { $set: { stock: stockNuevo, costo: costoNuevo, actualizadoEn: new Date() } }
        );
      }
      itemsLimpios.push({ productoId, nombre: producto.nombre || "", cantidad, costoUnitario, actualizarStock });
    }

    // 3) Actualizar el mismo registro de gasto (mismo _id, no se crea uno nuevo).
    await db.collection("gastos").updateOne(
      { _id: oid },
      { $set: { ...datos, itemsInventario: itemsLimpios, actualizadoEn: new Date() } }
    );

    const gastoActualizado = await db.collection("gastos").findOne({ _id: oid });
    const productos = await db.collection("productos")
      .find(req.gastoUser.empresa ? { empresa: req.gastoUser.empresa } : {})
      .toArray();
    res.json({
      gasto: { ...gastoActualizado, id: gastoActualizado._id.toString() },
      productos: productos.map(x => ({ ...x, id: x._id.toString() })),
    });
  } catch (e) {
    console.error("❌ PUT /api/gastos/:id:", e);
    res.status(500).json({ error: e.message });
  }
});

app.delete("/api/gastos/:id", authGastos, async (req, res) => {
  try {
    if (!db) return res.status(503).json({ error: "Sin base de datos" });
    let oid;
    try { oid = new ObjectId(req.params.id); }
    catch { return res.status(400).json({ error: "ID de gasto inválido" }); }
    const result = await db.collection("gastos").deleteOne({ _id: oid, empresa: req.gastoEmpresa });
    if (!result.deletedCount) return res.status(404).json({ error: "Gasto no encontrado" });
    res.json({ ok: true });
  } catch (e) {
    console.error("❌ DELETE /api/gastos:", e);
    res.status(500).json({ error: e.message });
  }
});

// ─── HUEVOS (MongoDB, sincronizados entre dispositivos) ───────────────────────
const authHuevos = (req, res, next) => {
  const user = obtenerUsuarioPeticion(req);
  if (!user) return res.status(401).json({ error: "Credenciales inválidas para huevos" });
  req.eggUser = user;
  req.eggKey = obtenerClaveHuevos(user);
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
    // El stock de huevos SÍ puede ser negativo (venta sin stock suficiente),
    // a diferencia de costos y precios, que siempre deben ser >= 0.
    stockHuevos: Number(q.stockHuevos || 0),
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

// Se asegura de que exista el documento de huevos para esta empresa/usuario
// ANTES de intentar una actualización atómica con arrayFilters — si el
// documento (o el array inventory) no existe todavía, un arrayFilter no
// tiene sobre qué hacer match. $setOnInsert es un no-op si el documento ya
// existe, así que llamar esto en cada request es seguro y barato.
const ensureHuevosDoc = async (key) => {
  await db.collection("huevos").updateOne(
    { key },
    { $setOnInsert: { key, inventory: inventarioHuevosInicial, movements: [], creadoEn: new Date() } },
    { upsert: true }
  );
};

// Si la categoría (calidadId) referenciada en un delta no existe todavía
// dentro del array inventory (categoría nueva/custom), la agrega antes de
// intentar el $set/$inc con arrayFilters. La condición "inventory.id": {$ne}
// evita duplicados aunque dos requests casi simultáneas la disparen a la vez.
const asegurarCategoriaHuevos = async (key, calidadId, nombre) => {
  if (!calidadId) return;
  await db.collection("huevos").updateOne(
    { key, "inventory.id": { $ne: calidadId } },
    { $push: { inventory: {
      id: calidadId, nombre: nombre || calidadId, stockHuevos: 0,
      costoCaja: 0, precioCaja: 0, precioBandeja: 0, precioVentaUnitario: 0,
      stockMinimoCajas: 5,
    } } }
  );
};

// Actualiza SOLO el elemento del array inventory que corresponde a una
// categoría (arrayFilters + $inc/$set), en vez de reescribir el array
// completo. Esto es lo que hace que dos guardadas de categorías distintas
// (o de la misma) ya no puedan pisarse entre sí.
const aplicarDeltaInventario = (update, delta) => {
  if (!delta || !delta.calidadId) return null;
  if (Number(delta.stockDelta || 0) !== 0) {
    update.$inc = { "inventory.$[q].stockHuevos": Number(delta.stockDelta) };
  }
  const camposAbsolutos = {};
  ["costoCaja", "precioVentaUnitario", "precioCaja", "precioBandeja", "stockMinimoCajas", "incrementoPct"].forEach(f => {
    if (delta[f] !== undefined) camposAbsolutos[`inventory.$[q].${f}`] = Number(delta[f]);
  });
  if (Object.keys(camposAbsolutos).length) update.$set = { ...(update.$set || {}), ...camposAbsolutos };
  return [{ "q.id": delta.calidadId }];
};

app.put("/api/huevos/inventario", authHuevos, async (req, res) => {
  try {
    if (!db) return res.status(503).json({ error: "Sin base de datos" });
    const delta = req.body?.inventoryDelta || (req.body?.calidadId ? req.body : null);

    if (delta && delta.calidadId) {
      // Camino atómico: solo toca la categoría indicada.
      await ensureHuevosDoc(req.eggKey);
      await asegurarCategoriaHuevos(req.eggKey, delta.calidadId, delta.nombre);
      const update = { $set: { usuario: req.eggUser.usuario, empresa: req.eggUser.empresa || "", actualizadoEn: new Date() } };
      const arrayFilters = aplicarDeltaInventario(update, delta);
      const doc = await db.collection("huevos").findOneAndUpdate(
        { key: req.eggKey }, update, { arrayFilters, returnDocument: "after" }
      );
      return res.json({ ok: true, inventory: doc.inventory });
    }

    // Camino legado: reescribe el array completo. Se deja solo para los
    // flujos que de verdad necesitan tocar TODAS las categorías a la vez
    // (reset del módulo, migración inicial desde localStorage, o agregar
    // categorías por defecto que falten) — no para ediciones normales.
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
    // Acepta un solo movimiento (compatibilidad) o varios en una sola escritura
    // atómica — necesario para "entrada + transferencia automática de lote".
    const incoming = Array.isArray(req.body?.movements)
      ? req.body.movements
      : (req.body?.movement ? [req.body.movement] : []);
    const stamped = incoming.map(m => ({ ...m, guardadoEn: new Date().toISOString() }));
    const delta = req.body?.inventoryDelta || null;

    await ensureHuevosDoc(req.eggKey);
    if (delta && delta.calidadId) await asegurarCategoriaHuevos(req.eggKey, delta.calidadId, delta.nombre);

    // ATÓMICO: los movimientos se agregan con $push (nunca se reescribe el
    // array completo, así que dos guardadas casi simultáneas no pueden
    // pisarse — cada una hace su propio $push sobre lo que haya en ese
    // instante en MongoDB, no sobre una copia leída antes en JS).
    const update = {
      $set: { usuario: req.eggUser.usuario, empresa: req.eggUser.empresa || "", actualizadoEn: new Date() },
    };
    if (stamped.length) {
      update.$push = { movements: { $each: stamped, $position: 0, $slice: 5000 } };
    }

    let arrayFilters;
    if (delta && delta.calidadId) {
      arrayFilters = aplicarDeltaInventario(update, delta);
    } else if (Array.isArray(req.body?.inventory)) {
      // Compatibilidad con clientes viejos que todavía manden el array
      // completo: se respeta, pero ya no es el camino recomendado.
      update.$set.inventory = limpiarInventarioHuevos(req.body.inventory);
    }

    const doc = await db.collection("huevos").findOneAndUpdate(
      { key: req.eggKey }, update, { arrayFilters, returnDocument: "after" }
    );
    res.json({ ok: true, inventory: doc.inventory, movements: doc.movements });
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
    const delta = req.body?.inventoryDelta || null;

    await ensureHuevosDoc(req.eggKey);
    if (delta && delta.calidadId) await asegurarCategoriaHuevos(req.eggKey, delta.calidadId, delta.nombre);

    // ATÓMICO: $pull saca el movimiento del array y $inc revierte el stock
    // en la misma escritura — no hace falta leer el documento antes.
    // El id puede haberse guardado como Number (Date.now()) o String según
    // el cliente que lo creó, así que se aceptan ambas formas al comparar.
    const idNum = Number(req.params.id);
    const update = {
      $pull: { movements: { $or: [{ id: req.params.id }, ...(Number.isFinite(idNum) ? [{ id: idNum }] : [])] } },
      $set: { usuario: req.eggUser.usuario, empresa: req.eggUser.empresa || "", actualizadoEn: new Date() },
    };
    let arrayFilters;
    if (delta && delta.calidadId) {
      arrayFilters = aplicarDeltaInventario(update, delta);
    } else if (Array.isArray(req.body?.inventory)) {
      // Compatibilidad con clientes viejos.
      update.$set.inventory = limpiarInventarioHuevos(req.body.inventory);
    }

    const doc = await db.collection("huevos").findOneAndUpdate(
      { key: req.eggKey }, update, { arrayFilters, returnDocument: "after" }
    );
    res.json({ ok: true, inventory: doc.inventory, movements: doc.movements });
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



  app.post("/api/gastos/upload-boleta", authGastos, upload.single("imagen"), async (req, res) => {
    if (!req.file) return res.status(400).json({ error: "No se recibió imagen" });
    try {
      const result = await new Promise((resolve, reject) => {
        const stream = cloudinary.uploader.upload_stream(
          { folder: `inventario-boletas/${req.gastoEmpresa}`, resource_type: "image" },
          (error, result) => error ? reject(error) : resolve(result)
        );
        stream.end(req.file.buffer);
      });
      res.json({ url: result.secure_url });
    } catch (e) {
      console.error("❌ Error subiendo boleta:", e.message);
      res.status(500).json({ error: "Error al subir la boleta" });
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
