// ─────────────────────────────────────────────────────────────────────────────
//  INVENTARIO PRO — Servidor Backend + Frontend Unificado
//  Mandarin · 2026
//
//  Instalación (solo la primera vez):
//    npm install express cors nodemailer multer mongoose
//
//  Para iniciar TODO el sistema (backend + frontend):
//    npm start        ← recomendado
//    node server.js   ← alternativa directa
//
//  El sistema corre en: http://localhost:3001
//  Los usuarios se guardan en: MongoDB Atlas (persistente)
//  Las imágenes se guardan en: uploads/ (mismo directorio)
// ─────────────────────────────────────────────────────────────────────────────

const express    = require("express");
const cors       = require("cors");
const nodemailer = require("nodemailer");
const fs         = require("fs");
const path       = require("path");
const multer     = require("multer");
const mongoose   = require("mongoose");

// ── Cargar .env si existe ─────────────────────────────────────────────────────
try { require("dotenv").config(); } catch (e) { /* dotenv opcional */ }

const app  = express();
const PORT = process.env.PORT || 3001;
const UPLOADS_DIR = path.join(__dirname, "uploads");
const BUILD_DIR   = path.join(__dirname, "build");

// ─────────────────────────────────────────────────────────────────────────────
//  CONEXIÓN MONGODB ATLAS
// ─────────────────────────────────────────────────────────────────────────────
const MONGO_URI = process.env.MONGO_URI;
if (!MONGO_URI) { console.error("✗ Falta la variable de entorno MONGO_URI"); process.exit(1); }

mongoose.connect(MONGO_URI)
  .then(() => console.log("✓ Conectado a MongoDB Atlas"))
  .catch(err => console.error("✗ Error conectando a MongoDB:", err.message));

// ─────────────────────────────────────────────────────────────────────────────
//  SCHEMA Y MODELO DE USUARIO
// ─────────────────────────────────────────────────────────────────────────────
const usuarioSchema = new mongoose.Schema({
  nombre:        { type: String, required: true },
  usuario:       { type: String, required: true, unique: true },
  correo:        { type: String, default: "" },
  clave:         { type: String, required: true },
  rol:           { type: String, default: "empleado" },
  createdAt:     { type: String },
  createdAtISO:  { type: String },
  lastAccess:    { type: String, default: "—" },
  blocked:       { type: Boolean, default: false },
  subscription:  { type: String, default: "free" },
  emailVerified: { type: Boolean, default: false },
  empresa:       { type: String, default: "" },
});

const Usuario = mongoose.model("Usuario", usuarioSchema);

// ── Crear usuario admin por defecto si no existe ──────────────────────────────
async function crearAdminSiNoExiste() {
  try {
    const existe = await Usuario.findOne({ usuario: "admin" });
    if (!existe) {
      const ahora = new Date();
      await Usuario.create({
        nombre: "Administrador",
        usuario: "admin",
        correo: "mandarin.soporte@gmail.com",
        clave: "admin1234",
        rol: "gerente",
        createdAt: ahora.toLocaleDateString("es-CL"),
        createdAtISO: ahora.toISOString(),
        lastAccess: "—",
        blocked: false,
        subscription: "enterprise",
        emailVerified: true,
      });
      console.log("✓ Usuario administrador creado en MongoDB.");
    }
  } catch (e) {
    console.error("Error creando admin:", e.message);
  }
}

mongoose.connection.once("open", crearAdminSiNoExiste);

// ─────────────────────────────────────────────────────────────────────────────
//  SCHEMA DE PRODUCTO
// ─────────────────────────────────────────────────────────────────────────────
const productoSchema = new mongoose.Schema({
  nombre:       { type: String, required: true },
  categoria:    { type: String, default: "Sin categoría" },
  precio:       { type: Number, default: 0 },
  costo:        { type: Number, default: 0 },
  incrementoPct:{ type: Number, default: 0 },
  stock:        { type: Number, default: 0 },
  img:          { type: String, default: "📦" },
  imagenUrl:    { type: String, default: "" },
  codigo:       { type: String, default: "" },
  promoActiva:  { type: Boolean, default: false },
  promoCantMin: { type: String, default: "" },
  promoPrecio:  { type: String, default: "" },
  empresa:      { type: String, default: "" },
}, { timestamps: true });

const Producto = mongoose.model("Producto", productoSchema);

// ─────────────────────────────────────────────────────────────────────────────
//  SCHEMA DE CATEGORÍA
// ─────────────────────────────────────────────────────────────────────────────
const categoriaSchema = new mongoose.Schema({
  nombre:  { type: String, required: true },
  icono:   { type: String, default: "📦" },
  empresa: { type: String, default: "" },
});

const Categoria = mongoose.model("Categoria", categoriaSchema);
// ─────────────────────────────────────────────────────────────────────────────
//  SCHEMAS DE VENTAS Y BOLETAS (persistencia monetaria)
// ─────────────────────────────────────────────────────────────────────────────
const ventaSchema = new mongoose.Schema({
  id: { type: String, required: true },
  items: { type: Array, default: [] },
  total: { type: Number, required: true, default: 0 },
  pago: { type: String, default: "Efectivo" },
  dineroRecibido: { type: Number, default: 0 },
  vuelto: { type: Number, default: 0 },
  fecha: { type: String, default: "" },
  timestamp: { type: Number, default: () => Date.now() },
  usuario: { type: String, default: "" },
  estadoPago: { type: String, default: "confirmado" },
  mpPaymentId: { type: String, default: "" },
  mpStatus: { type: String, default: "" },
  empresa: { type: String, default: "" },
}, { timestamps: true });
ventaSchema.index({ empresa: 1, id: 1 }, { unique: true });
const Venta = mongoose.model("Venta", ventaSchema);

