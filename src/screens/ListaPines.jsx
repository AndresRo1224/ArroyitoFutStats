import React, { useEffect, useState } from "react";
import { ArrowLeft, Copy, Check, Share2, Download, RefreshCw, KeyRound, Loader2 } from "lucide-react";
import { C, NUM, SOMBRA } from "../tema";
import { Avatar, Boton, Rotulo } from "../components/ui";
import * as nube from "../lib/nube";

// Lista para repartir los PIN. Como el servidor solo guarda el hash, aquí se
// muestran los que ESTE teléfono generó (quedan anotados en su libreta local).
// A quien no tenga PIN, o lo tenga generado en otro dispositivo, se le puede
// generar uno nuevo desde aquí.
export default function ListaPines({ jugadores, grupo, cerrar, avisar }) {
  const [vistos, setVistos] = useState(nube.pinesRecordados());
  const [conPin, setConPin] = useState(null); // ids que ya tienen PIN en la nube
  const [copiado, setCopiado] = useState(false);
  const [generando, setGenerando] = useState(null); // id en curso, o "faltantes"

  useEffect(() => {
    if (!nube.nubeActiva()) { setConPin(Object.keys(nube.pinesRecordados())); return; }
    nube.quienesTienenPin()
      .then((r) => setConPin(r.conPin || []))
      .catch(() => setConPin(null));
  }, []);

  const conocidos = jugadores.filter((j) => vistos[j.id]);
  const faltantes = jugadores.filter((j) => !vistos[j.id]);

  const texto = () => {
    let t = `🔑 PIN de ${grupo}\n\n`;
    conocidos.forEach((j) => { t += `${j.nombre}: ${vistos[j.id]}\n`; });
    t += `\nCada uno usa su PIN para subir su propia foto en la app.`;
    return t;
  };

  const copiar = async () => {
    try { await navigator.clipboard.writeText(texto()); } catch { /* queda visible abajo */ }
    setCopiado(true);
    setTimeout(() => setCopiado(false), 2000);
  };

  const compartir = async () => {
    if (navigator.share) {
      try { await navigator.share({ text: texto() }); return; } catch { /* cancelado */ }
    }
    copiar();
  };

  const descargar = () => {
    const blob = new Blob([texto()], { type: "text/plain;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `pines-${new Date().toISOString().slice(0, 10)}.txt`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  };

  const generarUno = async (j) => {
    setGenerando(j.id);
    try {
      await nube.generarPin(j.id);
      setVistos(nube.pinesRecordados());
      setConPin((c) => (c && c.includes(j.id) ? c : [...(c || []), j.id]));
    } catch (e) {
      avisar("No se pudo generar: " + e.message);
    } finally {
      setGenerando(null);
    }
  };

  const generarFaltantes = async () => {
    setGenerando("faltantes");
    let fallos = 0;
    for (const j of faltantes) {
      try { await nube.generarPin(j.id); } catch { fallos++; }
    }
    setVistos(nube.pinesRecordados());
    try {
      const r = await nube.quienesTienenPin();
      setConPin(r.conPin || []);
    } catch { /* da igual */ }
    setGenerando(null);
    avisar(fallos ? `Quedaron ${fallos} sin generar.` : "PIN generados.");
  };

  return (
    <div className="fixed inset-0 z-[65] flex flex-col" style={{ background: C.fondo }}>
      <div
        className="flex items-center gap-3 px-4 py-3 shrink-0"
        style={{ background: C.tarjeta, boxShadow: SOMBRA, paddingTop: "calc(12px + env(safe-area-inset-top))" }}
      >
        <button onClick={cerrar} className="p-1 active:opacity-60"><ArrowLeft size={22} color={C.tinta} /></button>
        <div className="flex-1 font-extrabold text-base" style={{ color: C.tinta }}>PIN de los jugadores</div>
      </div>

      <div className="flex-1 overflow-y-auto p-4" style={{ paddingBottom: "calc(24px + env(safe-area-inset-bottom))" }}>
        {!jugadores.length ? (
          <div className="text-sm text-center py-10" style={{ color: C.humo }}>
            Todavía no hay nadie en la nómina.
          </div>
        ) : (
          <>
            {conocidos.length > 0 && (
              <>
                <Rotulo>Listos para repartir · {conocidos.length}</Rotulo>
                <div className="mt-2 rounded-2xl overflow-hidden" style={{ background: C.tarjeta, boxShadow: SOMBRA }}>
                  {conocidos.map((j, i) => (
                    <div
                      key={j.id}
                      className="flex items-center gap-3 px-3 py-2.5"
                      style={{ borderTop: i ? `1px solid ${C.linea}` : "none" }}
                    >
                      <Avatar id={j.id} nombre={j.nombre} tam={34} />
                      <div className="flex-1 text-sm font-semibold truncate" style={{ color: C.tinta }}>{j.nombre}</div>
                      <div
                        className="rounded-lg px-2.5 py-1"
                        style={{ ...NUM, background: `${C.primario}18`, color: C.primarioOsc, fontSize: 15, fontWeight: 800, letterSpacing: "0.1em" }}
                      >
                        {vistos[j.id]}
                      </div>
                      <button onClick={() => generarUno(j)} className="p-1.5 active:opacity-60" title="Generar otro">
                        {generando === j.id
                          ? <Loader2 size={15} color={C.humo} className="animate-spin" />
                          : <RefreshCw size={15} color={C.humo} />}
                      </button>
                    </div>
                  ))}
                </div>

                <div className="flex gap-2 mt-3">
                  <div className="flex-1">
                    <Boton ancho onClick={compartir}><Share2 size={16} /> Compartir</Boton>
                  </div>
                  <div className="flex-1">
                    <Boton ancho tono="fantasma" onClick={copiar}>
                      {copiado ? <><Check size={16} /> ¡Copiado!</> : <><Copy size={16} /> Copiar</>}
                    </Boton>
                  </div>
                </div>
                <div className="mt-2">
                  <Boton ancho tono="suave" onClick={descargar}><Download size={16} /> Descargar como archivo</Boton>
                </div>
              </>
            )}

            {faltantes.length > 0 && (
              <div className="mt-6">
                <Rotulo>Sin PIN a la mano · {faltantes.length}</Rotulo>
                <div className="text-xs mt-1 mb-2" style={{ color: C.humo }}>
                  De estos no tengo el PIN en este teléfono. Genera uno nuevo para poder
                  entregárselo (si ya tenían uno, dejará de servirles).
                </div>
                <div className="rounded-2xl overflow-hidden" style={{ background: C.tarjeta, boxShadow: SOMBRA }}>
                  {faltantes.map((j, i) => (
                    <div
                      key={j.id}
                      className="flex items-center gap-3 px-3 py-2.5"
                      style={{ borderTop: i ? `1px solid ${C.linea}` : "none" }}
                    >
                      <Avatar id={j.id} nombre={j.nombre} tam={34} />
                      <div className="flex-1 min-w-0">
                        <div className="text-sm font-semibold truncate" style={{ color: C.tinta }}>{j.nombre}</div>
                        <div className="text-xs" style={{ color: C.humo }}>
                          {conPin === null
                            ? "—"
                            : conPin.includes(j.id)
                              ? "Ya tiene PIN (generado en otro dispositivo)"
                              : "Todavía no tiene PIN"}
                        </div>
                      </div>
                      <button
                        onClick={() => generarUno(j)}
                        className="rounded-xl px-3 py-2 text-xs font-bold active:opacity-60"
                        style={{ background: `${C.primario}18`, color: C.primarioOsc }}
                      >
                        {generando === j.id ? "…" : "Generar"}
                      </button>
                    </div>
                  ))}
                </div>
                <div className="mt-3">
                  <Boton ancho tono="fantasma" onClick={generarFaltantes} disabled={generando === "faltantes"}>
                    {generando === "faltantes"
                      ? <><Loader2 size={16} className="animate-spin" /> Generando…</>
                      : <><KeyRound size={16} /> Generar los {faltantes.length} que faltan</>}
                  </Boton>
                </div>
              </div>
            )}

            {conocidos.length > 0 && (
              <div className="mt-6">
                <Rotulo>Mensaje que se envía</Rotulo>
                <pre
                  className="mt-2 rounded-xl p-3 text-xs whitespace-pre-wrap select-all"
                  style={{ background: C.tarjeta, color: C.humo, boxShadow: SOMBRA }}
                >
                  {texto()}
                </pre>
              </div>
            )}

            <div className="text-xs mt-5" style={{ color: C.humo }}>
              Estos PIN quedan anotados solo en este teléfono. En el servidor se guardan
              cifrados y no se pueden consultar: si cambias de teléfono, tendrás que
              generarlos de nuevo.
            </div>
          </>
        )}
      </div>
    </div>
  );
}
