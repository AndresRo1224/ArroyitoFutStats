// Votación del MVP de cada partido. Cada jugador que asistió vota una vez,
// autenticándose con su PIN personal. La votación dura 24h desde que se registró
// el partido (campo `creado`).
//
// GET  /api/votos                 → { [partidoId]: { conteo: {votadoId:n}, votantes:[ids] } }
// GET  /api/votos?partidoId=xxx   → lo mismo, solo ese partido
// POST /api/votos { partidoId, votanteId, pin, votadoId }

import { getDb, cors, leerBody, verificarPin, conLimite } from "./_db.js";

const VOTACION_MS = 24 * 60 * 60 * 1000;

function agrupar(docs) {
  const out = {};
  docs.forEach((v) => {
    const g = (out[v.partidoId] = out[v.partidoId] || { conteo: {}, votantes: [] });
    g.conteo[v.votadoId] = (g.conteo[v.votadoId] || 0) + 1;
    g.votantes.push(v.votanteId);
  });
  return out;
}

export default async function handler(req, res) {
  cors(res);
  if (req.method === "OPTIONS") return res.status(200).end();

  try {
    const db = await getDb();
    const col = db.collection("votos");

    if (req.method === "GET") {
      const partidoId = req.query && req.query.partidoId;
      const filtro = partidoId ? { partidoId } : {};
      const docs = await col.find(filtro).toArray();
      return res.status(200).json(agrupar(docs));
    }

    if (req.method === "POST") {
      const { partidoId, votanteId, pin, votadoId } = leerBody(req);
      if (!partidoId || !votanteId || !pin || !votadoId) {
        return res.status(400).json({ error: "Faltan datos para votar." });
      }
      if (votanteId === votadoId) {
        return res.status(400).json({ error: "No puedes votar por ti mismo." });
      }

      // El partido vive dentro del documento de estado.
      const estado = await db.collection("estado").findOne({ _id: "principal" });
      const partido = (estado?.partidos || []).find((p) => p.id === partidoId);
      if (!partido) return res.status(404).json({ error: "Ese partido no existe." });
      if (!partido.creado || Date.now() >= partido.creado + VOTACION_MS) {
        return res.status(403).json({ error: "La votación de este partido ya cerró." });
      }
      if (!partido.att.includes(votanteId) || !partido.att.includes(votadoId)) {
        return res.status(400).json({ error: "Solo pueden votar y ser votados quienes jugaron ese partido." });
      }

      // Autenticación con el PIN personal del votante (con límite de intentos).
      const registro = await db.collection("pines").findOne({ _id: votanteId });
      const r = await conLimite(db, req, `voto:${votanteId}`, () => !!(registro && registro.pinHash) && verificarPin(pin, registro.pinHash));
      if (r.bloqueo) return res.status(429).json({ error: `Demasiados intentos. Espera ${Math.ceil(r.bloqueo / 60)} min.` });
      if (!r.ok) return res.status(401).json({ error: "PIN incorrecto." });

      // Un voto por votante por partido (se puede cambiar mientras esté abierta).
      await col.updateOne(
        { _id: `${partidoId}:${votanteId}` },
        { $set: { partidoId, votanteId, votadoId, fecha: new Date() } },
        { upsert: true }
      );

      const docs = await col.find({ partidoId }).toArray();
      return res.status(200).json(agrupar(docs));
    }

    return res.status(405).json({ error: "Método no permitido." });
  } catch (e) {
    return res.status(500).json({ error: "Error del servidor: " + e.message });
  }
}