const boletaSchema = new mongoose.Schema({
  numero: { type: String, required: true },
  ventaId: { type: String, required: true },
  fecha: { type: String, default: "" },
  timestamp: { type: Number, default: () => Date.now() },
  items: { type: Array, default: [] },
  total: { type: Number, required: true, default: 0 },
  subtotal: { type: Number, default: 0 },
  metodoPago: { type: String, default: "Efectivo" },
  estadoPago: { type: String, default: "confirmado" },
  vendedor: { type: String, default: "" },
  mpPaymentId: { type: String, default: "" },
  negocio: { type: String, default: "" },
  empresa: { type: String, default: "" },
}, { timestamps: true });
boletaSchema.index({ empresa: 1, numero: 1 }, { unique: true });
boletaSchema.index({ empresa: 1, ventaId: 1 });
const Boleta = mongoose.model("Boleta", boletaSchema);

// ─────────────────────────────────────────────────────────────────────────────
//  SCHEMA DE GASTOS Y COMPRAS DEL LOCAL
// ─────────────────────────────────────────────────────────────────────────────
const gastoSchema = new mongoose.Schema({
  comercio: { type: String, required: true },
  fecha: { type: String, default: () => new Date().toISOString().slice(0, 10) },
  total: { type: Number, required: true, default: 0 },
  iva: { type: Number, default: 0 },
  categoria: { type: String, default: "otros" },
  metodoPago: { type: String, default: "Efectivo" },
  numeroDocumento: { type: String, default: "" },
  notas: { type: String, default: "" },
  imagenUrl: { type: String, default: "" },
  textoOCR: { type: String, default: "" },
  itemsInventario: { type: Array, default: [] },
  usuario: { type: String, default: "" },
  empresa: { type: String, default: "" },
}, { timestamps: true });
gastoSchema.index({ empresa: 1, fecha: -1 });
const Gasto = mongoose.model("Gasto", gastoSchema);

// ─────────────────────────────────────────────────────────────────────────────
//  SCHEMAS DE HUEVOS (sincronizados entre dispositivos)
// ─────────────────────────────────────────────────────────────────────────────
const huevoInventarioSchema = new mongoose.Schema({
  calidadId: { type: String, required: true },
  nombre: { type: String, required: true },
  stockHuevos: { type: Number, default: 0 },
  costoCaja: { type: Number, default: 0 },
  precioCaja: { type: Number, default: 0 },
  precioBandeja: { type: Number, default: 0 },
  precioVentaUnitario: { type: Number, default: 0 },
  incrementoPct: { type: Number, default: 0 },
  stockMinimoCajas: { type: Number, default: 5 },
  empresa: { type: String, default: "" },
}, { timestamps: true });
huevoInventarioSchema.index({ empresa: 1, calidadId: 1 }, { unique: true });
const HuevoInventario = mongoose.model("HuevoInventario", huevoInventarioSchema);

const huevoMovimientoSchema = new mongoose.Schema({
  id: { type: String, required: true },
  fecha: { type: String, default: () => new Date().toISOString() },
  tipo: { type: String, required: true },
  calidadId: { type: String, required: true },
  calidad: { type: String, default: "" },
  cajas: { type: Number, default: 0 },
  bandejas: { type: Number, default: 0 },
  unidades: { type: Number, default: 0 },
  huevos: { type: Number, default: 0 },
  motivo: { type: String, default: "" },
  observaciones: { type: String, default: "" },
  usuario: { type: String, default: "" },
  ingreso: { type: Number, default: 0 },
  costo: { type: Number, default: 0 },
  ganancia: { type: Number, default: 0 },
  precioCaja: { type: Number, default: 0 },
  precioBandeja: { type: Number, default: 0 },
  precioUnidad: { type: Number, default: 0 },
  valorUnitarioCompra: { type: Number, default: 0 },
  totalCompra: { type: Number, default: 0 },
  precioVentaUnitario: { type: Number, default: 0 },
  ventaEsperada: { type: Number, default: 0 },
  gananciaEstimada: { type: Number, default: 0 },
  descuento: { type: Number, default: 0 },
  empresa: { type: String, default: "" },
}, { timestamps: true });
huevoMovimientoSchema.index({ empresa: 1, id: 1 }, { unique: true });
const HuevoMovimiento = mongoose.model("HuevoMovimiento", huevoMovimientoSchema);


// ── Crear directorio de uploads si no existe ──────────────────────────────────
if (!fs.existsSync(UPLOADS_DIR)) {
  fs.mkdirSync(UPLOADS_DIR, { recursive: true });
  console.log("✓ Directorio uploads/ creado.");
}

