import React, { useState } from "react";
import { KeyRound, Copy, Check, Share2 } from "lucide-react";
import { C, NUM, SOMBRA_ALTA } from "../tema";
import { Boton } from "../components/ui";

// Muestra, una sola vez, el PIN recién generado de un jugador para que el
// administrador se lo pase. Después ya no se puede consultar: solo regenerar.
export default function MostrarPin({ nombre, pin, onCerrar }) {
  const [copiado, setCopiado] = useState(false);

  const texto = `Tu PIN para subir tu foto en ArroyitoFutStats es: ${pin}\nGuárdalo, solo con ese PIN puedes cambiar tu foto.`;

  const copiar = async () => {
    try { await navigator.clipboard.writeText(texto); } catch { /* sin permiso: queda visible */ }
    setCopiado(true);
    setTimeout(() => setCopiado(false), 2000);
  };

  const compartir = async () => {
    if (navigator.share) {
      try { await navigator.share({ text: texto }); return; } catch { /* cancelado */ }
    }
    copiar();
  };

  return (
    <div className="fixed inset-0 z-[75] flex items-end sm:items-center justify-center" style={{ background: "rgba(15,27,45,0.6)" }}>
      <div
        className="w-full rounded-t-3xl sm:rounded-3xl p-5"
        style={{ background: C.fondo, maxWidth: 448, boxShadow: SOMBRA_ALTA, paddingBottom: "calc(20px + env(safe-area-inset-bottom))" }}
      >
        <div className="flex items-center gap-2">
          <div className="rounded-xl p-2" style={{ background: `${C.primario}18` }}>
            <KeyRound size={16} color={C.primario} />
          </div>
          <div className="font-extrabold text-lg" style={{ color: C.tinta }}>PIN de {nombre}</div>
        </div>

        <div className="text-sm mt-2" style={{ color: C.humo }}>
          Pásale este PIN. Es lo único que le permitirá subir y cambiar su propia foto.
        </div>

        <div
          className="mt-4 rounded-2xl py-6 text-center"
          style={{ background: C.tarjeta, boxShadow: `inset 0 0 0 2px ${C.primario}44` }}
        >
          <div style={{ ...NUM, fontSize: 46, fontWeight: 800, color: C.primario, letterSpacing: "0.18em" }}>
            {pin}
          </div>
        </div>

        <div
          className="mt-3 rounded-xl p-3 text-xs"
          style={{ background: `${C.oro}1A`, color: C.tinta, border: `1px solid ${C.oro}55` }}
        >
          Anótalo ahora: por seguridad no se vuelve a mostrar. Si se pierde, puedes generar
          uno nuevo desde la ficha del jugador.
        </div>

        <div className="flex gap-2 mt-4">
          <div className="flex-1">
            <Boton ancho tono="fantasma" onClick={copiar}>
              {copiado ? <><Check size={16} /> ¡Copiado!</> : <><Copy size={16} /> Copiar</>}
            </Boton>
          </div>
          <div className="flex-1">
            <Boton ancho onClick={compartir}><Share2 size={16} /> Compartir</Boton>
          </div>
        </div>

        <div className="mt-2">
          <Boton ancho tono="suave" onClick={onCerrar}>Ya lo anoté</Boton>
        </div>
      </div>
    </div>
  );
}
