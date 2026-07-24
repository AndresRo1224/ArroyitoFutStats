import React, { useMemo, useState } from "react";
import { ArrowLeft, Trash2, Plus, Minus, Check } from "lucide-react";
import { C, PETOS, NUM, ROTULO, SOMBRA } from "../tema";
import { Avatar, Rotulo, Boton, RejillaAsistencia } from "../components/ui";
import { domingoMasReciente, fechaLarga, uid } from "../lib/util";

export default function EditorPartido({ inicial, jugadores, ultimoPartido, guardar, borrar, cerrar }) {
  const vivos = useMemo(() => new Set(jugadores.map((j) => j.id)), [jugadores]);
  const [fecha, setFecha] = useState(inicial ? inicial.fecha : domingoMasReciente());
  const [att, setAtt] = useState(inicial ? inicial.att.filter((id) => vivos.has(id)) : []);
  const [g, setG] = useState(inicial ? { ...inicial.g } : {});
  const [a, setA] = useState(inicial ? { ...inicial.a } : {});
  const [paso, setPaso] = useState(inicial ? 2 : 1);

  const nombreDe = Object.fromEntries(jugadores.map((j) => [j.id, j.nombre]));
  const alternar = (id) => setAtt((p) => (p.includes(id) ? p.filter((x) => x !== id) : [...p, id]));
  const sumar = (obj, set, id, d) => set({ ...obj, [id]: Math.max(0, (obj[id] || 0) + d) });
  const traerUltimo = () => ultimoPartido && setAtt(ultimoPartido.att.filter((id) => vivos.has(id)));

  return (
    <div className="fixed inset-0 z-[60] flex flex-col" style={{ background: C.fondo }}>
      <div className="flex items-center gap-3 px-4 py-3 shrink-0" style={{ background: C.tarjeta, boxShadow: SOMBRA }}>
        <button onClick={paso === 2 && !inicial ? () => setPaso(1) : cerrar} className="p-1 active:opacity-60">
          <ArrowLeft size={22} color={C.tinta} />
        </button>
        <div className="flex-1">
          <div className="font-extrabold" style={{ color: C.tinta }}>
            {inicial ? "Editar partido" : paso === 1 ? "¿Quién vino?" : "Goles y asistencias"}
          </div>
          <div className="text-xs capitalize" style={{ color: C.humo }}>{fechaLarga(fecha)}</div>
        </div>
        {inicial && (
          <button onClick={borrar} className="p-2 active:opacity-60"><Trash2 size={19} color={C.alerta} /></button>
        )}
      </div>

      <div className="flex-1 overflow-y-auto pb-28">
        {paso === 1 ? (
          <div className="px-4 pt-4">
            <Rotulo>Fecha</Rotulo>
            <input
              type="date"
              value={fecha}
              onChange={(e) => setFecha(e.target.value)}
              className="w-full mt-2 rounded-xl px-3 py-3 text-sm outline-none"
              style={{ background: C.tarjeta, color: C.tinta, boxShadow: SOMBRA, ...NUM }}
            />
            <div className="flex items-center justify-between mt-5 mb-3">
              <Rotulo>Asistencia · {att.length} marcados</Rotulo>
              {ultimoPartido && (
                <button onClick={traerUltimo} className="text-xs font-bold" style={{ color: C.primario }}>
                  Copiar del último
                </button>
              )}
            </div>
            <RejillaAsistencia jugadores={jugadores} seleccion={att} alternar={alternar} />
          </div>
        ) : (
          <div className="px-4 pt-4 space-y-2">
            <div className="flex items-center justify-between pb-1">
              <Rotulo>{att.length} en cancha</Rotulo>
              <button onClick={() => setPaso(1)} className="text-xs font-bold" style={{ color: C.primario }}>
                Cambiar asistencia
              </button>
            </div>
            {att.map((id) => (
              <div key={id} className="rounded-2xl p-3" style={{ background: C.tarjeta, boxShadow: SOMBRA }}>
                <div className="flex items-center gap-2.5 mb-3">
                  <Avatar id={id} nombre={nombreDe[id]} tam={34} />
                  <div className="text-sm font-bold truncate" style={{ color: C.tinta }}>{nombreDe[id]}</div>
                </div>
                {[
                  { et: "Goles", obj: g, set: setG, col: C.oro },
                  { et: "Asist.", obj: a, set: setA, col: PETOS[1].hex },
                ].map((f) => (
                  <div key={f.et} className="flex items-center gap-3 mt-2">
                    <div className="w-14" style={{ ...ROTULO, color: f.col }}>{f.et}</div>
                    <button
                      onClick={() => sumar(f.obj, f.set, id, -1)}
                      className="rounded-full active:opacity-60 flex items-center justify-center"
                      style={{ width: 34, height: 34, background: C.tarjeta2 }}
                    >
                      <Minus size={16} color={C.tinta} />
                    </button>
                    <div className="flex-1 text-center" style={{ ...NUM, color: C.tinta, fontSize: 22, fontWeight: 800 }}>
                      {f.obj[id] || 0}
                    </div>
                    <button
                      onClick={() => sumar(f.obj, f.set, id, 1)}
                      className="rounded-full active:opacity-60 flex items-center justify-center"
                      style={{ width: 34, height: 34, background: f.col }}
                    >
                      <Plus size={16} color="#fff" strokeWidth={3} />
                    </button>
                  </div>
                ))}
              </div>
            ))}
          </div>
        )}
      </div>

      <div
        className="p-4 shrink-0"
        style={{ background: C.tarjeta, boxShadow: "0 -1px 8px rgba(15,27,45,0.06)", paddingBottom: "calc(16px + env(safe-area-inset-bottom))" }}
      >
        {paso === 1 ? (
          <Boton ancho onClick={() => setPaso(2)} disabled={!att.length}>
            Siguiente · {att.length} jugadores
          </Boton>
        ) : (
          <Boton ancho onClick={() => guardar({ id: inicial ? inicial.id : uid(), fecha, att, g, a })}>
            <Check size={17} /> Guardar partido
          </Boton>
        )}
      </div>
    </div>
  );
}
