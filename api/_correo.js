// Envío de correos con Brevo (transaccional). Se usa para mandar el código de
// reseteo del PIN. Requiere en Vercel:
//   BREVO_API_KEY      = la API key de Brevo
//   CORREO_REMITENTE   = el correo remitente verificado en Brevo (p. ej. tu Gmail)

export function enmascararCorreo(e) {
  if (typeof e !== "string" || !e.includes("@")) return "";
  const [loc, dom] = e.split("@");
  const ini = loc.slice(0, Math.min(2, loc.length));
  return `${ini}${"*".repeat(Math.max(3, loc.length - ini.length))}@${dom}`;
}

export async function enviarCorreo(destino, nombre, asunto, html) {
  const key = process.env.BREVO_API_KEY;
  const remitente = process.env.CORREO_REMITENTE;
  if (!key || !remitente) {
    throw new Error("El correo no está configurado (faltan BREVO_API_KEY o CORREO_REMITENTE).");
  }
  const r = await fetch("https://api.brevo.com/v3/smtp/email", {
    method: "POST",
    headers: { "api-key": key, "Content-Type": "application/json", accept: "application/json" },
    body: JSON.stringify({
      sender: { name: "ArroyitoFutStats", email: remitente },
      to: [{ email: destino, name: nombre || destino }],
      subject: asunto,
      htmlContent: html,
    }),
  });
  if (!r.ok) {
    let detalle = "";
    try { detalle = (await r.json()).message || ""; } catch {}
    throw new Error("No se pudo enviar el correo. " + detalle);
  }
}

export function correoCodigoHtml(nombre, codigo) {
  return `
  <div style="font-family:Arial,sans-serif;max-width:480px;margin:auto;color:#0F1B2D">
    <div style="background:#12A150;color:#fff;padding:20px;border-radius:16px 16px 0 0;font-weight:800;font-size:18px">⚽ ArroyitoFutStats</div>
    <div style="border:1px solid #E3E8EF;border-top:none;border-radius:0 0 16px 16px;padding:24px">
      <p>Hola ${nombre || ""},</p>
      <p>Tu código para cambiar tu PIN es:</p>
      <div style="font-size:34px;font-weight:800;letter-spacing:8px;color:#12A150;text-align:center;margin:18px 0">${codigo}</div>
      <p style="color:#647087;font-size:13px">Vence en 10 minutos. Si no fuiste tú, ignora este correo: nadie puede cambiar tu PIN sin este código.</p>
    </div>
  </div>`;
}
