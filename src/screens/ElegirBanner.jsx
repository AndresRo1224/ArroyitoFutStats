import React, { useRef, useState } from "react";
import { X, Check, Loader2, Image, Upload } from "lucide-react";
import { C, BANNERS, bannerCss, esBannerImagen, SOMBRA_ALTA } from "../tema";
import { Boton, Rotulo } from "../components/ui";
import { nubeActiva } from "../lib/nube";
import RecortarBanner from "./RecortarBanner";

const leerArchivo = (file) =>
  new Promise((resolve, reject) => {
    const fr = new FileReader();
    fr.onload = () => resolve(fr.result);
    fr.onerror = reject;
    fr.readAsDataURL(file);
  });

// El jugador personaliza su perfil: banner (diseño o foto propia, con encuadre) y
// una frase corta. Protegido con su PIN personal (el mismo de la foto).
export default function ElegirBanner({ jugador, actual, fraseActual, onGuardar, onOlvide, onCerrar }) {
  const [elegido, setElegido] = useState(actual || BANNERS[0].id);
  const [frase, setFrase] = useState(fraseActual || "");
  const [srcRecorte, setSrcRecorte] = useState(null); // imagen cruda en modo recorte
  const [pin, setPin] = useState("");
  const [error, setError] = useState("");
  const [cargando, setCargando] = useState(false);
  const inputFoto = useRef(null);

  const propia = esBannerImagen(elegido);

  const subir = async (e) => {
    const file = e.target.files && e.target.files[0];
    if (!file) return;
    setError("");
    try {
      setSrcRecorte(await leerArchivo(file));
    } catch {
      setError("No se pudo leer esa imagen. Prueba con otra.");
    }
  };

  const guardar = async () => {
    if (pin.trim().length < 4) return setError("Escribe tu PIN.");
    setCargando(true);
    setError("");
    try {
      await onGuardar(elegido, frase.trim(), pin.trim());
      onCerrar();
    } catch (e) {
      setError(e.message || "No se pudo guardar el perfil.");
    } finally {
      setCargando(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[70] flex items-end sm:items-center justify-center" style={{ background: "rgba(15,27,45,0.55)" }}>
      <div
        className="w-full rounded-t-3xl sm:rounded-3xl p-5"
        style={{ background: C.fondo, maxWidth: 448, boxShadow: SOMBRA_ALTA, paddingBottom: "calc(20px + env(safe-area-inset-bottom))" }}
      >
        <div className="flex items-center justify-between mb-1">
          <div className="flex items-center gap-2">
            <div className="rounded-xl p-2" style={{ background: `${C.primario}18` }}>
              <Image size={16} color={C.primario} />
            </div>
            <div className="font-extrabold text-lg" style={{ color: C.tinta }}>Tu perfil</div>
          </div>
          <button onClick={onCerrar} className="p-1 active:opacity-60"><X size={22} color={C.humo} /></button>
        </div>

        {srcRecorte ? (
          <RecortarBanner
            src={srcRecorte}
            onListo={(data) => { setElegido(data); setSrcRecorte(null); }}
            onCancelar={() => setSrcRecorte(null)}
          />
        ) : (
          <>
            <div className="text-sm mb-3" style={{ color: C.humo }}>
              {jugador.nombre}. Sube tu foto o elige un diseño, escribe una frase y confirma con tu PIN.
            </div>

            {/* Vista previa del banner elegido */}
            <div className="rounded-2xl h-24 w-full mb-3" style={{ background: bannerCss(elegido), boxShadow: `inset 0 0 0 1px ${C.linea}` }} />

            <button
              onClick={() => inputFoto.current && inputFoto.current.click()}
              className="w-full flex items-center justify-center gap-2 rounded-xl py-3 font-bold text-sm mb-3 active:scale-[0.98] transition"
              style={{ background: propia ? C.primario : C.tarjeta2, color: propia ? C.sobrePrimario : C.tinta }}
            >
              <Upload size={16} /> {propia ? "Cambiar mi foto de banner" : "Subir mi propia foto"}
            </button>

            <Rotulo>O elige un diseño</Rotulo>
            <div className="grid grid-cols-3 gap-2 mt-2 max-h-[24vh] overflow-y-auto pr-0.5">
              {BANNERS.map((b) => (
                <button
                  key={b.id}
                  onClick={() => setElegido(b.id)}
                  className="rounded-xl overflow-hidden transition active:scale-[0.97]"
                  style={{ boxShadow: elegido === b.id ? `0 0 0 2.5px ${C.primario}` : `inset 0 0 0 1px ${C.linea}` }}
                >
                  <div className="h-10 w-full relative" style={{ background: b.css }}>
                    {elegido === b.id && (
                      <div className="absolute top-1 right-1 rounded-full p-0.5" style={{ background: C.primario }}>
                        <Check size={11} color="#fff" strokeWidth={3.5} />
                      </div>
                    )}
                  </div>
                  <div className="text-xs font-semibold text-center py-1 truncate" style={{ background: C.tarjeta, color: C.tinta }}>
                    {b.nombre}
                  </div>
                </button>
              ))}
            </div>

            <div className="mt-4 flex items-center justify-between">
              <Rotulo>Tu frase</Rotulo>
              <span className="text-xs" style={{ color: C.humo }}>{frase.length}/80</span>
            </div>
            <input
              value={frase}
              onChange={(e) => setFrase(e.target.value.slice(0, 80))}
              placeholder="Ej: El muro del arco 🧤"
              className="w-full mt-2 rounded-xl px-3 py-3 text-sm outline-none"
              style={{ background: C.tarjeta, color: C.tinta, border: `1px solid ${C.linea}` }}
            />

            <div className="mt-4"><Rotulo>Tu PIN</Rotulo></div>
            <input
              value={pin}
              onChange={(e) => setPin(e.target.value.replace(/\D/g, "").slice(0, 12))}
              inputMode="numeric"
              placeholder="••••"
              className="w-full mt-2 rounded-xl px-3 py-3 text-center text-lg font-bold tracking-[0.4em] outline-none"
              style={{ background: C.tarjeta, color: C.tinta, border: `1px solid ${C.linea}` }}
            />
            {onOlvide && (
              <button onClick={onOlvide} className="w-full mt-2 text-xs font-bold" style={{ color: C.primario }}>
                ¿Olvidaste tu PIN? Cámbialo por correo
              </button>
            )}

            {error && <div className="mt-3 text-sm font-semibold text-center" style={{ color: C.alerta }}>{error}</div>}
            {!nubeActiva() && (
              <div className="mt-2 text-xs text-center" style={{ color: C.humo }}>Modo local: se guarda solo en este teléfono.</div>
            )}

            <div className="mt-4">
              <Boton ancho onClick={guardar} disabled={cargando}>
                {cargando ? <><Loader2 size={17} className="animate-spin" /> Guardando…</> : "Guardar perfil"}
              </Boton>
            </div>
          </>
        )}

        <input ref={inputFoto} type="file" accept="image/*" className="hidden" onChange={subir} />
      </div>
    </div>
  );
}
