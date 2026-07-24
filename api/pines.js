// PIN personal de cada jugador: es lo que le permite subir SU foto y nada más.
// Lo genera el servidor cuando el administrador agrega a alguien a la nómina, y
// se devuelve en claro una sola vez para que el admin se lo pase a esa persona.
// Después solo queda el hash: no se puede consultar, únicamente regenerar.
//
// POST   /api/pines  { jugadorId }        (cabecera x-admin-pin) → { pin }  genera o regenera
// DELETE /api/pines?jugadorId=xxx         (cabecera x-admin-pin) → borra su PIN y su foto

import { getDb, cors, leerBody, hashPin, generarPin, revisarAdmin, conLimite, esMaestra } from "./_db.js";

export default async function handler(req, res) {
  cors(res);
  if (req.method === "OPTIONS") return res.status(200).end();

  try {
    const db = await getDb();
    const yaHay = (await revisarAdmin(db, "")).configurado;
    if (yaHay && !esMaestra(req.headers["x-admin-pin"])) {
      const r = await conLimite(db, req, "admin", async () => (await revisarAdmin(db, req.headers["x-admin-pin"])).ok);
      if (r.bloqueo) return res.status(429).json({ error: `Demasiados intentos. Espera ${Math.ceil(r.bloqueo / 60)} min.` });
      if (!r.ok) return res.status(401).json({ error: "PIN de administrador incorrecto." });
    }

    // Solo dice QUIÉNES ya tienen PIN, nunca cuál es.
    if (req.method === "GET") {
      const docs = await db.collection("pines").find({}, { projection: { _id: 1 } }).toArray();
      return res.status(200).json({ conPin: docs.map((d) => d._id) });
    }

    if (req.method === "POST") {
      const { jugadorId } = leerBody(req);
      if (!jugadorId) return res.status(400).json({ error: "Falta el jugador." });
      const pin = generarPin();
      await db.collection("pines").updateOne(
        { _id: jugadorId },
        { $set: { pinHash: hashPin(pin), actualizado: new Date() } },
        { upsert: true }
      );
      return res.status(200).json({ ok: true, pin });
    }

    if (req.method === "DELETE") {
      const jugadorId = req.query && req.query.jugadorId;
      if (!jugadorId) return res.status(400).json({ error: "Falta el jugador." });
      await db.collection("pines").deleteOne({ _id: jugadorId });
      await db.collection("fotos").deleteOne({ _id: jugadorId });
      await db.collection("banners").deleteOne({ _id: jugadorId });
      // También sus votos (los que emitió y los que recibió).
      await db.collection("votos").deleteMany({ $or: [{ votanteId: jugadorId }, { votadoId: jugadorId }] });
      return res.status(200).json({ ok: true });
    }

    return res.status(405).json({ error: "Método no permitido." });
  } catch (e) {
    return res.status(500).json({ error: "Error del servidor: " + e.message });
  }
}
