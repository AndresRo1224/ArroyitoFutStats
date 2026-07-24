import React, { useRef, useState } from "react";
import { X, Camera, ShieldCheck, Loader2 } from "lucide-react";
import { C, SOMBRA_ALTA } from "../tema";
import { Avatar, Boton, Rotulo } from "../components/ui";
import { comprimirFoto } from "../lib/util";
import { nubeActiva } from "../lib/nube";

// Modal para que el propio jugador suba/cambie su foto.
// Pide un PIN: la primera vez lo fija; después ese mismo PIN es necesario para
// cambiarla, así nadie sube la foto por otra persona.
export default function SubirFoto({ jugador, fotoActual, onGuardar, onCerrar }) {
  const [preview, setPreview] = useState(null); // data URL nueva sin guardar
  const [pin, setPin] = useState("");
  const [error, setError] = useState("");
  const [cargando, setCargando] = useState(false);
  const inputFoto = useRef(null);

  const elegir = async (e) => {
    const file = e.target.files && e.target.files[0];
    if (!file) return;
    setError("");
    try {
      setPreview(await comprimirFoto(file));
    } catch {
      setError("No se pudo leer esa imagen. Prueba con otra.");
    }
  };

  const guardar = async () => {
    if (!preview) return setError("Primero elige una foto.");
    if (pin.trim().length < 4) return setError("El PIN debe tener al menos 4 dígitos.");
    setCargando(true);
    setError("");
    try {
      await onGuardar(preview, pin.trim());
      onCerrar();
    } catch (err) {
      setError(err.message || "No se pudo guardar la foto.");
    } finally {
      setCargando(false);
    }
  };

  const fotoMostrada = preview || fotoActual;

  return (
    <div className="fixed inset-0 z-[60] flex items-end sm:items-center justify-center" style={{ background: "rgba(15,27,45,0.55)" }} onClick={onCerrar}>
      <div
        className="w-full rounded-t-3xl sm:rounded-3xl p-5"
        style={{ background: C.fondo, maxWidth: 448, boxShadow: SOMBRA_ALTA, paddingBottom: "calc(20px + env(safe-area-inset-bottom))" }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-1">
          <div className="font-extrabold text-lg" style={{ color: C.tinta }}>Tu foto</div>
          <button onClick={onCerrar} className="p-1 active:opacity-60"><X size={22} color={C.humo} /></button>
        </div>
        <div className="text-sm mb-4" style={{ color: C.humo }}>
          {jugador.nombre}. Elige tu foto y pon un PIN. Solo con ese PIN se podrá cambiar después.
        </div>

        <div className="flex flex-col items-center">
          <button onClick={() => inputFoto.current && inputFoto.current.click()} className="relative active:opacity-80">
            {fotoMostrada ? (
              <img src={fotoMostrada} alt="" className="rounded-full object-cover" style={{ width: 110, height: 110, boxShadow: `0 0 0 3px ${C.primario}` }} />
            ) : (
              <Avatar id={jugador.id} nombre={jugador.nombre} tam={110} />
            )}
            <div className="absolute bottom-0 right-0 rounded-full p-2" style={{ background: C.primario, boxShadow: `0 0 0 3px ${C.fondo}` }}>
              <Camera size={16} color="#fff" />
            </div>
          </button>
          <div className="text-xs mt-2" style={{ color: C.humo }}>Toca para elegir o tomar una foto</div>
        </div>

        <div className="mt-5">
          <Rotulo>PIN {fotoActual ? "(el que usaste antes)" : "(elígelo ahora)"}</Rotulo>
          <input
            value={pin}
            onChange={(e) => setPin(e.target.value.replace(/\D/g, "").slice(0, 8))}
            inputMode="numeric"
            placeholder="••••"
            className="w-full mt-2 rounded-xl px-3 py-3 text-center text-lg font-bold tracking-[0.4em] outline-none"
            style={{ background: C.tarjeta, color: C.tinta, border: `1px solid ${C.linea}` }}
          />
        </div>

        {error && (
          <div className="mt-3 text-sm font-semibold text-center" style={{ color: C.alerta }}>{error}</div>
        )}

        <div className="mt-3 flex items-center gap-2 text-xs" style={{ color: C.humo }}>
          <ShieldCheck size={14} color={C.primario} />
          {nubeActiva() ? "Tu foto se comparte con todo el grupo." : "Modo local: la foto se guarda solo en este teléfono."}
        </div>

        <div className="mt-4">
          <Boton ancho onClick={guardar} disabled={cargando}>
            {cargando ? <><Loader2 size={17} className="animate-spin" /> Subiendo…</> : "Guardar mi foto"}
          </Boton>
        </div>

        <input ref={inputFoto} type="file" accept="image/*" className="hidden" onChange={elegir} />
      </div>
    </div>
  );
}