// ── Multer ────────────────────────────────────────────────────────────────────
const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, UPLOADS_DIR),
  filename: (req, file, cb) => {
    const ext  = path.extname(file.originalname).toLowerCase();
    const name = `prod_${Date.now()}_${Math.random().toString(36).slice(2, 7)}${ext}`;
    cb(null, name);
  },
});

const fileFilter = (req, file, cb) => {
  const allowed = [".jpg", ".jpeg", ".png", ".gif", ".webp", ".svg"];
  const ext = path.extname(file.originalname).toLowerCase();
  if (allowed.includes(ext)) cb(null, true);
  else cb(new Error("Formato de imagen no permitido. Use JPG, PNG, GIF, WEBP o SVG."), false);
};

const upload = multer({ storage, fileFilter, limits: { fileSize: 5 * 1024 * 1024 } });

// ── Middleware ─────────────────────────────────────────────────────────────────
app.use(cors({ origin: "*" }));
app.use(express.json());
app.use("/uploads", express.static(UPLOADS_DIR));

// ── Nodemailer ────────────────────────────────────────────────────────────────
const transporter = nodemailer.createTransport({
  service: "gmail",
  auth: {
    user: process.env.GMAIL_USER || "",
    pass: process.env.GMAIL_APP_PASSWORD || "",
  },
});

// ── Códigos en memoria ────────────────────────────────────────────────────────
const codigosVerif        = new Map();
const codigosRecuperacion = new Map();

function generarCodigo() {
  return String(Math.floor(100000 + Math.random() * 900000));
}

async function enviarCodigo(correoDestino, codigo, nombreUsuario) {
  await transporter.sendMail({
    from: '"Mandarin" <mandarin.soporte@gmail.com>',
    to: correoDestino,
    subject: "Código de verificación — Inventario Pro",
    html: `
    <div style="font-family:Arial,sans-serif;max-width:600px;margin:auto;padding:30px;color:#222;">
      <h2>Código de verificación del correo electrónico</h2>
      <p>Hola <strong>${nombreUsuario}</strong>, introduce este código en la pantalla de verificación:</p>
      <div style="font-size:42px;font-weight:bold;letter-spacing:8px;margin:30px 0;color:#ff8c42;">${codigo}</div>
      <p>Este código caduca en <strong>10 minutos</strong>.</p>
    </div>`,
  });
}

// ── Middleware: solo gerentes ──────────────────────────────────────────────────
async function soloGerente(req, res, next) {
  const adminUser  = req.headers["x-admin-user"];
  const adminClave = req.headers["x-admin-clave"];
  if (!adminUser || !adminClave) {
    return res.status(403).json({ error: "Credenciales de administrador requeridas." });
  }
  const user = await Usuario.findOne({ usuario: adminUser, clave: adminClave, rol: "gerente" });
  if (!user) return res.status(403).json({ error: "Acceso denegado. Solo gerentes." });
  req.adminUser = user;
  next();
}

// ─────────────────────────────────────────────────────────────────────────────
//  RUTAS DE AUTENTICACIÓN
// ─────────────────────────────────────────────────────────────────────────────

app.get("/api/ping", (req, res) => {
  res.json({ ok: true, version: "2.4.0", ts: new Date().toISOString() });
});

app.post("/api/auth/send-code", async (req, res) => {
  const { correo, nombre } = req.body;
  if (!correo || !nombre) return res.status(400).json({ error: "Correo y nombre son requeridos." });

  const existe = await Usuario.findOne({ correo });
  if (existe) return res.status(400).json({ error: "Ese correo ya está registrado." });

  const codigo = generarCodigo();
  codigosVerif.set(correo, { codigo, expira: Date.now() + 10 * 60 * 1000, nombre });

  try {
    await enviarCodigo(correo, codigo, nombre);
    res.json({ ok: true, mensaje: `Código enviado a ${correo}` });
  } catch (err) {
    codigosVerif.delete(correo);
    res.status(500).json({ error: "No se pudo enviar el correo." });
  }
});

app.post("/api/auth/verify-code", (req, res) => {
  const { correo, codigo } = req.body;
  const data = codigosVerif.get(correo);
  if (!data) return res.status(400).json({ error: "No hay código pendiente para ese correo." });
  if (Date.now() > data.expira) { codigosVerif.delete(correo); return res.status(400).json({ error: "El código expiró." }); }
  if (data.codigo !== String(codigo).trim()) return res.status(400).json({ error: "Código incorrecto." });
  res.json({ ok: true, mensaje: "Código verificado correctamente." });
});

app.post("/api/auth/register", async (req, res) => {
  const { nombre, usuario, correo, clave, codigo } = req.body;
  if (!nombre || !usuario || !correo || !clave) return res.status(400).json({ error: "Completa todos los campos." });
  if (clave.length < 4) return res.status(400).json({ error: "La contraseña debe tener al menos 4 caracteres." });

  const verif = codigosVerif.get(correo);
  if (!verif || String(codigo).trim() !== verif.codigo || Date.now() > verif.expira) {
    return res.status(400).json({ error: "Código inválido o expirado." });
  }

  const existeUsuario = await Usuario.findOne({ usuario });
  if (existeUsuario) return res.status(400).json({ error: "Ese nombre de usuario ya existe." });
  const existeCorreo = await Usuario.findOne({ correo });
  if (existeCorreo) return res.status(400).json({ error: "Ese correo ya está registrado." });

  const ahora = new Date();
  await Usuario.create({
    nombre, usuario, correo, clave,
    rol: "empleado",
    createdAt: ahora.toLocaleDateString("es-CL"),
    createdAtISO: ahora.toISOString(),
    lastAccess: "—",
    blocked: false,
    subscription: "free",
    emailVerified: true,
  });
  codigosVerif.delete(correo);
  res.json({ ok: true, mensaje: "Cuenta creada exitosamente." });
});

