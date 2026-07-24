import React, { useState } from "react";
import {
  X, ArrowLeft, RefreshCw, ChevronRight, KeyRound, Lock, Unlock,
  ShieldCheck, LogOut, Download, Upload, Trash2, Sun, Moon,
} from "lucide-react";
import { C, SOMBRA, aplicarTema, temaGuardado } from "../tema";
import { Boton, Rotulo } from "../components/ui";
import * as nube from "../lib/nube";

// Ajustes con aspecto de app móvil: pantalla completa, secciones agrupadas y filas.
// Lo que solo le sirve al administrador se oculta a los demás.

function Seccion({ titulo, children, nota }) {
  return (
    <div className="mt-5">
      <div className="px-1 mb-2"><Rotulo>{titulo}</Rotulo></div>
      <div className="rounded-2xl overflow-hidden" style={{ background: C.tarjeta, boxShadow: SOMBRA }}>
        {children}
      </div>
      {nota && <div className="text-xs mt-2 px-1" style={{ color: C.humo }}>{nota}</div>}
    </div>
  );
}

function Fila({ icono, titulo, detalle, alPulsar, derecha, peligro, primera }) {
  const Tag = alPulsar ? "button" : "div";
  return (
    <Tag
      onClick={alPulsar}
      className={`w-full flex items-center gap-3 px-4 py-3.5 text-left ${alPulsar ? "active:opacity-60" : ""}`}
      style={{ borderTop: primera ? "none" : `1px solid ${C.linea}` }}
    >
      {icono && <div className="shrink-0">{icono}</div>}
      <div className="flex-1 min-w-0">
        <div className="text-sm font-bold" style={{ color: peligro ? C.alerta : C.tinta }}>{titulo}</div>
        {detalle && <div className="text-xs mt-0.5" style={{ color: C.humo }}>{detalle}</div>}
      </div>
      {derecha}
    </Tag>
  );
}

