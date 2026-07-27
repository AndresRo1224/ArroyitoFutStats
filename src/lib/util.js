export const uid = () =>
  Math.random().toString(36).slice(2, 9) + Date.now().toString(36).slice(-3);

// Fechas siempre en hora local: toISOString() correría el día en Colombia.
export const isoLocal = (d) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;

export function domingoMasReciente() {
  const d = new Date();
  d.setDate(d.getDate() - d.getDay());
  return isoLocal(d);
}

const aDate = (iso) => {
  const [y, m, d] = iso.split("-").map(Number);
  return new Date(y, m - 1, d);
};

export const fechaLarga = (iso) =>
  aDate(iso).toLocaleDateString("es", { weekday: "long", day: "numeric", month: "long" });

export const fechaCorta = (iso) =>
  aDate(iso).toLocaleDateString("es", { day: "2-digit", month: "short" });

export const iniciales = (n) =>
  (n || "?").trim().split(/\s+/).slice(0, 2).map((p) => p[0]).join("").toUpperCase();

export const nombreCorto = (n) => {
  const p = (n || "?").trim().split(/\s+/);
  return p.length > 1 ? `${p[0]} ${p[1][0]}.` : p[0];
};

export const dec = (x) => (Math.round(x * 100) / 100).toFixed(2);

// Las notas van con un decimal, como las calificaciones del fútbol real (7.5).
export const dec1 = (x) => (Math.round(x * 10) / 10).toFixed(1);

// Nota de rendimiento de UN partido, en escala de fútbol real (máximo 10).
// Base 6.0 por presentarse a jugar, y sube con goles y asistencias.
export const NOTA_BASE = 6;
export const NOTA_GOL = 0.8;
export const NOTA_ASIS = 0.5;
export const NOTA_ATAJADA = 0.1; // cada atajada suma 0.1 a la nota (para arqueros)
export const NOTA_AUTOGOL = 1; // cada autogol RESTA 1 punto (¡ojo con el arco propio!)
export const NOTA_MAX = 10;
export const NOTA_MIN = 0;

export const notaPartido = (goles = 0, asis = 0, atajadas = 0, autogoles = 0) =>
  Math.max(
    NOTA_MIN,
    Math.min(NOTA_MAX, NOTA_BASE + NOTA_GOL * goles + NOTA_ASIS * asis + NOTA_ATAJADA * atajadas - NOTA_AUTOGOL * autogoles)
  );

// Las fotos se recortan a un cuadrado chico: 30 jugadores caben de sobra
// en el almacenamiento del teléfono.
export function comprimirFoto(file, lado = 240, calidad = 0.72) {
  return new Promise((resolve, reject) => {
    const fr = new FileReader();
    fr.onload = () => {
      const img = new Image();
      img.onload = () => {
        const cv = document.createElement("canvas");
        cv.width = lado;
        cv.height = lado;
        const ctx = cv.getContext("2d");
        const min = Math.min(img.width, img.height);
        ctx.drawImage(img, (img.width - min) / 2, (img.height - min) / 2, min, min, 0, 0, lado, lado);
        resolve(cv.toDataURL("image/jpeg", calidad));
      };
      img.onerror = reject;
      img.src = fr.result;
    };
    fr.onerror = reject;
    fr.readAsDataURL(file);
  });
}

// Banner de portada: se recorta a un rectángulo ancho (tipo cover de red social).
export function comprimirBanner(file, ancho = 800, alto = 280, calidad = 0.72) {
  return new Promise((resolve, reject) => {
    const fr = new FileReader();
    fr.onload = () => {
      const img = new Image();
      img.onload = () => {
        const cv = document.createElement("canvas");
        cv.width = ancho;
        cv.height = alto;
        const ctx = cv.getContext("2d");
        const escala = Math.max(ancho / img.width, alto / img.height);
        const w = img.width * escala, h = img.height * escala;
        ctx.drawImage(img, (ancho - w) / 2, (alto - h) / 2, w, h);
        resolve(cv.toDataURL("image/jpeg", calidad));
      };
      img.onerror = reject;
      img.src = fr.result;
    };
    fr.onerror = reject;
    fr.readAsDataURL(file);
  });
}