app.post("/api/auth/login", async (req, res) => {
  const { usuario, clave } = req.body;
  const user = await Usuario.findOne({ usuario, clave });
  if (!user) return res.status(401).json({ error: "Usuario o contraseña incorrectos." });
  if (user.blocked) return res.status(403).json({ error: "Tu cuenta ha sido bloqueada." });

  const lastAccess = new Date().toLocaleString("es-CL");
  await Usuario.updateOne({ usuario }, { lastAccess });

  const { clave: _, ...userObj } = user.toObject();
  res.json({ ok: true, user: { ...userObj, lastAccess } });
});

// ── Recuperación de contraseña ────────────────────────────────────────────────

app.post("/api/auth/forgot-password", async (req, res) => {
  const { correo } = req.body;
  if (!correo) return res.status(400).json({ error: "El correo es requerido." });

  const user = await Usuario.findOne({ correo });
  if (!user) return res.json({ ok: true, mensaje: "Si ese correo está registrado, recibirás un código." });

  const codigo = generarCodigo();
  codigosRecuperacion.set(correo, { codigo, expira: Date.now() + 10 * 60 * 1000, intentos: 0 });

  try {
    await transporter.sendMail({
      from: '"Mandarin" <mandarin.soporte@gmail.com>',
      to: correo,
      subject: "Recupera tu contraseña — Inventario Pro",
      html: `
      <div style="font-family:Arial,sans-serif;max-width:600px;margin:auto;padding:30px;color:#222;">
        <h2>Recuperación de contraseña</h2>
        <p>Hola <strong>${user.nombre}</strong>, ingresa este código:</p>
        <div style="font-size:42px;font-weight:bold;letter-spacing:8px;margin:30px 0;color:#3b5bdb;">${codigo}</div>
        <p>Este código caduca en <strong>10 minutos</strong>.</p>
      </div>`,
    });
    res.json({ ok: true, mensaje: "Si ese correo está registrado, recibirás un código." });
  } catch (err) {
    codigosRecuperacion.delete(correo);
    res.status(500).json({ error: "No se pudo enviar el correo." });
  }
});

app.post("/api/auth/verify-recovery-code", (req, res) => {
  const { correo, codigo } = req.body;
  const data = codigosRecuperacion.get(correo);
  if (!data) return res.status(400).json({ error: "No hay código pendiente." });
  if (Date.now() > data.expira) { codigosRecuperacion.delete(correo); return res.status(400).json({ error: "El código expiró." }); }
  if (data.intentos >= 5) { codigosRecuperacion.delete(correo); return res.status(400).json({ error: "Demasiados intentos." }); }
  if (data.codigo !== String(codigo).trim()) {
    data.intentos += 1;
    codigosRecuperacion.set(correo, data);
    return res.status(400).json({ error: `Código incorrecto. ${5 - data.intentos} intentos restantes.` });
  }
  data.verificado = true;
  codigosRecuperacion.set(correo, data);
  res.json({ ok: true, mensaje: "Código verificado." });
});

app.post("/api/auth/reset-password", async (req, res) => {
  const { correo, nuevaClave } = req.body;
  if (!correo || !nuevaClave) return res.status(400).json({ error: "Correo y nueva contraseña son requeridos." });
  if (nuevaClave.length < 4) return res.status(400).json({ error: "La contraseña debe tener al menos 4 caracteres." });

  const data = codigosRecuperacion.get(correo);
  if (!data || !data.verificado) return res.status(400).json({ error: "Debes verificar el código primero." });
  if (Date.now() > data.expira) { codigosRecuperacion.delete(correo); return res.status(400).json({ error: "Sesión expirada." }); }

  const user = await Usuario.findOneAndUpdate({ correo }, { clave: nuevaClave });
  if (!user) return res.status(404).json({ error: "Usuario no encontrado." });

  codigosRecuperacion.delete(correo);
  res.json({ ok: true, mensaje: "Contraseña actualizada exitosamente." });
});

// ─────────────────────────────────────────────────────────────────────────────
//  RUTAS DE ADMINISTRACIÓN DE USUARIOS
// ─────────────────────────────────────────────────────────────────────────────

app.get("/api/users", soloGerente, async (req, res) => {
  const users = await Usuario.find({}, { clave: 0 });
  res.json(users);
});

