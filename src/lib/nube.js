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

// ¿Hay PIN de administrador definido? (si no, la nómina está abierta)
export const adminRequerido = () => pedir("/api/admin");

// Comprueba un PIN de administrador. Lanza Error si es incorrecto.
export const verificarAdmin = (pin) =>
  pedir("/api/admin", { method: "POST", body: JSON.stringify({ pin }) });

// Define el PIN de administrador o lo cambia (pinActual solo hace falta si ya había uno).
export const definirAdmin = (pinNuevo, pinActual) =>
  pedir("/api/admin", { method: "PUT", body: JSON.stringify({ pinNuevo, pinActual }) });

// Genera (o regenera) el PIN personal de un jugador. Devuelve { pin } en claro
// una sola vez, para que el administrador se lo pase a esa persona.
export const generarPinJugador = (jugadorId) =>
  pedir("/api/pines", {
    method: "POST",
    headers: adminPin() ? { "x-admin-pin": adminPin() } : {},
    body: JSON.stringify({ jugadorId }),
  });

// Borra el PIN y la foto de un jugador (al sacarlo de la nómina).
export const borrarPinJugador = (jugadorId) =>
  pedir(`/api/pines?jugadorId=${encodeURIComponent(jugadorId)}`, {
    method: "DELETE",
    headers: adminPin() ? { "x-admin-pin": adminPin() } : {},
  });

// --- PINes en modo local (sin nube). Misma lógica que en el servidor. ---
function pinsLocales() {
  try { return JSON.parse(local.leer(K_PINS) || "{}"); } catch { return {}; }
}

// Genera el PIN personal de un jugador. Devuelve el PIN en claro una sola vez,
// para que el administrador se lo pase a esa persona. Sirve con y sin nube.
export async function generarPin(jugadorId) {
  if (nubeActiva()) {
    const r = await generarPinJugador(jugadorId);
    return r.pin;
  }
  const pins = pinsLocales();
  const pin = String(Math.floor(1000 + Math.random() * 9000));
  pins[jugadorId] = pin;
  local.escribir(K_PINS, JSON.stringify(pins));
  return pin;
}

// Al sacar a alguien de la nómina se borra su PIN (y su foto en la nube).
export async function borrarPin(jugadorId) {
  if (nubeActiva()) {
    try { await borrarPinJugador(jugadorId); } catch { /* mejor esfuerzo */ }
    return;
  }
  const pins = pinsLocales();
  delete pins[jugadorId];
  local.escribir(K_PINS, JSON.stringify(pins));
}

// Sube (o cambia) la foto de un jugador. Exige el PIN que le dio el administrador.
// Lanza un Error si el PIN no coincide o si el jugador todavía no tiene PIN.
export async function subirFoto(jugadorId, data, pin) {
  if (nubeActiva()) {
    await pedir("/api/fotos", { method: "POST", body: JSON.stringify({ jugadorId, data, pin }) });
    return;
  }
  const pins = pinsLocales();
  if (!pins[jugadorId]) {
    throw new Error("Este jugador todavía no tiene PIN. Pídeselo al administrador del grupo.");
  }
  if (pins[jugadorId] !== String(pin)) {
    throw new Error("PIN incorrecto. Esa foto solo la puede cambiar su dueño.");
  }
}
