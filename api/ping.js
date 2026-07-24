// GET /api/ping → comprueba que la API responde y que Atlas está conectado.
// Lo usa el botón "Probar conexión" de Ajustes.

import { getDb, cors } from "./_db.js";

export default async function handler(req, res) {
  cors(res);
  if (req.method === "OPTIONS") return res.status(200).end();
  try {
    await (await getDb()).command({ ping: 1 });
    return res.status(200).json({ ok: true, nube: true });
  } catch (e) {
    return res.status(500).json({ ok: false, error: e.message });
  }
}
