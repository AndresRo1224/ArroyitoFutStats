// Reseteo del PIN personal por correo (código de 6 dígitos, vence en 10 min).
//
// POST /api/reset { jugadorId }                        → envía el código al correo del jugador
// POST /api/reset { jugadorId, codigo, pinNuevo }      → verifica el código y fija el PIN nuevo
//
// No expone correos completos. Con límite de intentos para evitar abuso.

import { getDb, cors, leerBody, idValido, pinValido, hashPin, verificarPin, generarCodigo, conLimite } from "./_db.js";
import { enviarCorreo, correoCodigoHtml, enmascararCorreo } from "./_correo.js";

const VENCE_MS = 10 * 60 * 1000;   // el código dura 10 minutos
const REENVIO_MS = 60 * 1000;      // no se puede pedir otro código antes de 60s

export default async function handler(req, res) {
  cors(req, res);
  if (req.method === "OPTIONS") return res.status(200).end();
  if (req.method !== "POST") return res.status(405).json({ error: "Método no permitido." });

  try {
    const db = await getDb();
    const { jugadorId, codigo, pinNuevo } = leerBody(req);
    if (!idValido(jugadorId)) return res.status(400).json({ error: "Jugador inválido." });

    const pines = db.collection("pines");
    const resets = db.collection("reset");

    // --- Paso 2: confirmar el código y cambiar el PIN ---
    if (codigo !== undefined || pinNuevo !== undefined) {
      if (!/^\d{6}$/.test(String(codigo || "")) || !pinValido(pinNuevo)) {
        return res.status(400).json({ error: "Código o PIN inválido." });
      }
      const doc = await resets.findOne({ _id: jugadorId });
      if (!doc || !doc.codigoHash || doc.expira < Date.now()) {
        return res.status(400).json({ error: "El código venció. Pide uno nuevo." });
      }
      const r = await conLimite(db, req, `reset:${jugadorId}`, () => verificarPin(codigo, doc.codigoHash));
      if (r.bloqueo) return res.status(429).json({ error: `Demasiados intentos. Espera ${Math.ceil(r.bloqueo / 60)} min.` });
      if (!r.ok) return res.status(401).json({ error: "Código incorrecto." });

      await pines.updateOne({ _id: jugadorId }, { $set: { pinHash: hashPin(pinNuevo), actualizado: new Date() } }, { upsert: true });
      await resets.deleteOne({ _id: jugadorId });
      return res.status(200).json({ ok: true });
    }

    // --- Paso 1: enviar el código al correo del jugador ---
    const registro = await pines.findOne({ _id: jugadorId });
    if (!registro || !registro.email) {
      return res.status(200).json({ ok: false, sinCorreo: true });
    }
    // Anti-reenvío: si ya se mandó un código hace poco, no manda otro.
    const previo = await resets.findOne({ _id: jugadorId });
    if (previo && previo.enviado && Date.now() - previo.enviado < REENVIO_MS) {
      return res.status(200).json({ ok: true, correo: enmascararCorreo(registro.email), yaEnviado: true });
    }

    const estado = await db.collection("estado").findOne({ _id: "principal" }, { projection: { jugadores: 1 } });
    const nombre = (estado?.jugadores || []).find((j) => j.id === jugadorId)?.nombre || "";

    const codigoNuevo = generarCodigo();
    await resets.updateOne(
      { _id: jugadorId },
      { $set: { codigoHash: hashPin(codigoNuevo), expira: Date.now() + VENCE_MS, enviado: Date.now(), expiraTTL: new Date(Date.now() + VENCE_MS + 60000) } },
      { upsert: true }
    );
    await enviarCorreo(registro.email, nombre, "Tu código para cambiar el PIN — ArroyitoFutStats", correoCodigoHtml(nombre, codigoNuevo));
    return res.status(200).json({ ok: true, correo: enmascararCorreo(registro.email) });
  } catch (e) {
    return res.status(500).json({ error: "Error del servidor: " + e.message });
  }
}
