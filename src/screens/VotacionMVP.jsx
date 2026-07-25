import React, { useMemo, useState } from "react";
import { Crown, Check, Loader2, Trophy, CheckCircle2 } from "lucide-react";
import { C, NUM, SOMBRA } from "../tema";
import { Avatar, Boton, Rotulo } from "../components/ui";
import { nombreCorto, votacionAbierta, cierreVotacion, mvpDePartido } from "../lib/util";

const faltaTexto = (ms) => {
  if (ms <= 0) return "cerrada";
  const h = Math.floor(ms / 3600000);
  const m = Math.floor((ms % 3600000) / 60000);
  return h >= 1 ? `cierra en ${h}h ${m}m` : `cierra en ${m}m`;
};

// Contenido de la votación del MVP (sin encabezado): se usa dentro de la pestaña
// "MVP" del detalle del partido. Cada asistente vota una vez con su PIN personal.
export default function VotacionMVP({ partido, jugadores, votos, onVotar }) {
  const nombreDe = useMemo(() => Object.fromEntries(jugadores.map((j) => [j.id, j.nombre])), [jugadores]);
  const presentes = partido.att.filter((id) => nombreDe[id]);
  const abierta = votacionAbierta(partido);
  const conteo = (votos && votos.conteo) || {};
  const votantes = (votos && votos.votantes) || [];
  const totalVotos = Object.values(conteo).reduce((s, n) => s + n, 0);
  const mvp = mvpDePartido(partido, conteo);

  const [yo, setYo] = useState(null);
  const [pin, setPin] = useState("");
  const [elegido, setElegido] = useState(null);
  const [error, setError] = useState("");
  const [enviando, setEnviando] = useState(false);

  const yaVote = yo && votantes.includes(yo);
  const verConteo = !abierta || yaVote;

  const enviar = async () => {
    if (!yo) return setError("Elige quién eres.");
    if (pin.trim().length < 4) return setError("Escribe tu PIN.");
    if (!elegido) return setError("Elige al MVP.");
    setEnviando(true);
    setError("");
    try {
      await onVotar(partido.id, yo, pin.trim(), elegido);
      setPin("");
    } catch (e) {
      setError(e.message || "No se pudo votar.");
    } finally {
      setEnviando(false);
    }
  };

  const tarjeta = { background: C.tarjeta, boxShadow: SOMBRA };
  const ordenPorVotos = presentes.slice().sort((a, b) => (conteo[b] || 0) - (conteo[a] || 0));

  return (
    <div>
      {/* Estado de la votación */}
      <div className="rounded-2xl p-4 flex items-center gap-3" style={tarjeta}>
        <div className="rounded-xl p-2.5" style={{ background: abierta ? `${C.primario}18` : `${C.oro}1A` }}>
          {abierta ? <Trophy size={20} color={C.primario} /> : <Crown size={20} color={C.oro} />}
        </div>
        {abierta ? (
          <div className="flex-1">
            <div className="font-bold text-sm" style={{ color: C.tinta }}>Votación abierta</div>
            <div className="text-xs" style={{ color: C.humo }}>{faltaTexto(cierreVotacion(partido) - Date.now())} · {totalVotos} votos</div>
          </div>
        ) : mvp ? (
          <div className="flex-1 flex items-center gap-2">
            <Avatar id={mvp} nombre={nombreDe[mvp]} tam={40} borde={C.oro} />
            <div>
              <div className="font-extrabold text-sm" style={{ color: C.tinta }}>{nombreDe[mvp]}</div>
              <div className="text-xs" style={{ color: C.humo }}>MVP · {conteo[mvp]} votos</div>
            </div>
          </div>
        ) : (
          <div className="flex-1">
            <div className="font-bold text-sm" style={{ color: C.tinta }}>Votación cerrada</div>
            <div className="text-xs" style={{ color: C.humo }}>No hubo votos para este partido.</div>
          </div>
        )}
      </div>

      {/* Ya votó: confirmación clara */}
      {abierta && yaVote && (
        <div className="mt-4 rounded-2xl p-3 flex items-center gap-2" style={{ background: `${C.primario}14`, boxShadow: `inset 0 0 0 1.5px ${C.primario}44` }}>
          <CheckCircle2 size={20} color={C.primario} />
          <div className="text-sm font-bold" style={{ color: C.tinta }}>¡Tu voto quedó registrado! Gracias.</div>
        </div>
      )}

      {/* Formulario de voto */}
      {abierta && !yaVote && (
        <>
          <div className="mt-5"><Rotulo>¿Quién eres?</Rotulo></div>
          <div className="grid grid-cols-4 gap-2 mt-2">
            {presentes.map((id) => (
              <button
                key={id}
                onClick={() => { setYo(id); if (elegido === id) setElegido(null); }}
                className="rounded-2xl py-2.5 flex flex-col items-center gap-1 transition active:scale-[0.97]"
                style={{ background: C.tarjeta, boxShadow: yo === id ? `inset 0 0 0 2px ${C.primario}, ${SOMBRA}` : SOMBRA }}
              >
                <Avatar id={id} nombre={nombreDe[id]} tam={38} />
                <div className="text-xs font-semibold truncate w-full text-center px-1" style={{ color: yo === id ? C.tinta : C.humo }}>
                  {nombreCorto(nombreDe[id])}
                </div>
              </button>
            ))}
          </div>

          {yo && (
            <>
              <div className="mt-4"><Rotulo>Tu PIN</Rotulo></div>
              <input
                value={pin}
                onChange={(e) => setPin(e.target.value.replace(/\D/g, "").slice(0, 12))}
                inputMode="numeric"
                placeholder="••••"
                className="w-full mt-2 rounded-xl px-3 py-3 text-center text-lg font-bold tracking-[0.4em] outline-none"
                style={{ background: C.tarjeta2, color: C.tinta, border: `1px solid ${C.linea}` }}
              />

              <div className="mt-4"><Rotulo>Tu MVP · vota por otro jugador</Rotulo></div>
              <div className="grid grid-cols-4 gap-2 mt-2">
                {presentes.filter((id) => id !== yo).map((id) => (
                  <button
                    key={id}
                    onClick={() => setElegido(id)}
                    className="rounded-2xl py-2.5 flex flex-col items-center gap-1 transition active:scale-[0.97]"
                    style={{ background: C.tarjeta, boxShadow: elegido === id ? `inset 0 0 0 2px ${C.oro}, ${SOMBRA}` : SOMBRA }}
                  >
                    <div className="relative">
                      <Avatar id={id} nombre={nombreDe[id]} tam={38} />
                      {elegido === id && (
                        <div className="absolute -top-1 -right-1 rounded-full p-0.5" style={{ background: C.oro, boxShadow: `0 0 0 2px ${C.tarjeta}` }}>
                          <Crown size={10} color="#fff" />
                        </div>
                      )}
                    </div>
                    <div className="text-xs font-semibold truncate w-full text-center px-1" style={{ color: elegido === id ? C.tinta : C.humo }}>
                      {nombreCorto(nombreDe[id])}
                    </div>
                  </button>
                ))}
              </div>

              {error && <div className="mt-3 text-sm font-semibold text-center" style={{ color: C.alerta }}>{error}</div>}

              <div className="mt-4">
                <Boton ancho onClick={enviar} disabled={enviando}>
                  {enviando ? <><Loader2 size={17} className="animate-spin" /> Enviando…</> : <><Check size={17} /> Votar</>}
                </Boton>
              </div>
            </>
          )}
        </>
      )}

      {/* Resultados */}
      {verConteo && totalVotos > 0 && (
        <div className="mt-5">
          <Rotulo>{abierta ? "Resultados en vivo" : "Resultados finales"}</Rotulo>
          <div className="mt-2 rounded-2xl overflow-hidden" style={tarjeta}>
            {ordenPorVotos.filter((id) => (conteo[id] || 0) > 0).map((id, i) => {
              const n = conteo[id] || 0;
              const pct = totalVotos ? Math.round((n / totalVotos) * 100) : 0;
              const gana = !abierta && id === mvp;
              return (
                <div key={id} className="flex items-center gap-3 px-3 py-2.5" style={{ borderTop: i ? `1px solid ${C.linea}` : "none" }}>
                  <Avatar id={id} nombre={nombreDe[id]} tam={32} borde={gana ? C.oro : undefined} />
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-semibold truncate" style={{ color: C.tinta }}>{nombreDe[id]}</div>
                    <div className="mt-1 h-1.5 rounded-full overflow-hidden" style={{ background: C.tarjeta2 }}>
                      <div className="h-full rounded-full" style={{ width: `${pct}%`, background: gana ? C.oro : C.primario }} />
                    </div>
                  </div>
                  <div style={{ ...NUM, color: C.tinta, fontWeight: 800, fontSize: 15 }}>{n}</div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {abierta && !yaVote && totalVotos > 0 && (
        <div className="mt-4 text-xs text-center" style={{ color: C.humo }}>
          {totalVotos} personas ya votaron. Vota para ver los resultados.
        </div>
      )}
    </div>
  );
}
