// Utilidades compartidas por las funciones serverless de Vercel.
// La app (APK o web) le pega a estas rutas; ellas hablan con MongoDB Atlas.

import { MongoClient } from "mongodb";
import crypto from "crypto";

// La conexión se cachea en el ámbito global para reutilizarla entre invocaciones
// "calientes" de la función (patrón recomendado en serverless).
let promesaCliente = globalThis._canchitaMongo;

export async function getDb() {
  const uri = process.env.MONGODB_URI;
  if (!uri) throw new Error("Falta la variable de entorno MONGODB_URI.");
  if (!promesaCliente) {
    promesaCliente = new MongoClient(uri, { maxPoolSize: 5 }).connect();
    globalThis._canchitaMongo = promesaCliente;
  }
  const cliente = await promesaCliente;
  return cliente.db(process.env.MONGODB_DB || "canchita");
}

// CORS abierto: la app corre desde el WebView de Android (origen capacitor://),
// así que necesita poder llamar a la API desde cualquier origen.
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

// El PIN se guarda como "salt:hash" con scrypt. Nunca se guarda el PIN en claro.
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