// Resultado de UN jugador en UN partido según el marcador y su equipo.
//  'V' ganó · 'E' empató (empate arriba entre 2+ equipos) · 'D' perdió · null si
//  ese partido no tiene resultado registrado o el jugador no quedó en ningún equipo.
export function resultadoJugador(id, partido) {
  const mk = partido && partido.marcador;
  const eq = partido && partido.equipo;
  if (!Array.isArray(mk) || mk.length < 2 || !eq) return null;
  const t = eq[id];
  if (t === undefined || t === null || t >= mk.length) return null;
  const max = Math.max(...mk);
  const empatanArriba = mk.filter((x) => x === max).length;
  if (mk[t] === max) return empatanArriba > 1 ? "E" : "V";
  return "D";
}

// ¿El partido tiene un resultado registrado? (marcador + equipos)
export const partidoConResultado = (p) =>
  !!(p && Array.isArray(p.marcador) && p.marcador.length >= 2 && p.equipo && Object.keys(p.equipo).length);

// Índice del equipo ganador (o -1 si empate / sin resultado).
export function equipoGanador(partido) {
  if (!partidoConResultado(partido)) return -1;
  const mk = partido.marcador;
  const max = Math.max(...mk);
  if (mk.filter((x) => x === max).length > 1) return -1; // empate arriba
  return mk.indexOf(max);
}

// Tabla general.
//  - prom = (goles + asistencias) / partidos jugados (dato crudo)
//  - nota = promedio de las notas de cada partido, en escala 0-10
// La nota se acumula partido a partido (no sobre los totales) porque el tope de 10
// se aplica a cada partido, igual que una calificación real.
export function calcularTabla(jugadores, partidos) {
  const base = {};
  jugadores.forEach((j) => {
    base[j.id] = { id: j.id, nombre: j.nombre, pj: 0, goles: 0, asis: 0, atajadas: 0, autogoles: 0, victorias: 0, empates: 0, derrotas: 0, sumaNotas: 0 };
  });
  partidos.forEach((p) =>
    p.att.forEach((id) => {
      if (!base[id]) return; // jugador borrado de la nómina
      const g = (p.g && p.g[id]) || 0;
      const a = (p.a && p.a[id]) || 0;
      const at = (p.at && p.at[id]) || 0;
      const ag = (p.ag && p.ag[id]) || 0;
      base[id].pj += 1;
      base[id].goles += g;
      base[id].asis += a;
      base[id].atajadas += at;
      base[id].autogoles += ag;
      base[id].sumaNotas += notaPartido(g, a, at, ag);
      const r = resultadoJugador(id, p);
      if (r === "V") base[id].victorias += 1;
      else if (r === "E") base[id].empates += 1;
      else if (r === "D") base[id].derrotas += 1;
    })
  );
  return Object.values(base).map((t) => ({
    ...t,
    promGoles: t.pj ? t.goles / t.pj : 0,
    promAsis: t.pj ? t.asis / t.pj : 0,
    prom: t.pj ? (t.goles + t.asis) / t.pj : 0,
    nota: t.pj ? t.sumaNotas / t.pj : 0,
    presencia: partidos.length ? t.pj / partidos.length : 0,
  }));
}

export const filaVacia = {
  pj: 0, goles: 0, asis: 0, atajadas: 0, autogoles: 0, victorias: 0, empates: 0, derrotas: 0,
  sumaNotas: 0, promGoles: 0, promAsis: 0, prom: 0, nota: 0, presencia: 0,
};

// --- Votación del MVP ---
export const VOTACION_MS = 2 * 60 * 60 * 1000; // la votación dura 2 horas

// Desde cuándo cuentan las 2 horas: normalmente desde que se registró el partido
// (`creado`), pero si el administrador la reabre, desde ese momento (`votaDesde`).
// Eso importa cuando el partido se guarda ANTES de jugar (por ejemplo, desde la
// ruleta): al terminar, el admin la reabre y todos tienen 2 horas frescas.
const inicioVotacion = (partido) => (partido && (partido.votaDesde || partido.creado)) || 0;

// Abierta = tiene inicio, el admin no la cerró a mano, y no han pasado las 2 horas.
export const votacionAbierta = (partido) =>
  !!inicioVotacion(partido) && !(partido && partido.votacionCerrada) && Date.now() < inicioVotacion(partido) + VOTACION_MS;

export const cierreVotacion = (partido) => {
  const i = inicioVotacion(partido);
  return i ? i + VOTACION_MS : 0;
};

