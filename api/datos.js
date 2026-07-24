// GET  /api/datos  → { grupo, jugadores, partidos }  (lo que todo el grupo ve)
// PUT  /api/datos  → guarda { grupo, jugadores, partidos }
//
// Escribir puede protegerse con un PIN de administrador: si defines la variable
// de entorno ADMIN_PIN en Vercel, las escrituras exigen la cabecera x-admin-pin.
// Si no la defines, cualquiera con la app puede editar (modo abierto).

import { getDb, cors, leerBody } from "./_db.js";

const VACIO = { grupo: "ArroyitoFutStats", jugadores: [], partidos: [] };

export default async function handler(req, res) {
  cors(res);
  if (req.method === "OPTIONS") return res.status(200).end();

  try {
    const col = (await getDb()).collection("estado");

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
      const admin = process.env.ADMIN_PIN;
      if (admin && String(req.headers["x-admin-pin"] || "") !== String(admin)) {
        return res.status(401).json({ error: "PIN de administrador incorrecto." });
      }
      const { grupo, jugadores, partidos } = leerBody(req);
      if (!Array.isArray(jugadores) || !Array.isArray(partidos)) {
        return res.status(400).json({ error: "Faltan jugadores o partidos." });
      }
      await col.updateOne(
        { _id: "principal" },
        { $set: { grupo: grupo || VACIO.grupo, jugadores, partidos, actualizado: new Date() } },
        { upsert: true }
      );
      return res.status(200).json({ ok: true });
    }

    return res.status(405).json({ error: "Método no permitido." });
  } catch (e) {
    return res.status(500).json({ error: "Error del servidor: " + e.message });
  }
}
