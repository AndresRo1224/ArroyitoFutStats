// Los datos viven en el teléfono (localStorage del WebView). No hay servidor.
// Por eso Ajustes trae exportar/importar respaldo: es la única red de seguridad.

const PREFIJO = "canchita:";
export const K_DATOS = PREFIJO + "datos";
export const K_FOTOS = PREFIJO + "fotos";
export const K_BANNERS = PREFIJO + "banners";
export const K_FRASES = PREFIJO + "frases";

// window.storage existe cuando el código corre dentro de un artifact de Claude.
// En el APK y en el navegador se usa localStorage.
const puente = {
  async leer(clave) {
    try {
      if (typeof window !== "undefined" && window.storage) {
        const r = await window.storage.get(clave);
        return r ? r.value : null;
      }
      return localStorage.getItem(clave);
    } catch (e) {
      return null;
    }
  },
  async escribir(clave, valor) {
    try {
      if (typeof window !== "undefined" && window.storage) {
        return await window.storage.set(clave, valor);
      }
      localStorage.setItem(clave, valor);
      return true;
    } catch (e) {
      return null;
    }
  },
};

export async function leerJSON(clave, porDefecto) {
  const crudo = await puente.leer(clave);
  if (!crudo) return porDefecto;
  try {
    return JSON.parse(crudo);
  } catch (e) {
    return porDefecto;
  }
}

export async function guardarJSON(clave, valor) {
  return puente.escribir(clave, JSON.stringify(valor));
}

export function descargarRespaldo({ jugadores, partidos, grupo, fotos }) {
  const contenido = JSON.stringify({ version: 1, grupo, jugadores, partidos, fotos }, null, 2);
  const blob = new Blob([contenido], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `canchita-${new Date().toISOString().slice(0, 10)}.json`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

export function leerRespaldo(file) {
  return new Promise((resolve, reject) => {
    const fr = new FileReader();
    fr.onload = () => {
      try {
        const o = JSON.parse(fr.result);
        if (!Array.isArray(o.jugadores) || !Array.isArray(o.partidos)) {
          reject(new Error("El archivo no tiene jugadores ni partidos."));
          return;
        }
        resolve(o);
      } catch (e) {
        reject(new Error("El archivo no es un respaldo válido."));
      }
    };
    fr.onerror = () => reject(new Error("No se pudo leer el archivo."));
    fr.readAsText(file);
  });
}
