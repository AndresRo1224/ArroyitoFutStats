// Cliente de la nube. Habla con la API en Vercel (que a su vez usa MongoDB Atlas).
// Si no hay URL configurada, la app funciona 100% local y estas funciones lo saben.

import { API_BASE } from "../config";

const K_API = "canchita:api";     // override de la URL, editable en Ajustes
const K_ADMIN = "canchita:admin"; // PIN de administrador para guardar datos
const K_PINS = "canchita:pins";   // PINs de fotos en modo local (sin nube)

const local = {
  leer(k) { try { return localStorage.getItem(k); } catch { return null; } },
  escribir(k, v) { try { localStorage.setItem(k, v); } catch {} },
};

export function baseNube() {
  const guardada = local.leer(K_API);
  return String(guardada || API_BASE || "").trim().replace(/\/+$/, "");
}
export const nubeActiva = () => !!baseNube();

export function fijarBaseNube(url) { local.escribir(K_API, String(url || "").trim()); }
export function baseGuardada() { return local.leer(K_API) || ""; }

export function fijarAdminPin(pin) { local.escribir(K_ADMIN, String(pin || "")); }
export function adminPin() { return local.leer(K_ADMIN) || ""; }

async function pedir(ruta, opciones = {}) {
  const b = baseNube();
  if (!b) throw new Error("Sin conexión configurada.");
  const r = await fetch(b + ruta, {
    headers: { "Content-Type": "application/json", ...(opciones.headers || {}) },
    ...opciones,
  });
  let cuerpo = null;
  try { cuerpo = await r.json(); } catch {}
  if (!r.ok) throw new Error((cuerpo && cuerpo.error) || `Error ${r.status}`);
  return cuerpo;
}

export const obtenerDatos = () => pedir("/api/datos");
export const obtenerFotos = () => pedir("/api/fotos");

export const guardarDatos = (datos) =>
  pedir("/api/datos", {
    method: "PUT",
    headers: adminPin() ? { "x-admin-pin": adminPin() } : {},
    body: JSON.stringify(datos),
  });

export const probarConexion = () => pedir("/api/ping");

// Sube (o cambia) la foto de un jugador. En la nube exige el PIN en el servidor;
// en modo local se verifica contra un PIN guardado en el teléfono (anti-bromas).
// Lanza un Error si el PIN no coincide.
export async function subirFoto(jugadorId, data, pin) {
  if (nubeActiva()) {
    await pedir("/api/fotos", { method: "POST", body: JSON.stringify({ jugadorId, data, pin }) });
    return;
  }
  // Modo local
  let pins = {};
  try { pins = JSON.parse(local.leer(K_PINS) || "{}"); } catch {}
  if (pins[jugadorId] && pins[jugadorId] !== String(pin)) {
    throw new Error("PIN incorrecto. Esa foto la protege otra persona.");
  }
  pins[jugadorId] = String(pin);
  local.escribir(K_PINS, JSON.stringify(pins));
}
