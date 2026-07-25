import React, { useState } from "react";
import { X, Mail, KeyRound, Loader2, ArrowRight } from "lucide-react";
import { C, SOMBRA_ALTA } from "../tema";
import { Boton, Rotulo } from "../components/ui";
import * as nube from "../lib/nube";

// Reseteo del PIN por correo. Paso 1: pedir el código. Paso 2: código + PIN nuevo.
export default function ResetPin({ jugador, onCerrar, avisar }) {
  const [paso, setPaso] = useState(1);
  const [pinActual, setPinActual] = useState("");
  const [email, setEmail] = useState("");
  const [codigo, setCodigo] = useState("");
  const [pinNuevo, setPinNuevo] = useState("");
  const [error, setError] = useState("");
  const [cargando, setCargando] = useState(false);

  const enviar = async () => {
    if (pinActual.trim().length < 4) return setError("Escribe tu PIN actual.");
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) return setError("Escribe un correo válido.");
    setCargando(true); setError("");
    try {
      const r = await nube.pedirCodigoReset(jugador.id, email.trim(), pinActual.trim());
      if (r && r.sinPin) {
        setError("Todavía no tienes un PIN. Pídele al administrador que te lo genere.");
      } else {
        setPaso(2);
      }
    } catch (e) {
      setError(e.message || "No se pudo enviar el código.");
    } finally {
      setCargando(false);
    }
  };

  const confirmar = async () => {
    if (!/^\d{6}$/.test(codigo)) return setError("El código es de 6 dígitos.");
    if (pinNuevo.trim().length < 4) return setError("El PIN debe tener al menos 4 dígitos.");
    setCargando(true); setError("");
    try {
      await nube.confirmarReset(jugador.id, codigo, pinNuevo.trim());
      avisar("¡PIN cambiado! Ya puedes usarlo.");
      onCerrar();
    } catch (e) {
      setError(e.message || "No se pudo cambiar el PIN.");
    } finally {
      setCargando(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[80] flex items-end sm:items-center justify-center" style={{ background: "rgba(15,27,45,0.55)" }}>
      <div
        className="w-full rounded-t-3xl sm:rounded-3xl p-5"
        style={{ background: C.fondo, maxWidth: 448, boxShadow: SOMBRA_ALTA, paddingBottom: "calc(20px + env(safe-area-inset-bottom))" }}
      >
        <div className="flex items-center justify-between mb-1">
          <div className="flex items-center gap-2">
            <div className="rounded-xl p-2" style={{ background: `${C.primario}18` }}>
              <KeyRound size={16} color={C.primario} />
            </div>
            <div className="font-extrabold text-lg" style={{ color: C.tinta }}>Cambiar tu PIN por correo</div>
          </div>
          <button onClick={onCerrar} className="p-1 active:opacity-60"><X size={22} color={C.humo} /></button>
        </div>

        {paso === 1 ? (
          <>
            <div className="text-sm mt-2 mb-3" style={{ color: C.humo }}>
              {jugador.nombre}, para cambiar tu PIN confirma el que tienes ahora y escribe tu
              correo: te enviaremos un código de 6 dígitos.
            </div>

            <Rotulo>Tu PIN actual</Rotulo>
            <input
              value={pinActual}
              onChange={(e) => setPinActual(e.target.value.replace(/\D/g, "").slice(0, 12))}
              inputMode="numeric"
              placeholder="••••"
              className="w-full mt-2 mb-3 rounded-xl px-3 py-3 text-center text-lg font-bold tracking-[0.4em] outline-none"
              style={{ background: C.tarjeta, color: C.tinta, border: `1px solid ${C.linea}` }}
            />

            <Rotulo>Tu correo</Rotulo>
            <input
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && enviar()}
              inputMode="email"
              placeholder="tucorreo@ejemplo.com"
              className="w-full mt-2 mb-2 rounded-xl px-3 py-3 text-sm outline-none"
              style={{ background: C.tarjeta, color: C.tinta, border: `1px solid ${C.linea}` }}
            />

            <div className="text-xs mb-3" style={{ color: C.humo }}>
              ¿No recuerdas tu PIN? Pídele al administrador que te lo regenere.
            </div>

            {error && <div className="mb-3 text-sm font-semibold text-center" style={{ color: C.alerta }}>{error}</div>}
            <Boton ancho onClick={enviar} disabled={cargando}>
              {cargando ? <><Loader2 size={17} className="animate-spin" /> Enviando…</> : <><Mail size={17} /> Enviarme el código</>}
            </Boton>
          </>
        ) : (
          <>
            <div className="text-sm mt-2 mb-3 flex items-center gap-2" style={{ color: C.humo }}>
              <Mail size={14} color={C.primario} /> Enviamos un código a <strong style={{ color: C.tinta }}>{email.trim()}</strong>
            </div>

            <Rotulo>Código del correo</Rotulo>
            <input
              value={codigo}
              onChange={(e) => setCodigo(e.target.value.replace(/\D/g, "").slice(0, 6))}
              inputMode="numeric"
              placeholder="000000"
              className="w-full mt-2 rounded-xl px-3 py-3 text-center text-lg font-bold tracking-[0.4em] outline-none"
              style={{ background: C.tarjeta, color: C.tinta, border: `1px solid ${C.linea}` }}
            />

            <div className="mt-3"><Rotulo>Tu PIN nuevo (mínimo 4 dígitos)</Rotulo></div>
            <input
              value={pinNuevo}
              onChange={(e) => setPinNuevo(e.target.value.replace(/\D/g, "").slice(0, 12))}
              inputMode="numeric"
              placeholder="••••"
              className="w-full mt-2 rounded-xl px-3 py-3 text-center text-lg font-bold tracking-[0.4em] outline-none"
              style={{ background: C.tarjeta, color: C.tinta, border: `1px solid ${C.linea}` }}
            />

            {error && <div className="mt-3 text-sm font-semibold text-center" style={{ color: C.alerta }}>{error}</div>}

            <div className="mt-4">
              <Boton ancho onClick={confirmar} disabled={cargando}>
                {cargando ? <><Loader2 size={17} className="animate-spin" /> Cambiando…</> : <><ArrowRight size={17} /> Cambiar mi PIN</>}
              </Boton>
            </div>
            <button onClick={enviar} disabled={cargando} className="w-full mt-2 text-xs font-bold" style={{ color: C.humo }}>
              Reenviar código
            </button>
          </>
        )}
      </div>
    </div>
  );
}
