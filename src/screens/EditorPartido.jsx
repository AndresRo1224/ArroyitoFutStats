import React, { useMemo, useState } from "react";
import { ArrowLeft, Trash2, Plus, Minus, Check } from "lucide-react";
import { C, PETOS, NUM, ROTULO, SOMBRA, MAX_EQUIPOS } from "../tema";
import { Avatar, Rotulo, Boton, RejillaAsistencia } from "../components/ui";
import { domingoMasReciente, fechaLarga, uid } from "../lib/util";

export default function EditorPartido({ inicial, jugadores, ultimoPartido, guardar, borrar, cerrar, pasoInicial }) {
  const vivos = useMemo(() => new Set(jugadores.map((j) => j.id)), [jugadores]);
  const [fecha, setFecha] = useState(inicial ? inicial.fecha : domingoMasReciente());
  const [att, setAtt] = useState(inicial ? inicial.att.filter((id) => vivos.has(id)) : []);
  const [g, setG] = useState(inicial ? { ...inicial.g } : {});
  const [a, setA] = useState(inicial ? { ...inicial.a } : {});
  const [at, setAt] = useState(inicial ? { ...inicial.at } : {}); // atajadas
  const [ag, setAg] = useState(inicial ? { ...inicial.ag } : {}); // autogoles (restan)

  // Resultado: cada asistente a un equipo (color) + goles por equipo (marcador).
  const mkIni = inicial && Array.isArray(inicial.marcador) && inicial.marcador.length >= 2 ? [...inicial.marcador] : [0, 0];
  const [nEq, setNEq] = useState(mkIni.length);
  const [eq, setEq] = useState(inicial && inicial.equipo ? { ...inicial.equipo } : {}); // id → índice de equipo
  const [mk, setMk] = useState(mkIni); // goles por equipo

  const [paso, setPaso] = useState(pasoInicial || (inicial ? 2 : 1));

  const nombreDe = Object.fromEntries(jugadores.map((j) => [j.id, j.nombre]));
  const alternar = (id) => setAtt((p) => (p.includes(id) ? p.filter((x) => x !== id) : [...p, id]));
  const sumar = (obj, set, id, d) => set({ ...obj, [id]: Math.max(0, (obj[id] || 0) + d) });
  const traerUltimo = () => ultimoPartido && setAtt(ultimoPartido.att.filter((id) => vivos.has(id)));

  const cambiarNEq = (n) => {
    const q = Math.max(2, Math.min(MAX_EQUIPOS, n));
    setNEq(q);
    setMk((m) => Array.from({ length: q }, (_, i) => m[i] || 0));
    setEq((e) => Object.fromEntries(Object.entries(e).filter(([, v]) => v < q))); // quita asignaciones a equipos que ya no existen
  };
  const golEquipo = (t, d) => setMk((m) => m.map((x, i) => (i === t ? Math.max(0, x + d) : x)));
  const asignar = (id, t) => setEq((e) => {
    const n = { ...e };
    if (n[id] === t) delete n[id]; // tocar el equipo ya elegido lo quita
    else n[id] = t;
    return n;
  });

  const hayResultado = Object.keys(eq).length > 0;
  const marc = mk.slice(0, nEq);
  const maxG = Math.max(...marc);
  const lideres = marc.map((x, i) => (x === maxG ? i : -1)).filter((i) => i >= 0);
  const previoGanador = !hayResultado ? "" : lideres.length > 1 ? "Empate 🤝" : `Gana ${PETOS[lideres[0]].nombre} 🏆`;

  const construir = () => {
    const base = { id: inicial ? inicial.id : uid(), fecha, att, g, a, at, ag };
    if (hayResultado) {
      base.equipo = Object.fromEntries(Object.entries(eq).filter(([id]) => att.includes(id)));
      base.marcador = marc;
    }
    return base;
  };
  const guardarTodo = () => guardar(construir());

  const atras = () => {
    if (paso === 3 && pasoInicial !== 3) return setPaso(2);
    if (paso === 2 && pasoInicial !== 2 && pasoInicial !== 3) return setPaso(1);
    cerrar();
  };

  const titulo = inicial
    ? "Editar partido"
    : paso === 1 ? "¿Quién vino?" : paso === 2 ? "Goles y asistencias" : "Resultado y equipos";

  return (
    <div className="fixed inset-0 z-[60] flex flex-col" style={{ background: C.fondo }}>
      <div className="flex items-center gap-3 px-4 py-3 shrink-0" style={{ background: C.tarjeta, boxShadow: SOMBRA }}>
        <button onClick={atras} className="p-1 active:opacity-60"><ArrowLeft size={22} color={C.tinta} /></button>
        <div className="flex-1">
          <div className="font-extrabold" style={{ color: C.tinta }}>{titulo}</div>
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
        ) : paso === 2 ? (
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
                  { et: "Atajadas", obj: at, set: setAt, col: PETOS[5].hex },
                  { et: "Autogol", obj: ag, set: setAg, col: C.alerta },
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
        ) : (
          <div className="px-4 pt-4 space-y-5">
            <div>
              <Rotulo>¿Cuántos equipos?</Rotulo>
              <div className="flex gap-2 mt-2">
                {Array.from({ length: MAX_EQUIPOS - 1 }, (_, i) => i + 2).map((n) => (
                  <button
                    key={n}
                    onClick={() => cambiarNEq(n)}
                    className="flex-1 rounded-xl py-2 text-sm font-extrabold active:scale-95 transition"
                    style={{ ...NUM, background: nEq === n ? C.primario : C.tarjeta, color: nEq === n ? C.sobrePrimario : C.tinta, boxShadow: SOMBRA }}
                  >
                    {n}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <Rotulo>Marcador</Rotulo>
              <div className="mt-2 space-y-2">
                {Array.from({ length: nEq }).map((_, t) => (
                  <div key={t} className="flex items-center gap-3 rounded-2xl p-3" style={{ background: C.tarjeta, boxShadow: SOMBRA }}>
                    <div className="rounded-full shrink-0" style={{ width: 16, height: 16, background: PETOS[t].hex }} />
                    <div className="flex-1 text-sm font-bold truncate" style={{ color: C.tinta }}>{PETOS[t].nombre}</div>
                    <button onClick={() => golEquipo(t, -1)} className="rounded-full flex items-center justify-center active:opacity-60" style={{ width: 32, height: 32, background: C.tarjeta2 }}>
                      <Minus size={15} color={C.tinta} />
                    </button>
                    <div className="text-center" style={{ ...NUM, color: C.tinta, fontSize: 20, fontWeight: 800, width: 30 }}>{mk[t] || 0}</div>
                    <button onClick={() => golEquipo(t, 1)} className="rounded-full flex items-center justify-center active:opacity-60" style={{ width: 32, height: 32, background: PETOS[t].hex }}>
                      <Plus size={15} color="#fff" strokeWidth={3} />
                    </button>
                  </div>
                ))}
              </div>
              <div className="text-center text-sm font-bold mt-2" style={{ color: hayResultado ? C.primario : C.humo }}>
                {hayResultado ? previoGanador : "Asigna cada jugador a su equipo abajo"}
              </div>
            </div>

            <div>
              <Rotulo>¿Quién jugó en cada equipo?</Rotulo>
              <div className="mt-2 space-y-2">
                {att.map((id) => (
                  <div key={id} className="flex items-center gap-2 rounded-2xl p-2.5" style={{ background: C.tarjeta, boxShadow: SOMBRA }}>
                    <Avatar id={id} nombre={nombreDe[id]} tam={30} />
                    <div className="flex-1 text-sm font-semibold truncate" style={{ color: C.tinta }}>{nombreDe[id]}</div>
                    <div className="flex gap-1.5">
                      {Array.from({ length: nEq }).map((_, t) => {
                        const on = eq[id] === t;
                        return (
                          <button
                            key={t}
                            onClick={() => asignar(id, t)}
                            className="rounded-full flex items-center justify-center transition active:scale-90"
                            style={{ width: 27, height: 27, background: on ? PETOS[t].hex : C.tarjeta2, boxShadow: on ? `0 0 0 2px ${PETOS[t].hex}66` : `inset 0 0 0 1px ${C.linea}` }}
                            title={PETOS[t].nombre}
                          >
                            {on && <Check size={14} color={PETOS[t].texto} strokeWidth={3} />}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                ))}
              </div>
              {hayResultado && (
                <button onClick={() => setEq({})} className="w-full text-xs font-bold mt-3" style={{ color: C.humo }}>
                  Quitar el resultado
                </button>
              )}
            </div>
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
        ) : paso === 2 ? (
          <div className="space-y-2">
            <Boton ancho onClick={guardarTodo}>
              <Check size={17} /> Guardar partido
            </Boton>
            <button onClick={() => setPaso(3)} className="w-full text-sm font-bold py-1 active:opacity-60" style={{ color: C.primario }}>
              {hayResultado ? "Editar resultado y equipos →" : "Agregar resultado y equipos →"}
            </button>
          </div>
        ) : (
          <Boton ancho onClick={guardarTodo}>
            <Check size={17} /> Guardar partido
          </Boton>
        )}
      </div>
    </div>
  );
}
