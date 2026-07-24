// GET  /api/fotos  → { [idJugador]: "data:image/jpeg;base64,..." }  (todas las fotos)
// POST /api/fotos  → body { jugadorId, data, pin }
//
// El PIN NO se fija aquí: lo genera el administrador al agregar al jugador (ver
// api/pines.js) y se guarda en la colección "pines". Así nadie puede "reservar"
// la foto de otro subiéndola primero: si no tienes el PIN que te dio el admin,
// no puedes subir nada a nombre de esa persona.

import { getDb, cors, leerBody, verificarPin, conLimite, idValido, pinValido, esTexto, LIM, auditar } from "./_db.js";

export default async function handler(req, res) {
  cors(req, res);
  if (req.method === "OPTIONS") return res.status(200).end();

  try {
    const db = await getDb();
    const col = db.collection("fotos");

    if (req.method === "GET") {
      const docs = await col.find({}, { projection: { data: 1 } }).toArray();
      const salida = {};
      docs.forEach((d) => { if (d.data) salida[d._id] = d.data; });
      return res.status(200).json(salida);
    }

    if (req.method === "POST") {
      const { jugadorId, data, pin } = leerBody(req);
      if (!idValido(jugadorId) || !pinValido(pin)) {
        return res.status(400).json({ error: "Datos inválidos." });
      }
      if (!esTexto(data, LIM.foto) || !/^data:image\//.test(data)) {
        return res.status(400).json({ error: "La foto no es válida o es demasiado grande." });
      }

      const registro = await db.collection("pines").findOne({ _id: jugadorId });
      if (!registro || !registro.pinHash) {
        return res.status(403).json({
          error: "Este jugador todavía no tiene PIN. Pídeselo al administrador del grupo.",
        });
      }
      const r = await conLimite(db, req, `foto:${jugadorId}`, () => verificarPin(pin, registro.pinHash));
      if (r.bloqueo) return res.status(429).json({ error: `Demasiados intentos. Espera ${Math.ceil(r.bloqueo / 60)} min.` });
      if (!r.ok) return res.status(401).json({ error: "PIN incorrecto. Esa foto solo la puede cambiar su dueño." });

      await col.updateOne(
        { _id: jugadorId },
        { $set: { data, actualizado: new Date() } },
        { upsert: true }
      );
      await auditar(db, "foto", req, { jugadorId });
      return res.status(200).json({ ok: true });
    }

    return res.status(405).json({ error: "Método no permitido." });
  } catch (e) {
    return res.status(500).json({ error: "Error del servidor: " + e.message });
  }
}
