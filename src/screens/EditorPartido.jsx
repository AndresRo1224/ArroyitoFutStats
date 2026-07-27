import React, { useMemo, useState } from "react";
import { ArrowLeft, Trash2, Plus, Minus, Check, Shuffle } from "lucide-react";
import { C, PETOS, NUM, ROTULO, SOMBRA, MAX_EQUIPOS } from "../tema";
import { Avatar, Rotulo, Boton, RejillaAsistencia } from "../components/ui";
import { domingoMasReciente, fechaLarga, isoLocal, uid } from "../lib/util";

// Traduce el sorteo que dejó la ruleta a lo que el editor necesita: quiénes
// asistieron (equipos + banca) y en qué equipo quedó cada uno. Descarta a los
// que ya no están en la nómina.
function leerSorteo(sorteo, vivos) {
  if (!sorteo || !Array.isArray(sorteo.equipos)) return null;
  const equipos = sorteo.equipos
    .slice(0, MAX_EQUIPOS)
    .map((e) => (Array.isArray(e) ? e.filter((id) => vivos.has(id)) : []));
  const banca = Array.isArray(sorteo.banca) ? sorteo.banca.filter((id) => vivos.has(id)) : [];
  const att = [...equipos.flat(), ...banca];
  if (!att.length) return null;
  const eq = {};
  equipos.forEach((e, i) => e.forEach((id) => { eq[id] = i; }));
  return { att, eq, nEq: Math.max(2, equipos.length), fecha: sorteo.fecha };
}