app.post("/api/users", soloGerente, async (req, res) => {
  const { nombre, usuario, correo, clave, rol, empresa } = req.body;
  if (!nombre || !usuario || !clave) return res.status(400).json({ error: "Nombre, usuario y contraseña son obligatorios." });

  const existe = await Usuario.findOne({ usuario });
  if (existe) return res.status(400).json({ error: "Ese usuario ya existe." });

  const ahora = new Date();
  const newUser = await Usuario.create({
    nombre, usuario, correo: correo || "", clave,
    rol: rol || "empleado",
    empresa: empresa || "",
    createdAt: ahora.toLocaleDateString("es-CL"), createdAtISO: ahora.toISOString(),
    lastAccess: "—", blocked: false, subscription: "free", emailVerified: true,
  });

  const { clave: _, ...sinClave } = newUser.toObject();
  res.json({ ok: true, user: sinClave });
});

app.put("/api/users/:username", soloGerente, async (req, res) => {
  const { nombre, rol, correo, subscription, nuevaClave, empresa } = req.body;
  const update = {
    ...(nombre       !== undefined && { nombre }),
    ...(rol          !== undefined && { rol }),
    ...(correo       !== undefined && { correo }),
    ...(subscription !== undefined && { subscription }),
    ...(empresa      !== undefined && { empresa }),
    ...(nuevaClave   && nuevaClave.trim() && { clave: nuevaClave }),
  };

  const user = await Usuario.findOneAndUpdate({ usuario: req.params.username }, update, { new: true });
  if (!user) return res.status(404).json({ error: "Usuario no encontrado." });

  const { clave: _, ...sinClave } = user.toObject();
  res.json({ ok: true, user: sinClave });
});

app.patch("/api/users/:username/block", soloGerente, async (req, res) => {
  const { blocked } = req.body;
  const user = await Usuario.findOneAndUpdate({ usuario: req.params.username }, { blocked: Boolean(blocked) }, { new: true });
  if (!user) return res.status(404).json({ error: "Usuario no encontrado." });
  res.json({ ok: true, blocked: user.blocked });
});

app.delete("/api/users/:username", soloGerente, async (req, res) => {
  const { username } = req.params;
  if (username === req.adminUser.usuario) return res.status(400).json({ error: "No puedes eliminar tu propia cuenta." });

  const result = await Usuario.deleteOne({ usuario: username });
  if (result.deletedCount === 0) return res.status(404).json({ error: "Usuario no encontrado." });
  res.json({ ok: true });
});

// ─────────────────────────────────────────────────────────────────────────────
//  MIDDLEWARE: AUTENTICAR USUARIO (para rutas de productos)
// ─────────────────────────────────────────────────────────────────────────────
async function autenticarUsuario(req, res, next) {
  const usuario = req.headers["x-usuario"];
  const clave   = req.headers["x-clave"];
  if (!usuario || !clave) return res.status(401).json({ error: "Autenticación requerida." });
  const user = await Usuario.findOne({ usuario, clave, blocked: false });
  if (!user) return res.status(401).json({ error: "Credenciales inválidas." });
  req.user = user;
  next();
}

// ─────────────────────────────────────────────────────────────────────────────
//  RUTAS DE PRODUCTOS (separados por empresa)
// ─────────────────────────────────────────────────────────────────────────────

app.get("/api/productos", autenticarUsuario, async (req, res) => {
  const empresa = req.user.empresa || "";
  const productos = await Producto.find({ empresa });
  res.json(productos.map(p => ({ ...p.toObject(), id: p._id })));
});

app.post("/api/productos", autenticarUsuario, async (req, res) => {
  const empresa = req.user.empresa || "";
  const data = { ...req.body, empresa };
  const nuevo = await Producto.create(data);
  res.json({ ...nuevo.toObject(), id: nuevo._id });
});

app.put("/api/productos/:id", autenticarUsuario, async (req, res) => {
  const empresa = req.user.empresa || "";
  const prod = await Producto.findOneAndUpdate({ _id: req.params.id, empresa }, req.body, { new: true });
  if (!prod) return res.status(404).json({ error: "Producto no encontrado." });
  res.json({ ...prod.toObject(), id: prod._id });
});

app.delete("/api/productos/:id", autenticarUsuario, async (req, res) => {
  const empresa = req.user.empresa || "";
  const result = await Producto.deleteOne({ _id: req.params.id, empresa });
  if (result.deletedCount === 0) return res.status(404).json({ error: "Producto no encontrado." });
  res.json({ ok: true });
});

app.post("/api/productos/upload-imagen", autenticarUsuario, upload.single("imagen"), (req, res) => {
  if (!req.file) return res.status(400).json({ error: "No se recibió ninguna imagen." });
  res.json({ ok: true, url: `/uploads/${req.file.filename}` });
});

// ─────────────────────────────────────────────────────────────────────────────
//  RUTAS DE CATEGORÍAS (separadas por empresa)
// ─────────────────────────────────────────────────────────────────────────────

app.get("/api/categorias", autenticarUsuario, async (req, res) => {
  const empresa = req.user.empresa || "";
  const cats = await Categoria.find({ empresa });
  res.json(cats);
});

app.post("/api/categorias", autenticarUsuario, async (req, res) => {
  const empresa = req.user.empresa || "";
  const { nombre, icono } = req.body;
  const existe = await Categoria.findOne({ nombre, empresa });
  if (existe) return res.status(400).json({ error: "Esa categoría ya existe." });
  const nueva = await Categoria.create({ nombre, icono: icono || "📦", empresa });
  res.json(nueva);
});

