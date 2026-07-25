import React, { useState } from "react";
import { X, Trash2, Camera, KeyRound, Image, Crown, Trophy, Zap, Target, Calendar } from "lucide-react";
import { C, PETOS, NUM, SOMBRA, bannerCss } from "../tema";
import { Avatar, Rotulo, Marcador } from "../components/ui";
import { dec, dec1, fechaCorta, notaPartido } from "../lib/util";

const TROFEO = {
  goleador: { nombre: "Bota de oro", Ico: Trophy },
  asistidor: { nombre: "Rey de asistencias", Ico: Zap },
  nota: { nombre: "Mejor promedio", Ico: Target },
  constante: { nombre: "Inoxidable", Ico: Calendar },
  reyMvp: { nombre: "Rey del MVP", Ico: Crown },
};

export default function FichaJugador({
  jugador, stats, partidos, banner, frase, trofeos, esAdmin,
  cerrar, renombrar, eliminar, pedirFoto, cambiarBanner, regenerarPin,
}) {
  const [nombre, setNombre] = useState(jugador.nombre);
  const suyos = partidos.filter((p) => p.att.includes(jugador.id)).slice(0, 8);
  const tarjeta = { background: C.tarjeta, boxShadow: SOMBRA };
  const misTitulos = (trofeos && trofeos.titulos) || [];
  const misMvp = (trofeos && trofeos.mvp) || 0;
  const tieneTrofeos = misTitulos.length > 0 || misMvp > 0;

  return (
    <div className="fixed inset-0 z-[60] flex flex-col" style={{ background: C.fondo }}>
      <div className="flex items-center gap-3 px-4 py-3 shrink-0" style={{ background: C.tarjeta, boxShadow: SOMBRA }}>
        <button onClick={cerrar} className="p-1 active:opacity-60"><X size={22} color={C.tinta} /></button>
        <div className="flex-1 font-extrabold" style={{ color: C.tinta }}>Ficha</div>
        {esAdmin && (
          <button onClick={eliminar} className="p-2 active:opacity-60"><Trash2 size={19} color={C.alerta} /></button>
        )}
      </div>

      <div className="flex-1 overflow-y-auto p-4">
        {/* Portada con banner; el avatar lo tapa un poco y el nombre va DEBAJO
            (sobre fondo sólido) para que siempre se lea, sea cual sea el banner. */}
        <div className="relative">
          <button
            onClick={() => cambiarBanner(jugador)}
            className="relative block w-full h-24 rounded-2xl active:opacity-90"
            style={{ background: bannerCss(banner), boxShadow: SOMBRA }}
            title="Cambiar banner"
          >
            <div className="absolute top-2 right-2 rounded-full p-1.5 flex items-center gap-1" style={{ background: "rgba(15,27,45,0.35)" }}>
              <Image size={12} color="#fff" />
              <span className="text-[10px] font-bold" style={{ color: "#fff" }}>Banner</span>
            </div>
          </button>
          <button
            onClick={() => pedirFoto(jugador.id)}
            className="absolute left-3 active:opacity-70"
            style={{ bottom: -26 }}
          >
            <Avatar id={jugador.id} nombre={jugador.nombre} tam={72} borde={C.fondo} />
            <div className="absolute bottom-0 right-0 rounded-full p-1.5" style={{ background: C.primario, boxShadow: `0 0 0 2.5px ${C.fondo}` }}>
              <Camera size={12} color="#fff" />
            </div>
          </button>
        </div>

        <div className="mt-9 px-1">
          {esAdmin ? (
            <input
              value={nombre}
              onChange={(e) => setNombre(e.target.value)}
              onBlur={() => renombrar(nombre.trim() || jugador.nombre)}
              className="w-full rounded-xl px-3 py-2 text-lg font-extrabold outline-none"
              style={{ background: C.tarjeta, color: C.tinta, boxShadow: SOMBRA }}
            />
          ) : (
            <div className="text-lg font-extrabold truncate" style={{ color: C.tinta }}>{jugador.nombre}</div>
          )}
          {frase && (
            <div className="text-sm mt-1 line-clamp-2" style={{ color: C.humo }}>“{frase}”</div>
          )}
        </div>

        {/* Trofeos del jugador */}
        {tieneTrofeos && (
          <div className="flex flex-wrap gap-2 mt-4">
            {misMvp > 0 && (
              <div className="inline-flex items-center gap-1.5 rounded-full px-3 py-1.5" style={{ background: `${C.oro}1A`, boxShadow: `inset 0 0 0 1px ${C.oro}55` }}>
                <Crown size={14} color={C.oro} />
                <span className="text-xs font-bold" style={{ color: C.tinta }}>MVP ×{misMvp}</span>
              </div>
            )}
            {misTitulos.map((clave) => {
              const meta = TROFEO[clave];
              if (!meta) return null;
              const Ico = meta.Ico;
              return (
                <div key={clave} className="inline-flex items-center gap-1.5 rounded-full px-3 py-1.5" style={{ background: `${C.oro}1A`, boxShadow: `inset 0 0 0 1px ${C.oro}55` }}>
                  <Ico size={14} color={C.oro} />
                  <span className="text-xs font-bold" style={{ color: C.tinta }}>{meta.nombre}</span>
                </div>
              );
            })}
          </div>
        )}

        <div
          className="mt-4 rounded-2xl p-4 flex items-center justify-between"
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

        <div className="grid grid-cols-4 gap-2 mt-3">
          <div className="rounded-2xl py-4" style={tarjeta}>
            <Marcador valor={stats.pj} etiqueta="Partidos" />
          </div>
          <div className="rounded-2xl py-4" style={tarjeta}>
            <Marcador valor={stats.goles} etiqueta="Goles" color={C.oro} />
          </div>
          <div className="rounded-2xl py-4" style={tarjeta}>
            <Marcador valor={stats.asis} etiqueta="Asist." color={PETOS[1].hex} />
          </div>
          <div className="rounded-2xl py-4" style={tarjeta}>
            <Marcador valor={stats.atajadas} etiqueta="Atajadas" color={PETOS[5].hex} />
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

        <div className="text-xs mt-3 text-center" style={{ color: C.humo }}>
          Toca tu foto o tu banner (con tu PIN) para personalizar tu perfil.
        </div>

        {esAdmin && (
          <button
            onClick={() => regenerarPin && regenerarPin(jugador.id, jugador.nombre)}
            className="w-full mt-3 rounded-2xl p-3 flex items-center gap-3 text-left active:scale-[0.99] transition"
            style={tarjeta}
          >
            <div className="rounded-xl p-2" style={{ background: `${C.primario}18` }}>
              <KeyRound size={16} color={C.primario} />
            </div>
            <div className="flex-1">
              <div className="text-sm font-bold" style={{ color: C.tinta }}>Generar PIN nuevo</div>
              <div className="text-xs" style={{ color: C.humo }}>Si se le olvidó el suyo para editar su perfil</div>
            </div>
          </button>
        )}

        <div className="mt-6"><Rotulo>Últimos partidos</Rotulo></div>
        <div className="mt-2 rounded-2xl overflow-hidden" style={tarjeta}>
          {suyos.length ? (
            suyos.map((p, i) => (
              <div
                key={p.id}
                className="flex items-center px-3 py-2.5"
                style={{ borderBottom: i < suyos.length - 1 ? `1px solid ${C.linea}` : "none" }}
              >
                <div className="flex-1 text-sm capitalize truncate" style={{ color: C.tinta }}>{fechaCorta(p.fecha)}</div>
                <div style={{ ...NUM, color: C.oro, fontSize: 13, fontWeight: 700, width: 34, textAlign: "right" }}>
                  {(p.g && p.g[jugador.id]) || 0}G
                </div>
                <div style={{ ...NUM, color: PETOS[1].hex, fontSize: 13, fontWeight: 700, width: 34, textAlign: "right" }}>
                  {(p.a && p.a[jugador.id]) || 0}A
                </div>
                <div style={{ ...NUM, color: PETOS[5].hex, fontSize: 13, fontWeight: 700, width: 40, textAlign: "right" }}>
                  {(p.at && p.at[jugador.id]) || 0}AT
                </div>
                <div
                  className="rounded-lg px-2 py-0.5 ml-2"
                  style={{ ...NUM, background: `${C.primario}18`, color: C.primarioOsc, fontSize: 12, fontWeight: 800, minWidth: 38, textAlign: "center" }}
                >
                  {dec1(notaPartido((p.g && p.g[jugador.id]) || 0, (p.a && p.a[jugador.id]) || 0, (p.at && p.at[jugador.id]) || 0))}
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
