// Dirección visual: app deportiva clara y moderna.
// Fondo claro, tarjetas blancas con sombra suave, verde césped como color primario
// y números en tipografía tabular (no monoespaciada).

// Las superficies y el texto salen de variables CSS (ver index.css), así el modo
// claro/oscuro se cambia con un atributo en <html> sin re-renderizar nada. Los
// acentos (verde, dorado, rojo) van en hex porque a veces se les concatena
// transparencia (p. ej. `${C.primario}18`) y sirven igual en ambos temas.
export const C = {
  // Superficies (cambian con el tema)
  marco: "var(--marco)",       // el fondo detrás de la columna de 448px
  fondo: "var(--fondo)",       // fondo general de la app
  tarjeta: "var(--tarjeta)",   // tarjetas y paneles
  tarjeta2: "var(--tarjeta2)", // superficie interior sutil (chips, celdas)
  linea: "var(--linea)",       // bordes y separadores

  // Texto (cambia con el tema)
  tinta: "var(--tinta)",       // texto principal
  humo: "var(--humo)",         // texto secundario / rótulos

  // Marca (iguales en ambos temas)
  primario: "#12A150",         // verde césped: acción principal
  primarioOsc: "var(--primario-osc)", // verde para texto sobre tinte claro/oscuro
  sobrePrimario: "#FFFFFF",
  oro: "#F5A524",              // dorado: bota de oro y destacados
  alerta: "#EF4444",           // rojo: acciones destructivas
};

// --- Modo claro / oscuro ---
const K_TEMA = "canchita:tema";
const COLOR_BARRA = { claro: "#FFFFFF", oscuro: "#1A212C" };

export function temaGuardado() {
  try { return localStorage.getItem(K_TEMA) === "oscuro" ? "oscuro" : "claro"; } catch { return "claro"; }
}

export function aplicarTema(modo) {
  const t = modo === "oscuro" ? "oscuro" : "claro";
  try {
    document.documentElement.setAttribute("data-tema", t);
    localStorage.setItem(K_TEMA, t);
    const meta = document.querySelector('meta[name="theme-color"]');
    if (meta) meta.setAttribute("content", COLOR_BARRA[t]);
  } catch {}
  return t;
}

// Los equipos se nombran por el color del peto, como en la cancha.
// `texto` es el color legible encima de ese peto.
// Hay 6 porque la ruleta permite hasta 6 equipos cuando llega mucha gente.
export const PETOS = [
  { id: 0, nombre: "Rojo",     hex: "#F04438", texto: "#FFFFFF" },
  { id: 1, nombre: "Azul",     hex: "#2E90FA", texto: "#FFFFFF" },
  { id: 2, nombre: "Amarillo", hex: "#F5A524", texto: "#3A2A06" },
  { id: 3, nombre: "Morado",   hex: "#875BF7", texto: "#FFFFFF" },
  { id: 4, nombre: "Naranja",  hex: "#FB6514", texto: "#FFFFFF" },
  { id: 5, nombre: "Cian",     hex: "#06AED4", texto: "#FFFFFF" },
];

// Cuántos equipos y de qué tamaño se puede armar en la ruleta.
export const MAX_EQUIPOS = PETOS.length;
export const MIN_POR_EQUIPO = 2;
export const MAX_POR_EQUIPO = 11;

// Colores de las tajadas de la ruleta.
export const RUEDA = ["#F04438", "#F5A524", "#12A150", "#2E90FA", "#875BF7", "#EC4899"];

// Banners de perfil: cada jugador elige uno para la portada de su ficha.
// Son fondos CSS (van tal cual en `background`), así no pesan nada en la base.
export const BANNERS = [
  { id: "cancha",    nombre: "Cancha",    css: "repeating-linear-gradient(115deg, #16964E 0 26px, #138746 26px 52px)" },
  { id: "verde",     nombre: "Verde",     css: "linear-gradient(135deg, #12A150, #0A6B34)" },
  { id: "oceano",    nombre: "Océano",    css: "linear-gradient(135deg, #12A150, #06AED4)" },
  { id: "azul",      nombre: "Azul",      css: "linear-gradient(135deg, #2E90FA, #1D4ED8)" },
  { id: "cielo",     nombre: "Cielo",     css: "linear-gradient(135deg, #06AED4, #6366F1)" },
  { id: "atardecer", nombre: "Atardecer", css: "linear-gradient(135deg, #FB6514, #F5A524)" },
  { id: "fuego",     nombre: "Fuego",     css: "linear-gradient(135deg, #F04438, #FB6514)" },
  { id: "rojo",      nombre: "Rojo",      css: "linear-gradient(135deg, #F04438, #B42318)" },
  { id: "dorado",    nombre: "Dorado",    css: "linear-gradient(135deg, #F5A524, #B54708)" },
  { id: "morado",    nombre: "Morado",    css: "linear-gradient(135deg, #875BF7, #5925C5)" },
  { id: "rosa",      nombre: "Rosa",      css: "linear-gradient(135deg, #EE46BC, #A11552)" },
  { id: "noche",     nombre: "Noche",     css: "linear-gradient(135deg, #1E293B, #0F1B2D)" },
];

export const BANNER_POR_DEFECTO = "cancha";
export const bannerCss = (id) => (BANNERS.find((b) => b.id === id) || BANNERS[0]).css;

// Sombras de elevación para las tarjetas.
export const SOMBRA = "0 1px 2px rgba(15,27,45,0.06), 0 2px 8px rgba(15,27,45,0.06)";
export const SOMBRA_ALTA = "0 12px 32px rgba(15,27,45,0.16)";

// Todo dato numérico va en tabular para que las cifras queden alineadas.
export const NUM = {
  fontVariantNumeric: "tabular-nums",
  letterSpacing: "-0.02em",
  fontFeatureSettings: '"tnum"',
};

// Alias histórico: antes los números iban en monoespaciada. Se conserva el nombre
// para no romper importaciones, pero ahora apunta al estilo tabular moderno.
export const MONO = NUM;

// Rótulos: mayúsculas chicas y espaciadas, en color humo.
export const ROTULO = {
  letterSpacing: "0.12em",
  textTransform: "uppercase",
  fontSize: 10,
  fontWeight: 700,
  color: C.humo,
};
