import React, { useState } from "react";
import { Trophy, Plus, Crown, Zap, Calendar, Target, Siren } from "lucide-react";
import { C, PETOS, NUM, ROTULO, SOMBRA } from "../tema";
import { Avatar, Rotulo, Boton, Marcador, Vacio } from "../components/ui";
import { dec, dec1, nombreCorto } from "../lib/util";

export default function Tabla({ jugadores, partidos, tabla, abrirJugador, irA }) {
  const [orden, setOrden] = useState("goles");

  if (!jugadores.length) {
    return (
      <Vacio
        icono={<Trophy size={26} color={C.primario} />}
        titulo="Todavía no hay tabla"
        texto="Agrega a los del grupo y registra el partido del domingo."
        accion={<Boton onClick={() => irA("jugadores")}><Plus size={16} /> Agregar jugadores</Boton>}
      />
    );
  }

  const conPartidos = tabla.filter((t) => t.pj > 0);
  const mejor = (campo, minPj = 1) => {
    const c = conPartidos.filter((t) => t.pj >= minPj);
    if (!c.length) return null;
    return c.slice().sort((a, b) => b[campo] - a[campo] || b.nota - a.nota)[0];
  };

  const goleador = mejor("goles");
  const lideres = [
    { t: "Asistidor", j: mejor("asis"), campo: (x) => x.asis, ic: Zap, col: PETOS[1].hex },
    { t: "Más constante", j: mejor("pj"), campo: (x) => x.pj, ic: Calendar, col: C.primario },
    { t: "Mejor nota", j: mejor("nota", Math.min(2, partidos.length)), campo: (x) => dec1(x.nota), ic: Target, col: PETOS[3].hex },
  ];

  const ordenada = tabla
    .slice()
    .sort((a, b) => b[orden] - a[orden] || b.nota - a.nota || a.nombre.localeCompare(b.nombre));
  const totalGoles = tabla.reduce((s, t) => s + t.goles, 0);

  const tarjeta = { background: C.tarjeta, boxShadow: SOMBRA };

  return (
    <div className="pb-6">
      <div className="flex gap-3 px-4 pt-4">
        <div className="flex-1 rounded-2xl py-3.5" style={tarjeta}>
          <Marcador valor={partidos.length} etiqueta="Partidos" />
        </div>
        <div className="flex-1 rounded-2xl py-3.5" style={tarjeta}>
          <Marcador valor={totalGoles} etiqueta="Goles" color={C.oro} />
        </div>
        <div className="flex-1 rounded-2xl py-3.5" style={tarjeta}>
          <Marcador valor={jugadores.length} etiqueta="Nómina" color={C.primario} />
        </div>
      </div>

      {goleador && (
        <div className="px-4 pt-5">
          <Rotulo>Bota de oro</Rotulo>
          <button
            onClick={() => abrirJugador(goleador.id)}
            className="w-full mt-2 rounded-2xl p-4 flex items-center gap-4 text-left active:scale-[0.99] transition"
            style={{ background: `linear-gradient(135deg, ${C.tarjeta}, ${C.oro}1A)`, boxShadow: `${SOMBRA}, inset 0 0 0 1.5px ${C.oro}55` }}
          >
            <div className="relative">
              <Avatar id={goleador.id} nombre={goleador.nombre} tam={64} borde={C.oro} />
              <div className="absolute -bottom-1 -right-1 rounded-full p-1" style={{ background: C.oro, boxShadow: "0 2px 6px rgba(245,165,36,0.5)" }}>
                <Crown size={13} color="#fff" />
              </div>
            </div>
            <div className="flex-1 min-w-0">
              <div className="font-extrabold text-lg truncate" style={{ color: C.tinta, letterSpacing: "-0.02em" }}>
                {goleador.nombre}
              </div>
              <div className="text-xs mt-0.5" style={{ color: C.humo }}>
                {dec(goleador.promGoles)} goles por partido
              </div>
            </div>
            <div className="text-right">
              <div style={{ ...NUM, color: C.oro, fontSize: 34, fontWeight: 800, lineHeight: 1 }}>{goleador.goles}</div>
              <Rotulo>Goles</Rotulo>
            </div>
          </button>
        </div>
      )}

      <div className="px-4 pt-4 grid grid-cols-3 gap-3">
        {lideres.map((c) => {
          const Ico = c.ic;
          return (
            <button
              key={c.t}
              onClick={() => c.j && abrirJugador(c.j.id)}
              className="rounded-2xl p-3 text-left active:scale-[0.98] transition"
              style={tarjeta}
            >
              <div className="flex items-center gap-1">
                <Ico size={12} color={c.col} />
                <span style={{ ...ROTULO, fontSize: 9 }}>{c.t}</span>
              </div>
              {c.j ? (
                <>
                  <div className="mt-2"><Avatar id={c.j.id} nombre={c.j.nombre} tam={34} /></div>
                  <div className="text-xs font-bold mt-2 truncate" style={{ color: C.tinta }}>{nombreCorto(c.j.nombre)}</div>
                  <div style={{ ...NUM, color: c.col, fontSize: 18, fontWeight: 800 }}>{c.campo(c.j)}</div>
                </>
              ) : (
                <div className="text-xs mt-3" style={{ color: C.humo }}>—</div>
              )}
            </button>
          );
        })}
      </div>

      <div className="px-4 pt-6 flex items-center justify-between">
        <Rotulo>Tabla general</Rotulo>
        <div className="flex gap-1">
          {[["goles", "G"], ["asis", "A"], ["nota", "NOTA"], ["pj", "PJ"]].map(([k, l]) => (
            <button
              key={k}
              onClick={() => setOrden(k)}
              className="px-2.5 py-1 rounded-lg text-xs font-bold transition"
              style={{ background: orden === k ? C.primario : C.tarjeta, color: orden === k ? "#fff" : C.humo, boxShadow: orden === k ? "none" : SOMBRA, ...NUM }}
            >
              {l}
            </button>
          ))}
        </div>
      </div>

      <div className="mt-2 mx-4 rounded-2xl overflow-hidden" style={tarjeta}>
        <div className="flex items-center gap-2 px-3 py-2" style={{ borderBottom: `1px solid ${C.linea}` }}>
          <div className="w-6" />
          <div className="flex-1" style={ROTULO}>Jugador</div>
          {["PJ", "G", "A", "NOTA"].map((h) => (
            <div key={h} className="text-center" style={{ ...ROTULO, width: h === "NOTA" ? 40 : 26 }}>{h}</div>
          ))}
        </div>
        {ordenada.map((t, i) => (
          <button
            key={t.id}
            onClick={() => abrirJugador(t.id)}
            className="w-full flex items-center gap-2 px-3 py-2 active:opacity-60"
            style={{ borderBottom: i < ordenada.length - 1 ? `1px solid ${C.linea}` : "none", background: i < 3 ? `${C.primario}0A` : "transparent" }}
          >
            <div className="w-6 text-left" style={{ ...NUM, color: i < 3 ? C.primario : C.humo, fontSize: 12, fontWeight: 800 }}>{i + 1}</div>
            <Avatar id={t.id} nombre={t.nombre} tam={26} />
            <div className="flex-1 min-w-0 flex items-center gap-1 text-left">
              <span className="text-sm font-semibold truncate" style={{ color: C.tinta }}>{nombreCorto(t.nombre)}</span>
              {t.amenazado && <Siren size={12} color={C.alerta} className="shrink-0" />}
            </div>
            <div className="text-center" style={{ ...NUM, width: 26, color: C.humo, fontSize: 13 }}>{t.pj}</div>
            <div className="text-center" style={{ ...NUM, width: 26, color: C.tinta, fontSize: 13, fontWeight: 700 }}>{t.goles}</div>
            <div className="text-center" style={{ ...NUM, width: 26, color: C.tinta, fontSize: 13, fontWeight: 700 }}>{t.asis}</div>
            <div className="text-center" style={{ ...NUM, width: 40, color: C.primario, fontSize: 13, fontWeight: 800 }}>
              {t.pj ? dec1(t.nota) : "—"}
            </div>
          </button>
        ))}
      </div>

      <div className="px-4 pt-2 text-xs" style={{ color: C.humo }}>
        NOTA = calificación sobre 10. Se parte de 6.0 por jugar y sube con cada gol (+0.8),
        asistencia (+0.5) y atajada (+0.1), con tope de 10 por partido.
      </div>
    </div>
  );
}
