// Cliente de la nube. Habla con la API en Vercel (que a su vez usa MongoDB Atlas).
// Si no hay URL configurada, la app funciona 100% local y estas funciones lo saben.

import { API_BASE } from "../config";

const K_API = "canchita:api";     // override de la URL, editable en Ajustes
const K_TOKEN = "canchita:token"; // token de sesión de administrador (NO el PIN)
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

// --- Sesión de administrador por token firmado (no se guarda el PIN) ---
function guardarToken(t) { local.escribir(K_TOKEN, t || ""); }
export function salirAdmin() { local.escribir(K_TOKEN, ""); }
export function adminAutorizado() {
  const t = local.leer(K_TOKEN);
  if (!t) return false;
  try {
    const p = JSON.parse(atob(t.split(".")[1].replace(/-/g, "+").replace(/_/g, "/")));
    return p.exp * 1000 > Date.now();
  } catch { return false; }
}
function cabeceraAdmin() {
  const t = local.leer(K_TOKEN);
  return t ? { Authorization: "Bearer " + t } : {};
}

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
  pedir("/api/datos", { method: "PUT", headers: cabeceraAdmin(), body: JSON.stringify(datos) });

export const probarConexion = () => pedir("/api/ping");

// ¿Hay PIN de administrador definido? (si no, la nómina está abierta)
export const adminRequerido = () => pedir("/api/admin");

// Comprueba el PIN de administrador; si es correcto, guarda el token de sesión.
// Lanza Error si es incorrecto.
export async function verificarAdmin(pin) {
  const r = await pedir("/api/admin", { method: "POST", body: JSON.stringify({ pin }) });
  if (r && r.token) guardarToken(r.token);
  return r;
}

// Define o cambia el PIN de administrador (pinActual solo si ya había uno).
// Devuelve y guarda un token de sesión nuevo.
export async function definirAdmin(pinNuevo, pinActual) {
  const r = await pedir("/api/admin", { method: "PUT", body: JSON.stringify({ pinNuevo, pinActual }) });
  if (r && r.token) guardarToken(r.token);
  return r;
}

// Guarda el perfil (banner y/o frase) de un jugador con su PIN personal.
export const elegirBanner = (jugadorId, banner, frase, pin) =>
  pedir("/api/banners", { method: "POST", body: JSON.stringify({ jugadorId, banner, frase, pin }) });

// Genera (o regenera) el PIN personal de un jugador. Devuelve { pin } en claro
// una sola vez, para que el administrador se lo pase a esa persona.
export const generarPinJugador = (jugadorId) =>
  pedir("/api/pines", { method: "POST", headers: cabeceraAdmin(), body: JSON.stringify({ jugadorId }) });

// Borra el PIN y la foto de un jugador (al sacarlo de la nómina).
export const borrarPinJugador = (jugadorId) =>
  pedir(`/api/pines?jugadorId=${encodeURIComponent(jugadorId)}`, { method: "DELETE", headers: cabeceraAdmin() });

// --- PINes en modo local (sin nube). Misma lógica que en el servidor. ---
function pinsLocales() {
  try { return JSON.parse(local.leer(K_PINS) || "{}"); } catch { return {}; }
}

// Qué jugadores ya tienen PIN en la nube (solo los ids, nunca el PIN).
export const quienesTienenPin = () => pedir("/api/pines");

// Genera el PIN personal de un jugador. Devuelve el PIN en claro una sola vez.
// Por seguridad NO se guarda en el navegador: quien lo genera debe repartirlo
// en el momento (o regenerarlo). Sirve con y sin nube.
export async function generarPin(jugadorId) {
  if (nubeActiva()) {
    const r = await generarPinJugador(jugadorId);
    return r.pin;
  }
  const pins = pinsLocales();
  const pin = String(Math.floor(100000 + Math.random() * 900000)); // 6 dígitos
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

// Guarda el perfil (banner y frase) con el PIN personal. Sirve con y sin nube.
export async function guardarBanner(jugadorId, banner, frase, pin) {
  if (nubeActiva()) {
    await elegirBanner(jugadorId, banner, frase, pin);
    return;
  }
  verificarPinLocal(jugadorId, pin);
}