export default function EditorPartido({
  inicial, jugadores, ultimoPartido, guardar, borrar, cerrar, pasoInicial, sorteo, aplicarSorteo,
}) {
  const vivos = useMemo(() => new Set(jugadores.map((j) => j.id)), [jugadores]);

  // Equipos que dejó la ruleta. Solo se ofrecen en partidos nuevos, y se aplican
  // solos si vienes de la ruleta o si el sorteo es de hoy (uno viejo sería un lío).
  const delSorteo = leerSorteo(sorteo, vivos);
  const usarSorteo = !inicial && !!delSorteo && (!!aplicarSorteo || delSorteo.fecha === isoLocal(new Date()));

  const [fecha, setFecha] = useState(
    inicial ? inicial.fecha : usarSorteo && delSorteo.fecha ? delSorteo.fecha : domingoMasReciente()
  );
  const [att, setAtt] = useState(
    inicial ? inicial.att.filter((id) => vivos.has(id)) : usarSorteo ? delSorteo.att : []
  );
  const [g, setG] = useState(inicial ? { ...inicial.g } : {});
  const [a, setA] = useState(inicial ? { ...inicial.a } : {});
  const [at, setAt] = useState(inicial ? { ...inicial.at } : {}); // atajadas
  const [ag, setAg] = useState(inicial ? { ...inicial.ag } : {}); // autogoles (restan)

  // Resultado: cada asistente a un equipo (color) + goles por equipo (marcador).
  const mkIni = inicial && Array.isArray(inicial.marcador) && inicial.marcador.length >= 2 ? [...inicial.marcador] : null;
  const eqIni = inicial && inicial.equipo ? { ...inicial.equipo } : usarSorteo ? delSorteo.eq : {};
  // Cuántos equipos mostrar: los del marcador, los del sorteo y, sobre todo, los
  // que ya tienen gente asignada (si no, se perderían al guardar).
  const nEqIni = Math.max(
    2,
    mkIni ? mkIni.length : 0,
    usarSorteo ? delSorteo.nEq : 0,
    Math.max(-1, ...Object.values(eqIni)) + 1
  );
  const [nEq, setNEq] = useState(nEqIni);
  const [eq, setEq] = useState(eqIni);
  const [mk, setMk] = useState(mkIni || Array.from({ length: nEqIni }, () => 0));
  // El marcador solo se guarda si de verdad lo registraron: unos equipos sin
  // marcador no pueden contar como empate 0-0 para todo el mundo.
  const [conMarcador, setConMarcador] = useState(!!mkIni);
  const [deSorteo, setDeSorteo] = useState(usarSorteo);

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
  const golEquipo = (t, d) => {
    const v = Math.max(0, (mk[t] || 0) + d);
    if (v === (mk[t] || 0)) return; // restar en 0 no registra nada
    setConMarcador(true);
    setMk((m) => m.map((x, i) => (i === t ? v : x)));
  };
  const asignar = (id, t) => setEq((e) => {
    const n = { ...e };
    if (n[id] === t) delete n[id]; // tocar el equipo ya elegido lo quita
    else n[id] = t;
    return n;
  });

  const traerSorteo = () => {
    if (!delSorteo) return;
    const q = Math.max(2, Math.min(MAX_EQUIPOS, delSorteo.nEq));
    setAtt((p) => Array.from(new Set([...p, ...delSorteo.att])));
    setEq(delSorteo.eq);
    setNEq(q);
    setMk((m) => Array.from({ length: q }, (_, i) => m[i] || 0));
    setDeSorteo(true);
  };
  const quitarEquipos = () => {
    setEq({});
    setConMarcador(false);
    setDeSorteo(false);
  };

  const hayEquipos = Object.keys(eq).length > 0;
  const marc = mk.slice(0, nEq);
  const maxG = Math.max(...marc);
  const lideres = marc.map((x, i) => (x === maxG ? i : -1)).filter((i) => i >= 0);
  const previoGanador = lideres.length > 1 ? "Empate 🤝" : `Gana ${PETOS[lideres[0]].nombre} 🏆`;

  const construir = () => {
    const base = { id: inicial ? inicial.id : uid(), fecha, att, g, a, at, ag };
    // Solo se guardan asignaciones de gente que asistió y a equipos que existen.
    const asignados = Object.fromEntries(
      Object.entries(eq).filter(([id, t]) => att.includes(id) && t < nEq)
    );
    if (Object.keys(asignados).length) {
      base.equipo = asignados;
      if (conMarcador) base.marcador = marc; // sin marcador no hay ganado/empatado/perdido
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
            {deSorteo && (
              <div className="rounded-2xl p-3 mb-3 flex items-center gap-2.5" style={{ background: `${C.primario}12`, boxShadow: `inset 0 0 0 1px ${C.primario}44` }}>
                <Shuffle size={16} color={C.primario} />
                <div className="flex-1 text-xs font-semibold" style={{ color: C.tinta }}>
                  Equipos traídos de la ruleta
                </div>
              </div>
            )}
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
                  <div className="text-sm font-bold truncate flex-1" style={{ color: C.tinta }}>{nombreDe[id]}</div>
                  {eq[id] !== undefined && eq[id] < nEq && (
                    <div className="rounded-full shrink-0" style={{ width: 10, height: 10, background: PETOS[eq[id]].hex }} title={PETOS[eq[id]].nombre} />
                  )}
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
            {deSorteo ? (
              <div className="rounded-2xl p-3 flex items-center gap-2.5" style={{ background: `${C.primario}12`, boxShadow: `inset 0 0 0 1px ${C.primario}44` }}>
                <Shuffle size={16} color={C.primario} />
                <div className="flex-1 text-xs font-semibold" style={{ color: C.tinta }}>
                  Equipos traídos de la ruleta
                </div>
                <button onClick={quitarEquipos} className="text-xs font-bold shrink-0" style={{ color: C.humo }}>Quitar</button>
              </div>
            ) : delSorteo && !hayEquipos ? (
              <button
                onClick={traerSorteo}
                className="w-full flex items-center justify-center gap-2 rounded-2xl py-3 font-bold text-sm active:scale-[0.99] transition"
                style={{ background: C.tarjeta, color: C.primario, boxShadow: SOMBRA }}
              >
                <Shuffle size={16} /> Traer equipos de la ruleta
              </button>
            ) : null}

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
                    <div className="text-center" style={{ ...NUM, color: conMarcador ? C.tinta : C.humo, fontSize: 20, fontWeight: 800, width: 30 }}>{mk[t] || 0}</div>
                    <button onClick={() => golEquipo(t, 1)} className="rounded-full flex items-center justify-center active:opacity-60" style={{ width: 32, height: 32, background: PETOS[t].hex }}>
                      <Plus size={15} color="#fff" strokeWidth={3} />
                    </button>
                  </div>
                ))}
              </div>
              <div className="text-center text-sm font-bold mt-2" style={{ color: conMarcador ? C.primario : C.humo }}>
                {!hayEquipos
                  ? "Asigna cada jugador a su equipo abajo"
                  : conMarcador
                    ? previoGanador
                    : "Toca los + para registrar el marcador"}
              </div>
              {conMarcador && (
                <button
                  onClick={() => { setConMarcador(false); setMk(Array.from({ length: nEq }, () => 0)); }}
                  className="w-full text-xs font-bold mt-1"
                  style={{ color: C.humo }}
                >
                  Quitar el marcador
                </button>
              )}
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
              {hayEquipos && !deSorteo && (
                <button onClick={quitarEquipos} className="w-full text-xs font-bold mt-3" style={{ color: C.humo }}>
                  Quitar los equipos
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
              {hayEquipos ? "Editar resultado y equipos →" : "Agregar resultado y equipos →"}
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
