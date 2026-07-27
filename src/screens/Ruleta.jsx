import React, { useEffect, useMemo, useRef, useState } from "react";
import { RotateCw, Shuffle, Copy, Check, Plus, Minus, Users, ClipboardList } from "lucide-react";
import { C, PETOS, RUEDA, NUM, ROTULO, SOMBRA, MAX_EQUIPOS, MIN_POR_EQUIPO, MAX_POR_EQUIPO } from "../tema";
import { Avatar, Rotulo, Boton, Vacio, RejillaAsistencia } from "../components/ui";
import { dec1, isoLocal, fechaCorta, nombreCorto } from "../lib/util";

const R = 140, CX = 150, CY = 150;

// Si el teléfono pide menos movimiento, el sorteo resuelve casi al instante.
const menosMovimiento = () =>
  typeof window !== "undefined" &&
  window.matchMedia &&
  window.matchMedia("(prefers-reduced-motion: reduce)").matches;
const GIRO_MS = menosMovimiento() ? 350 : 3400;

// Reparte a los jugadores en filas tipo formación: el primero es el arquero
// (abajo, solo) y el resto se acomoda en filas hacia arriba.
function formacion(ids) {
  const n = ids.length;
  if (n === 0) return [];
  if (n === 1) return [ids];
  const arquero = ids[0];
  const resto = ids.slice(1);
  const porFila = resto.length <= 4 ? 2 : resto.length <= 9 ? 3 : 4;
  const filas = [];
  for (let i = 0; i < resto.length; i += porFila) filas.push(resto.slice(i, i + porFila));
  filas.push([arquero]);
  return filas;
}

// Un jugador dentro de la cancha: foto con anillo del color del peto y su nombre.
function ChipJugador({ id, nombre, color, tam }) {
  return (
    <div className="flex flex-col items-center" style={{ width: tam + 18 }}>
      <Avatar id={id} nombre={nombre} tam={tam} borde={color} />
      <div
        className="mt-1 px-1.5 rounded-md text-center truncate w-full"
        style={{ fontSize: 10, fontWeight: 700, color: "#fff", background: "rgba(8,26,16,0.42)", textShadow: "0 1px 2px rgba(0,0,0,0.4)" }}
      >
        {nombreCorto(nombre)}
      </div>
    </div>
  );
}

// Mini cancha con la alineación de un equipo.
function Cancha({ ids, peto, nombreDe, cupo }) {
  const filas = formacion(ids);
  const tam = ids.length <= 5 ? 46 : ids.length <= 9 ? 40 : 34;
  const linea = "rgba(255,255,255,0.45)";
  const completo = ids.length >= cupo;
  return (
    <div className="rounded-2xl overflow-hidden" style={{ boxShadow: SOMBRA }}>
      <div className="flex items-center justify-between px-3 py-2" style={{ background: peto.hex }}>
        <div className="font-extrabold text-sm" style={{ color: peto.texto, letterSpacing: "-0.01em" }}>
          Peto {peto.nombre}
        </div>
        <div className="flex items-center gap-2">
          {completo && (
            <span className="rounded-full px-2 py-0.5" style={{ fontSize: 9, fontWeight: 800, background: "rgba(255,255,255,0.25)", color: peto.texto }}>
              COMPLETO
            </span>
          )}
          <div style={{ ...NUM, color: peto.texto, fontWeight: 800, fontSize: 13, opacity: 0.95 }}>{ids.length}/{cupo}</div>
        </div>
      </div>
      <div
        className="relative px-2 py-4"
        style={{
          minHeight: 140,
          background: "repeating-linear-gradient(180deg, #16964E 0px, #16964E 20px, #138746 20px, #138746 40px)",
        }}
      >
        {/* Líneas de la cancha */}
        <div className="absolute left-0 right-0 top-1/2" style={{ height: 2, background: linea }} />
        <div className="absolute rounded-full" style={{ width: 60, height: 60, top: "calc(50% - 30px)", left: "calc(50% - 30px)", border: `2px solid ${linea}` }} />
        <div className="absolute" style={{ width: "46%", height: 28, bottom: 0, left: "27%", borderTop: `2px solid ${linea}`, borderLeft: `2px solid ${linea}`, borderRight: `2px solid ${linea}` }} />

        <div className="relative flex flex-col gap-3">
          {filas.length ? (
            filas.map((fila, i) => (
              <div key={i} className="flex justify-around items-start">
                {fila.map((id) => (
                  <ChipJugador key={id} id={id} nombre={nombreDe[id] || "?"} color={peto.hex} tam={tam} />
                ))}
              </div>
            ))
          ) : (
            <div className="text-center text-xs py-6" style={{ color: "rgba(255,255,255,0.85)" }}>Sin jugadores todavía</div>
          )}
        </div>
      </div>
    </div>
  );
}

