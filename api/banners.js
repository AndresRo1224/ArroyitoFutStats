// Perfil personalizable de cada jugador: banner (diseño o foto propia) y una frase.
// Lo edita el propio jugador con su PIN personal (el mismo de la foto).
//
// GET  /api/banners → { banners: {id: bannerVal}, frases: {id: frase} }
// POST /api/banners { jugadorId, banner?, frase?, pin }  (al menos uno de banner/frase)

import { getDb, cors, leerBody, verificarPin, conLimite, idValido, pinValido, bannerValido, fraseValida, auditar } from "./_db.js";

export default async function handler(req, res) {
  cors(req, res);
  if (req.method === "OPTIONS") return res.status(200).end();

  try {
    const db = await getDb();
    const col = db.collection("banners");

    if (req.method === "GET") {
      const docs = await col.find({}, { projection: { banner: 1, frase: 1 } }).toArray();
      const banners = {}, frases = {};
      docs.forEach((d) => {
        if (d.banner) banners[d._id] = d.banner;
        if (d.frase) frases[d._id] = d.frase;
      });
      return res.status(200).json({ banners, frases });
    }

    if (req.method === "POST") {
      const { jugadorId, banner, frase, pin } = leerBody(req);
      if (!idValido(jugadorId) || !pinValido(pin)) {
        return res.status(400).json({ error: "Datos inválidos." });
      }
      const set = { actualizado: new Date() };
      if (banner !== undefined) {
        if (!bannerValido(banner)) return res.status(400).json({ error: "Banner inválido o imagen muy grande." });
        set.banner = banner;
      }
      if (frase !== undefined) {
        if (!fraseValida(frase)) return res.status(400).json({ error: "La frase es demasiado larga." });
        set.frase = String(frase).slice(0, 80);
      }
      if (set.banner === undefined && set.frase === undefined) {
        return res.status(400).json({ error: "No hay nada que guardar." });
      }

      const registro = await db.collection("pines").findOne({ _id: jugadorId });
      if (!registro || !registro.pinHash) {
        return res.status(403).json({ error: "Este jugador todavía no tiene PIN. Pídeselo al administrador." });
      }
      const r = await conLimite(db, req, `banner:${jugadorId}`, () => verificarPin(pin, registro.pinHash));
      if (r.bloqueo) return res.status(429).json({ error: `Demasiados intentos. Espera ${Math.ceil(r.bloqueo / 60)} min.` });
      if (!r.ok) return res.status(401).json({ error: "PIN incorrecto. Ese perfil solo lo edita su dueño." });

      await col.updateOne({ _id: jugadorId }, { $set: set }, { upsert: true });
      await auditar(db, "perfil", req, { jugadorId, banner: set.banner ? (set.banner.startsWith("data:") ? "foto" : set.banner) : undefined, frase: set.frase !== undefined });
      return res.status(200).json({ ok: true });
    }

    return res.status(405).json({ error: "Método no permitido." });
  } catch (e) {
    return res.status(500).json({ error: "Error del servidor: " + e.message });
  }
}
