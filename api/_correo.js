// Envío de correos con el Gmail dedicado (SMTP vía nodemailer). Se usa para mandar
// el código de reseteo del PIN. Requiere en Vercel:
//   GMAIL_USER          = el Gmail dedicado (p. ej. arroyitofutstats@gmail.com)
//   GMAIL_APP_PASSWORD  = la "Contraseña de aplicación" de 16 caracteres que da Google
//                          (Cuenta de Google → Seguridad → Verificación en 2 pasos →
//                           Contraseñas de aplicaciones). NO es la contraseña normal.

import nodemailer from "nodemailer";

export function enmascararCorreo(e) {
  if (typeof e !== "string" || !e.includes("@")) return "";
  const [loc, dom] = e.split("@");
  const ini = loc.slice(0, Math.min(2, loc.length));
  return `${ini}${"*".repeat(Math.max(3, loc.length - ini.length))}@${dom}`;
}

// El transporte se cachea entre invocaciones "calientes" del serverless.
let transporteCache;
function transporte() {
  const user = process.env.GMAIL_USER;
  // Google muestra la contraseña de aplicación con espacios ("abcd efgh ijkl mnop");
  // se los quitamos para que el usuario pueda copiarla tal cual.
  const pass = (process.env.GMAIL_APP_PASSWORD || "").replace(/\s+/g, "");
  if (!user || !pass) {
    throw new Error("El correo no está configurado (faltan GMAIL_USER o GMAIL_APP_PASSWORD en Vercel).");
  }
  if (!transporteCache) {
    transporteCache = nodemailer.createTransport({
      host: "smtp.gmail.com",
      port: 465,
      secure: true,
      auth: { user, pass },
    });
  }
  return transporteCache;
}

export async function enviarCorreo(destino, nombre, asunto, html) {
  const user = process.env.GMAIL_USER;
  try {
    await transporte().sendMail({
      from: { name: "ArroyitoFutStats", address: user },
      to: { name: nombre || destino, address: destino },
      subject: asunto,
      html,
    });
  } catch (e) {
    throw new Error("No se pudo enviar el correo. " + (e.message || ""));
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
