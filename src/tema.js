// Dirección visual: app deportiva clara y moderna.
// Fondo claro, tarjetas blancas con sombra suave, verde césped como color primario
// y números en tipografía tabular (no monoespaciada).

export const C = {
  // Superficies
  fondo: "#EDF1F6",     // fondo general de la app
  tarjeta: "#FFFFFF",   // tarjetas y paneles
  tarjeta2: "#F1F4F9",  // superficie interior sutil (chips, celdas)
  linea: "#E3E8EF",     // bordes y separadores

  // Texto
  tinta: "#0F1B2D",     // texto principal (casi negro)
  humo: "#647087",      // texto secundario / rótulos

  // Marca
  primario: "#12A150",  // verde césped: acción principal
  primarioOsc: "#0C7F3E",
  sobrePrimario: "#FFFFFF",
  oro: "#F5A524",       // dorado: bota de oro y destacados
  alerta: "#EF4444",    // rojo: acciones destructivas
};

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
