import React, { useMemo, useState } from "react";
import { ArrowLeft, Trash2, Users, ListChecks, Trophy, Pencil, Swords } from "lucide-react";
import { C, PETOS, NUM, ROTULO, SOMBRA } from "../tema";
import { Avatar, Boton, Rotulo } from "../components/ui";
import { dec1, fechaLarga, notaPartido, votacionAbierta, mvpDePartido, partidoConResultado, equipoGanador } from "../lib/util";
import VotacionMVP from "./VotacionMVP";

const TABS = [
  { id: "asistencia", label: "Asistencia", icono: Users },
  { id: "datos", label: "Datos", icono: ListChecks },
  { id: "mvp", label: "MVP", icono: Trophy },
];

// Detalle de un partido con TRES apartados separados: asistencia, datos y la
// votación del MVP. El administrador puede editar cada uno o borrar el partido.
export default function DetallePartido({
  partido, jugadores, votos, onVotar, esAdmin,
  onEditarAsistencia, onEditarDatos, onEditarResultado, onBorrar, onCerrar,
}) {
  const [tab, setTab] = useState("datos");
  const nombreDe = useMemo(() => Object.fromEntries(jugadores.map((j) => [j.id, j.nombre])), [jugadores]);
  const presentes = partido.att.filter((id) => nombreDe[id]);
  const tarjeta = { background: C.tarjeta, boxShadow: SOMBRA };

  const totalG = presentes.reduce((s, id) => s + ((partido.g && partido.g[id]) || 0), 0);
  const totalA = presentes.reduce((s, id) => s + ((partido.a && partido.a[id]) || 0), 0);
  const totalAt = presentes.reduce((s, id) => s + ((partido.at && partido.at[id]) || 0), 0);
  const totalAg = presentes.reduce((s, id) => s + ((partido.ag && partido.ag[id]) || 0), 0);
  const conVotacion = votacionAbierta(partido);
  const mvp = mvpDePartido(partido, (votos && votos.conteo) || {});

  const conResultado = partidoConResultado(partido);
  const ganador = equipoGanador(partido);
  const marc = conResultado ? partido.marcador : [];

  return (
    <div className="fixed inset-0 z-[60] flex flex-col" style={{ background: C.fondo }}>
      <div className="flex items-center gap-3 px-4 py-3 shrink-0" style={{ background: C.tarjeta, boxShadow: SOMBRA }}>
        <button onClick={onCerrar} className="p-1 active:opacity-60"><ArrowLeft size={22} color={C.tinta} /></button>
        <div className="flex-1 min-w-0">
          <div className="font-extrabold capitalize truncate" style={{ color: C.tinta }}>{fechaLarga(partido.fecha)}</div>
          <div className="text-xs" style={{ color: C.humo }}>
            {presentes.length} jugadores{conVotacion ? " · votación abierta" : mvp ? ` · MVP ${nombreDe[mvp]}` : ""}
          </div>
        </div>
        {esAdmin && (
          <button onClick={onBorrar} className="p-2 active:opacity-60" title="Borrar partido"><Trash2 size={19} color={C.alerta} /></button>
        )}
      </div>

      {/* Pestañas */}
      <div className="flex gap-1 px-3 py-2 shrink-0" style={{ background: C.tarjeta, boxShadow: SOMBRA }}>
        {TABS.map((t) => {
          const Ico = t.icono;
          const on = tab === t.id;
          return (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              className="flex-1 flex items-center justify-center gap-1.5 rounded-xl py-2 text-sm font-bold transition"
              style={{ background: on ? C.primario : C.tarjeta2, color: on ? C.sobrePrimario : C.humo }}
            >
              <Ico size={15} /> {t.label}
            </button>
          );
        })}
      </div>

      <div className="flex-1 overflow-y-auto p-4" style={{ paddingBottom: "calc(24px + env(safe-area-inset-bottom))" }}>
        {tab === "asistencia" && (
          <>
            <div className="flex items-center justify-between mb-3">
              <Rotulo>Jugaron · {presentes.length}</Rotulo>
              {esAdmin && (
                <button onClick={onEditarAsistencia} className="text-xs font-bold flex items-center gap-1" style={{ color: C.primario }}>
                  <Pencil size={13} /> Editar
                </button>
              )}
            </div>
            {presentes.length ? (
              <div className="grid grid-cols-4 gap-2">
                {presentes.map((id) => (
                  <div key={id} className="rounded-2xl py-3 flex flex-col items-center gap-1.5" style={tarjeta}>
                    <Avatar id={id} nombre={nombreDe[id]} tam={42} />
                    <div className="text-xs font-semibold text-center px-1 truncate w-full" style={{ color: C.tinta }}>
                      {nombreDe[id].split(" ")[0]}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-sm text-center py-8" style={{ color: C.humo }}>Nadie marcado en este partido.</div>
            )}
          </>
        )}

        {tab === "datos" && (
          <>
            {conResultado ? (
              <div className="rounded-2xl p-3 mb-3" style={tarjeta}>
                <div className="flex items-center justify-between mb-2">
                  <Rotulo>Marcador</Rotulo>
                  {esAdmin && onEditarResultado && (
                    <button onClick={onEditarResultado} className="text-xs font-bold flex items-center gap-1" style={{ color: C.primario }}>
                      <Pencil size={13} /> Editar
                    </button>
                  )}
                </div>
                <div className="flex items-stretch gap-2">
                  {marc.map((golT, t) => {
                    const gana = ganador === t;
                    return (
                      <div key={t} className="flex-1 rounded-xl py-2 text-center" style={{ background: gana ? `${PETOS[t].hex}1A` : C.tarjeta2, boxShadow: gana ? `inset 0 0 0 1.5px ${PETOS[t].hex}` : "none" }}>
                        <div className="flex items-center justify-center gap-1.5">
                          <div className="rounded-full" style={{ width: 10, height: 10, background: PETOS[t].hex }} />
                          <div className="text-xs font-bold truncate" style={{ color: C.tinta }}>{PETOS[t].nombre}</div>
                        </div>
                        <div style={{ ...NUM, color: gana ? PETOS[t].hex : C.tinta, fontSize: 26, fontWeight: 800, lineHeight: 1.15 }}>{golT}</div>
                      </div>
                    );
                  })}
                </div>
                <div className="text-center text-xs font-bold mt-2" style={{ color: ganador < 0 ? C.humo : PETOS[ganador].hex }}>
                  {ganador < 0 ? "Empate 🤝" : `Ganó ${PETOS[ganador].nombre} 🏆`}
                </div>
              </div>
            ) : esAdmin && onEditarResultado ? (
              <button
                onClick={onEditarResultado}
                className="w-full flex items-center justify-center gap-2 rounded-2xl py-3 mb-3 font-bold text-sm active:scale-[0.99] transition"
                style={{ ...tarjeta, color: C.primario }}
              >
                <Swords size={16} /> Registrar resultado y equipos
              </button>
            ) : null}

            <div className="flex gap-3 mb-3">
              <div className="flex-1 rounded-2xl py-3 text-center" style={tarjeta}>
                <div style={{ ...NUM, color: C.oro, fontSize: 22, fontWeight: 800 }}>{totalG}</div>
                <div style={ROTULO}>Goles</div>
              </div>
              <div className="flex-1 rounded-2xl py-3 text-center" style={tarjeta}>
                <div style={{ ...NUM, color: PETOS[1].hex, fontSize: 22, fontWeight: 800 }}>{totalA}</div>
                <div style={ROTULO}>Asist.</div>
              </div>
              <div className="flex-1 rounded-2xl py-3 text-center" style={tarjeta}>
                <div style={{ ...NUM, color: PETOS[5].hex, fontSize: 22, fontWeight: 800 }}>{totalAt}</div>
                <div style={ROTULO}>Atajadas</div>
              </div>
              {totalAg > 0 && (
                <div className="flex-1 rounded-2xl py-3 text-center" style={tarjeta}>
                  <div style={{ ...NUM, color: C.alerta, fontSize: 22, fontWeight: 800 }}>{totalAg}</div>
                  <div style={ROTULO}>Autogol</div>
                </div>
              )}
            </div>

            <div className="flex items-center justify-between mb-2">
              <Rotulo>Por jugador</Rotulo>
              {esAdmin && (
                <button onClick={onEditarDatos} className="text-xs font-bold flex items-center gap-1" style={{ color: C.primario }}>
                  <Pencil size={13} /> Editar
                </button>
              )}
            </div>
            <div className="rounded-2xl overflow-hidden" style={tarjeta}>
              {presentes.map((id, i) => {
                const g = (partido.g && partido.g[id]) || 0;
                const a = (partido.a && partido.a[id]) || 0;
                const at = (partido.at && partido.at[id]) || 0;
                const ag = (partido.ag && partido.ag[id]) || 0;
                return (
                  <div key={id} className="flex items-center gap-2 px-3 py-2.5" style={{ borderTop: i ? `1px solid ${C.linea}` : "none" }}>
                    <Avatar id={id} nombre={nombreDe[id]} tam={30} />
                    {partido.equipo && partido.equipo[id] !== undefined && (
                      <div className="rounded-full shrink-0" style={{ width: 9, height: 9, background: PETOS[partido.equipo[id]].hex }} title={PETOS[partido.equipo[id]].nombre} />
                    )}
                    <div className="flex-1 text-sm font-semibold truncate" style={{ color: C.tinta }}>{nombreDe[id]}</div>
                    <div style={{ ...NUM, color: C.oro, fontSize: 13, fontWeight: 700, width: 30, textAlign: "right" }}>{g}G</div>
                    <div style={{ ...NUM, color: PETOS[1].hex, fontSize: 13, fontWeight: 700, width: 30, textAlign: "right" }}>{a}A</div>
                    <div style={{ ...NUM, color: PETOS[5].hex, fontSize: 13, fontWeight: 700, width: 38, textAlign: "right" }}>{at}AT</div>
                    {ag > 0 && (
                      <div style={{ ...NUM, color: C.alerta, fontSize: 13, fontWeight: 800, width: 38, textAlign: "right" }}>{ag}AG</div>
                    )}
                    <div className="rounded-lg px-2 py-0.5 ml-1" style={{ ...NUM, background: `${C.primario}18`, color: C.primarioOsc, fontSize: 12, fontWeight: 800, minWidth: 38, textAlign: "center" }}>
                      {dec1(notaPartido(g, a, at, ag))}
                    </div>
                  </div>
                );
              })}
            </div>
          </>
        )}

        {tab === "mvp" && (
          <VotacionMVP partido={partido} jugadores={jugadores} votos={votos} onVotar={onVotar} />
        )}
      </div>
    </div>
  );
}
