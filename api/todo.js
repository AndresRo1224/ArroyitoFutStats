// GET /api/todo → todo lo que la app necesita para pintar, en UNA sola llamada
// (y una sola conexión a Atlas). Reduce muchísimo el uso de conexiones frente a
// pedir datos, fotos, banners, votos y admin por separado.
//
// { datos:{grupo,jugadores,partidos}, fotos, banners, votos, admin:{configurado} }

import { getDb, cors } from "./_db.js";

const VACIO = { grupo: "ArroyitoFutStats", jugadores: [], partidos: [] };

function agruparVotos(docs) {
  const out = {};
  docs.forEach((v) => {
    const g = (out[v.partidoId] = out[v.partidoId] || { conteo: {}, votantes: [] });
    g.conteo[v.votadoId] = (g.conteo[v.votadoId] || 0) + 1;
    g.votantes.push(v.votanteId);
  });
  return out;
}

export default async function handler(req, res) {
  cors(req, res);
  if (req.method === "OPTIONS") return res.status(200).end();
  if (req.method !== "GET") return res.status(405).json({ error: "Método no permitido." });

  try {
    const db = await getDb();
    const [estado, fotosDocs, bannerDocs, votoDocs, adminDoc] = await Promise.all([
      db.collection("estado").findOne({ _id: "principal" }),
      db.collection("fotos").find({}, { projection: { data: 1 } }).toArray(),
      db.collection("banners").find({}, { projection: { banner: 1, frase: 1 } }).toArray(),
      db.collection("votos").find({}).toArray(),
      db.collection("config").findOne({ _id: "admin" }),
    ]);

    const fotos = {};
    fotosDocs.forEach((d) => { if (d.data) fotos[d._id] = d.data; });
    const banners = {}, frases = {};
    bannerDocs.forEach((d) => {
      if (d.banner) banners[d._id] = d.banner;
      if (d.frase) frases[d._id] = d.frase;
    });

    return res.status(200).json({
      datos: estado
        ? { grupo: estado.grupo || VACIO.grupo, jugadores: estado.jugadores || [], partidos: estado.partidos || [] }
        : VACIO,
      fotos,
      banners,
      frases,
      votos: agruparVotos(votoDocs),
      admin: { configurado: !!(adminDoc && adminDoc.pinHash) || !!process.env.ADMIN_PIN },
    });
  } catch (e) {
    return res.status(500).json({ error: "Error del servidor: " + e.message });
  }
}
