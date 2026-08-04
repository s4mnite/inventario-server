const express = require("express");
const cors = require("cors");
const path = require("path");
const fs = require("fs");
require("dotenv").config();

const app = express();
app.use(cors({ origin: "*", methods: ["GET","POST","PUT","DELETE","PATCH","OPTIONS"], allowedHeaders: ["Content-Type","x-admin-user","x-admin-clave"] }));
app.use(express.json());

// ─── MongoDB ──────────────────────────────────────────────────────────────────
const { MongoClient, ObjectId } = require("mongodb");
const MONGO_URI = process.env.MONGODB_URI;
let db;

async function conectarDB() {
  if (!MONGO_URI) { console.log("⚠️  Sin MONGODB_URI, usando memoria"); return; }
  try {
    const client = new MongoClient(MONGO_URI);
    await client.connect();
    db = client.db("inventario");
    console.log("✅ MongoDB conectado");
  } catch (e) {
    console.error("❌ Error MongoDB:", e.message);
  }
}

// ─── Base de datos en memoria (fallback) ──────────────────────────────────────
let usuarios = [
  { nombre: "Admin", usuario: "admin", clave: "admin1234", rol: "gerente", correo: "admin@negocio.cl", blocked: false },
  { nombre: "Empleado 1", usuario: "empleado1", clave: "emp1234", rol: "empleado", correo: "", blocked: false },
];
const codigos = {};

// ─── Middleware auth ──────────────────────────────────────────────────────────
const authAdmin = (req, res, next) => {
  const adminUser = req.headers["x-admin-user"];
  const adminClave = req.headers["x-admin-clave"];
  const user = usuarios.find(u => u.usuario === adminUser && u.clave === adminClave && u.rol === "gerente");
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

app.post("/api/auth/send-code", (req, res) => {
  const { correo } = req.body;
  const codigo = Math.floor(100000 + Math.random() * 900000).toString();
  codigos[correo] = codigo;
  console.log(`📧 Código para ${correo}: ${codigo}`);
  res.json({ ok: true, mensaje: "Código enviado (ver consola del servidor)" });
});

app.post("/api/auth/verify-code", (req, res) => {
  const { correo, codigo } = req.body;
  if (codigos[correo] !== codigo) return res.status(400).json({ error: "Código incorrecto" });
  res.json({ ok: true });
});

app.post("/api/auth/register", (req, res) => {
  const { nombre, usuario, correo, clave, codigo } = req.body;
  if (codigos[correo] !== codigo) return res.status(400).json({ error: "Código incorrecto" });
  if (usuarios.find(u => u.usuario === usuario)) return res.status(400).json({ error: "Usuario ya existe" });
  const nuevoUser = { nombre, usuario, clave, correo, rol: "empleado", blocked: false };
  usuarios.push(nuevoUser);
  delete codigos[correo];
  const { clave: _, ...userSinClave } = nuevoUser;
  res.json({ user: userSinClave });
});

app.post("/api/auth/forgot-password", (req, res) => {
  const { correo } = req.body;
  const user = usuarios.find(u => u.correo === correo);
  if (!user) return res.status(404).json({ error: "Correo no encontrado" });
  const codigo = Math.floor(100000 + Math.random() * 900000).toString();
  codigos[correo] = codigo;
  console.log(`🔑 Código recuperación para ${correo}: ${codigo}`);
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
  const { nombre, rol, correo, nuevaClave } = req.body;
  if (nombre) user.nombre = nombre;
  if (rol) user.rol = rol;
  if (correo !== undefined) user.correo = correo;
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
  const { nombre, usuario, correo, clave, rol } = req.body;
  if (usuarios.find(u => u.usuario === usuario)) return res.status(400).json({ error: "Usuario ya existe" });
  const nuevoUser = { nombre, usuario, clave, correo, rol: rol || "empleado", blocked: false };
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

// ─── PING ─────────────────────────────────────────────────────────────────────
app.get("/ping", (req, res) => res.json({ ok: true }));

// ─── UPLOAD IMÁGENES ──────────────────────────────────────────────────────────
try {
  const multer = require("multer");
  if (!fs.existsSync("uploads")) fs.mkdirSync("uploads");
  const storage = multer.diskStorage({
    destination: (req, file, cb) => cb(null, "uploads/"),
    filename: (req, file, cb) => cb(null, Date.now() + path.extname(file.originalname)),
  });
  const upload = multer({ storage });
  const BASE_URL = process.env.BASE_URL || "http://localhost:3001";
  app.post("/api/productos/upload-imagen", upload.single("imagen"), (req, res) => {
    if (!req.file) return res.status(400).json({ error: "No se recibió imagen" });
    res.json({ url: `${BASE_URL}/uploads/${req.file.filename}` });
  });
  app.use("/uploads", express.static(path.join(__dirname, "uploads")));
  console.log("📁 Upload de imágenes habilitado");
} catch (e) {
  console.log("⚠️  multer no instalado, upload deshabilitado");
}

// ─── START ────────────────────────────────────────────────────────────────────
const PORT = process.env.PORT || 3001;
conectarDB().then(() => {
  app.listen(PORT, () => console.log(`✅ Servidor corriendo en http://localhost:${PORT}`));
});
