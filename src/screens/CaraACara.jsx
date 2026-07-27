import React, { useMemo, useState } from "react";
import { ArrowLeft, Swords } from "lucide-react";
import { C, NUM, ROTULO, SOMBRA } from "../tema";
import { Avatar } from "../components/ui";
import { dec, dec1, filaVacia, rachasJugador } from "../lib/util";

// Compara dos jugadores lado a lado. Resalta en verde quién gana cada categoría
// y al final declara quién ganó más categorías. Todo se calcula con datos que ya
// existen (tabla + trofeos), no toca el modelo de datos.
export default function CaraACara({ jugadores, tabla, partidos, trofeos, inicialA, onCerrar }) {
  const hay = jugadores.length >= 2;
  const primero = inicialA || (jugadores[0] && jugadores[0].id);
  const segundo = jugadores.find((j) => j.id !== primero)?.id;
  const [idA, setIdA] = useState(primero);
  const [idB, setIdB] = useState(segundo);

  const mapaTabla = useMemo(() => Object.fromEntries(tabla.map((t) => [t.id, t])), [tabla]);
  const nombreDe = useMemo(() => Object.fromEntries(jugadores.map((j) => [j.id, j.nombre])), [jugadores]);
  const statsDe = (id) => ({ ...filaVacia, id, nombre: nombreDe[id], ...(mapaTabla[id] || {}) });
  const mvpDe = (id) => (trofeos && trofeos.mvp && trofeos.mvp[id]) || 0;

  const A = statsDe(idA);
  const B = statsDe(idB);

  // et: etiqueta · num: valor numérico para comparar · txt: cómo se muestra · mejor: alto|bajo
  const filas = [
    { et: "Partidos", num: (t) => t.pj, txt: (t) => t.pj, mejor: "alto" },
    { et: "Goles", num: (t) => t.goles, txt: (t) => t.goles, mejor: "alto" },
    { et: "Asistencias", num: (t) => t.asis, txt: (t) => t.asis, mejor: "alto" },
    { et: "Atajadas", num: (t) => t.atajadas, txt: (t) => t.atajadas, mejor: "alto" },
    { et: "Nota media", num: (t) => t.nota, txt: (t) => (t.pj ? dec1(t.nota) : "—"), mejor: "alto" },
    { et: "Goles/partido", num: (t) => t.promGoles, txt: (t) => (t.pj ? dec(t.promGoles) : "—"), mejor: "alto" },
    { et: "% Asistencia", num: (t) => t.presencia, txt: (t) => `${Math.round(t.presencia * 100)}%`, mejor: "alto" },
    { et: "MVP", num: (t) => mvpDe(t.id), txt: (t) => mvpDe(t.id), mejor: "alto" },
    { et: "Racha goleadora", num: (t) => rachasJugador(t.id, partidos).goleadora, txt: (t) => rachasJugador(t.id, partidos).goleadora, mejor: "alto" },
    { et: "Autogoles", num: (t) => t.autogoles, txt: (t) => t.autogoles, mejor: "bajo" },
  ];

  const comparado = filas.map((f) => {
    const na = f.num(A), nb = f.num(B);
    let wa = false, wb = false;
    if (na !== nb) {
      const aGana = f.mejor === "bajo" ? na < nb : na > nb;
      wa = aGana; wb = !aGana;
    }
    return { f, wa, wb };
  });
  const winsA = comparado.filter((c) => c.wa).length;
  const winsB = comparado.filter((c) => c.wb).length;

  const Selector = ({ valor, fijar, excluir }) => (
    <select
      value={valor}
      onChange={(e) => fijar(e.target.value)}
      className="w-full rounded-xl px-2 py-2 text-sm font-bold outline-none text-center appearance-none"
      style={{ background: C.tarjeta2, color: C.tinta, border: `1px solid ${C.linea}` }}
    >
      {jugadores.map((j) => (
        <option key={j.id} value={j.id} disabled={j.id === excluir}>{j.nombre}</option>
      ))}
    </select>
  );

  const Columna = ({ id }) => (
    <div className="flex-1 flex flex-col items-center gap-2 min-w-0">
      <Avatar id={id} nombre={nombreDe[id]} tam={64} borde={C.primario} />
      <div className="font-extrabold text-sm text-center truncate w-full px-1" style={{ color: C.tinta }}>
        {nombreDe[id]}
      </div>
    </div>
  );

  return (
    <div className="fixed inset-0 z-[60] flex flex-col" style={{ background: C.fondo }}>
      <div className="flex items-center gap-3 px-4 py-3 shrink-0" style={{ background: C.tarjeta, boxShadow: SOMBRA }}>
        <button onClick={onCerrar} className="p-1 active:opacity-60"><ArrowLeft size={22} color={C.tinta} /></button>
        <div className="flex items-center gap-2 flex-1">
          <Swords size={18} color={C.primario} />
          <div className="font-extrabold" style={{ color: C.tinta }}>Cara a Cara</div>
        </div>
      </div>

      {!hay ? (
        <div className="flex-1 flex items-center justify-center px-8 text-center text-sm" style={{ color: C.humo }}>
          Necesitas al menos dos jugadores en la nómina para comparar.
        </div>
      ) : (
        <div className="flex-1 overflow-y-auto p-4" style={{ paddingBottom: "calc(24px + env(safe-area-inset-bottom))" }}>
          {/* Selectores */}
          <div className="flex items-center gap-2 mb-3">
            <div className="flex-1"><Selector valor={idA} fijar={setIdA} excluir={idB} /></div>
            <div style={{ ...ROTULO, color: C.humo }}>VS</div>
            <div className="flex-1"><Selector valor={idB} fijar={setIdB} excluir={idA} /></div>
          </div>

          {/* Retratos */}
          <div className="rounded-2xl p-4 mb-3 flex items-center gap-2" style={{ background: C.tarjeta, boxShadow: SOMBRA }}>
            <Columna id={idA} />
            <div
              className="rounded-full px-3 py-1.5 shrink-0 font-extrabold text-xs"
              style={{ background: `${C.primario}18`, color: C.primario }}
            >
              VS
            </div>
            <Columna id={idB} />
          </div>

          {/* Tabla comparativa */}
          <div className="rounded-2xl overflow-hidden" style={{ background: C.tarjeta, boxShadow: SOMBRA }}>
            {comparado.map(({ f, wa, wb }, i) => (
              <div key={f.et} className="flex items-center px-3 py-2.5" style={{ borderTop: i ? `1px solid ${C.linea}` : "none" }}>
                <div className="flex-1 text-left" style={{ ...NUM, fontSize: 15, color: wa ? C.primario : C.tinta, fontWeight: wa ? 800 : 600 }}>
                  {f.txt(A)}
                </div>
                <div className="px-2 text-center shrink-0" style={{ ...ROTULO, fontSize: 9, width: 118 }}>{f.et}</div>
                <div className="flex-1 text-right" style={{ ...NUM, fontSize: 15, color: wb ? C.primario : C.tinta, fontWeight: wb ? 800 : 600 }}>
                  {f.txt(B)}
                </div>
              </div>
            ))}
          </div>

          {/* Marcador de categorías */}
          <div className="rounded-2xl p-4 mt-3 text-center" style={{ background: `linear-gradient(135deg, ${C.tarjeta}, ${C.primario}14)`, boxShadow: SOMBRA }}>
            <div style={{ ...ROTULO }}>Gana categorías</div>
            <div className="flex items-center justify-center gap-3 mt-1">
              <span style={{ ...NUM, fontSize: 28, fontWeight: 800, color: winsA > winsB ? C.primario : C.humo }}>{winsA}</span>
              <span className="text-sm" style={{ color: C.humo }}>—</span>
              <span style={{ ...NUM, fontSize: 28, fontWeight: 800, color: winsB > winsA ? C.primario : C.humo }}>{winsB}</span>
            </div>
            <div className="text-sm font-bold mt-1" style={{ color: C.tinta }}>
              {winsA === winsB ? "¡Empate técnico!" : `Gana ${nombreDe[winsA > winsB ? idA : idB]} 🏆`}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
