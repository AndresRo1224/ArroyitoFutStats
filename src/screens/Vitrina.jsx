import React, { useMemo } from "react";
import { Trophy, Zap, Target, Calendar, Crown, Medal, Frown, Hand, Award, Star, Flame, Ghost, Rocket, Siren } from "lucide-react";
import { C, NUM, ROTULO, SOMBRA } from "../tema";
import { Avatar, Rotulo, Vacio } from "../components/ui";
import { calcularTrofeos, nombreCorto } from "../lib/util";

const ICONO = {
  goleador: Trophy, asistidor: Zap, nota: Target, constante: Calendar, reyMvp: Crown,
  muro: Hand, hattrick: Award, mes: Star, racha: Flame, campeon: Medal, imparable: Rocket,
  topo: Frown, fantasma: Ghost, fifa: Siren,
};

export default function Vitrina({ tabla, partidos, votos, jugadores, abrirJugador }) {
  const { titulos, mvp } = useMemo(
    () => calcularTrofeos(tabla, partidos, votos || {}),
    [tabla, partidos, votos]
  );
  const nombreDe = useMemo(() => Object.fromEntries(jugadores.map((j) => [j.id, j.nombre])), [jugadores]);
  const rankingMvp = Object.entries(mvp).sort((a, b) => b[1] - a[1]);

  if (!jugadores.length) {
    return (
      <Vacio
        icono={<Trophy size={26} color={C.oro} />}
        titulo="Vitrina vacía"
        texto="Cuando el grupo juegue y vote, aquí se llenan los trofeos."
      />
    );
  }

  return (
    <div className="pb-6">
      <div className="px-4 pt-4">
        <div className="rounded-2xl p-4 flex items-center gap-3" style={{ background: `linear-gradient(135deg, ${C.tarjeta}, ${C.oro}1A)`, boxShadow: SOMBRA }}>
          <div className="rounded-2xl p-2.5" style={{ background: `${C.oro}22` }}>
            <Medal size={22} color={C.oro} />
          </div>
          <div>
            <div className="font-extrabold text-base" style={{ color: C.tinta }}>Vitrina de trofeos</div>
            <div className="text-xs" style={{ color: C.humo }}>Los títulos del grupo, siempre al día</div>
          </div>
        </div>
      </div>

      <div className="px-4 pt-4 space-y-2">
        {titulos.map((t) => {
          const Ico = ICONO[t.clave] || Trophy;
          const tono = t.tono === "alerta" ? C.alerta : C.oro;
          return (
            <button
              key={t.clave}
              onClick={() => t.jugador && abrirJugador(t.jugador.id)}
              className="w-full rounded-2xl p-3.5 flex items-center gap-3 text-left active:scale-[0.99] transition"
              style={{ background: C.tarjeta, boxShadow: SOMBRA }}
            >
              <div className="rounded-xl p-2.5 shrink-0" style={{ background: `${tono}18` }}>
                <Ico size={20} color={tono} />
              </div>
              <div className="flex-1 min-w-0">
                <div className="font-extrabold text-sm" style={{ color: C.tinta }}>{t.nombre}</div>
                <div style={{ ...ROTULO, fontSize: 9 }}>{t.detalle}</div>
              </div>
              {t.jugador ? (
                <div className="flex items-center gap-2 shrink-0">
                  <div className="text-right">
                    <div className="text-sm font-bold truncate" style={{ color: C.tinta, maxWidth: 96 }}>{nombreCorto(t.jugador.nombre)}</div>
                    <div style={{ ...NUM, color: tono, fontSize: 11, fontWeight: 700 }}>{t.valor(t.jugador)}</div>
                  </div>
                  <Avatar id={t.jugador.id} nombre={t.jugador.nombre} tam={40} borde={tono} />
                </div>
              ) : (
                <div className="text-xs" style={{ color: C.humo }}>Sin dueño aún</div>
              )}
            </button>
          );
        })}
      </div>

      <div className="px-4 pt-6">
        <Rotulo>Palmarés de MVP</Rotulo>
        {rankingMvp.length ? (
          <div className="mt-2 rounded-2xl overflow-hidden" style={{ background: C.tarjeta, boxShadow: SOMBRA }}>
            {rankingMvp.map(([id, n], i) => (
              <button
                key={id}
                onClick={() => abrirJugador(id)}
                className="w-full flex items-center gap-3 px-3 py-2.5 text-left active:opacity-60"
                style={{ borderTop: i ? `1px solid ${C.linea}` : "none" }}
              >
                <div className="w-5 text-center" style={{ ...NUM, color: i === 0 ? C.oro : C.humo, fontWeight: 800, fontSize: 13 }}>{i + 1}</div>
                <Avatar id={id} nombre={nombreDe[id]} tam={32} borde={i === 0 ? C.oro : undefined} />
                <div className="flex-1 text-sm font-semibold truncate" style={{ color: C.tinta }}>{nombreDe[id]}</div>
                <div className="flex items-center gap-1">
                  <Crown size={14} color={C.oro} />
                  <span style={{ ...NUM, color: C.tinta, fontWeight: 800, fontSize: 15 }}>{n}</span>
                </div>
              </button>
            ))}
          </div>
        ) : (
          <div className="text-sm mt-2 rounded-2xl p-4 text-center" style={{ background: C.tarjeta, boxShadow: SOMBRA, color: C.humo }}>
            Todavía nadie ha ganado un MVP. Vota al terminar cada partido.
          </div>
        )}
      </div>
    </div>
  );
}