export default function Ruleta({ jugadores, tabla, ultimoPartido, onSorteo, onRegistrar }) {
  const [sel, setSel] = useState([]);
  const [nEquipos, setNEquipos] = useState(2);
  const [porEquipo, setPorEquipo] = useState(5); // fútbol 5 por defecto
  const [equilibrar, setEquilibrar] = useState(false);
  const [equipos, setEquipos] = useState(null);
  const [banca, setBanca] = useState([]);
  const [giro, setGiro] = useState(0);
  const [girando, setGirando] = useState(false);
  const [ganador, setGanador] = useState(null);
  const [copiado, setCopiado] = useState(false);
  const reloj = useRef(null);

  useEffect(() => () => clearTimeout(reloj.current), []);

  const sorteoActual = () => ({ equipos: equipos || [], banca, fecha: isoLocal(new Date()), ts: Date.now() });

  // El sorteo se guarda en el teléfono apenas cambia, así los equipos ya están
  // listos al registrar el partido (aunque se cierre la app en el intermedio).
  useEffect(() => {
    if (!onSorteo || !equipos) return;
    onSorteo(sorteoActual());
    // `onSorteo` no va en las dependencias: el padre la recrea en cada render y
    // esto se dispararía en bucle.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [equipos, banca]);

  // El nivel para "repartir parejo" es la nota sobre 10.
  const nivel = useMemo(() => Object.fromEntries(tabla.map((t) => [t.id, t.pj ? t.nota : 0])), [tabla]);
  const nombreDe = useMemo(() => Object.fromEntries(jugadores.map((j) => [j.id, j.nombre])), [jugadores]);
  const pozo = equipos
    ? sel.filter((id) => !equipos.some((e) => e.includes(id)) && !banca.includes(id))
    : sel;
  const hayEspacio = equipos ? equipos.some((e) => e.length < porEquipo) : true;

  const alternar = (id) => setSel((p) => (p.includes(id) ? p.filter((x) => x !== id) : [...p, id]));

  // Entra al equipo con menos gente ENTRE LOS QUE TIENEN CUPO. Si hay empate: al azar,
  // o al de menor nota acumulada cuando "repartir parejo" está activo.
  // Devuelve equipo -1 cuando todos los equipos ya están llenos (va a la banca).
  const ubicar = (eqs, id) => {
    const conCupo = eqs.map((e, i) => i).filter((i) => eqs[i].length < porEquipo);
    if (!conCupo.length) return { eqs, equipo: -1 };
    const min = Math.min(...conCupo.map((i) => eqs[i].length));
    const cands = conCupo.filter((i) => eqs[i].length === min);
    const total = (e) => e.reduce((s, p) => s + (nivel[p] || 0), 0);
    const elegido = equilibrar
      ? cands.slice().sort((x, y) => total(eqs[x]) - total(eqs[y]))[0]
      : cands[Math.floor(Math.random() * cands.length)];
    const copia = eqs.map((e) => e.slice());
    copia[elegido].push(id);
    return { eqs: copia, equipo: elegido };
  };

  const girar = () => {
    if (girando || !pozo.length) return;
    const idx = Math.floor(Math.random() * pozo.length);
    const seg = 360 / pozo.length;
    // La flecha está arriba: llevamos el centro de la tajada elegida hasta los 0°.
    const objetivo = 360 - (idx * seg + seg / 2);
    const actual = ((giro % 360) + 360) % 360;
    const delta = ((((objetivo - actual) % 360) + 360) % 360) + 360 * 5;
    setGirando(true);
    setGanador(null);
    setGiro(giro + delta);
    reloj.current = setTimeout(() => {
      const elegido = pozo[idx];
      const r = ubicar(equipos, elegido);
      if (r.equipo === -1) {
        setBanca((b) => [...b, elegido]);
      } else {
        setEquipos(r.eqs);
      }
      setGanador({ id: elegido, equipo: r.equipo });
      setGirando(false);
    }, GIRO_MS);
  };

  const sortearResto = () => {
    if (girando) return;
    let eqs = equipos;
    const nuevosBanca = [];
    pozo
      .slice()
      .sort(() => Math.random() - 0.5)
      .forEach((id) => {
        const r = ubicar(eqs, id);
        if (r.equipo === -1) nuevosBanca.push(id);
        else eqs = r.eqs;
      });
    setEquipos(eqs);
    if (nuevosBanca.length) setBanca((b) => [...b, ...nuevosBanca]);
    setGanador(null);
  };

  const mandarABanca = () => {
    setBanca((b) => [...b, ...pozo]);
    setGanador(null);
  };

  const reiniciar = () => {
    setEquipos(null);
    setBanca([]);
    setGanador(null);
  };

  const texto = () => {
    if (!equipos) return "";
    let t = `⚽ Equipos ${fechaCorta(isoLocal(new Date()))}\n\n`;
    equipos.forEach((e, i) => {
      t += `${PETOS[i].nombre.toUpperCase()}\n`;
      e.forEach((id) => { t += `· ${nombreDe[id]}\n`; });
      t += "\n";
    });
    if (banca.length) {
      t += "BANCA\n";
      banca.forEach((id) => { t += `· ${nombreDe[id]}\n`; });
    }
    return t.trim();
  };

  const copiar = async () => {
    try {
      await navigator.clipboard.writeText(texto());
    } catch (e) {
      // Sin permiso de portapapeles: el texto queda visible abajo para seleccionar.
    }
    setCopiado(true);
    setTimeout(() => setCopiado(false), 2000);
  };

  if (!jugadores.length) {
    return (
      <Vacio
        icono={<Shuffle size={26} color={C.primario} />}
        titulo="Nadie en la nómina"
        texto="Agrega jugadores para poder sortear los equipos del domingo."
      />
    );
  }

  // Paso 1: quiénes juegan hoy y cómo se arman los equipos.
  if (!equipos) {
    const cupo = nEquipos * porEquipo;
    const sobran = Math.max(0, sel.length - cupo);
    const todos = jugadores.length > 0 && sel.length === jugadores.length;
    const opcionesEquipos = Array.from({ length: MAX_EQUIPOS - 1 }, (_, i) => i + 2);

    return (
      <div className="pb-6">
        <div className="px-4 pt-4 flex items-center justify-between gap-3 mb-3">
          <Rotulo>¿Quiénes juegan hoy? · {sel.length}</Rotulo>
          <div className="flex items-center gap-3 shrink-0">
            {ultimoPartido && (
              <button
                onClick={() => setSel(ultimoPartido.att.filter((id) => nombreDe[id]))}
                className="text-xs font-bold active:opacity-60"
                style={{ color: C.primario }}
              >
                Copiar del último
              </button>
            )}
            <button
              onClick={() => setSel(todos ? [] : jugadores.map((j) => j.id))}
              className="text-xs font-bold active:opacity-60"
              style={{ color: C.primario }}
            >
              {todos ? "Quitar todos" : "Todos"}
            </button>
          </div>
        </div>
        <div className="px-4">
          <RejillaAsistencia jugadores={jugadores} seleccion={sel} alternar={alternar} />
        </div>

        <div className="px-4 pt-5">
          <Rotulo>Cuántos equipos</Rotulo>
          <div className="flex gap-2 mt-2">
            {opcionesEquipos.map((n) => (
              <button
                key={n}
                onClick={() => setNEquipos(n)}
                className="flex-1 rounded-xl py-3 font-bold transition"
                style={{ background: nEquipos === n ? C.primario : C.tarjeta, color: nEquipos === n ? "#fff" : C.humo, boxShadow: nEquipos === n ? "none" : SOMBRA, ...NUM }}
              >
                {n}
              </button>
            ))}
          </div>

          <div className="mt-4"><Rotulo>Jugadores por equipo</Rotulo></div>
          <div className="flex items-center gap-3 mt-2 rounded-2xl p-2" style={{ background: C.tarjeta, boxShadow: SOMBRA }}>
            <button
              onClick={() => setPorEquipo((v) => Math.max(MIN_POR_EQUIPO, v - 1))}
              className="rounded-full flex items-center justify-center active:opacity-60"
              style={{ width: 40, height: 40, background: C.tarjeta2 }}
            >
              <Minus size={18} color={C.tinta} />
            </button>
            <div className="flex-1 text-center">
              <div style={{ ...NUM, fontSize: 26, fontWeight: 800, color: C.tinta, lineHeight: 1 }}>{porEquipo}</div>
              <div style={{ ...ROTULO, fontSize: 9, marginTop: 3 }}>por equipo</div>
            </div>
            <button
              onClick={() => setPorEquipo((v) => Math.min(MAX_POR_EQUIPO, v + 1))}
              className="rounded-full flex items-center justify-center active:opacity-60"
              style={{ width: 40, height: 40, background: C.primario }}
            >
              <Plus size={18} color="#fff" strokeWidth={3} />
            </button>
          </div>

          <div className="text-xs mt-2" style={{ color: C.humo }}>
            {nEquipos} equipos × {porEquipo} = <strong style={{ color: C.tinta }}>{cupo} en cancha</strong>
            {sel.length > 0 && (
              sobran > 0
                ? ` · sobran ${sobran} para la banca`
                : sel.length < cupo
                  ? ` · te faltan ${cupo - sel.length} para llenar`
                  : " · justo completo"
            )}
          </div>

          <button
            onClick={() => setEquilibrar(!equilibrar)}
            className="w-full flex items-center gap-3 rounded-2xl p-3 mt-3 text-left"
            style={{ background: C.tarjeta, boxShadow: SOMBRA }}
          >
            <div className="rounded-md flex items-center justify-center" style={{ width: 22, height: 22, background: equilibrar ? C.primario : C.tarjeta2 }}>
              {equilibrar && <Check size={14} color="#fff" strokeWidth={3.5} />}
            </div>
            <div className="flex-1">
              <div className="text-sm font-bold" style={{ color: C.tinta }}>Repartir parejo</div>
              <div className="text-xs" style={{ color: C.humo }}>Manda a cada uno al equipo con menor nota acumulada</div>
            </div>
          </button>

          <div className="mt-4">
            <Boton ancho onClick={() => { setEquipos(Array.from({ length: nEquipos }, () => [])); setBanca([]); setGanador(null); }} disabled={sel.length < nEquipos}>
              <RotateCw size={17} /> Armar la ruleta
            </Boton>
          </div>
          {sel.length > 0 && sel.length < nEquipos && (
            <div className="text-xs mt-2" style={{ color: C.humo }}>Necesitas al menos {nEquipos} jugadores.</div>
          )}
        </div>
      </div>
    );
  }

  // Paso 2: girar y repartir.
  const seg = pozo.length ? 360 / pozo.length : 360;
  const punto = (ang, r) => {
    const rad = ((ang - 90) * Math.PI) / 180;
    return [CX + r * Math.cos(rad), CY + r * Math.sin(rad)];
  };
  const tamTexto = pozo.length <= 8 ? 13 : pozo.length <= 13 ? 11 : 9;

  return (
    <div className="pb-6">
      {pozo.length > 0 && hayEspacio ? (
        <div className="flex flex-col items-center pt-3">
          <div className="relative" style={{ width: 300, maxWidth: "100%" }}>
            <svg viewBox="0 0 300 300" className="w-full">
              <g
                style={{
                  transformOrigin: "150px 150px",
                  transform: `rotate(${giro}deg)`,
                  transition: girando ? `transform ${GIRO_MS}ms cubic-bezier(0.16,0.84,0.24,1)` : "none",
                }}
              >
                <circle cx={CX} cy={CY} r={R + 6} fill="#fff" />
                {pozo.map((id, i) => {
                  const a0 = i * seg;
                  const [x0, y0] = punto(a0, R);
                  const [x1, y1] = punto(a0 + seg, R);
                  const d =
                    pozo.length === 1
                      ? `M ${CX} ${CY - R} A ${R} ${R} 0 1 1 ${CX - 0.01} ${CY - R} Z`
                      : `M ${CX} ${CY} L ${x0} ${y0} A ${R} ${R} 0 ${seg > 180 ? 1 : 0} 1 ${x1} ${y1} Z`;
                  return (
                    <g key={id}>
                      <path d={d} fill={RUEDA[i % RUEDA.length]} stroke="#fff" strokeWidth="2.5" />
                      <text
                        x={CX}
                        y={CY - R * 0.62}
                        textAnchor="middle"
                        dominantBaseline="middle"
                        transform={`rotate(${pozo.length === 1 ? 0 : a0 + seg / 2} ${CX} ${CY})`}
                        style={{ fontSize: tamTexto, fontWeight: 800, fill: "#fff", stroke: "rgba(15,27,45,0.55)", strokeWidth: 2.2, paintOrder: "stroke", strokeLinejoin: "round" }}
                      >
                        {nombreCorto(nombreDe[id])}
                      </text>
                    </g>
                  );
                })}
                <circle cx={CX} cy={CY} r="27" fill="#fff" />
                <circle cx={CX} cy={CY} r="27" fill="none" stroke={C.primario} strokeWidth="3" />
              </g>
              <polygon points="150,36 134,4 166,4" fill={C.primario} />
            </svg>
          </div>

          <div className="h-10 flex items-center px-4">
            {ganador ? (
              <div
                className="flex items-center gap-2 rounded-full px-4 py-2"
                style={{ background: ganador.equipo === -1 ? C.tarjeta2 : PETOS[ganador.equipo].hex, boxShadow: SOMBRA }}
              >
                <span className="font-extrabold text-sm" style={{ color: ganador.equipo === -1 ? C.humo : PETOS[ganador.equipo].texto }}>
                  {nombreDe[ganador.id]} → {ganador.equipo === -1 ? "Banca" : PETOS[ganador.equipo].nombre}
                </span>
              </div>
            ) : (
              <div className="text-xs" style={{ color: C.humo }}>Faltan {pozo.length} por repartir</div>
            )}
          </div>

          <div className="flex gap-2 px-4 w-full mt-1">
            <div className="flex-1">
              <Boton ancho onClick={girar} disabled={girando}>
                <RotateCw size={17} /> {girando ? "Girando…" : "Girar"}
              </Boton>
            </div>
            <Boton tono="fantasma" onClick={sortearResto} disabled={girando}>
              <Shuffle size={16} /> Todos
            </Boton>
          </div>
        </div>
      ) : pozo.length > 0 ? (
        // Los equipos están llenos pero sobra gente.
        <div className="px-4 pt-4">
          <div className="rounded-2xl p-4" style={{ background: C.tarjeta, boxShadow: SOMBRA }}>
            <div className="flex items-center gap-2">
              <Users size={16} color={C.humo} />
              <div className="font-bold text-sm" style={{ color: C.tinta }}>Equipos completos</div>
            </div>
            <div className="text-xs mt-1 mb-3" style={{ color: C.humo }}>
              Quedan {pozo.length} jugadores sin puesto ({nEquipos} × {porEquipo} = {nEquipos * porEquipo} cupos).
              Mándalos a la banca o vuelve atrás y arma más equipos.
            </div>
            <div className="flex gap-2">
              <div className="flex-1"><Boton ancho onClick={mandarABanca}>Mandar a la banca</Boton></div>
              <Boton tono="fantasma" onClick={reiniciar}><RotateCw size={16} /></Boton>
            </div>
          </div>
        </div>
      ) : (
        <div className="px-4 pt-4 space-y-2">
          {onRegistrar && (
            <>
              <Boton ancho onClick={() => onRegistrar(sorteoActual())}>
                <ClipboardList size={17} /> Guardar como partido
              </Boton>
              <div className="text-xs text-center" style={{ color: C.humo }}>
                Los equipos quedan listos: después solo pones los goles.
              </div>
            </>
          )}
          <div className="flex gap-2">
            <div className="flex-1">
              <Boton tono={onRegistrar ? "fantasma" : "solido"} ancho onClick={copiar}>
                <Copy size={16} /> {copiado ? "¡Copiado!" : "Copiar para WhatsApp"}
              </Boton>
            </div>
            <Boton tono="fantasma" onClick={reiniciar}>
              <RotateCw size={16} />
            </Boton>
          </div>
        </div>
      )}

      {/* Alineaciones tipo cancha */}
      <div className="px-4 pt-5 space-y-3">
        {equipos.map((e, i) => (
          <Cancha key={i} ids={e} peto={PETOS[i]} nombreDe={nombreDe} cupo={porEquipo} />
        ))}
      </div>

      {/* Banca */}
      {banca.length > 0 && (
        <div className="px-4 pt-3">
          <div className="rounded-2xl overflow-hidden" style={{ background: C.tarjeta, boxShadow: SOMBRA }}>
            <div className="flex items-center justify-between px-3 py-2" style={{ background: C.tarjeta2 }}>
              <div className="font-extrabold text-sm" style={{ color: C.tinta }}>Banca</div>
              <div style={{ ...NUM, color: C.humo, fontWeight: 800, fontSize: 13 }}>{banca.length}</div>
            </div>
            <div className="flex flex-wrap gap-3 p-3">
              {banca.map((id) => (
                <div key={id} className="flex flex-col items-center" style={{ width: 54 }}>
                  <Avatar id={id} nombre={nombreDe[id]} tam={40} />
                  <div className="text-xs mt-1 truncate w-full text-center" style={{ color: C.humo, fontWeight: 600 }}>
                    {nombreCorto(nombreDe[id] || "?")}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {equilibrar && !pozo.length && (
        <div className="px-4 pt-3 space-y-1">
          <Rotulo>Nota acumulada por equipo</Rotulo>
          {equipos.map((e, i) => (
            <div key={i} className="flex items-center justify-between text-sm">
              <span style={{ color: C.humo }}>Peto {PETOS[i].nombre}</span>
              <span style={{ ...NUM, color: C.tinta, fontWeight: 700 }}>{dec1(e.reduce((s, id) => s + (nivel[id] || 0), 0))}</span>
            </div>
          ))}
        </div>
      )}

      {!pozo.length && (
        <div className="px-4 pt-4">
          <Rotulo>Texto listo para pegar</Rotulo>
          <pre
            className="mt-2 rounded-xl p-3 text-xs whitespace-pre-wrap select-all"
            style={{ background: C.tarjeta, color: C.humo, boxShadow: SOMBRA }}
          >
            {texto()}
          </pre>
        </div>
      )}
    </div>
  );
}
