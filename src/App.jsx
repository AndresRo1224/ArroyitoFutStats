import React, { useEffect, useMemo, useRef, useState } from "react";
import { Trophy, Calendar, RotateCw, Users, Settings, Cloud, CloudOff, RefreshCw } from "lucide-react";
import { C, ROTULO, SOMBRA } from "./tema";
import { FotoCtx, Boton, Rotulo } from "./components/ui";
import { calcularTabla, filaVacia, uid } from "./lib/util";
import { K_DATOS, K_FOTOS, leerJSON, guardarJSON, descargarRespaldo, leerRespaldo } from "./lib/almacenamiento";
import * as nube from "./lib/nube";
import Tabla from "./screens/Tabla";
import Nomina from "./screens/Nomina";
import Partidos from "./screens/Partidos";
import Ruleta from "./screens/Ruleta";
import EditorPartido from "./screens/EditorPartido";
import FichaJugador from "./screens/FichaJugador";
import SubirFoto from "./screens/SubirFoto";

const PESTANAS = [
  { id: "tabla", label: "Tabla", icono: Trophy },
  { id: "partidos", label: "Partidos", icono: Calendar },
  { id: "ruleta", label: "Ruleta", icono: RotateCw },
  { id: "jugadores", label: "Nómina", icono: Users },
];

const ordenarPartidos = (ps) => ps.slice().sort((a, b) => b.fecha.localeCompare(a.fecha));