app.put("/api/categorias/:id", autenticarUsuario, async (req, res) => {
  const empresa = req.user.empresa || "";
  const cat = await Categoria.findOneAndUpdate({ _id: req.params.id, empresa }, req.body, { new: true });
  if (!cat) return res.status(404).json({ error: "Categoría no encontrada." });
  res.json(cat);
});

app.delete("/api/categorias/:id", autenticarUsuario, async (req, res) => {
  const empresa = req.user.empresa || "";
  const result = await Categoria.deleteOne({ _id: req.params.id, empresa });
  if (result.deletedCount === 0) return res.status(404).json({ error: "Categoría no encontrada." });
  res.json({ ok: true });
});


// ─────────────────────────────────────────────────────────────────────────────
//  RUTAS DE VENTAS Y BOLETAS (guardado permanente en MongoDB)
// ─────────────────────────────────────────────────────────────────────────────
app.get("/api/ventas", autenticarUsuario, async (req, res) => {
  const empresa = req.user.empresa || "";
  const ventas = await Venta.find({ empresa }).sort({ timestamp: -1, createdAt: -1 }).lean();
  res.json(ventas.map(v => ({ ...v, id: v.id || String(v._id) })));
});

app.get("/api/boletas", autenticarUsuario, async (req, res) => {
  const empresa = req.user.empresa || "";
  const boletas = await Boleta.find({ empresa }).sort({ timestamp: -1, createdAt: -1 }).lean();
  res.json(boletas);
});

app.post("/api/ventas", autenticarUsuario, async (req, res) => {
  try {
    const empresa = req.user.empresa || "";
    const { venta, boleta } = req.body || {};
    if (!venta || !boleta) return res.status(400).json({ error: "Venta y boleta son requeridas." });
    if (!Array.isArray(venta.items) || venta.items.length === 0) return res.status(400).json({ error: "La venta no tiene productos." });

    const ventaId = String(venta.id || Date.now());
    const numero = String(boleta.numero || Date.now());

    const existente = await Venta.findOne({ empresa, id: ventaId }).lean();
    if (existente) {
      const boletaExistente = await Boleta.findOne({ empresa, ventaId }).lean();
      return res.json({ venta: existente, boleta: boletaExistente, duplicada: true });
    }

    for (const item of venta.items) {
      const productoId = item.productoId || item.id || item._id;
      const cantidad = Number(item.cantidad || 0);
      if (!productoId || cantidad <= 0) continue;
      const prod = await Producto.findOne({ _id: productoId, empresa });
      if (!prod) return res.status(400).json({ error: `Producto no encontrado: ${item.nombre || productoId}` });
      if (prod.stock < cantidad) return res.status(400).json({ error: `Stock insuficiente para ${prod.nombre}.` });
    }

    const nuevaVenta = await Venta.create({ ...venta, id: ventaId, empresa });
    const nuevaBoleta = await Boleta.create({ ...boleta, numero, ventaId, empresa });

    for (const item of venta.items) {
      const productoId = item.productoId || item.id || item._id;
      const cantidad = Number(item.cantidad || 0);
      if (productoId && cantidad > 0) {
        await Producto.updateOne({ _id: productoId, empresa }, { $inc: { stock: -cantidad } });
      }
    }

    res.status(201).json({
      venta: { ...nuevaVenta.toObject(), id: nuevaVenta.id },
      boleta: nuevaBoleta.toObject(),
    });
  } catch (err) {
    if (err && err.code === 11000) return res.status(409).json({ error: "La venta o boleta ya estaba registrada." });
    console.error("Error guardando venta:", err);
    res.status(500).json({ error: "No se pudo guardar la venta en la nube." });
  }
});

// Por seguridad contable, las ventas y boletas nunca se eliminan físicamente.
app.delete("/api/ventas/:id", autenticarUsuario, async (req, res) => {
  return res.status(405).json({
    error: "El borrado de ventas y boletas está bloqueado por seguridad."
  });
});

app.delete("/api/ventas", autenticarUsuario, async (req, res) => {
  return res.status(405).json({
    error: "El borrado masivo de ventas está bloqueado por seguridad."
  });
});

app.delete("/api/boletas", autenticarUsuario, async (req, res) => {
  return res.status(405).json({
    error: "El borrado de boletas está bloqueado por seguridad."
  });
});

app.delete("/api/boletas/:id", autenticarUsuario, async (req, res) => {
  return res.status(405).json({
    error: "El borrado de boletas está bloqueado por seguridad."
  });
});


// ─────────────────────────────────────────────────────────────────────────────
// ─────────────────────────────────────────────────────────────────────────────
//  RUTAS DE GASTOS Y COMPRAS DEL LOCAL
// ─────────────────────────────────────────────────────────────────────────────
app.get("/api/gastos", autenticarUsuario, async (req, res) => {
  try {
    const empresa = req.user.empresa || "";
    const gastos = await Gasto.find({ empresa }).sort({ fecha: -1, createdAt: -1 }).lean();
    res.json(gastos.map(g => ({ ...g, id: String(g._id) })));
  } catch (e) { res.status(500).json({ error: e.message }); }
});

app.post("/api/gastos/upload-boleta", autenticarUsuario, upload.single("imagen"), (req, res) => {
  if (!req.file) return res.status(400).json({ error: "No se recibió ninguna imagen." });
  res.json({ ok: true, url: `/uploads/${req.file.filename}` });
});

