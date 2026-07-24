// Utilidades compartidas por las funciones serverless de Vercel.
// La app (APK o web) le pega a estas rutas; ellas hablan con MongoDB Atlas.

import { MongoClient } from "mongodb";
import crypto from "crypto";

// La conexión se cachea en el ámbito global para reutilizarla entre invocaciones
// "calientes" de la función. maxPoolSize bajo para no agotar el límite de Atlas M0.
let promesaCliente = globalThis._canchitaMongo;

export async function getDb() {
  const uri = process.env.MONGODB_URI;
  if (!uri) throw new Error("Falta la variable de entorno MONGODB_URI.");
  if (!promesaCliente) {
    promesaCliente = new MongoClient(uri, {
      maxPoolSize: 1,          // como máximo 1 conexión por contenedor serverless
      minPoolSize: 0,
      maxIdleTimeMS: 10000,    // cierra conexiones ociosas rápido
      serverSelectionTimeoutMS: 8000,
    }).connect();
    globalThis._canchitaMongo = promesaCliente;
  }
  const cliente = await promesaCliente;
  return cliente.db(process.env.MONGODB_DB || "canchita");
}

// CORS abierto: la app corre desde el WebView de Android (origen capacitor://),
// así que necesita poder llamar a la API desde cualquier origen. Las escrituras
// están protegidas por PIN + límite de intentos (ver más abajo).
export function cors(res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET,POST,PUT,DELETE,OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, x-admin-pin");
}

// Vercel normalmente ya entrega req.body parseado; si llega como texto, lo parseamos.
export function leerBody(req) {
  if (!req.body) return {};
  if (typeof req.body === "string") {
    try { return JSON.parse(req.body); } catch { return {}; }
  }
  return req.body;
}

export function clienteIp(req) {
  const xff = req.headers["x-forwarded-for"];
  if (xff) return String(xff).split(",")[0].trim();
  return (req.socket && req.socket.remoteAddress) || "desconocido";
}

// --- PIN: siempre como hash scrypt "salt:hash", nunca en claro ---

// PIN personal de 6 dígitos aleatorio (1.000.000 de combinaciones).
export function generarPin() {
  return String(crypto.randomInt(100000, 1000000));
}

export function hashPin(pin) {
  const salt = crypto.randomBytes(16).toString("hex");
  const hash = crypto.scryptSync(String(pin), salt, 32).toString("hex");
  return `${salt}:${hash}`;
}

export function verificarPin(pin, guardado) {
  if (!guardado || !guardado.includes(":")) return false;
  const [salt, hash] = guardado.split(":");
  const calc = crypto.scryptSync(String(pin), salt, 32).toString("hex");
  const a = Buffer.from(hash, "hex");
  const b = Buffer.from(calc, "hex");
  return a.length === b.length && crypto.timingSafeEqual(a, b);
}

// La llave maestra (variable de entorno ADMIN_PIN) es la puerta de emergencia del
// administrador: salta el límite de intentos, así un atacante no puede dejarlo
// afuera con un bloqueo (DoS). Manténla larga y secreta.
export const esMaestra = (pin) => {
  const m = process.env.ADMIN_PIN;
  return !!m && String(pin || "") === String(m);
};

// ¿Quien manda esta petición es el administrador?
// { configurado, ok }. Si no hay PIN configurado, el grupo está abierto.
// ADMIN_PIN (variable de entorno) sigue funcionando como llave maestra de rescate.
export async function revisarAdmin(db, pin) {
  const maestra = process.env.ADMIN_PIN;
  if (maestra && String(pin || "") === String(maestra)) return { configurado: true, ok: true };
  const doc = await db.collection("config").findOne({ _id: "admin" });
  if (!doc || !doc.pinHash) return { configurado: false, ok: true };
  return { configurado: true, ok: verificarPin(pin, doc.pinHash) };
}

// --- Límite de intentos (anti fuerza bruta) ---
// Se cuenta por IP y por objetivo (jugador o "admin"). Tras `umbral` fallos en la
// ventana, se bloquea esa llave durante `bloqueoMs`. La colección "seguridad" tiene
// un índice TTL sobre `expira` para autolimpiarse.
const UMBRAL = 6, VENTANA_MS = 10 * 60 * 1000, BLOQUEO_MS = 15 * 60 * 1000;

// Devuelve segundos restantes de bloqueo (0 si no está bloqueado).
export async function verBloqueo(db, llaves) {
  const now = Date.now();
  const docs = await db.collection("seguridad").find({ _id: { $in: llaves } }).toArray();
  let max = 0;
  docs.forEach((d) => { if (d.bloqueoHasta && d.bloqueoHasta > now) max = Math.max(max, d.bloqueoHasta - now); });
  return Math.ceil(max / 1000);
}

export async function sumarFallos(db, llaves) {
  const now = Date.now();
  const col = db.collection("seguridad");
  for (const llave of llaves) {
    const d = await col.findOne({ _id: llave });
    const dentro = d && d.desde && now - d.desde < VENTANA_MS;
    const fallos = (dentro ? d.fallos || 0 : 0) + 1;
    const set = { fallos, desde: dentro ? d.desde : now, expira: new Date(now + BLOQUEO_MS) };
    if (fallos >= UMBRAL) set.bloqueoHasta = now + BLOQUEO_MS;
    await col.updateOne({ _id: llave }, { $set: set }, { upsert: true });
  }
}

export async function limpiarIntentos(db, llaves) {
  try { await db.collection("seguridad").deleteMany({ _id: { $in: llaves } }); } catch {}
}

// Envuelve la verificación de un PIN con el límite de intentos.
// `verificar()` debe devolver true/false. Devuelve { ok, bloqueo } donde
// bloqueo son los segundos restantes si está bloqueado.
export async function conLimite(db, req, objetivo, verificar) {
  const llaves = [`ip:${clienteIp(req)}`, `obj:${objetivo}`];
  const bloqueo = await verBloqueo(db, llaves);
  if (bloqueo > 0) return { ok: false, bloqueo };
  const ok = await verificar();
  if (ok) await limpiarIntentos(db, llaves);
  else await sumarFallos(db, llaves);
  return { ok, bloqueo: 0 };
}
