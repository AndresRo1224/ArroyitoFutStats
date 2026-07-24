import React, { useEffect, useMemo, useRef, useState } from "react";
import { Trophy, Calendar, RotateCw, Users, Settings, Cloud, CloudOff, Medal } from "lucide-react";
import { C, ROTULO, SOMBRA } from "./tema";
import { FotoCtx, Boton, Rotulo } from "./components/ui";
import { calcularTabla, calcularTrofeos, filaVacia, uid } from "./lib/util";
import { K_DATOS, K_FOTOS, K_BANNERS, leerJSON, guardarJSON, descargarRespaldo, leerRespaldo } from "./lib/almacenamiento";
import * as nube from "./lib/nube";
import Tabla from "./screens/Tabla";
import Nomina from "./screens/Nomina";
import Partidos from "./screens/Partidos";
import Ruleta from "./screens/Ruleta";
import Vitrina from "./screens/Vitrina";
import EditorPartido from "./screens/EditorPartido";
import FichaJugador from "./screens/FichaJugador";
import SubirFoto from "./screens/SubirFoto";
import ElegirBanner from "./screens/ElegirBanner";
import VotarMVP from "./screens/VotarMVP";
import PedirPin from "./screens/PedirPin";
import MostrarPin from "./screens/MostrarPin";
import Ajustes from "./screens/Ajustes";
import ListaPines from "./screens/ListaPines";

const PESTANAS = [
  { id: "tabla", label: "Tabla", icono: Trophy },
  { id: "partidos", label: "Partidos", icono: Calendar },
  { id: "ruleta", label: "Ruleta", icono: RotateCw },
  { id: "trofeos", label: "Trofeos", icono: Medal },
  { id: "jugadores", label: "Nómina", icono: Users },
];

const ordenarPartidos = (ps) => ps.slice().sort((a, b) => b.fecha.localeCompare(a.fecha));

