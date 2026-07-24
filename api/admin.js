// GET  /api/admin → { requerido: bool }   ¿hay PIN de administrador configurado?
// POST /api/admin → body { pin } → 200 si es correcto, 401 si no.
//
// El PIN sale de la variable de entorno ADMIN_PIN en Vercel. Si no está definida,
// la nómina y los partidos quedan abiertos (cualquiera con la app puede editar).

import { cors, leerBody } from "./_db.js";

export default async function handler(req, res) {
  cors(res);
  if (req.method === "OPTIONS") return res.status(200).end();

  const admin = process.env.ADMIN_PIN;

  if (req.method === "GET") {
    return res.status(200).json({ requerido: !!admin });
  }

  if (req.method === "POST") {
    if (!admin) return res.status(200).json({ ok: true, requerido: false });
    const { pin } = leerBody(req);
    if (String(pin || "") !== String(admin)) {
      return res.status(401).json({ error: "PIN incorrecto." });
    }
    return res.status(200).json({ ok: true, requerido: true });
  }

  return res.status(405).json({ error: "Método no permitido." });
}
