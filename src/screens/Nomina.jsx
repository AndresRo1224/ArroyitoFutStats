import React, { useMemo, useState } from "react";
import { Users, Plus, Camera } from "lucide-react";
import { C, NUM, SOMBRA } from "../tema";
import { Avatar, Rotulo, Boton, Vacio } from "../components/ui";
import { dec1 } from "../lib/util";

export default function Nomina({ jugadores, tabla, agregar, abrirJugador, pedirFoto }) {
  const [nombre, setNombre] = useState("");
  const mapa = useMemo(() => Object.fromEntries(tabla.map((t) => [t.id, t])), [tabla]);

  const enviar = () => {
    const n = nombre.trim();
    if (!n) return;
    agregar(n);
    setNombre("");
  };

  return (
    <div className="pb-6">
      <div className="px-4 pt-4">
        <div className="flex gap-2">
          <input
            value={nombre}
            onChange={(e) => setNombre(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && enviar()}
            placeholder="Nombre del jugador"
            className="flex-1 rounded-2xl px-4 py-3 text-sm outline-none"
            style={{ background: C.tarjeta, color: C.tinta, boxShadow: SOMBRA }}
          />
          <Boton onClick={enviar} disabled={!nombre.trim()}><Plus size={18} /></Boton>
        </div>
      </div>

      {!jugadores.length ? (
        <Vacio
          icono={<Users size={26} color={C.primario} />}
          titulo="Nómina vacía"
          texto="Escribe el nombre de cada amigo del grupo y agrégalo a la lista."
        />
      ) : (
        <div className="px-4 pt-4 space-y-2">
          {jugadores.map((j) => {
            const t = mapa[j.id] || { pj: 0, goles: 0, asis: 0, nota: 0 };
            return (
              <div key={j.id} className="flex items-center gap-3 rounded-2xl p-3" style={{ background: C.tarjeta, boxShadow: SOMBRA }}>
                <button onClick={() => pedirFoto(j.id)} className="relative active:opacity-70">
                  <Avatar id={j.id} nombre={j.nombre} tam={46} />
                  <div className="absolute -bottom-1 -right-1 rounded-full p-1" style={{ background: C.primario, boxShadow: `0 0 0 2px ${C.tarjeta}` }}>
                    <Camera size={11} color="#fff" />
                  </div>
                </button>
                <button onClick={() => abrirJugador(j.id)} className="flex-1 text-left min-w-0 active:opacity-70">
                  <div className="font-bold text-sm truncate" style={{ color: C.tinta }}>{j.nombre}</div>
                  <div className="text-xs mt-0.5" style={{ color: C.humo, ...NUM }}>
                    {t.pj} PJ · {t.goles} G · {t.asis} A
                  </div>
                </button>
                <div className="text-right pr-1">
                  <div style={{ ...NUM, color: C.primario, fontSize: 17, fontWeight: 800 }}>{t.pj ? dec1(t.nota) : "—"}</div>
                  <Rotulo style={{ fontSize: 9 }}>Nota</Rotulo>
                </div>
              </div>
            );
          })}
          <div className="text-xs pt-1" style={{ color: C.humo }}>Toca la foto para que cada quien suba la suya con su PIN.</div>
        </div>
      )}
    </div>
  );
}
