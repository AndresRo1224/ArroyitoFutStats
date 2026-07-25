// Cambio del PIN personal por correo. Como candado, el jugador debe confirmar SU
// PIN actual: sin él no se envía nada (así nadie resetea el PIN de otro poniendo un
// correo cualquiera). Escribe su correo en el momento y recibe un código de 6 dígitos
// (vence en 10 min) para poner un PIN nuevo. El correo no se guarda en la app.
//
// POST /api/reset { jugadorId, email, pinActual }    → valida el PIN actual y envía el código
// POST /api/reset { jugadorId, codigo, pinNuevo }    → verifica el código y fija el PIN nuevo

import { getDb, cors, leerBody, idValido, pinValido, correoValido, hashPin, verificarPin, generarCodigo, conLimite, clienteIp, verBloqueo, sumarFallos } from "./_db.js";
import { enviarCorreo, correoCodigoHtml } from "./_correo.js";

const VENCE_MS = 10 * 60 * 1000;   // el código dura 10 minutos
const REENVIO_MS = 60 * 1000;      // no se manda otro código antes de 60s

export default async function handler(req, res) {
  cors(req, res);
  if (req.method === "OPTIONS") return res.status(200).end();
  if (req.method !== "POST") return res.status(405).json({ error: "Método no permitido." });

  try {
    const db = await getDb();
    const { jugadorId, email, pinActual, codigo, pinNuevo } = leerBody(req);
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

    // --- Paso 1: validar el PIN actual y enviar el código al correo escrito ---
    if (!correoValido(email) || !email) return res.status(400).json({ error: "Escribe un correo válido." });
    if (!pinValido(pinActual)) return res.status(400).json({ error: "Escribe tu PIN actual." });

    const registro = await pines.findOne({ _id: jugadorId });
    if (!registro || !registro.pinHash) {
      return res.status(200).json({ ok: false, sinPin: true });
    }

    // Candado: sin el PIN actual correcto no se envía el código. Con límite de intentos
    // (por IP y por jugador) para que este PIN tampoco se pueda adivinar por fuerza bruta.
    const okActual = await conLimite(db, req, `resetpin:${jugadorId}`, () => verificarPin(pinActual, registro.pinHash));
    if (okActual.bloqueo) return res.status(429).json({ error: `Demasiados intentos. Espera ${Math.ceil(okActual.bloqueo / 60)} min.` });
    if (!okActual.ok) return res.status(401).json({ error: "El PIN actual no es correcto." });

    // Anti-abuso: límite de envíos por IP.
    const llaves = [`envio:${clienteIp(req)}`];
    const bloqueo = await verBloqueo(db, llaves);
    if (bloqueo) return res.status(429).json({ error: `Demasiados envíos. Espera ${Math.ceil(bloqueo / 60)} min.` });

    // Anti-reenvío: no manda otro código si acaba de enviar uno.
    const previo = await resets.findOne({ _id: jugadorId });
    if (previo && previo.enviado && Date.now() - previo.enviado < REENVIO_MS) {
      return res.status(200).json({ ok: true, yaEnviado: true });
    }

    const estado = await db.collection("estado").findOne({ _id: "principal" }, { projection: { jugadores: 1 } });
    const nombre = (estado?.jugadores || []).find((j) => j.id === jugadorId)?.nombre || "";

    const codigoNuevo = generarCodigo();
    await resets.updateOne(
      { _id: jugadorId },
      { $set: { codigoHash: hashPin(codigoNuevo), expira: Date.now() + VENCE_MS, enviado: Date.now(), expiraTTL: new Date(Date.now() + VENCE_MS + 60000) } },
      { upsert: true }
    );
    await enviarCorreo(String(email).trim().toLowerCase(), nombre, "Tu código para cambiar el PIN — ArroyitoFutStats", correoCodigoHtml(nombre, codigoNuevo));
    await sumarFallos(db, llaves); // cuenta este envío hacia el límite por IP
    return res.status(200).json({ ok: true });
  } catch (e) {
    return res.status(500).json({ error: "Error del servidor: " + e.message });
  }
}