app.post("/api/gastos", autenticarUsuario, async (req, res) => {
  try {
    const empresa = req.user.empresa || "";
    const body = req.body || {};
    const total = Number(body.total || 0);
    if (!String(body.comercio || "").trim()) return res.status(400).json({ error: "El comercio o descripción es obligatorio." });
    if (!(total > 0)) return res.status(400).json({ error: "El total debe ser mayor a cero." });

    const items = Array.isArray(body.itemsInventario) ? body.itemsInventario : [];
    const itemsGuardados = [];
    for (const item of items) {
      const productoId = item.productoId;
      const cantidad = Number(item.cantidad || 0);
      const costoUnitario = Number(item.costoUnitario || 0);
      if (!productoId || cantidad <= 0) continue;
      const prod = await Producto.findOne({ _id: productoId, empresa });
      if (!prod) return res.status(400).json({ error: "Uno de los productos vinculados no existe." });
      const stockAnterior = Number(prod.stock || 0);
      const costoAnterior = Number(prod.costo || 0);
      const nuevoStock = stockAnterior + cantidad;
      const nuevoCosto = costoUnitario > 0
        ? ((stockAnterior * costoAnterior) + (cantidad * costoUnitario)) / Math.max(1, nuevoStock)
        : costoAnterior;
      prod.stock = nuevoStock;
      prod.costo = Number(nuevoCosto.toFixed(4));
      await prod.save();
      itemsGuardados.push({
        productoId: String(prod._id), nombre: prod.nombre, cantidad, costoUnitario,
        stockAnterior, stockNuevo: nuevoStock, costoPromedioNuevo: prod.costo,
      });
    }

    const gasto = await Gasto.create({
      comercio: String(body.comercio).trim(), fecha: body.fecha || new Date().toISOString().slice(0,10),
      total, iva: Number(body.iva || 0), categoria: body.categoria || "otros",
      metodoPago: body.metodoPago || "Efectivo", numeroDocumento: body.numeroDocumento || "",
      notas: body.notas || "", imagenUrl: body.imagenUrl || "", textoOCR: body.textoOCR || "",
      itemsInventario: itemsGuardados, usuario: req.user.nombre || req.user.usuario || "", empresa,
    });
    const productos = await Producto.find({ empresa }).lean();
    res.json({ gasto: { ...gasto.toObject(), id: String(gasto._id) }, productos: productos.map(p => ({ ...p, id: String(p._id) })) });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

app.delete("/api/gastos/:id", autenticarUsuario, async (req, res) => {
  try {
    const empresa = req.user.empresa || "";
    const result = await Gasto.deleteOne({ _id: req.params.id, empresa });
    if (!result.deletedCount) return res.status(404).json({ error: "Gasto no encontrado." });
    res.json({ ok: true });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

//  RUTAS DE HUEVOS (persistencia y sincronización en MongoDB)
// ─────────────────────────────────────────────────────────────────────────────
const CALIDADES_HUEVO = [
  { id: "super", nombre: "Súper" },
  { id: "extra", nombre: "Extra" },
  { id: "primera", nombre: "Primera" },
  { id: "segunda", nombre: "Segunda" },
];

function normalizarInventarioHuevos(inventory = []) {
  return CALIDADES_HUEVO.map(base => {
    const q = inventory.find(x => String(x.id || x.calidadId) === base.id) || {};
    return {
      id: base.id, calidadId: base.id, nombre: q.nombre || base.nombre,
      stockHuevos: Math.max(0, Number(q.stockHuevos || 0)),
      costoCaja: Math.max(0, Number(q.costoCaja || 0)),
      precioCaja: Math.max(0, Number(q.precioCaja || 0)),
      precioBandeja: Math.max(0, Number(q.precioBandeja || 0)),
      precioVentaUnitario: Math.max(0, Number(q.precioVentaUnitario || 0)),
      stockMinimoCajas: Math.max(0, Number(q.stockMinimoCajas ?? 5)),
    };
  });
}

async function guardarInventarioHuevos(empresa, inventory) {
  const normalized = normalizarInventarioHuevos(inventory);
  await HuevoInventario.bulkWrite(normalized.map(q => ({
    updateOne: {
      filter: { empresa, calidadId: q.id },
      update: { $set: { ...q, calidadId: q.id, empresa } },
      upsert: true,
    },
  })));
  return normalized;
}

async function obtenerEstadoHuevos(empresa) {
  const docs = await HuevoInventario.find({ empresa }).lean();
  const inventory = normalizarInventarioHuevos(docs.map(d => ({ ...d, id: d.calidadId })));
  const movements = await HuevoMovimiento.find({ empresa }).sort({ fecha: -1, createdAt: -1 }).lean();
  return {
    inventory,
    movements: movements.map(m => ({ ...m, id: m.id || String(m._id) })),
  };
}

app.get("/api/huevos", autenticarUsuario, async (req, res) => {
  try {
    const empresa = req.user.empresa || "";
    const state = await obtenerEstadoHuevos(empresa);
    res.json(state);
  } catch (err) {
    console.error("Error cargando huevos:", err);
    res.status(500).json({ error: "No se pudo cargar el inventario de huevos." });
  }
});

app.put("/api/huevos/inventario", autenticarUsuario, async (req, res) => {
  try {
    const empresa = req.user.empresa || "";
    const inventory = await guardarInventarioHuevos(empresa, req.body?.inventory || []);
    res.json({ ok: true, inventory });
  } catch (err) {
    console.error("Error actualizando inventario de huevos:", err);
    res.status(500).json({ error: "No se pudo actualizar el inventario de huevos." });
  }
});

app.post("/api/huevos/movimientos", autenticarUsuario, async (req, res) => {
  try {
    const empresa = req.user.empresa || "";
    const { inventory, movement } = req.body || {};
    if (!Array.isArray(inventory)) return res.status(400).json({ error: "Inventario inválido." });
    await guardarInventarioHuevos(empresa, inventory);
    if (movement) {
      const movementId = String(movement.id || Date.now());
      await HuevoMovimiento.updateOne(
        { empresa, id: movementId },
        { $setOnInsert: { ...movement, id: movementId, empresa } },
        { upsert: true }
      );
    }
    const state = await obtenerEstadoHuevos(empresa);
    res.status(201).json({ ok: true, ...state });
  } catch (err) {
    console.error("Error guardando movimiento de huevos:", err);
    res.status(500).json({ error: "No se pudo guardar el movimiento de huevos." });
  }
});

app.post("/api/huevos/migrar", autenticarUsuario, async (req, res) => {
  try {
    const empresa = req.user.empresa || "";
    const existing = await HuevoMovimiento.countDocuments({ empresa });
    const existingInventory = await HuevoInventario.find({ empresa }).lean();
    const hasServerStock = existingInventory.some(q => Number(q.stockHuevos || 0) > 0);
    if (existing > 0 || hasServerStock) return res.json({ ok: true, ...(await obtenerEstadoHuevos(empresa)), skipped: true });

    await guardarInventarioHuevos(empresa, req.body?.inventory || []);
    const movements = Array.isArray(req.body?.movements) ? req.body.movements : [];
    if (movements.length) {
      await HuevoMovimiento.insertMany(movements.map(m => ({ ...m, id: String(m.id || Date.now() + Math.random()), empresa })), { ordered: false }).catch(err => {
        if (err?.code !== 11000) throw err;
      });
    }
    res.status(201).json({ ok: true, ...(await obtenerEstadoHuevos(empresa)) });
  } catch (err) {
    console.error("Error migrando huevos:", err);
    res.status(500).json({ error: "No se pudo migrar el inventario de huevos." });
  }
});

// ─────────────────────────────────────────────────────────────────────────────
//  SUBIDA DE IMÁGENES
// ─────────────────────────────────────────────────────────────────────────────

app.post("/api/upload/product-image", upload.single("imagen"), (req, res) => {
  if (!req.file) return res.status(400).json({ error: "No se recibió ninguna imagen." });
  const imageUrl = `/uploads/${req.file.filename}`;
  res.json({ ok: true, url: imageUrl, filename: req.file.filename, size: req.file.size, mimetype: req.file.mimetype });
});

app.delete("/api/upload/product-image/:filename", (req, res) => {
  const filePath = path.join(UPLOADS_DIR, path.basename(req.params.filename));
  if (!fs.existsSync(filePath)) return res.status(404).json({ error: "Imagen no encontrada." });
  try {
    fs.unlinkSync(filePath);
    res.json({ ok: true });
  } catch (e) {
    res.status(500).json({ error: "No se pudo eliminar la imagen." });
  }
});

// ─────────────────────────────────────────────────────────────────────────────
//  FRONTEND ESTÁTICO
// ─────────────────────────────────────────────────────────────────────────────

if (fs.existsSync(BUILD_DIR)) {
  app.use(express.static(BUILD_DIR));
  app.get(/^(?!\/api|\/uploads).*/, (req, res) => {
    res.sendFile(path.join(BUILD_DIR, "index.html"));
  });
}

// ── Manejo de errores multer ──────────────────────────────────────────────────
app.use((err, req, res, next) => {
  if (err instanceof multer.MulterError) {
    if (err.code === "LIMIT_FILE_SIZE") return res.status(400).json({ error: "La imagen es demasiado grande. Máximo 5MB." });
    return res.status(400).json({ error: `Error al subir archivo: ${err.message}` });
  }
  if (err && err.message && err.message.includes("Formato")) return res.status(400).json({ error: err.message });
  next(err);
});

// ─────────────────────────────────────────────────────────────────────────────
//  INICIAR SERVIDOR
// ─────────────────────────────────────────────────────────────────────────────
app.listen(PORT, () => {
  console.log("");
  console.log("  ╔══════════════════════════════════════════════════╗");
  console.log("  ║      Inventario Pro — Sistema Unificado          ║");
  console.log(`  ║      http://localhost:${PORT}                       ║`);
  console.log("  ╚══════════════════════════════════════════════════╝");
  console.log("");
  console.log(`  Backend API  : http://localhost:${PORT}/api/`);
  console.log(`  Base de datos: MongoDB Atlas (persistente)`);
  console.log(`  Imágenes     : http://localhost:${PORT}/uploads/`);
  console.log("");
});
