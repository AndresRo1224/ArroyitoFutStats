// Perfil personalizable de cada jugador: banner, frase y correo de recuperación.
// Lo edita el propio jugador con su PIN personal (el mismo de la foto). El correo
// se guarda en la colección "pines" (privado, nunca se devuelve completo).
//
// GET  /api/banners → { banners: {id: bannerVal}, frases: {id: frase} }
// POST /api/banners { jugadorId, banner?, frase?, email?, pin }  (al menos uno)

import { getDb, cors, leerBody, verificarPin, conLimite, idValido, pinValido, bannerValido, fraseValida, correoValido, auditar } from "./_db.js";

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
      const { jugadorId, banner, frase, email, pin } = leerBody(req);
      if (!idValido(jugadorId) || !pinValido(pin)) {
        return res.status(400).json({ error: "Datos inválidos." });
      }
      const setBanner = {};
      if (banner !== undefined) {
        if (!bannerValido(banner)) return res.status(400).json({ error: "Banner inválido o imagen muy grande." });
        setBanner.banner = banner;
      }
      if (frase !== undefined) {
        if (!fraseValida(frase)) return res.status(400).json({ error: "La frase es demasiado larga." });
        setBanner.frase = String(frase).slice(0, 80);
      }
      let emailNuevo;
      if (email !== undefined) {
        if (!correoValido(email)) return res.status(400).json({ error: "El correo no es válido." });
        emailNuevo = String(email).trim().toLowerCase();
      }
      if (banner === undefined && frase === undefined && email === undefined) {
        return res.status(400).json({ error: "No hay nada que guardar." });
      }

      const registro = await db.collection("pines").findOne({ _id: jugadorId });
      if (!registro || !registro.pinHash) {
        return res.status(403).json({ error: "Este jugador todavía no tiene PIN. Pídeselo al administrador." });
      }
      const r = await conLimite(db, req, `banner:${jugadorId}`, () => verificarPin(pin, registro.pinHash));
      if (r.bloqueo) return res.status(429).json({ error: `Demasiados intentos. Espera ${Math.ceil(r.bloqueo / 60)} min.` });
      if (!r.ok) return res.status(401).json({ error: "PIN incorrecto. Ese perfil solo lo edita su dueño." });

      if (Object.keys(setBanner).length) {
        await col.updateOne({ _id: jugadorId }, { $set: { ...setBanner, actualizado: new Date() } }, { upsert: true });
      }
      if (emailNuevo !== undefined) {
        await db.collection("pines").updateOne({ _id: jugadorId }, { $set: { email: emailNuevo, actualizado: new Date() } });
      }
      await auditar(db, "perfil", req, {
        jugadorId,
        banner: setBanner.banner ? (setBanner.banner.startsWith("data:") ? "foto" : setBanner.banner) : undefined,
        frase: setBanner.frase !== undefined,
        correo: emailNuevo !== undefined,
      });
      return res.status(200).json({ ok: true });
    }

    return res.status(405).json({ error: "Método no permitido." });
  } catch (e) {
    return res.status(500).json({ error: "Error del servidor: " + e.message });
  }
}
