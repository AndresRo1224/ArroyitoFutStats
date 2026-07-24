import React, { useState } from "react";
import { X, Check, Loader2, Image } from "lucide-react";
import { C, BANNERS, SOMBRA_ALTA } from "../tema";
import { Boton, Rotulo } from "../components/ui";
import { nubeActiva } from "../lib/nube";

// El propio jugador elige el banner de su perfil, protegido con su PIN personal
// (el mismo de la foto).
export default function ElegirBanner({ jugador, actual, onGuardar, onCerrar }) {
  const [elegido, setElegido] = useState(actual || BANNERS[0].id);
  const [pin, setPin] = useState("");
  const [error, setError] = useState("");
  const [cargando, setCargando] = useState(false);

  const guardar = async () => {
    if (pin.trim().length < 4) return setError("Escribe tu PIN.");
    setCargando(true);
    setError("");
    try {
      await onGuardar(elegido, pin.trim());
      onCerrar();
    } catch (e) {
      setError(e.message || "No se pudo guardar el banner.");
    } finally {
      setCargando(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[70] flex items-end sm:items-center justify-center" style={{ background: "rgba(15,27,45,0.55)" }} onClick={onCerrar}>
      <div
        className="w-full rounded-t-3xl sm:rounded-3xl p-5"
        style={{ background: C.fondo, maxWidth: 448, boxShadow: SOMBRA_ALTA, paddingBottom: "calc(20px + env(safe-area-inset-bottom))" }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-1">
          <div className="flex items-center gap-2">
            <div className="rounded-xl p-2" style={{ background: `${C.primario}18` }}>
              <Image size={16} color={C.primario} />
            </div>
            <div className="font-extrabold text-lg" style={{ color: C.tinta }}>Tu banner</div>
          </div>
          <button onClick={onCerrar} className="p-1 active:opacity-60"><X size={22} color={C.humo} /></button>
        </div>
        <div className="text-sm mb-3" style={{ color: C.humo }}>
          {jugador.nombre}. Elige el fondo de tu perfil y confirma con tu PIN.
        </div>

        <div className="grid grid-cols-3 gap-2 max-h-[38vh] overflow-y-auto pr-0.5">
          {BANNERS.map((b) => (
            <button
              key={b.id}
              onClick={() => setElegido(b.id)}
              className="rounded-xl overflow-hidden transition active:scale-[0.97]"
              style={{ boxShadow: elegido === b.id ? `0 0 0 2.5px ${C.primario}` : `inset 0 0 0 1px ${C.linea}` }}
            >
              <div className="h-12 w-full relative" style={{ background: b.css }}>
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

        <div className="mt-4"><Rotulo>Tu PIN</Rotulo></div>
        <input
          value={pin}
          onChange={(e) => setPin(e.target.value.replace(/\D/g, "").slice(0, 12))}
          inputMode="numeric"
          placeholder="••••"
          className="w-full mt-2 rounded-xl px-3 py-3 text-center text-lg font-bold tracking-[0.4em] outline-none"
          style={{ background: C.tarjeta, color: C.tinta, border: `1px solid ${C.linea}` }}
        />

        {error && <div className="mt-3 text-sm font-semibold text-center" style={{ color: C.alerta }}>{error}</div>}
        {!nubeActiva() && (
          <div className="mt-2 text-xs text-center" style={{ color: C.humo }}>Modo local: se guarda solo en este teléfono.</div>
        )}

        <div className="mt-4">
          <Boton ancho onClick={guardar} disabled={cargando}>
            {cargando ? <><Loader2 size={17} className="animate-spin" /> Guardando…</> : "Guardar banner"}
          </Boton>
        </div>
      </div>
    </div>
  );
}