// MVP de un partido según los votos. Empate: gana quien más aportó (goles+asist)
// en ese partido; si sigue el empate, el id menor (estable). Sin votos: null.
export function mvpDePartido(partido, conteo) {
  const votos = conteo || {};
  const ids = Object.keys(votos).filter((id) => votos[id] > 0);
  if (!ids.length) return null;
  const aporte = (id) =>
    ((partido.g && partido.g[id]) || 0) + ((partido.a && partido.a[id]) || 0) +
    ((partido.at && partido.at[id]) || 0) - ((partido.ag && partido.ag[id]) || 0);
  return ids.sort((x, y) => votos[y] - votos[x] || aporte(y) - aporte(x) || (x < y ? -1 : 1))[0];
}

// Rachas ACTUALES de un jugador, contadas desde el partido más reciente hacia atrás.
// `partidos` debe venir ordenado por fecha descendente (partidos[0] = el más reciente).
//  - asistencia: partidos recientes seguidos en los que estuvo (se corta al primero que faltó)
//  - goleadora: entre los partidos que jugó, los más recientes seguidos en que anotó
export function rachasJugador(id, partidos) {
  let asistencia = 0;
  for (const p of partidos) {
    if (p.att.includes(id)) asistencia++;
    else break;
  }
  let goleadora = 0;
  for (const p of partidos) {
    if (!p.att.includes(id)) continue; // solo cuentan partidos que jugó
    if (((p.g && p.g[id]) || 0) > 0) goleadora++;
    else break;
  }
  // Racha ganadora: partidos CON resultado, los más recientes seguidos ganando.
  let victorias = 0;
  for (const p of partidos) {
    const r = resultadoJugador(id, p);
    if (r === null) continue; // partidos sin resultado no cuentan ni cortan
    if (r === "V") victorias++;
    else break;
  }
  return { asistencia, goleadora, victorias };
}