export default function Ajustes({
  grupo, setGrupo, enLinea, sincronizando, adminNecesario, esAdmin,
  desbloquear, bloquear, trasCambiarPin, refrescar, cerrar, exportar, importar, borrarTodo, avisar,
}) {
  const [vista, setVista] = useState("menu"); // menu | pin | conexion
  const [url, setUrl] = useState(nube.baseGuardada() || nube.baseNube());
  const [probando, setProbando] = useState(false);
  const [pinActual, setPinActual] = useState("");
  const [pinNuevo, setPinNuevo] = useState("");
  const [guardando, setGuardando] = useState(false);
  const [tema, setTema] = useState(temaGuardado());

  const cambiarTema = (modo) => { setTema(aplicarTema(modo)); };

  const campo = { background: C.tarjeta2, color: C.tinta, border: `1px solid ${C.linea}` };

  const guardarPinGrupo = async () => {
    if (pinNuevo.trim().length < 4) return avisar("El PIN debe tener al menos 4 dígitos.");
    setGuardando(true);
    try {
      await nube.definirAdmin(pinNuevo.trim(), pinActual.trim());
      nube.fijarAdminPin(pinNuevo.trim()); // este teléfono queda autorizado
      setPinActual(""); setPinNuevo("");
      await trasCambiarPin();
      avisar(adminNecesario ? "PIN del grupo cambiado." : "PIN del grupo definido.");
      setVista("menu");
    } catch (e) {
      avisar(e.message);
    } finally {
      setGuardando(false);
    }
  };

  const probar = async () => {
    nube.fijarBaseNube(url);
    setProbando(true);
    try {
      await nube.probarConexion();
      avisar("Conexión correcta con la nube.");
    } catch (e) {
      avisar("Falló la conexión: " + e.message);
    } finally {
      setProbando(false);
    }
  };

  const guardarConexion = () => {
    nube.fijarBaseNube(url);
    avisar("Conexión guardada. Sincronizando…");
    refrescar();
    cerrar();
  };

  const Encabezado = ({ titulo, atras, esMenu }) => (
    <div
      className="flex items-center gap-3 px-4 py-3 shrink-0"
      style={{ background: C.tarjeta, boxShadow: SOMBRA, paddingTop: "calc(12px + env(safe-area-inset-top))" }}
    >
      <button onClick={atras} className="p-1 active:opacity-60">
        {esMenu ? <X size={22} color={C.tinta} /> : <ArrowLeft size={22} color={C.tinta} />}
      </button>
      <div className="flex-1 font-extrabold text-base" style={{ color: C.tinta }}>{titulo}</div>
      {sincronizando && <RefreshCw size={14} color={C.primario} className="animate-spin" />}
    </div>
  );

  // --- Subpantalla: PIN del grupo ---
  if (vista === "pin") {
    return (
      <div className="fixed inset-0 z-[60] flex flex-col" style={{ background: C.fondo }}>
        <Encabezado titulo={adminNecesario ? "Cambiar PIN" : "Poner PIN al grupo"} atras={() => setVista("menu")} />
        <div className="flex-1 overflow-y-auto p-4">
          <div className="text-sm" style={{ color: C.humo }}>
            {adminNecesario
              ? "Escribe el PIN actual y el nuevo. Acuérdate de avisarle al resto del grupo."
              : "Elige un PIN para que solo tú, y quien tú decidas, pueda editar la nómina y los partidos."}
          </div>

          {adminNecesario && (
            <>
              <div className="mt-4"><Rotulo>PIN actual</Rotulo></div>
              <input
                value={pinActual}
                onChange={(e) => setPinActual(e.target.value.replace(/\D/g, "").slice(0, 12))}
                inputMode="numeric"
                className="w-full mt-2 rounded-xl px-3 py-3 text-center text-lg font-bold tracking-[0.3em] outline-none"
                style={campo}
              />
            </>
          )}

          <div className="mt-4"><Rotulo>PIN nuevo (mínimo 4 dígitos)</Rotulo></div>
          <input
            value={pinNuevo}
            onChange={(e) => setPinNuevo(e.target.value.replace(/\D/g, "").slice(0, 12))}
            inputMode="numeric"
            className="w-full mt-2 rounded-xl px-3 py-3 text-center text-lg font-bold tracking-[0.3em] outline-none"
            style={campo}
          />

          <div className="mt-5">
            <Boton ancho onClick={guardarPinGrupo} disabled={guardando}>
              {guardando ? "Guardando…" : adminNecesario ? "Cambiar PIN" : "Definir PIN"}
            </Boton>
          </div>
        </div>
      </div>
    );
  }

  // --- Subpantalla: conexión con la nube ---
  if (vista === "conexion") {
    return (
      <div className="fixed inset-0 z-[60] flex flex-col" style={{ background: C.fondo }}>
        <Encabezado titulo="Conexión con la nube" atras={() => setVista("menu")} />
        <div className="flex-1 overflow-y-auto p-4">
          <div className="text-sm" style={{ color: C.humo }}>
            La app ya viene apuntando al servidor del grupo. Cambia esto solo si sabes lo que
            haces; déjalo vacío para usar la app únicamente en este teléfono.
          </div>
          <input
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            placeholder="https://tu-proyecto.vercel.app"
            className="w-full mt-4 rounded-xl px-3 py-3 text-sm outline-none"
            style={campo}
          />
          <div className="flex gap-2 mt-3">
            <div className="flex-1">
              <Boton ancho tono="fantasma" onClick={probar} disabled={probando}>
                {probando ? "Probando…" : "Probar"}
              </Boton>
            </div>
            <div className="flex-1"><Boton ancho onClick={guardarConexion}>Guardar</Boton></div>
          </div>
        </div>
      </div>
    );
  }

  // --- Menú principal ---
  const puntoEstado = (
    <div className="flex items-center gap-1.5">
      <div className="rounded-full" style={{ width: 8, height: 8, background: enLinea ? C.primario : C.humo }} />
      <span className="text-xs font-bold" style={{ color: enLinea ? C.primario : C.humo }}>
        {enLinea ? "Conectado" : "Sin conexión"}
      </span>
    </div>
  );

  return (
    <div className="fixed inset-0 z-[60] flex flex-col" style={{ background: C.fondo }}>
      <Encabezado titulo="Ajustes" atras={cerrar} esMenu />

      <div className="flex-1 overflow-y-auto px-4" style={{ paddingBottom: "calc(24px + env(safe-area-inset-bottom))" }}>
        <Seccion titulo="Grupo">
          {esAdmin ? (
            <div className="px-4 py-3">
              <Rotulo>Nombre</Rotulo>
              <input
                value={grupo}
                onChange={(e) => setGrupo(e.target.value)}
                className="w-full mt-2 rounded-xl px-3 py-2.5 text-sm font-bold outline-none"
                style={campo}
              />
            </div>
          ) : (
            <Fila primera titulo={grupo} detalle="Nombre del grupo" />
          )}
          <Fila
            titulo="Nube"
            detalle="Tabla y fotos compartidas con todo el grupo"
            derecha={puntoEstado}
            alPulsar={esAdmin ? () => setVista("conexion") : undefined}
          />
        </Seccion>

        <Seccion
          titulo="Administrador"
          nota={
            esAdmin
              ? "Con el modo administrador activo puedes agregar jugadores, registrar partidos y generar el PIN de cada uno."
              : "Solo el administrador cambia la nómina y los partidos. Tú sí puedes subir tu foto con tu PIN personal."
          }
        >
          {!adminNecesario ? (
            <>
              <Fila
                primera
                icono={<Unlock size={18} color={C.oro} />}
                titulo="El grupo no tiene PIN"
                detalle="Por ahora cualquiera puede editar"
              />
              <Fila
                icono={<KeyRound size={18} color={C.primario} />}
                titulo="Poner un PIN al grupo"
                detalle="Recomendado"
                alPulsar={() => setVista("pin")}
                derecha={<ChevronRight size={18} color={C.humo} />}
              />
            </>
          ) : esAdmin ? (
            <>
              <Fila
                primera
                icono={<ShieldCheck size={18} color={C.primario} />}
                titulo="Modo administrador activo"
                detalle="Este teléfono puede editar el grupo"
              />
              <Fila
                icono={<KeyRound size={18} color={C.humo} />}
                titulo="Cambiar PIN del grupo"
                alPulsar={() => setVista("pin")}
                derecha={<ChevronRight size={18} color={C.humo} />}
              />
              <Fila
                icono={<LogOut size={18} color={C.humo} />}
                titulo="Salir del modo administrador"
                detalle="Este teléfono dejará de poder editar"
                alPulsar={bloquear}
              />
            </>
          ) : (
            <Fila
              primera
              icono={<Lock size={18} color={C.humo} />}
              titulo="Entrar como administrador"
              detalle="Ingresa el PIN del grupo"
              alPulsar={desbloquear}
              derecha={<ChevronRight size={18} color={C.humo} />}
            />
          )}
        </Seccion>

        <Seccion titulo="Apariencia">
          <div className="p-2.5">
            <div className="flex gap-2">
              {[
                { id: "claro", label: "Claro", Ico: Sun },
                { id: "oscuro", label: "Oscuro", Ico: Moon },
              ].map(({ id, label, Ico }) => {
                const on = tema === id;
                return (
                  <button
                    key={id}
                    onClick={() => cambiarTema(id)}
                    className="flex-1 flex items-center justify-center gap-2 rounded-xl py-3 font-bold text-sm transition active:scale-[0.98]"
                    style={{
                      background: on ? C.primario : C.tarjeta2,
                      color: on ? C.sobrePrimario : C.humo,
                    }}
                  >
                    <Ico size={17} /> {label}
                  </button>
                );
              })}
            </div>
          </div>
        </Seccion>

        <Seccion titulo="Respaldo" nota="Guarda una copia de todo, incluidas las fotos.">
          <Fila
            primera
            icono={<Download size={18} color={C.humo} />}
            titulo="Exportar"
            detalle="Descarga un archivo con todos los datos"
            alPulsar={exportar}
            derecha={<ChevronRight size={18} color={C.humo} />}
          />
          {esAdmin && (
            <Fila
              icono={<Upload size={18} color={C.humo} />}
              titulo="Importar"
              detalle="Restaura desde un archivo de respaldo"
              alPulsar={importar}
              derecha={<ChevronRight size={18} color={C.humo} />}
            />
          )}
        </Seccion>

        {esAdmin && (
          <Seccion titulo="Zona peligrosa">
            <Fila
              primera
              peligro
              icono={<Trash2 size={18} color={C.alerta} />}
              titulo="Borrar todos los datos"
              detalle="Jugadores, partidos y fotos. No se puede deshacer."
              alPulsar={borrarTodo}
            />
          </Seccion>
        )}

        <div className="text-center text-xs mt-6" style={{ color: C.humo }}>
          ArroyitoFutStats · fútbol 5
        </div>
      </div>
    </div>
  );
}
