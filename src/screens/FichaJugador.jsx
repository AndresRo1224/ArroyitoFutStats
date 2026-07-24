import React, { useState } from "react";
import { X, Trash2, Camera, KeyRound } from "lucide-react";
import { C, PETOS, NUM, SOMBRA } from "../tema";
import { Avatar, Rotulo, Marcador } from "../components/ui";
import { dec, dec1, fechaCorta, notaPartido } from "../lib/util";

export default function FichaJugador({ jugador, stats, partidos, cerrar, renombrar, eliminar, pedirFoto, regenerarPin }) {
  const [nombre, setNombre] = useState(jugador.nombre);
  const suyos = partidos.filter((p) => p.att.includes(jugador.id)).slice(0, 8);
  const tarjeta = { background: C.tarjeta, boxShadow: SOMBRA };

  return (
    <div className="fixed inset-0 z-[60] flex flex-col" style={{ background: C.fondo }}>
      <div className="flex items-center gap-3 px-4 py-3 shrink-0" style={{ background: C.tarjeta, boxShadow: SOMBRA }}>
        <button onClick={cerrar} className="p-1 active:opacity-60"><X size={22} color={C.tinta} /></button>
        <div className="flex-1 font-extrabold" style={{ color: C.tinta }}>Ficha</div>
        <button onClick={eliminar} className="p-2 active:opacity-60"><Trash2 size={19} color={C.alerta} /></button>
      </div>

      <div className="flex-1 overflow-y-auto p-4">
        <div className="flex items-center gap-4">
          <button onClick={() => pedirFoto(jugador.id)} className="relative active:opacity-70">
            <Avatar id={jugador.id} nombre={jugador.nombre} tam={80} borde={C.primario} />
            <div className="absolute bottom-0 right-0 rounded-full p-1.5" style={{ background: C.primario, boxShadow: `0 0 0 2.5px ${C.fondo}` }}>
              <Camera size={13} color="#fff" />
            </div>
          </button>
          <div className="flex-1">
            <input
              value={nombre}
              onChange={(e) => setNombre(e.target.value)}
              onBlur={() => renombrar(nombre.trim() || jugador.nombre)}
              className="w-full rounded-xl px-3 py-2 text-lg font-extrabold outline-none"
              style={{ background: C.tarjeta, color: C.tinta, boxShadow: SOMBRA }}
            />
            <div className="text-xs mt-1.5" style={{ color: C.humo }}>Toca la foto (con tu PIN) o el nombre para editarlos.</div>
          </div>
        </div>

        <div
          className="mt-5 rounded-2xl p-4 flex items-center justify-between"
          style={{ background: `linear-gradient(135deg, ${C.tarjeta}, ${C.primario}14)`, boxShadow: `${SOMBRA}, inset 0 0 0 1.5px ${C.primario}33` }}
        >
          <div>
            <Rotulo>Valoración</Rotulo>
            <div className="text-xs mt-1" style={{ color: C.humo }}>Promedio de sus notas</div>
          </div>
          <div style={{ ...NUM, color: C.primario, fontSize: 40, fontWeight: 800, lineHeight: 1 }}>
            {stats.pj ? dec1(stats.nota) : "—"}
            <span style={{ fontSize: 15, color: C.humo, fontWeight: 700 }}>/10</span>
          </div>
        </div>

        <div className="grid grid-cols-3 gap-3 mt-3">
          <div className="rounded-2xl py-4" style={tarjeta}>
            <Marcador valor={stats.pj} etiqueta="Partidos" grande />
          </div>
          <div className="rounded-2xl py-4" style={tarjeta}>
            <Marcador valor={stats.goles} etiqueta="Goles" color={C.oro} grande />
          </div>
          <div className="rounded-2xl py-4" style={tarjeta}>
            <Marcador valor={stats.asis} etiqueta="Asist." color={PETOS[1].hex} grande />
          </div>
        </div>

        <div className="grid grid-cols-3 gap-3 mt-3">
          <div className="rounded-2xl py-3" style={tarjeta}>
            <Marcador valor={stats.pj ? dec(stats.promGoles) : "—"} etiqueta="Goles/partido" />
          </div>
          <div className="rounded-2xl py-3" style={tarjeta}>
            <Marcador valor={stats.pj ? dec(stats.promAsis) : "—"} etiqueta="Asist./partido" />
          </div>
          <div className="rounded-2xl py-3" style={tarjeta}>
            <Marcador valor={`${Math.round(stats.presencia * 100)}%`} etiqueta="Asistencia" color={C.primario} />
          </div>
        </div>

        <button
          onClick={() => regenerarPin && regenerarPin(jugador.id, jugador.nombre)}
          className="w-full mt-4 rounded-2xl p-3 flex items-center gap-3 text-left active:scale-[0.99] transition"
          style={tarjeta}
        >
          <div className="rounded-xl p-2" style={{ background: `${C.primario}18` }}>
            <KeyRound size={16} color={C.primario} />
          </div>
          <div className="flex-1">
            <div className="text-sm font-bold" style={{ color: C.tinta }}>Generar PIN nuevo</div>
            <div className="text-xs" style={{ color: C.humo }}>Si se le olvidó el suyo para subir la foto</div>
          </div>
        </button>

        <div className="mt-6"><Rotulo>Últimos partidos</Rotulo></div>
        <div className="mt-2 rounded-2xl overflow-hidden" style={tarjeta}>
          {suyos.length ? (
            suyos.map((p, i) => (
              <div
                key={p.id}
                className="flex items-center px-3 py-2.5"
                style={{ borderBottom: i < suyos.length - 1 ? `1px solid ${C.linea}` : "none" }}
              >
                <div className="flex-1 text-sm capitalize" style={{ color: C.tinta }}>{fechaCorta(p.fecha)}</div>
                <div style={{ ...NUM, color: C.oro, fontSize: 13, fontWeight: 700, width: 42, textAlign: "right" }}>
                  {(p.g && p.g[jugador.id]) || 0} G
                </div>
                <div style={{ ...NUM, color: PETOS[1].hex, fontSize: 13, fontWeight: 700, width: 42, textAlign: "right" }}>
                  {(p.a && p.a[jugador.id]) || 0} A
                </div>
                <div
                  className="rounded-lg px-2 py-0.5 ml-2"
                  style={{ ...NUM, background: `${C.primario}18`, color: C.primarioOsc, fontSize: 12, fontWeight: 800, minWidth: 38, textAlign: "center" }}
                >
                  {dec1(notaPartido((p.g && p.g[jugador.id]) || 0, (p.a && p.a[jugador.id]) || 0))}
                </div>
              </div>
            ))
          ) : (
            <div className="px-3 py-4 text-xs" style={{ color: C.humo }}>Todavía no ha jugado ningún partido.</div>
          )}
        </div>
      </div>
    </div>
  );
}
