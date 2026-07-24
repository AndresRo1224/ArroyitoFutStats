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

// CORS restringido. La app nativa (APK) ignora CORS; esto protege a los usuarios
// en navegador: solo se permite la propia app (Vercel), localhost y los orígenes
// de Capacitor/Ionic. Otros sitios web no pueden hacer peticiones con credenciales.
function origenPermitido(origen) {
  if (!origen) return true; // apps nativas / curl no mandan Origin
  return (
    /^https:\/\/[a-z0-9-]+\.vercel\.app$/i.test(origen) ||
    /^https?:\/\/localhost(:\d+)?$/i.test(origen) ||
    /^(capacitor|ionic):\/\/localhost$/i.test(origen)
  );
}

export function cors(req, res) {
  const origen = req.headers.origin;
  if (origenPermitido(origen)) {
    res.setHeader("Access-Control-Allow-Origin", origen || "*");
    res.setHeader("Vary", "Origin");
  }
  res.setHeader("Access-Control-Allow-Methods", "GET,POST,PUT,DELETE,OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, x-admin-pin, Authorization");
  // Cabeceras de seguridad para las respuestas de la API.
  res.setHeader("X-Content-Type-Options", "nosniff");
  res.setHeader("Referrer-Policy", "no-referrer");
  res.setHeader("Cache-Control", "no-store");
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

// --- Validación de entradas (anti inyección NoSQL) ---
// La regla de oro: nada que venga del cliente y se use en un filtro de Mongo puede
// ser un objeto (p. ej. {"$ne":null}); solo strings con forma esperada.
export const esTexto = (v, max = 400) => typeof v === "string" && v.length > 0 && v.length <= max;
export const idValido = (v) => typeof v === "string" && /^[A-Za-z0-9:_-]{1,64}$/.test(v);
export const pinValido = (v) => typeof v === "string" && /^[0-9]{4,12}$/.test(v);
export const fechaValida = (v) => typeof v === "string" && /^\d{4}-\d{2}-\d{2}$/.test(v);

// Fuerza a string un parámetro de query (Vercel puede entregar arreglos).
export const qStr = (v) => (Array.isArray(v) ? v[0] : v) || "";

// Límites de tamaño para no inflar la base ni permitir DoS.
export const LIM = {
  foto: 400 * 1024,     // ~400 KB de dataURL (la app comprime a ~15 KB)
  nombre: 60,
  jugadores: 300,
  partidos: 2000,
  banner: 32,           // id de diseño de la galería
  bannerImg: 600 * 1024, // foto de banner propia (la app comprime a ~40 KB)
};

// El banner es un id de diseño (letras) o una foto propia (data:image, con tope).
export const bannerValido = (v) =>
  typeof v === "string" &&
  ((/^[a-z]+$/.test(v) && v.length <= LIM.banner) ||
    (/^data:image\//.test(v) && v.length <= LIM.bannerImg));

// Saneo estructural de los datos del grupo: reconstruye solo con campos y tipos
// permitidos, descartando cualquier objeto/operador malicioso o basura.
export function sanearDatos(body) {
  // Se exige id válido y nombre de texto; el nombre se RECORTA (no se descarta al
  // jugador por ser largo).
  const jugadores = (Array.isArray(body.jugadores) ? body.jugadores : [])
    .slice(0, LIM.jugadores)
    .filter((j) => j && idValido(j.id) && typeof j.nombre === "string" && j.nombre.trim())
    .map((j) => ({ id: j.id, nombre: j.nombre.slice(0, LIM.nombre) }));

  const numMap = (o) => {
    const out = {};
    if (o && typeof o === "object" && !Array.isArray(o)) {
      for (const k of Object.keys(o)) {
        if (idValido(k) && Number.isFinite(o[k])) out[k] = Math.max(0, Math.min(99, Math.trunc(o[k])));
      }
    }
    return out;
  };
  const partidos = (Array.isArray(body.partidos) ? body.partidos : [])
    .slice(0, LIM.partidos)
    .filter((p) => p && idValido(p.id) && fechaValida(p.fecha) && Array.isArray(p.att))
    .map((p) => ({
      id: p.id,
      fecha: p.fecha,
      att: p.att.filter(idValido).slice(0, LIM.jugadores),
      g: numMap(p.g),
      a: numMap(p.a),
      creado: Number.isFinite(p.creado) ? p.creado : Date.now(),
    }));

  const grupo = esTexto(body.grupo, LIM.nombre) ? body.grupo.slice(0, LIM.nombre) : "ArroyitoFutStats";
  return { grupo, jugadores, partidos };
}

// --- Sesiones: token firmado (HMAC-SHA256), sin dependencias externas ---
function claveFirma() {
  return process.env.SESSION_SECRET ||
    crypto.createHash("sha256").update("arroyito:" + (process.env.MONGODB_URI || "sin-uri")).digest("hex");
}
const b64url = (buf) => Buffer.from(buf).toString("base64").replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
const b64urlJson = (o) => b64url(JSON.stringify(o));

export function firmarToken(payload, segundos = 12 * 3600) {
  const cuerpo = { ...payload, exp: Math.floor(Date.now() / 1000) + segundos };
  const h = b64urlJson({ alg: "HS256", typ: "JWT" });
  const b = b64urlJson(cuerpo);
  const firma = b64url(crypto.createHmac("sha256", claveFirma()).update(`${h}.${b}`).digest());
  return `${h}.${b}.${firma}`;
}

export function verificarToken(token) {
  if (typeof token !== "string" || token.split(".").length !== 3) return null;
  const [h, b, s] = token.split(".");
  const esperado = b64url(crypto.createHmac("sha256", claveFirma()).update(`${h}.${b}`).digest());
  const a = Buffer.from(s), c = Buffer.from(esperado);
  if (a.length !== c.length || !crypto.timingSafeEqual(a, c)) return null;
  let payload;
  try { payload = JSON.parse(Buffer.from(b.replace(/-/g, "+").replace(/_/g, "/"), "base64").toString()); }
  catch { return null; }
  if (!payload.exp || payload.exp * 1000 < Date.now()) return null;
  return payload;
}

export function tokenDe(req) {
  const a = req.headers["authorization"] || "";
  return a.startsWith("Bearer ") ? a.slice(7) : "";
}

// ¿La petición está autorizada como admin por token o por llave maestra?
// (El PIN por cabecera se maneja aparte, con rate-limit, en cada endpoint.)
export function adminPorTokenOMaestra(req) {
  const p = verificarToken(tokenDe(req));
  if (p && p.rol === "admin") return true;
  if (esMaestra(req.headers["x-admin-pin"])) return true;
  return false;
}

// Registro de auditoría de escrituras (para forense). Se autolimpia con TTL.
export async function auditar(db, accion, req, detalle) {
  try {
    await db.collection("auditoria").insertOne({
      accion,
      ip: clienteIp(req),
      detalle: detalle || null,
      fecha: new Date(),
      expira: new Date(Date.now() + 90 * 24 * 3600 * 1000),
    });
  } catch { /* la auditoría nunca debe romper la operación */ }
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
