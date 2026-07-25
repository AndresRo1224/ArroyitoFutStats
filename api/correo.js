// El administrador guarda el correo de un jugador (para el reseteo del PIN por email).
// El correo se guarda en la colección "pines" (privado, nunca se devuelve completo).
//
// POST /api/correo { jugadorId, email }   (requiere token/PIN de administrador)

import { getDb, cors, leerBody, revisarAdmin, conLimite, adminPorTokenOMaestra, idValido, correoValido, auditar } from "./_db.js";

export default async function handler(req, res) {
  cors(req, res);
  if (req.method === "OPTIONS") return res.status(200).end();
  if (req.method !== "POST") return res.status(405).json({ error: "Método no permitido." });

  try {
    const db = await getDb();
    const yaHay = (await revisarAdmin(db, "")).configurado;
    if (yaHay && !adminPorTokenOMaestra(req)) {
      const r = await conLimite(db, req, "admin", async () => (await revisarAdmin(db, req.headers["x-admin-pin"])).ok);
      if (r.bloqueo) return res.status(429).json({ error: `Demasiados intentos. Espera ${Math.ceil(r.bloqueo / 60)} min.` });
      if (!r.ok) return res.status(401).json({ error: "No autorizado." });
    }

    const { jugadorId, email } = leerBody(req);
    if (!idValido(jugadorId) || !correoValido(email)) {
      return res.status(400).json({ error: "Jugador o correo inválido." });
    }
    await db.collection("pines").updateOne(
      { _id: jugadorId },
      { $set: { email: String(email).trim().toLowerCase(), actualizado: new Date() } },
      { upsert: true }
    );
    await auditar(db, "correo", req, { jugadorId, tiene: !!email });
    return res.status(200).json({ ok: true });
  } catch (e) {
    return res.status(500).json({ error: "Error del servidor: " + e.message });
  }
}
