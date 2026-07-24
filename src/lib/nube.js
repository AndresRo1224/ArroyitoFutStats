// Cliente de la nube. Habla con la API en Vercel (que a su vez usa MongoDB Atlas).
// Si no hay URL configurada, la app funciona 100% local y estas funciones lo saben.

import { API_BASE } from "../config";

const K_API = "canchita:api";     // override de la URL, editable en Ajustes
const K_ADMIN = "canchita:admin"; // PIN de administrador para guardar datos
const K_PINS = "canchita:pins";   // PINs de fotos en modo local (sin nube)
const K_VISTOS = "canchita:pines-vistos"; // PINs que se generaron desde ESTE teléfono

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

// Todo en una sola llamada (y una sola conexión a Atlas).
export const obtenerTodo = () => pedir("/api/todo");
export const obtenerDatos = () => pedir("/api/datos");
export const obtenerFotos = () => pedir("/api/fotos");
export const obtenerBanners = () => pedir("/api/banners");
export const obtenerVotos = () => pedir("/api/votos");

// Vota por el MVP de un partido. Lanza Error si el PIN es incorrecto o cerró la votación.
export const votarMVP = (partidoId, votanteId, pin, votadoId) =>
  pedir("/api/votos", { method: "POST", body: JSON.stringify({ partidoId, votanteId, pin, votadoId }) });

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

// Elige el banner de perfil de un jugador (verificado con su PIN personal).
export const elegirBanner = (jugadorId, banner, pin) =>
  pedir("/api/banners", { method: "POST", body: JSON.stringify({ jugadorId, banner, pin }) });

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

// --- Libreta del administrador ---
// El servidor solo guarda el hash del PIN, así que no se puede consultar después.
// Para poder repartirlos, este teléfono anota los PIN que él mismo generó.
export function pinesRecordados() {
  try { return JSON.parse(local.leer(K_VISTOS) || "{}"); } catch { return {}; }
}
function recordarPin(jugadorId, pin) {
  const v = pinesRecordados();
  v[jugadorId] = pin;
  local.escribir(K_VISTOS, JSON.stringify(v));
}
export function olvidarPin(jugadorId) {
  const v = pinesRecordados();
  delete v[jugadorId];
  local.escribir(K_VISTOS, JSON.stringify(v));
}

// Qué jugadores ya tienen PIN en la nube (solo los ids, nunca el PIN).
export const quienesTienenPin = () => pedir("/api/pines");

// Genera el PIN personal de un jugador. Devuelve el PIN en claro una sola vez,
// para que el administrador se lo pase a esa persona. Sirve con y sin nube.
export async function generarPin(jugadorId) {
  let pin;
  if (nubeActiva()) {
    const r = await generarPinJugador(jugadorId);
    pin = r.pin;
  } else {
    const pins = pinsLocales();
    pin = String(Math.floor(1000 + Math.random() * 9000));
    pins[jugadorId] = pin;
    local.escribir(K_PINS, JSON.stringify(pins));
  }
  recordarPin(jugadorId, pin);
  return pin;
}

// Al sacar a alguien de la nómina se borra su PIN (y su foto en la nube).
export async function borrarPin(jugadorId) {
  olvidarPin(jugadorId);
  if (nubeActiva()) {
    try { await borrarPinJugador(jugadorId); } catch { /* mejor esfuerzo */ }
    return;
  }
  const pins = pinsLocales();
  delete pins[jugadorId];
  local.escribir(K_PINS, JSON.stringify(pins));
}

// Verifica el PIN personal en modo local. Lanza Error si no coincide.
function verificarPinLocal(jugadorId, pin) {
  const pins = pinsLocales();
  if (!pins[jugadorId]) {
    throw new Error("Este jugador todavía no tiene PIN. Pídeselo al administrador del grupo.");
  }
  if (pins[jugadorId] !== String(pin)) {
    throw new Error("PIN incorrecto. Ese perfil solo lo edita su dueño.");
  }
}

// Sube (o cambia) la foto de un jugador. Exige el PIN que le dio el administrador.
// Lanza un Error si el PIN no coincide o si el jugador todavía no tiene PIN.
export async function subirFoto(jugadorId, data, pin) {
  if (nubeActiva()) {
    await pedir("/api/fotos", { method: "POST", body: JSON.stringify({ jugadorId, data, pin }) });
    return;
  }
  verificarPinLocal(jugadorId, pin);
}

// Guarda el banner elegido (verificado con el PIN personal). Sirve con y sin nube.
export async function guardarBanner(jugadorId, banner, pin) {
  if (nubeActiva()) {
    await elegirBanner(jugadorId, banner, pin);
    return;
  }
  verificarPinLocal(jugadorId, pin);
}
