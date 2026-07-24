// GET  /api/datos  → { grupo, jugadores, partidos }  (lo que todo el grupo ve)
// PUT  /api/datos  → guarda { grupo, jugadores, partidos }
//
// Escribir puede protegerse con un PIN de administrador: si defines la variable
// de entorno ADMIN_PIN en Vercel, las escrituras exigen la cabecera x-admin-pin.
// Si no la defines, cualquiera con la app puede editar (modo abierto).

import { getDb, cors, leerBody, revisarAdmin, conLimite, adminPorTokenOMaestra, sanearDatos, auditar } from "./_db.js";

const VACIO = { grupo: "ArroyitoFutStats", jugadores: [], partidos: [] };

export default async function handler(req, res) {
  cors(req, res);
  if (req.method === "OPTIONS") return res.status(200).end();

  try {
    const db = await getDb();
    const col = db.collection("estado");

    if (req.method === "GET") {
      const doc = await col.findOne({ _id: "principal" });
      if (!doc) return res.status(200).json(VACIO);
      return res.status(200).json({
        grupo: doc.grupo || VACIO.grupo,
        jugadores: doc.jugadores || [],
        partidos: doc.partidos || [],
      });
    }

    if (req.method === "PUT") {
      const yaHay = (await revisarAdmin(db, "")).configurado;
      // Autorizado por token de sesión o llave maestra; si no, PIN por cabecera
      // (con límite de intentos, por compatibilidad).
      if (yaHay && !adminPorTokenOMaestra(req)) {
        const r = await conLimite(db, req, "admin", async () => (await revisarAdmin(db, req.headers["x-admin-pin"])).ok);
        if (r.bloqueo) return res.status(429).json({ error: `Demasiados intentos. Espera ${Math.ceil(r.bloqueo / 60)} min.` });
        if (!r.ok) return res.status(401).json({ error: "No autorizado." });
      }
      // Saneo estricto: reconstruye los datos solo con campos y tipos permitidos.
      const datos = sanearDatos(leerBody(req));
      await col.updateOne(
        { _id: "principal" },
        { $set: { ...datos, actualizado: new Date() } },
        { upsert: true }
      );
      await auditar(db, "datos", req, { jugadores: datos.jugadores.length, partidos: datos.partidos.length });
      return res.status(200).json({ ok: true });
    }

    return res.status(405).json({ error: "Método no permitido." });
  } catch (e) {
    return res.status(500).json({ error: "Error del servidor: " + e.message });
  }
}