export default function App() {
  const [tab, setTab] = useState("tabla");
  const [jugadores, setJugadores] = useState([]);
  const [partidos, setPartidos] = useState([]);
  const [fotos, setFotos] = useState({});
  const [banners, setBanners] = useState({});
  const [votos, setVotos] = useState({}); // { [partidoId]: { conteo, votantes } }
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
  const [adminNecesario, setAdminNecesario] = useState(false); // el grupo tiene PIN
  const [esAdmin, setEsAdmin] = useState(false);               // este teléfono está autorizado
  const [pedirPin, setPedirPin] = useState(null); // { titulo, texto, accion }
  const [pinNuevo, setPinNuevo] = useState(null); // { nombre, pin } recién generado
  const [verPines, setVerPines] = useState(false); // lista de PIN para repartir
  const [votarPartido, setVotarPartido] = useState(null); // partido cuyo MVP se vota
  const [bannerJugador, setBannerJugador] = useState(null); // jugador que cambia banner

  const inputRespaldo = useRef(null);
  const primeraCarga = useRef(true);
  // Solo se empuja a la nube lo que se cambió DESDE ESTE teléfono. Sin esto, al
  // cargar los datos del servidor se reenviaban de vuelta, y un visitante sin
  // permiso recibía un aviso de PIN incorrecto (y podía pisar los datos del grupo).
  const hayCambios = useRef(false);

  const refrescarNube = async (silencioso = true) => {
    if (!nube.nubeActiva()) { setEnLinea(null); return; }
    setSincronizando(true);
    try {
      const t = await nube.obtenerTodo();
      const d = t.datos || {};
      const f = t.fotos || {}, b = t.banners || {}, v = t.votos || {};
      setJugadores(d.jugadores || []);
      setPartidos(ordenarPartidos(d.partidos || []));
      if (d.grupo) setGrupo(d.grupo);
      setFotos(f);
      setBanners(b);
      setVotos(v);
      // Estado del administrador (viene en la misma llamada).
      const necesario = !!(t.admin && t.admin.configurado);
      setAdminNecesario(necesario);
      setEsAdmin(!necesario || nube.adminAutorizado());
      guardarJSON(K_DATOS, { jugadores: d.jugadores || [], partidos: d.partidos || [], grupo: d.grupo || grupo });
      guardarJSON(K_FOTOS, f);
      guardarJSON(K_BANNERS, b);
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
      setBanners(await leerJSON(K_BANNERS, {}));
      if (!nube.nubeActiva()) setEsAdmin(true); // sin nube, este teléfono manda
      setCargado(true);
      await refrescarNube(true); // esto también trae el estado del administrador
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Re-consulta si el grupo tiene PIN (tras definirlo/cambiarlo en Ajustes).
  // Es optimista: no verifica el PIN guardado contra el servidor (una llamada
  // menos); si estuviera mal, el primer guardado lo corrige y lo vuelve a pedir.
  const revisarAdmin = async () => {
    if (!nube.nubeActiva()) { setAdminNecesario(false); setEsAdmin(true); return; }
    try {
      const r = await nube.adminRequerido();
      const necesario = !!(r && r.configurado);
      setAdminNecesario(necesario);
      setEsAdmin(!necesario || nube.adminAutorizado());
    } catch { /* sin conexión: se decide al intentar guardar */ }
  };

  const puedeEditar = !adminNecesario || esAdmin;

  const ejecutar = (accion) => { hayCambios.current = true; accion(); };

  // Ejecuta una acción que modifica la nómina o los partidos. Si el grupo tiene
  // PIN y este teléfono no está autorizado, lo pide antes de continuar.
  const conPermiso = (titulo, accion) => {
    if (puedeEditar) return ejecutar(accion);
    setPedirPin({
      titulo,
      accion,
      texto: "Este grupo está protegido: solo quien conozca el PIN puede cambiar la nómina o los partidos.",
    });
  };

  const desbloquearAdmin = () =>
    setPedirPin({
      titulo: "Modo administrador",
      texto: "Ingresa el PIN del grupo para poder editar la nómina y los partidos.",
      accion: () => {},
      soloDesbloquear: true,
    });

  const bloquearAdmin = () => {
    nube.salirAdmin();
    setEsAdmin(false);
    setAviso("Saliste del modo administrador.");
  };

  // Guardar datos: cache local siempre + empuje a la nube (con pequeño retardo).
  useEffect(() => {
    if (!cargado) return;
    if (primeraCarga.current) { primeraCarga.current = false; return; }
    const t = setTimeout(() => {
      guardarJSON(K_DATOS, { jugadores, partidos, grupo }); // el cache local siempre
      // A la nube solo van los cambios hechos aquí, y solo si hay permiso.
      // Un visitante nunca escribe ni recibe avisos que no le corresponden.
      if (!nube.nubeActiva() || !hayCambios.current || !puedeEditar) return;
      nube.guardarDatos({ jugadores, partidos, grupo })
        .then(() => { hayCambios.current = false; setEnLinea(true); })
        .catch((e) => {
          setEnLinea(false);
          if (/no autorizado|PIN/i.test(e.message)) {
            nube.salirAdmin();
            setEsAdmin(false);
            setAdminNecesario(true);
            setAviso("Tu sesión de administrador venció. Vuelve a ingresar el PIN en Ajustes.");
          } else {
            setAviso(e.message);
          }
        });
    }, 700);
    return () => clearTimeout(t);
  }, [jugadores, partidos, grupo, cargado, puedeEditar]);

  // Fotos y banners se cachean local; a la nube van uno por uno (con PIN).
  useEffect(() => {
    if (!cargado) return;
    const t = setTimeout(() => guardarJSON(K_FOTOS, fotos), 400);
    return () => clearTimeout(t);
  }, [fotos, cargado]);

  useEffect(() => {
    if (!cargado) return;
    const t = setTimeout(() => guardarJSON(K_BANNERS, banners), 400);
    return () => clearTimeout(t);
  }, [banners, cargado]);

  const tabla = useMemo(() => calcularTabla(jugadores, partidos), [jugadores, partidos]);
  const trofeos = useMemo(() => calcularTrofeos(tabla, partidos, votos), [tabla, partidos, votos]);
  const statsDe = (id) => tabla.find((t) => t.id === id) || filaVacia;
  const ultimoPartido = partidos[0];

  const guardarFotoJugador = async (data, pin) => {
    const id = subir;
    await nube.subirFoto(id, data, pin); // lanza error si el PIN no coincide
    setFotos((f) => ({ ...f, [id]: data }));
  };

  const guardarBannerJugador = async (bannerId, pin) => {
    const id = bannerJugador.id;
    await nube.guardarBanner(id, bannerId, pin); // lanza error si el PIN no coincide
    setBanners((b) => ({ ...b, [id]: bannerId }));
  };

  const votar = async (partidoId, votanteId, pin, votadoId) => {
    const res = await nube.votarMVP(partidoId, votanteId, pin, votadoId); // lanza si falla
    setVotos((v) => ({ ...v, [partidoId]: res }));
  };

  const guardarPartido = (p) =>
    conPermiso("Guardar partido", () => {
      // `creado` marca el inicio de la ventana de votación del MVP (24h). Se
      // conserva si el partido ya existía; se pone ahora si es nuevo.
      setPartidos((ps) => {
        const previo = ps.find((x) => x.id === p.id);
        const conMarca = { ...p, creado: (previo && previo.creado) || p.creado || Date.now() };
        return ordenarPartidos([...ps.filter((x) => x.id !== p.id), conMarca]);
      });
      setEditor(null);
    });

  // Al agregar a alguien, el servidor le genera su PIN personal y se lo mostramos
  // al administrador para que se lo pase. Si eso falla, no se crea el jugador.
  const agregarJugador = (nombre) =>
    conPermiso("Agregar a la nómina", async () => {
      const id = uid();
      try {
        const pin = await nube.generarPin(id);
        setJugadores((js) => [...js, { id, nombre }]);
        setPinNuevo({ nombre, pin });
      } catch (e) {
        setAviso("No se pudo agregar: " + e.message);
      }
    });

  const regenerarPin = (id, nombre) =>
    conPermiso("Generar PIN nuevo", async () => {
      try {
        setPinNuevo({ nombre, pin: await nube.generarPin(id) });
      } catch (e) {
        setAviso("No se pudo generar el PIN: " + e.message);
      }
    });

  const borrarJugador = (id) =>
    conPermiso("Sacar de la nómina", () => {
      setJugadores((js) => js.filter((j) => j.id !== id));
      setFotos((f) => { const c = { ...f }; delete c[id]; return c; });
      nube.borrarPin(id); // se lleva también su PIN y su foto de la nube
      setFicha(null);
      setConfirmar(null);
    });

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
      <div className="w-full flex justify-center" style={{ background: C.marco, minHeight: "100vh" }}>
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
                agregar={agregarJugador}
                esAdmin={puedeEditar}
                verPines={() => setVerPines(true)}
              />
            ) : tab === "partidos" ? (
              <Partidos
                partidos={partidos}
                jugadores={jugadores}
                votos={votos}
                esAdmin={puedeEditar}
                nuevo={() => setEditor({ nuevo: true })}
                abrir={(p) => setVotarPartido(p)}
              />
            ) : tab === "trofeos" ? (
              <Vitrina tabla={tabla} partidos={partidos} votos={votos} jugadores={jugadores} abrirJugador={setFicha} />
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

        {verPines && (
          <ListaPines
            jugadores={jugadores}
            grupo={grupo}
            avisar={setAviso}
            cerrar={() => setVerPines(false)}
          />
        )}

        {pinNuevo && (
          <MostrarPin nombre={pinNuevo.nombre} pin={pinNuevo.pin} onCerrar={() => setPinNuevo(null)} />
        )}

        {pedirPin && (
          <PedirPin
            titulo={pedirPin.titulo}
            texto={pedirPin.texto}
            onCerrar={() => setPedirPin(null)}
            onConfirmar={async (pin) => {
              await nube.verificarAdmin(pin); // lanza Error si falla; guarda el token
              setEsAdmin(true);
              const { accion, soloDesbloquear } = pedirPin;
              setPedirPin(null);
              if (soloDesbloquear) return setAviso("Modo administrador activado.");
              ejecutar(accion);
            }}
          />
        )}

        {editor && (
          <EditorPartido
            inicial={editor.p}
            jugadores={jugadores}
            ultimoPartido={ultimoPartido}
            guardar={guardarPartido}
            cerrar={() => setEditor(null)}
            borrar={() =>
              conPermiso("Borrar partido", () => {
                setPartidos((ps) => ps.filter((x) => x.id !== editor.p.id));
                setEditor(null);
              })
            }
          />
        )}

        {ficha && jugadores.some((j) => j.id === ficha) && (
          <FichaJugador
            jugador={jugadores.find((j) => j.id === ficha)}
            stats={statsDe(ficha)}
            partidos={partidos}
            banner={banners[ficha]}
            trofeos={trofeos.porJugador[ficha]}
            esAdmin={puedeEditar}
            cerrar={() => setFicha(null)}
            pedirFoto={setSubir}
            cambiarBanner={(j) => setBannerJugador(j)}
            regenerarPin={regenerarPin}
            renombrar={(n) => {
              const actual = jugadores.find((j) => j.id === ficha);
              if (!actual || actual.nombre === n) return; // sin cambios: no molestar con el PIN
              conPermiso("Cambiar el nombre", () =>
                setJugadores((js) => js.map((j) => (j.id === ficha ? { ...j, nombre: n } : j)))
              );
            }}
            eliminar={() => setConfirmar({ tipo: "jugador", id: ficha })}
          />
        )}

        {votarPartido && partidos.some((p) => p.id === votarPartido.id) && (
          <VotarMVP
            partido={partidos.find((p) => p.id === votarPartido.id)}
            jugadores={jugadores}
            votos={votos[votarPartido.id]}
            onVotar={votar}
            onCerrar={() => setVotarPartido(null)}
            esAdmin={puedeEditar}
            onEditar={() => { const p = partidos.find((x) => x.id === votarPartido.id); setVotarPartido(null); setEditor({ p }); }}
          />
        )}

        {bannerJugador && (
          <ElegirBanner
            jugador={bannerJugador}
            actual={banners[bannerJugador.id]}
            onGuardar={guardarBannerJugador}
            onCerrar={() => setBannerJugador(null)}
          />
        )}

        {ajustes && (
          <Ajustes
            grupo={grupo}
            setGrupo={(v) => { hayCambios.current = true; setGrupo(v); }}
            enLinea={enLinea}
            sincronizando={sincronizando}
            adminNecesario={adminNecesario}
            esAdmin={esAdmin}
            desbloquear={() => { setAjustes(false); desbloquearAdmin(); }}
            bloquear={bloquearAdmin}
            trasCambiarPin={revisarAdmin}
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
                      conPermiso("Borrar todos los datos", () => {
                        setJugadores([]); setPartidos([]); setFotos({});
                        setConfirmar(null); setAjustes(false); setTab("tabla");
                      });
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
            style={{ bottom: 84, maxWidth: 380, background: C.tinta, color: C.fondo, boxShadow: "0 8px 24px rgba(15,27,45,0.3)" }}
          >
            {aviso}
          </button>
        )}
      </div>
    </FotoCtx.Provider>
  );
}

