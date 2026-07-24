import React, { createContext, useContext } from "react";
import { C, ROTULO, NUM, SOMBRA } from "../tema";
import { iniciales } from "../lib/util";

// Las fotos se comparten por contexto para no pasarlas por cada pantalla.
export const FotoCtx = createContext({});

export function Avatar({ id, nombre, tam = 40, borde }) {
  const fotos = useContext(FotoCtx);
  const src = fotos[id];
  const estilo = {
    width: tam,
    height: tam,
    boxShadow: borde ? `0 0 0 2.5px ${borde}, ${SOMBRA}` : SOMBRA,
  };
  if (src) {
    return <img src={src} alt={nombre} className="rounded-full object-cover shrink-0" style={estilo} />;
  }
  return (
    <div
      className="rounded-full flex items-center justify-center shrink-0"
      style={{
        ...estilo,
        background: `linear-gradient(140deg, ${C.tarjeta2}, ${C.linea})`,
        color: C.humo,
        fontSize: tam * 0.36,
        fontWeight: 800,
      }}
    >
      {iniciales(nombre)}
    </div>
  );
}

export function Rotulo({ children, style }) {
  return <div style={{ ...ROTULO, ...style }}>{children}</div>;
}

export function Boton({ children, onClick, tono = "solido", chico, disabled, ancho }) {
  const est =
    tono === "solido"
      ? { background: C.primario, color: C.sobrePrimario, boxShadow: "0 4px 12px rgba(18,161,80,0.28)" }
      : tono === "fantasma"
        ? { background: C.tarjeta, color: C.tinta, boxShadow: `inset 0 0 0 1.5px ${C.linea}` }
        : { background: C.tarjeta2, color: C.tinta };
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={`inline-flex items-center justify-center gap-2 rounded-2xl font-bold transition active:scale-[0.98] active:opacity-80 ${
        chico ? "px-3 py-2 text-xs" : "px-4 py-3.5 text-sm"
      } ${ancho ? "w-full" : ""}`}
      style={{ ...est, opacity: disabled ? 0.45 : 1 }}
    >
      {children}
    </button>
  );
}

export function Tarjeta({ children, className = "", style, onClick }) {
  const Tag = onClick ? "button" : "div";
  return (
    <Tag
      onClick={onClick}
      className={`rounded-2xl ${onClick ? "text-left active:scale-[0.99] transition" : ""} ${className}`}
      style={{ background: C.tarjeta, boxShadow: SOMBRA, ...style }}
    >
      {children}
    </Tag>
  );
}

export function Marcador({ valor, etiqueta, color = C.tinta, grande }) {
  return (
    <div className="text-center">
      <div style={{ ...NUM, color, fontSize: grande ? 38 : 20, fontWeight: 800, lineHeight: 1 }}>{valor}</div>
      <div style={{ ...ROTULO, marginTop: 5 }}>{etiqueta}</div>
    </div>
  );
}

export function Vacio({ icono, titulo, texto, accion }) {
  return (
    <div className="flex flex-col items-center text-center px-8 py-14">
      <div
        className="rounded-3xl p-5 mb-4"
        style={{ background: C.tarjeta, boxShadow: SOMBRA }}
      >
        {icono}
      </div>
      <div className="font-extrabold text-base" style={{ color: C.tinta }}>{titulo}</div>
      <div className="text-sm mt-1 mb-5" style={{ color: C.humo }}>{texto}</div>
      {accion}
    </div>
  );
}

// Rejilla de caras para marcar quién vino. La usan el editor de partido y la ruleta.
export function RejillaAsistencia({ jugadores, seleccion, alternar }) {
  return (
    <div className="grid grid-cols-4 gap-2">
      {jugadores.map((j) => {
        const on = seleccion.includes(j.id);
        return (
          <button
            key={j.id}
            onClick={() => alternar(j.id)}
            className="rounded-2xl py-3 flex flex-col items-center gap-1.5 transition active:scale-[0.97]"
            style={{
              background: C.tarjeta,
              boxShadow: on ? `inset 0 0 0 2px ${C.primario}, ${SOMBRA}` : SOMBRA,
            }}
          >
            <div className="relative">
              <Avatar id={j.id} nombre={j.nombre} tam={42} />
              {on && (
                <div className="absolute -top-1 -right-1 rounded-full p-0.5" style={{ background: C.primario, boxShadow: `0 0 0 2px ${C.tarjeta}` }}>
                  <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round">
                    <polyline points="20 6 9 17 4 12" />
                  </svg>
                </div>
              )}
            </div>
            <div className="text-xs font-semibold text-center px-1 truncate w-full" style={{ color: on ? C.tinta : C.humo }}>
              {j.nombre.split(" ")[0]}
            </div>
          </button>
        );
      })}
    </div>
  );
}