// Trofeos históricos. Recibe la tabla ya calculada, los partidos y los votos
// por partido ({ [id]: { conteo, votantes } }). Devuelve los títulos actuales,
// el conteo de MVP por jugador y un índice por jugador para su ficha.
export function calcularTrofeos(tabla, partidos, votosPorPartido = {}) {
  const mapa = Object.fromEntries(tabla.map((t) => [t.id, t]));

  // MVP acumulado: solo cuentan las votaciones ya cerradas.
  const mvp = {};
  partidos.forEach((p) => {
    if (votacionAbierta(p)) return;
    const conteo = (votosPorPartido[p.id] || {}).conteo;
    const id = mvpDePartido(p, conteo);
    if (id && mapa[id]) mvp[id] = (mvp[id] || 0) + 1;
  });

  const lider = (campo, minPj = 1) => {
    const c = tabla.filter((t) => t.pj >= minPj && t[campo] > 0);
    if (!c.length) return null;
    return c.slice().sort((a, b) => b[campo] - a[campo] || b.nota - a.nota || a.nombre.localeCompare(b.nombre))[0];
  };

  const reyMvp = Object.entries(mvp).sort((a, b) => b[1] - a[1])[0];

  const titulos = [
    { clave: "goleador", nombre: "Bota de oro", detalle: "Máximo goleador", jugador: lider("goles"), valor: (t) => `${t.goles} goles` },
    { clave: "asistidor", nombre: "Rey de las asistencias", detalle: "Máximo asistidor", jugador: lider("asis"), valor: (t) => `${t.asis} asist.` },
    { clave: "nota", nombre: "Mejor promedio", detalle: "Mejor nota (mín. 2 partidos)", jugador: lider("nota", Math.min(2, partidos.length)), valor: (t) => `${dec1(t.nota)} de nota` },
    { clave: "constante", nombre: "Inoxidable", detalle: "Más partidos jugados", jugador: lider("pj"), valor: (t) => `${t.pj} partidos` },
    { clave: "reyMvp", nombre: "Rey del MVP", detalle: "Más veces MVP", jugador: reyMvp && mapa[reyMvp[0]], valor: () => `${reyMvp ? reyMvp[1] : 0} MVP` },
  ];

  // El Muro: más atajadas (para arqueros).
  const muro = lider("atajadas");
  if (muro) titulos.push({ clave: "muro", nombre: "El Muro 🧤", detalle: "Más atajadas", jugador: muro, valor: (t) => `${t.atajadas} atajadas` });

  // Rey del Hat-trick: más partidos con 3 o más goles.
  const hat = {};
  partidos.forEach((p) =>
    p.att.forEach((id) => {
      if (mapa[id] && ((p.g && p.g[id]) || 0) >= 3) hat[id] = (hat[id] || 0) + 1;
    })
  );
  const reyHat = Object.entries(hat).sort((a, b) => b[1] - a[1])[0];
  if (reyHat) titulos.push({ clave: "hattrick", nombre: "Rey del Hat-trick", detalle: "Más partidos de 3+ goles", jugador: mapa[reyHat[0]], valor: () => `${reyHat[1]} hat-trick${reyHat[1] === 1 ? "" : "s"}` });

  // Jugador del Mes: mejor nota entre los partidos del mes natural en curso.
  const ym = isoLocal(new Date()).slice(0, 7);
  const partidosMes = partidos.filter((p) => p.fecha && p.fecha.slice(0, 7) === ym);
  if (partidosMes.length) {
    const jugs = tabla.map((t) => ({ id: t.id, nombre: t.nombre }));
    const mejorMes = calcularTabla(jugs, partidosMes)
      .filter((t) => t.pj > 0)
      .sort((a, b) => b.nota - a.nota || b.goles - a.goles || a.nombre.localeCompare(b.nombre))[0];
    if (mejorMes) titulos.push({ clave: "mes", nombre: "Jugador del Mes", detalle: "Mejor nota este mes", jugador: mapa[mejorMes.id], valor: () => `${dec1(mejorMes.nota)} de nota` });
  }

  // En racha: la mayor racha goleadora ACTIVA del grupo (mínimo 2 partidos seguidos).
  let enRacha = null;
  tabla.forEach((t) => {
    const r = rachasJugador(t.id, partidos).goleadora;
    if (r >= 2 && (!enRacha || r > enRacha.r)) enRacha = { id: t.id, r };
  });
  if (enRacha) titulos.push({ clave: "racha", nombre: "En racha 🔥", detalle: "Racha goleadora activa", jugador: mapa[enRacha.id], valor: () => `${enRacha.r} seguidos anotando` });

  // El Campeón: más victorias (solo si ya hay partidos con resultado).
  const campeon = lider("victorias");
  if (campeon) titulos.push({ clave: "campeon", nombre: "El Campeón 🏆", detalle: "Más victorias", jugador: campeon, valor: (t) => `${t.victorias} victoria${t.victorias === 1 ? "" : "s"}` });

  // Imparable: mayor racha de victorias ACTIVA del grupo (mínimo 2 seguidas).
  let imparable = null;
  tabla.forEach((t) => {
    const r = rachasJugador(t.id, partidos).victorias;
    if (r >= 2 && (!imparable || r > imparable.r)) imparable = { id: t.id, r };
  });
  if (imparable) titulos.push({ clave: "imparable", nombre: "Imparable 🚀", detalle: "Racha de victorias activa", jugador: mapa[imparable.id], valor: () => `${imparable.r} seguidas ganando` });

  // Trofeo "de la vergüenza": solo aparece si de verdad alguien metió autogol.
  const topo = lider("autogoles");
  if (topo) {
    titulos.push({
      clave: "topo",
      nombre: "El Topo 🕳️",
      detalle: "Más autogoles",
      jugador: topo,
      valor: (t) => `${t.autogoles} autogol${t.autogoles === 1 ? "" : "es"}`,
      tono: "alerta",
    });
  }

  // El Fantasma: el de peor asistencia. Solo si el grupo ya jugó ≥3 partidos, entre
  // quienes al menos jugaron una vez, y solo si de verdad falta harto (<70%).
  if (partidos.length >= 3) {
    const fantasma = tabla
      .filter((t) => t.pj >= 1)
      .sort((a, b) => a.presencia - b.presencia || a.pj - b.pj || a.nombre.localeCompare(b.nombre))[0];
    if (fantasma && fantasma.presencia < 0.7) {
      titulos.push({ clave: "fantasma", nombre: "El Fantasma 👻", detalle: "El que más falta", jugador: mapa[fantasma.id], valor: (t) => `${Math.round(t.presencia * 100)}% asistencia`, tono: "alerta" });
    }
  }

  const porJugador = {};
  const anota = (id) => (porJugador[id] = porJugador[id] || { titulos: [], mvp: 0 });
  titulos.forEach((t) => { if (t.jugador) anota(t.jugador.id).titulos.push(t.clave); });
  Object.entries(mvp).forEach(([id, n]) => { anota(id).mvp = n; });

  return { titulos, mvp, porJugador };
}