export default function App() {
  const [tab, setTab] = useState("tabla");
  const [jugadores, setJugadores] = useState([]);
  const [partidos, setPartidos] = useState([]);
  const [fotos, setFotos] = useState({});
  const [grupo, setGrupo] = useState("ArroyitoFutStats");
  const [cargado, setCargado] = useState(false);
  const [editor, setEditor] = useState(null);
  const [ficha, setFicha] = useState(null);
  const [subir, setSubir] = useState(null); // id del jugador que sube su foto
  const [ajustes, setAjustes] = useState(false);
  const [confirmar, setConfirmar] = useState(null);
  const [aviso, setAviso] = useState("");
  const [enLinea, setEnLinea] = useState(null); // null = sin nube, true/false = estado
  const [sincronizando, setSincronizando] = useState(false);

  const inputRespaldo = useRef(null);
  const primeraCarga = useRef(true);

  const refrescarNube = async (silencioso = true) => {
    if (!nube.nubeActiva()) { setEnLinea(null); return; }
    setSincronizando(true);
    try {
      const [d, f] = await Promise.all([nube.obtenerDatos(), nube.obtenerFotos()]);
      setJugadores(d.jugadores || []);
      setPartidos(ordenarPartidos(d.partidos || []));
      if (d.grupo) setGrupo(d.grupo);
      setFotos(f || {});
      guardarJSON(K_DATOS, { jugadores: d.jugadores || [], partidos: d.partidos || [], grupo: d.grupo || grupo });
      guardarJSON(K_FOTOS, f || {});
      setEnLinea(true);
      if (!silencioso) setAviso("Datos actualizados desde la nube.");
    } catch (e) {
      setEnLinea(false);
      if (!silencioso) setAviso("No se pudo conectar con la nube. Se muestran los datos guardados.");
    } finally {
      setSincronizando(false);
    }
  };

  // Cargar: primero el cache local (instantáneo), luego refresca desde la nube.
  useEffect(() => {
    (async () => {
      const d = await leerJSON(K_DATOS, null);
      if (d) {
        setJugadores(d.jugadores || []);
        setPartidos(ordenarPartidos(d.partidos || []));
        if (d.grupo) setGrupo(d.grupo);
      }
      setFotos(await leerJSON(K_FOTOS, {}));
      setCargado(true);
      await refrescarNube(true);
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Guardar datos: cache local siempre + empuje a la nube (con pequeño retardo).
  useEffect(() => {
    if (!cargado) return;
    if (primeraCarga.current) { primeraCarga.current = false; return; }
    const t = setTimeout(() => {
      guardarJSON(K_DATOS, { jugadores, partidos, grupo });
      if (nube.nubeActiva()) {
        nube.guardarDatos({ jugadores, partidos, grupo })
          .then(() => setEnLinea(true))
          .catch((e) => { setEnLinea(false); setAviso(e.message); });
      }
    }, 700);
    return () => clearTimeout(t);
  }, [jugadores, partidos, grupo, cargado]);

  // Las fotos solo se cachean local; a la nube van una por una (con PIN).
  useEffect(() => {
    if (!cargado) return;
    const t = setTimeout(() => guardarJSON(K_FOTOS, fotos), 400);
    return () => clearTimeout(t);
  }, [fotos, cargado]);

  const tabla = useMemo(() => calcularTabla(jugadores, partidos), [jugadores, partidos]);
  const statsDe = (id) => tabla.find((t) => t.id === id) || filaVacia;
  const ultimoPartido = partidos[0];

  const guardarFotoJugador = async (data, pin) => {
    const id = subir;
    await nube.subirFoto(id, data, pin); // lanza error si el PIN no coincide
    setFotos((f) => ({ ...f, [id]: data }));
  };

  const guardarPartido = (p) => {
    setPartidos((ps) => ordenarPartidos([...ps.filter((x) => x.id !== p.id), p]));
    setEditor(null);
  };

  const borrarJugador = (id) => {
    setJugadores((js) => js.filter((j) => j.id !== id));
    setFotos((f) => { const c = { ...f }; delete c[id]; return c; });
    setFicha(null);
    setConfirmar(null);
  };

  const importar = async (e) => {
    const file = e.target.files && e.target.files[0];
    if (!file) return;
    try {
      const o = await leerRespaldo(file);
      setJugadores(o.jugadores);
      setPartidos(ordenarPartidos(o.partidos));
      setFotos(o.fotos || {});
      if (o.grupo) setGrupo(o.grupo);
      setAjustes(false);
      setAviso("Respaldo restaurado.");
    } catch (err) {
      setAviso(err.message);
    }
  };

  const jugadorSubiendo = subir ? jugadores.find((j) => j.id === subir) : null;

  return (
    <FotoCtx.Provider value={fotos}>
      <div className="w-full flex justify-center" style={{ background: "#DCE3EC", minHeight: "100vh" }}>
        <div
          className="w-full flex flex-col"
          style={{
            maxWidth: 448,
            height: "100vh",
            background: C.fondo,
            color: C.tinta,
            fontFamily: 'ui-sans-serif, system-ui, -apple-system, "Segoe UI", Roboto, sans-serif',
          }}
        >
          <header
            className="flex items-center gap-3 px-4 py-3 shrink-0"
            style={{ background: C.tarjeta, boxShadow: SOMBRA, paddingTop: "calc(12px + env(safe-area-inset-top))" }}
          >
            <div
              className="rounded-2xl flex items-center justify-center"
              style={{ width: 38, height: 38, background: `linear-gradient(140deg, ${C.primario}, ${C.primarioOsc})`, boxShadow: "0 4px 12px rgba(18,161,80,0.3)" }}
            >
              {/* Mismo balón del ícono de la app: pentágono central y costuras. */}
              <svg width="22" height="22" viewBox="0 0 24 24">
                <circle cx="12" cy="12" r="9" fill="#fff" />
                <g stroke={C.primarioOsc} strokeWidth="1.3" strokeLinecap="round">
                  <line x1="12" y1="8.6" x2="12" y2="5" />
                  <line x1="15.23" y1="10.95" x2="18.66" y2="9.84" />
                  <line x1="14" y1="14.75" x2="16.12" y2="17.66" />
                  <line x1="10" y1="14.75" x2="7.88" y2="17.66" />
                  <line x1="8.77" y1="10.95" x2="5.34" y2="9.84" />
                </g>
                <polygon points="12,8.6 15.23,10.95 14,14.75 10,14.75 8.77,10.95" fill={C.primarioOsc} />
              </svg>
            </div>
            <div className="flex-1 min-w-0">
              <div className="font-extrabold text-base truncate" style={{ letterSpacing: "-0.02em", color: C.tinta }}>{grupo}</div>
              <div className="flex items-center gap-1.5">
                <div style={{ ...ROTULO, fontSize: 9 }}>{partidos.length} partidos jugados</div>
                {enLinea === true && <Cloud size={11} color={C.primario} />}
                {enLinea === false && <CloudOff size={11} color={C.humo} />}
              </div>
            </div>
            <button onClick={() => setAjustes(true)} className="p-2 rounded-xl active:opacity-60" style={{ background: C.tarjeta2 }}>
              <Settings size={18} color={C.humo} />
            </button>
          </header>

          <main className="flex-1 overflow-y-auto">
            {!cargado ? (
              <div className="flex items-center justify-center h-full text-sm" style={{ color: C.humo }}>Cargando el grupo…</div>
            ) : tab === "tabla" ? (
              <Tabla jugadores={jugadores} partidos={partidos} tabla={tabla} abrirJugador={setFicha} irA={setTab} />
            ) : tab === "jugadores" ? (
              <Nomina
                jugadores={jugadores}
                tabla={tabla}
                abrirJugador={setFicha}
                pedirFoto={setSubir}
                agregar={(n) => setJugadores((js) => [...js, { id: uid(), nombre: n }])}
              />
            ) : tab === "partidos" ? (
              <Partidos
                partidos={partidos}
                jugadores={jugadores}
                nuevo={() => setEditor({ nuevo: true })}
                editar={(p) => setEditor({ p })}
              />
            ) : (
              <Ruleta jugadores={jugadores} tabla={tabla} ultimoPartido={ultimoPartido} />
            )}
          </main>

          <nav
            className="flex shrink-0"
            style={{ background: C.tarjeta, boxShadow: "0 -1px 8px rgba(15,27,45,0.05)", paddingBottom: "env(safe-area-inset-bottom)" }}
          >
            {PESTANAS.map((t) => {
              const Ico = t.icono;
              const on = tab === t.id;
              return (
                <button key={t.id} onClick={() => setTab(t.id)} className="flex-1 flex flex-col items-center gap-1 py-2.5 active:opacity-60">
                  <div className="flex items-center justify-center rounded-xl transition" style={{ width: 40, height: 28, background: on ? `${C.primario}18` : "transparent" }}>
                    <Ico size={19} color={on ? C.primario : C.humo} />
                  </div>
                  <span style={{ ...ROTULO, fontSize: 9, color: on ? C.primario : C.humo }}>{t.label}</span>
                </button>
              );
            })}
          </nav>
        </div>

        <input ref={inputRespaldo} type="file" accept="application/json" className="hidden" onChange={importar} />

        {jugadorSubiendo && (
          <SubirFoto
            jugador={jugadorSubiendo}
            fotoActual={fotos[jugadorSubiendo.id]}
            onGuardar={guardarFotoJugador}
            onCerrar={() => setSubir(null)}
          />
        )}

        {editor && (
          <EditorPartido
            inicial={editor.p}
            jugadores={jugadores}
            ultimoPartido={ultimoPartido}
            guardar={guardarPartido}
            cerrar={() => setEditor(null)}
            borrar={() => {
              setPartidos((ps) => ps.filter((x) => x.id !== editor.p.id));
              setEditor(null);
            }}
          />
        )}

        {ficha && jugadores.some((j) => j.id === ficha) && (
          <FichaJugador
            jugador={jugadores.find((j) => j.id === ficha)}
            stats={statsDe(ficha)}
            partidos={partidos}
            cerrar={() => setFicha(null)}
            pedirFoto={setSubir}
            renombrar={(n) => setJugadores((js) => js.map((j) => (j.id === ficha ? { ...j, nombre: n } : j)))}
            eliminar={() => setConfirmar({ tipo: "jugador", id: ficha })}
          />
        )}

        {ajustes && (
          <Ajustes
            grupo={grupo}
            setGrupo={setGrupo}
            enLinea={enLinea}
            sincronizando={sincronizando}
            refrescar={() => refrescarNube(false)}
            cerrar={() => setAjustes(false)}
            exportar={() => descargarRespaldo({ jugadores, partidos, grupo, fotos })}
            importar={() => inputRespaldo.current && inputRespaldo.current.click()}
            borrarTodo={() => setConfirmar({ tipo: "todo" })}
            avisar={setAviso}
          />
        )}

        {confirmar && (
          <div className="fixed inset-0 z-[60] flex items-center justify-center p-6" style={{ background: "rgba(15,27,45,0.55)" }}>
            <div className="w-full rounded-3xl p-5" style={{ background: C.tarjeta, maxWidth: 340, boxShadow: SOMBRA }}>
              <div className="font-extrabold text-base" style={{ color: C.tinta }}>
                {confirmar.tipo === "todo" ? "¿Borrar todo?" : "¿Sacar a este jugador?"}
              </div>
              <div className="text-sm mt-2" style={{ color: C.humo }}>
                {confirmar.tipo === "todo"
                  ? "Se eliminan jugadores, partidos y fotos. Esto no se puede deshacer."
                  : "Se borra de la nómina y de la tabla. Los partidos ya registrados conservan sus goles."}
              </div>
              <div className="flex gap-2 mt-5">
                <div className="flex-1">
                  <Boton ancho tono="fantasma" onClick={() => setConfirmar(null)}>Cancelar</Boton>
                </div>
                <button
                  onClick={() => {
                    if (confirmar.tipo === "todo") {
                      setJugadores([]); setPartidos([]); setFotos({});
                      setConfirmar(null); setAjustes(false); setTab("tabla");
                    } else {
                      borrarJugador(confirmar.id);
                    }
                  }}
                  className="flex-1 rounded-2xl py-3 text-sm font-bold text-white active:opacity-80"
                  style={{ background: C.alerta }}
                >
                  Borrar
                </button>
              </div>
            </div>
          </div>
        )}

        {aviso && (
          <button
            onClick={() => setAviso("")}
            className="fixed left-0 right-0 z-[70] mx-auto px-4 py-3 rounded-2xl text-sm font-semibold"
            style={{ bottom: 84, maxWidth: 380, background: C.tinta, color: "#fff", boxShadow: "0 8px 24px rgba(15,27,45,0.3)" }}
          >
            {aviso}
          </button>
        )}
      </div>
    </FotoCtx.Provider>
  );
}

// Panel de ajustes, incluida la configuración de la nube.
function Ajustes({ grupo, setGrupo, enLinea, sincronizando, refrescar, cerrar, exportar, importar, borrarTodo, avisar }) {
  const [url, setUrl] = useState(nube.baseGuardada());
  const [admin, setAdmin] = useState(nube.adminPin());
  const [probando, setProbando] = useState(false);

  const guardarConexion = () => {
    nube.fijarBaseNube(url);
    nube.fijarAdminPin(admin);
    avisar("Conexión guardada. Sincronizando…");
    refrescar();
    cerrar();
  };

  const probar = async () => {
    nube.fijarBaseNube(url);
    setProbando(true);
    try {
      await nube.probarConexion();
      avisar("¡Conexión correcta con la nube!");
    } catch (e) {
      avisar("Falló la conexión: " + e.message);
    } finally {
      setProbando(false);
    }
  };

  const campo = { background: C.tarjeta2, color: C.tinta, border: `1px solid ${C.linea}` };

  return (
    <div className="fixed inset-0 z-[60] flex items-end" style={{ background: "rgba(15,27,45,0.55)" }} onClick={cerrar}>
      <div
        className="w-full rounded-t-3xl p-5 overflow-y-auto"
        style={{ background: C.fondo, maxWidth: 448, margin: "0 auto", maxHeight: "90vh", paddingBottom: "calc(20px + env(safe-area-inset-bottom))" }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="font-extrabold text-lg mb-4" style={{ color: C.tinta }}>Ajustes</div>

        <Rotulo>Nombre del grupo</Rotulo>
        <input value={grupo} onChange={(e) => setGrupo(e.target.value)} className="w-full mt-2 rounded-xl px-3 py-3 text-sm outline-none" style={campo} />

        <div className="mt-5 flex items-center justify-between">
          <Rotulo>Conexión con la nube</Rotulo>
          {sincronizando && <RefreshCw size={13} color={C.primario} className="animate-spin" />}
        </div>
        <div className="text-xs mt-1 mb-2" style={{ color: C.humo }}>
          Pega la URL de tu proyecto en Vercel para que todo el grupo comparta tabla y fotos.
          Déjalo vacío para usar la app solo en este teléfono.
        </div>
        <input
          value={url}
          onChange={(e) => setUrl(e.target.value)}
          placeholder="https://tu-proyecto.vercel.app"
          className="w-full rounded-xl px-3 py-3 text-sm outline-none"
          style={campo}
        />
        <input
          value={admin}
          onChange={(e) => setAdmin(e.target.value)}
          placeholder="PIN de administrador (opcional)"
          className="w-full mt-2 rounded-xl px-3 py-3 text-sm outline-none"
          style={campo}
        />
        <div className="flex gap-2 mt-2">
          <div className="flex-1"><Boton ancho tono="fantasma" onClick={probar} disabled={probando}>{probando ? "Probando…" : "Probar conexión"}</Boton></div>
          <div className="flex-1"><Boton ancho onClick={guardarConexion}>Guardar</Boton></div>
        </div>

        <div className="mt-5"><Rotulo>Respaldo</Rotulo></div>
        <div className="text-xs mt-1" style={{ color: C.humo }}>
          Guarda una copia de todo (incluidas las fotos) en un archivo. Útil aunque uses la nube.
        </div>
        <div className="flex gap-2 mt-3">
          <div className="flex-1"><Boton ancho tono="suave" onClick={exportar}>Exportar</Boton></div>
          <div className="flex-1"><Boton ancho tono="fantasma" onClick={importar}>Importar</Boton></div>
        </div>

        <div className="mt-5 space-y-2">
          <Boton ancho onClick={cerrar}>Listo</Boton>
          <button onClick={borrarTodo} className="w-full py-3 text-sm font-bold active:opacity-60" style={{ color: C.alerta }}>
            Borrar todos los datos
          </button>
        </div>
      </div>
    </div>
  );
}
