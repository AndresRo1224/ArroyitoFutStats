// GET  /api/fotos  → { [idJugador]: "data:image/jpeg;base64,..." }  (todas las fotos)
// POST /api/fotos  → body { jugadorId, data, pin }
//
// La primera vez que alguien sube su foto, el PIN que elige queda asociado a ella.
// Para cambiarla después hay que enviar ese mismo PIN. Así nadie sube la foto por otro.

import { getDb, cors, leerBody, hashPin, verificarPin } from "./_db.js";

export default async function handler(req, res) {
  cors(res);
  if (req.method === "OPTIONS") return res.status(200).end();

  try {
    const col = (await getDb()).collection("fotos");

    if (req.method === "GET") {
      const docs = await col.find({}, { projection: { data: 1 } }).toArray();
      const salida = {};
      docs.forEach((d) => { if (d.data) salida[d._id] = d.data; });
      return res.status(200).json(salida);
    }

    if (req.method === "POST") {
      const { jugadorId, data, pin } = leerBody(req);
      if (!jugadorId || !data || !pin) {
        return res.status(400).json({ error: "Faltan datos, foto o PIN." });
      }
      if (String(pin).length < 4) {
        return res.status(400).json({ error: "El PIN debe tener al menos 4 dígitos." });
      }

      const existente = await col.findOne({ _id: jugadorId });
      if (existente && existente.pinHash) {
        // Ya hay foto protegida: exige el PIN correcto para cambiarla.
        if (!verificarPin(pin, existente.pinHash)) {
          return res.status(401).json({ error: "PIN incorrecto. Esa foto la protege otra persona." });
        }
        await col.updateOne({ _id: jugadorId }, { $set: { data, actualizado: new Date() } });
      } else {
        // Primera vez: se guarda la foto y se fija el PIN.
        await col.updateOne(
          { _id: jugadorId },
          { $set: { data, pinHash: hashPin(pin), actualizado: new Date() } },
          { upsert: true }
        );
      }
      return res.status(200).json({ ok: true });
    }

    return res.status(405).json({ error: "Método no permitido." });
  } catch (e) {
    return res.status(500).json({ error: "Error del servidor: " + e.message });
  }
}
