// PIN de administrador. Vive en la base (colección "config", doc "admin"), así que
// se puede cambiar desde la app sin redesplegar.
//
// GET  /api/admin → { configurado: bool }   ¿ya hay PIN definido?
// POST /api/admin → { pin }                 verifica el PIN (200 / 401)
// PUT  /api/admin → { pinNuevo, pinActual } define o cambia el PIN
//        · si todavía no hay ninguno, lo crea sin pedir pinActual
//        · si ya hay, exige el pinActual correcto
//
// La variable de entorno ADMIN_PIN, si existe, sigue sirviendo como llave maestra
// de rescate (por si se olvida el PIN guardado en la base).

import { getDb, cors, leerBody, hashPin, revisarAdmin } from "./_db.js";

export default async function handler(req, res) {
  cors(res);
  if (req.method === "OPTIONS") return res.status(200).end();

  try {
    const db = await getDb();
    const col = db.collection("config");

    if (req.method === "GET") {
      const doc = await col.findOne({ _id: "admin" });
      const configurado = !!(doc && doc.pinHash) || !!process.env.ADMIN_PIN;
      // "requerido" se conserva por compatibilidad con versiones anteriores de la app.
      return res.status(200).json({ configurado, requerido: configurado });
    }

    if (req.method === "POST") {
      const { pin } = leerBody(req);
      const r = await revisarAdmin(db, pin);
      if (!r.configurado) return res.status(200).json({ ok: true, configurado: false });
      if (!r.ok) return res.status(401).json({ error: "PIN incorrecto." });
      return res.status(200).json({ ok: true, configurado: true });
    }

    if (req.method === "PUT") {
      const { pinNuevo, pinActual } = leerBody(req);
      if (!pinNuevo || String(pinNuevo).length < 4) {
        return res.status(400).json({ error: "El PIN debe tener al menos 4 dígitos." });
      }
      const r = await revisarAdmin(db, pinActual);
      if (r.configurado && !r.ok) {
        return res.status(401).json({ error: "El PIN actual es incorrecto." });
      }
      await col.updateOne(
        { _id: "admin" },
        { $set: { pinHash: hashPin(pinNuevo), actualizado: new Date() } },
        { upsert: true }
      );
      return res.status(200).json({ ok: true });
    }

    return res.status(405).json({ error: "Método no permitido." });
  } catch (e) {
    return res.status(500).json({ error: "Error del servidor: " + e.message });
  }
}
