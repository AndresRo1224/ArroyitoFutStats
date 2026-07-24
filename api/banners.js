// Banner de perfil de cada jugador. Es solo el id de un diseño (no una imagen),
// así que pesa nada. Lo elige el propio jugador con su PIN personal, igual que la foto.
//
// GET  /api/banners → { [jugadorId]: "idDiseño" }
// POST /api/banners { jugadorId, banner, pin }

import { getDb, cors, leerBody, verificarPin, conLimite, idValido, pinValido, esTexto, LIM, auditar } from "./_db.js";

export default async function handler(req, res) {
  cors(req, res);
  if (req.method === "OPTIONS") return res.status(200).end();

  try {
    const db = await getDb();
    const col = db.collection("banners");

    if (req.method === "GET") {
      const docs = await col.find({}, { projection: { banner: 1 } }).toArray();
      const salida = {};
      docs.forEach((d) => { if (d.banner) salida[d._id] = d.banner; });
      return res.status(200).json(salida);
    }

    if (req.method === "POST") {
      const { jugadorId, banner, pin } = leerBody(req);
      if (!idValido(jugadorId) || !pinValido(pin) || !esTexto(banner, LIM.banner) || !/^[a-z]+$/.test(banner)) {
        return res.status(400).json({ error: "Datos inválidos." });
      }
      const registro = await db.collection("pines").findOne({ _id: jugadorId });
      if (!registro || !registro.pinHash) {
        return res.status(403).json({ error: "Este jugador todavía no tiene PIN. Pídeselo al administrador." });
      }
      const r = await conLimite(db, req, `banner:${jugadorId}`, () => verificarPin(pin, registro.pinHash));
      if (r.bloqueo) return res.status(429).json({ error: `Demasiados intentos. Espera ${Math.ceil(r.bloqueo / 60)} min.` });
      if (!r.ok) return res.status(401).json({ error: "PIN incorrecto. Ese perfil solo lo edita su dueño." });
      await col.updateOne(
        { _id: jugadorId },
        { $set: { banner, actualizado: new Date() } },
        { upsert: true }
      );
      await auditar(db, "banner", req, { jugadorId, banner });
      return res.status(200).json({ ok: true });
    }

    return res.status(405).json({ error: "Método no permitido." });
  } catch (e) {
    return res.status(500).json({ error: "Error del servidor: " + e.message });
  }
}
