import React, { useState } from "react";
import { X, Lock, Loader2 } from "lucide-react";
import { C, SOMBRA_ALTA } from "../tema";
import { Boton, Rotulo } from "../components/ui";

// Pide el PIN de administrador antes de dejar tocar la nómina o los partidos.
// Una vez acertado, el teléfono lo recuerda y no vuelve a preguntar.
export default function PedirPin({ titulo, texto, onConfirmar, onCerrar }) {
  const [pin, setPin] = useState("");
  const [error, setError] = useState("");
  const [cargando, setCargando] = useState(false);

  const confirmar = async () => {
    if (!pin.trim()) return setError("Escribe el PIN.");
    setCargando(true);
    setError("");
    try {
      await onConfirmar(pin.trim());
    } catch (err) {
      setError(err.message || "No se pudo verificar el PIN.");
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
              <Lock size={16} color={C.primario} />
            </div>
            <div className="font-extrabold text-lg" style={{ color: C.tinta }}>{titulo || "PIN requerido"}</div>
          </div>
          <button onClick={onCerrar} className="p-1 active:opacity-60"><X size={22} color={C.humo} /></button>
        </div>

        <div className="text-sm mt-2" style={{ color: C.humo }}>
          {texto || "Solo quienes conocen el PIN del grupo pueden hacer este cambio."}
        </div>

        <div className="mt-4">
          <Rotulo>PIN del grupo</Rotulo>
          <input
            value={pin}
            onChange={(e) => setPin(e.target.value.replace(/\D/g, "").slice(0, 12))}
            onKeyDown={(e) => e.key === "Enter" && confirmar()}
            inputMode="numeric"
            autoFocus
            placeholder="••••"
            className="w-full mt-2 rounded-xl px-3 py-3 text-center text-lg font-bold tracking-[0.4em] outline-none"
            style={{ background: C.tarjeta, color: C.tinta, border: `1px solid ${C.linea}` }}
          />
        </div>

        {error && (
          <div className="mt-3 text-sm font-semibold text-center" style={{ color: C.alerta }}>{error}</div>
        )}

        <div className="mt-4">
          <Boton ancho onClick={confirmar} disabled={cargando}>
            {cargando ? <><Loader2 size={17} className="animate-spin" /> Verificando…</> : "Continuar"}
          </Boton>
        </div>
      </div>
    </div>
  );
}
