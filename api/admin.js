// PIN de administrador. Vive en la base (colección "config", doc "admin"), así que
// se puede cambiar desde la app sin redesplegar.
//
// GET  /api/admin → { configurado: bool }   ¿ya hay PIN definido?
// POST /api/admin → { pin }                 verifica el PIN (200 / 401 / 429)
// PUT  /api/admin → { pinNuevo, pinActual } define o cambia el PIN
//
// Verificar y cambiar el PIN pasa por el límite de intentos: es la superficie más
// sensible, así que un atacante no puede adivinarlo por fuerza bruta.

import { getDb, cors, leerBody, hashPin, revisarAdmin, conLimite, esMaestra, firmarToken, pinValido, auditar } from "./_db.js";

export default async function handler(req, res) {
  cors(req, res);
  if (req.method === "OPTIONS") return res.status(200).end();

  try {
    const db = await getDb();
    const col = db.collection("config");

    if (req.method === "GET") {
      const doc = await col.findOne({ _id: "admin" });
      const configurado = !!(doc && doc.pinHash) || !!process.env.ADMIN_PIN;
      return res.status(200).json({ configurado, requerido: configurado });
    }

    // Al acertar el PIN se entrega un token de sesión firmado (12h). La app guarda
    // el token, NO el PIN: así no queda el PIN en texto plano en el navegador.
    if (req.method === "POST") {
      const { pin } = leerBody(req);
      const estado = await revisarAdmin(db, ""); // ¿está configurado?
      if (!estado.configurado) return res.status(200).json({ ok: true, configurado: false, token: firmarToken({ rol: "admin" }) });
      if (esMaestra(pin)) return res.status(200).json({ ok: true, configurado: true, token: firmarToken({ rol: "admin" }) });
      const r = await conLimite(db, req, "admin", async () => (await revisarAdmin(db, pin)).ok);
      if (r.bloqueo) return res.status(429).json({ error: `Demasiados intentos. Espera ${Math.ceil(r.bloqueo / 60)} min.` });
      if (!r.ok) return res.status(401).json({ error: "PIN incorrecto." });
      await auditar(db, "admin-login", req, null);
      return res.status(200).json({ ok: true, configurado: true, token: firmarToken({ rol: "admin" }) });
    }

    if (req.method === "PUT") {
      const { pinNuevo, pinActual } = leerBody(req);
      if (!pinValido(pinNuevo)) {
        return res.status(400).json({ error: "El PIN debe tener entre 4 y 12 dígitos." });
      }
      const yaHay = (await revisarAdmin(db, "")).configurado;
      if (yaHay && !esMaestra(pinActual)) {
        const r = await conLimite(db, req, "admin", async () => (await revisarAdmin(db, pinActual)).ok);
        if (r.bloqueo) return res.status(429).json({ error: `Demasiados intentos. Espera ${Math.ceil(r.bloqueo / 60)} min.` });
        if (!r.ok) return res.status(401).json({ error: "El PIN actual es incorrecto." });
      }
      await col.updateOne(
        { _id: "admin" },
        { $set: { pinHash: hashPin(pinNuevo), actualizado: new Date() } },
        { upsert: true }
      );
      await auditar(db, "admin-pin-cambiado", req, null);
      return res.status(200).json({ ok: true, token: firmarToken({ rol: "admin" }) });
    }

    return res.status(405).json({ error: "Método no permitido." });
  } catch (e) {
    return res.status(500).json({ error: "Error del servidor: " + e.message });
  }
}
