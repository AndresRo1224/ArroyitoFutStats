import React, { useMemo } from "react";
import { Calendar, Plus } from "lucide-react";
import { C, PETOS, NUM, ROTULO, SOMBRA } from "../tema";
import { Rotulo, Boton, Marcador, Vacio } from "../components/ui";
import { fechaCorta, nombreCorto } from "../lib/util";

export default function Partidos({ partidos, jugadores, nuevo, editar }) {
  const nombreDe = useMemo(() => Object.fromEntries(jugadores.map((j) => [j.id, j.nombre])), [jugadores]);

  return (
    <div className="pb-6">
      <div className="px-4 pt-4">
        <Boton ancho onClick={nuevo} disabled={!jugadores.length}>
          <Plus size={18} /> Registrar partido
        </Boton>
        {!jugadores.length && (
          <div className="text-xs mt-2" style={{ color: C.humo }}>Primero agrega jugadores en la pestaña Nómina.</div>
        )}
      </div>

      {!partidos.length ? (
        <Vacio
          icono={<Calendar size={26} color={C.primario} />}
          titulo="Sin partidos aún"
          texto="Cada domingo marca quién vino y anota goles y asistencias."
        />
      ) : (
        <div className="px-4 pt-5 space-y-2">
          <Rotulo>Historial</Rotulo>
          {partidos.map((p) => {
            const goles = Object.values(p.g || {}).reduce((s, v) => s + v, 0);
            const asis = Object.values(p.a || {}).reduce((s, v) => s + v, 0);
            const top = p.att.slice().sort((x, y) => ((p.g && p.g[y]) || 0) - ((p.g && p.g[x]) || 0))[0];
            const [dia, mes] = fechaCorta(p.fecha).split(" ");
            return (
              <button
                key={p.id}
                onClick={() => editar(p)}
                className="w-full rounded-2xl p-3 flex items-center gap-3 text-left active:scale-[0.99] transition"
                style={{ background: C.tarjeta, boxShadow: SOMBRA }}
              >
                <div className="rounded-xl px-2 py-1.5 text-center" style={{ background: `${C.primario}14`, minWidth: 52 }}>
                  <div style={{ ...NUM, color: C.primarioOsc, fontSize: 16, fontWeight: 800 }}>{dia}</div>
                  <div style={{ ...ROTULO, fontSize: 9, color: C.primarioOsc }}>{mes}</div>
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-bold" style={{ color: C.tinta }}>{p.att.length} jugadores</div>
                  <div className="text-xs truncate" style={{ color: C.humo }}>
                    {goles > 0 && top ? `Más goles: ${nombreCorto(nombreDe[top] || "—")}` : "Sin goles registrados"}
                  </div>
                </div>
                <div className="flex gap-3 pr-1">
                  <Marcador valor={goles} etiqueta="G" color={C.oro} />
                  <Marcador valor={asis} etiqueta="A" color={PETOS[1].hex} />
                </div>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
