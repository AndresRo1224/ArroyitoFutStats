# Contexto del proyecto

**ArroyitoFutStats** — app móvil de **fútbol 5** de un grupo de amigos. Registra asistencia,
goles y asistencias; calcula promedios; muestra la tabla; y sortea los equipos con una ruleta
que arma la alineación en cancha con las fotos de cada jugador. (Carpeta/proyecto histórico:
`canchita`.)

**Stack:** Vite + React 18 + Tailwind 3 + Capacitor 7 (Android). Backend opcional en
funciones serverless de Vercel (`/api`) con **MongoDB Atlas**. Sin router ni librería de
estado. Si no hay nube configurada, la app funciona 100% local con `localStorage`.

## Comandos

| Comando | Qué hace |
|---|---|
| `npm run dev` | servidor de desarrollo en :5173 |
| `npm run build` | compila a `dist/` |
| `npm run android:sync` | build + copia la web al proyecto Android |
| `npm run android:open` | abre Android Studio |
| `npm run android:apk` | genera `android/app/build/outputs/apk/debug/app-debug.apk` |

Después de tocar código de la app hay que correr `android:sync` antes de compilar el APK.
El APK también se puede generar en GitHub Actions (`.github/workflows/android.yml`).

## Modelo de datos

Las mismas dos "tablas" existen en local (`localStorage`) y en la nube (MongoDB):

```js
// datos del grupo  → local: "canchita:datos" · nube: colección "estado" (_id "principal")
{
  grupo: "Fútbol de los domingos",
  jugadores: [{ id: "ab12cd3", nombre: "Juan Pérez", amenazado: false }],
  partidos: [{
    id: "xy98z",
    fecha: "2026-07-19",          // YYYY-MM-DD, siempre local
    att: ["ab12cd3", ...],        // quiénes asistieron
    g: { ab12cd3: 2 },            // goles por jugador
    a: { ab12cd3: 1 },            // asistencias por jugador
    at: { ab12cd3: 0 },           // atajadas por jugador (arqueros)
    ag: { ab12cd3: 0 },           // autogoles por jugador (restan nota)
    equipo: { ab12cd3: 0 },       // índice de equipo (0..5) de cada jugador, para el marcador
    marcador: [3, 2],             // goles por equipo; gana el de más (empate si hay tope repetido)
    creado: 1690000000000,        // ms; abre la ventana de votación del MVP (2h)
    votacionCerrada: false,       // el admin la cerró antes de tiempo
    votaDesde: null,              // ms; si el admin la reabrió, desde aquí cuentan las 2h
  }]
}

// fotos  → local: "canchita:fotos" { [id]: dataURL }
//          nube: colección "fotos" { _id: idJugador, data: dataURL, pinHash }
```

- `partidos` se mantiene ordenado por fecha descendente; `partidos[0]` es el más reciente.
- **MVP, banners y trofeos** viven en la nube:
  - `votos` (colección): `{ _id:"partidoId:votanteId", partidoId, votanteId, votadoId }`. Cada
    asistente vota una vez con su PIN personal; la votación dura **2 horas** desde
    `partido.votaDesde || partido.creado` (`votacionAbierta()` en util). El **administrador**
    puede cerrarla antes (`votacionCerrada: true`) o reabrirla (pone `votaDesde: ahora`, lo que
    da 2 horas frescas — necesario cuando el partido se registró ANTES de jugarlo, p. ej. desde
    la ruleta). Botón en la pestaña MVP del detalle. **`VOTACION_MS` está duplicado en
    `src/lib/util.js` y `api/votos.js`: si cambias uno, cambia el otro**, y el servidor rechaza
    votos fuera de plazo o con la votación cerrada (el cliente solo esconde el formulario).
    El MVP se calcula (`mvpDePartido`), no se guarda.
  - `banners` (colección): `{ _id: jugadorId, banner: "idDiseño" }`. Solo el id de un fondo de
    `BANNERS` (tema.js); lo elige el jugador con su PIN. No es una imagen: no pesa.
  - Los **trofeos son calculados** (`calcularTrofeos` en util), históricos: Bota de oro
    (goleador), Rey de asistencias, Mejor promedio, Inoxidable (más PJ), Rey del MVP, **El Muro**
    (más atajadas), **Rey del Hat-trick** (más partidos de 3+ goles), **Jugador del Mes** (mejor
    nota del mes natural en curso) y **En racha** (mayor racha goleadora activa) + MVP acumulado.
    Trofeos "de la vergüenza" en rojo (`tono: "alerta"`): **El Topo** (más autogoles) y **El
    Fantasma** (peor asistencia, solo si <70% y el grupo jugó ≥3). Cada trofeo condicional solo
    aparece si hay dato. Los `clave` de cada trofeo deben existir en el mapa `ICONO` de `Vitrina`
    y en `TROFEO` de `FichaJugador` (si falta, no se pinta). La pantalla `Vitrina` (5º tab) y la
    ficha los muestran.
  - **"Amenazado por la FIFA"** (`jugador.amenazado`) es el único distintivo **manual**: lo pone
    y lo quita el administrador desde la ficha (`onAmenazar` → `alternarAmenazado` en `App.jsx`,
    protegido por `conPermiso`). Es una broma del grupo para quien está jugando mal. Se ve en
    **todas** las pestañas mediante un aviso rojo bajo el encabezado de `App.jsx`, más la sirena
    en Tabla y Nómina, la banda roja en la ficha y el "trofeo" `fifa` en la Vitrina.
    `sanearDatos` lo conserva (ojo: ese `.map()` **descarta cualquier campo del jugador que no
    liste explícitamente**) y `calcularTabla` lo copia a la fila para poder pintarlo.
  - **Rachas** (`rachasJugador(id, partidos)` en util): racha actual de asistencia y goleadora,
    contadas desde el partido más reciente (requiere `partidos` en orden descendente). Se ven
    como chips en la ficha y alimentan el trofeo "En racha".
  - **Cara a Cara** (`src/screens/CaraACara.jsx`): compara dos jugadores lado a lado (stats de
    la tabla + MVP + rachas + victorias), resalta quién gana cada categoría y declara ganador.
    Se abre desde la Nómina (botón "Cara a Cara") o desde la ficha ("Comparar con otro",
    preselecciona). No toca el modelo de datos.
  - **Marcador y resultados:** un partido puede llevar `equipo` (id→índice de equipo) y
    `marcador` (goles por equipo). `resultadoJugador(id, p)` da 'V'/'E'/'D'/null (null si el
    partido no tiene resultado o el jugador no quedó en ningún equipo); `equipoGanador(p)` y
    `partidoConResultado(p)` en util. `calcularTabla` suma `victorias/empates/derrotas`;
    `rachasJugador` añade la racha ganadora. Trofeos: **El Campeón** (más victorias) e
    **Imparable** (racha de victorias activa). Se registra en `EditorPartido` (3er paso
    "Resultado y equipos": nº de equipos + marcador + asignar cada asistente a un color) y se ve
    en `DetallePartido` (marcador con ganador + punto de color por jugador) y en la ficha
    (récord Ganados/Empates/Perdidos + chip de racha). El resultado es **opcional**: si no se
    asigna a nadie, el partido no guarda `equipo`/`marcador`.
  - **Los equipos salen de la ruleta.** Al terminar el sorteo, `Ruleta` lo guarda solo en este
    teléfono (`localStorage "canchita:sorteo"`, clave `K_SORTEO`) con
    `{equipos:[[id]], banca:[id], fecha, ts}`, y ofrece **"Guardar como partido"**, que abre el
    editor con la asistencia y los equipos ya puestos. En un partido **nuevo** el editor también
    los trae solo si el sorteo es **de hoy** (`leerSorteo()` + `usarSorteo` en `EditorPartido`);
    si es más viejo, aparece el botón "Traer equipos de la ruleta". Nunca se aplica al **editar**
    un partido existente. El sorteo NO va a la nube (evita endpoints y conexiones extra).
  - **`conMarcador` (en `EditorPartido`) es la razón de que prellenar equipos no invente
    resultados:** el `marcador` solo se guarda si de verdad lo tocaron. Sin él, un partido con
    equipos pero sin goles se guardaría como 0-0 y `calcularTabla` le daría un **empate a todo
    el mundo**. Si tocas ese archivo, no guardes `marcador` por defecto.
- **La nota de rendimiento (0-10) es calculada, no se guarda.** `notaPartido(g, a, at, ag)` en
  `src/lib/util.js` da la nota de un partido:
  `6.0 + 0.8·goles + 0.5·asistencias + 0.1·atajadas − 1.0·autogoles`, acotada a `[0, 10]`
  (tope 10 y piso 0). `calcularTabla` promedia esas notas partido a partido (los límites se
  aplican a cada partido, no a los totales). Es lo que la UI muestra como **NOTA** y lo que usa
  la ruleta para "repartir parejo". Los autogoles se editan en `EditorPartido` (fila roja) y se
  ven en `DetallePartido` y en la ficha (sufijo `AG`, en rojo, solo cuando hay).
- Las fotos van aparte porque son pesadas; se comprimen a 240×240 JPEG antes de guardar.
- Un jugador borrado desaparece de la nómina pero sus ids pueden seguir en partidos viejos:
  todo lo que recorre `att` debe tolerar ids desconocidos (ver `calcularTabla`).

## Nube (opcional)

- El backend son funciones serverless en `api/` (`todo`, `datos`, `fotos`, `banners`, `votos`,
  `admin`, `pines`, `ping`), pensadas para Vercel. `api/_db.js` cachea la conexión a Mongo y
  trae los helpers de PIN (scrypt) y de límite de intentos.
- **Conexiones a Atlas:** el pool es `maxPoolSize: 1` (M0 free tiene pocas conexiones). La app
  carga TODO con una sola llamada a **`GET /api/todo`** (datos+fotos+banners+votos+admin), no
  cinco. No agregues llamadas sueltas en la carga inicial; si necesitas más datos, súmalos a
  `/api/todo`.
- **Anti fuerza bruta (crítico):** todo endpoint que verifica un PIN pasa por `conLimite()`
  (`_db.js`): cuenta fallos por IP y por objetivo en la colección `seguridad` (índice TTL sobre
  `expira`) y bloquea 15 min tras 6 fallos, devolviendo 429. Sin esto, los PIN numéricos se
  adivinan por fuerza bruta. Los PIN personales que genera el servidor son de 6 dígitos.
- El cliente vive en `src/lib/nube.js`. La URL base se toma de `src/config.js` (`API_BASE`)
  o del override que el usuario guarda en Ajustes (`localStorage "canchita:api"`).
### Los dos tipos de PIN

**No confundirlos.** Ambos se guardan solo como hash (scrypt) y nunca se pueden consultar.

1. **PIN del grupo (administrador)** — uno solo. Protege nómina y partidos.
   - Vive en la base: colección `config`, doc `_id: "admin"`. Se define y se cambia **desde
     Ajustes**, sin redesplegar (`PUT /api/admin {pinNuevo, pinActual}`).
   - `GET /api/admin` → `{ configurado }`; `POST /api/admin {pin}` lo verifica.
   - Dos capas: el servidor rechaza `PUT /api/datos` y `/api/pines` sin la cabecera
     `x-admin-pin` correcta, y la app pide el PIN con el modal `PedirPin` antes de
     agregar/borrar/renombrar jugadores, guardar o borrar partidos y borrar todo
     (`conPermiso()` en `App.jsx`). El PIN acertado se recuerda en
     `localStorage "canchita:admin"`; si el servidor lo rechaza luego, se borra y se repregunta.
   - La variable de entorno `ADMIN_PIN` **ya no es la fuente de verdad**, pero si está definida
     sigue funcionando como **llave maestra de rescate** por si se olvida el PIN de la base.
   - Si no hay ninguno configurado, el grupo queda abierto y la app no pregunta nada.

2. **PIN personal de cada jugador** — uno por persona. Solo sirve para subir SU foto.
   - Vive en la colección `pines` (`_id: idJugador`). **Lo genera el servidor** cuando el
     administrador agrega a alguien (`POST /api/pines`), y se devuelve en claro **una sola vez**
     para que el admin se lo pase (modal `MostrarPin`). Después solo se puede regenerar, desde
     la ficha del jugador.
   - `POST /api/fotos` verifica contra ese PIN. Si el jugador no tiene PIN registrado, rechaza
     con 403. Esto evita que alguien "reserve" la foto de otro subiéndola primero.
   - Al sacar a alguien de la nómina, `DELETE /api/pines?jugadorId=` borra su PIN y su foto.
   - Como el servidor solo guarda el hash, el teléfono del administrador lleva una **libreta
     local** (`localStorage "canchita:pines-vistos"`) con los PIN que él mismo generó. De ahí
     sale la pantalla `ListaPines` (Nómina → "PIN de los jugadores"), que arma el mensaje para
     repartirlos y permite generar los que falten. `GET /api/pines` dice **quiénes** tienen PIN,
     nunca cuál. Si el admin cambia de teléfono, esa libreta se pierde y toca regenerarlos.
   - Sin nube, `src/lib/nube.js` replica la misma lógica contra `localStorage "canchita:pins"`.
- La app es **local-first**: carga el cache local al instante y luego refresca desde la nube;
  los cambios se cachean local y se empujan a la nube con un pequeño retardo.
- **Cambio del PIN por correo (Gmail SMTP):** el jugador escribe su correo **en el momento**
  (no se registra en la app) y, como candado, **su PIN actual**: sin el PIN actual correcto no
  se envía el código, así nadie resetea el PIN de otro poniendo un correo cualquiera. Flujo:
  `POST /api/reset {jugadorId, email, pinActual}` verifica el PIN actual (con `conLimite`) y
  manda un código de 6 dígitos a ese correo; `POST /api/reset {jugadorId, codigo, pinNuevo}`
  confirma y fija el PIN nuevo. Código de 6 dígitos, 10 min, colección `reset` con TTL, límite
  de intentos, anti-reenvío (60s) y límite de envíos por IP. El envío usa **nodemailer** contra
  el SMTP de Gmail (`api/_correo.js`, `smtp.gmail.com:465`). Quien **de verdad** olvidó su PIN
  no puede usar este flujo: el admin lo regenera desde la ficha. Entradas en la app: enlace
  "¿Olvidaste tu PIN?" en la ficha, SubirFoto y ElegirBanner; pantalla `ResetPin`.
- Variables de entorno del backend: `MONGODB_URI` (obligatoria), `MONGODB_DB` (opc., default
  "canchita"), `ADMIN_PIN` (opc.), `SESSION_SECRET` (opc., recomendada), y para el reseteo por
  correo `GMAIL_USER` (el Gmail dedicado) + `GMAIL_APP_PASSWORD` (la "Contraseña de aplicación"
  de 16 caracteres de Google, tras activar la Verificación en 2 pasos — NO la contraseña
  normal). Se configuran en Vercel → Settings → Environment Variables; tras cambiarlas hay que
  **redesplegar**.
- Despliegue actual: **https://arroyito-fut-stats.vercel.app** (repo
  `AndresRo1224/ArroyitoFutStats`). `src/config.js` ya apunta ahí.
- Diagnóstico rápido del backend: `GET /api/ping` responde `{"ok":true,"nube":true}` cuando
  Atlas está conectado, o el error exacto si algo falta.

## Distribución

- **Android:** APK con `npm run android:sync` + Android Studio / `android:apk` / GitHub Actions.
- **iPhone:** iOS no permite instalar apps sueltas (no hay equivalente del APK) y una app
  nativa exigiría Mac + cuenta Apple Developer. La vía es la **PWA**: abrir la URL de Vercel
  **en Safari** → Compartir → *Añadir a pantalla de inicio*. Queda a pantalla completa con
  ícono propio. En Android también se puede instalar así desde Chrome.
- El manifest y los íconos de la PWA están en `public/` (`manifest.webmanifest`,
  `icono-192.png`, `icono-512.png`, `apple-touch-icon.png`). No hay service worker: la PWA
  necesita internet para cargar.

## Convenciones

- **Todo el código y la interfaz están en español**, incluidos nombres de variables y archivos.
  Mantenlo así.
- **Colores y tipografía salen de `src/tema.js`.** No escribas hex sueltos en las pantallas.
  Tailwind se usa para layout (flex, grid, spacing, rounded); el color va por `style`.
- La identidad visual es **app deportiva clara y moderna**: fondo claro (`C.fondo`), tarjetas
  blancas (`C.tarjeta`) con sombra suave (`SOMBRA`), verde césped como color de acción
  (`C.primario`), dorado para destacados (`C.oro`), y números en tipografía tabular (`NUM`,
  antes `MONO`). Los equipos se nombran por color de peto (`PETOS`, cada uno con `texto` para
  el color legible encima).
- Nada de `localStorage` directo en componentes: pasa por `src/lib/almacenamiento.js` (cache
  local) o `src/lib/nube.js` (nube).
- Los componentes se definen en el nivel superior del archivo, nunca dentro de otro
  componente (si no, los inputs pierden el foco al re-renderizar).
- Diseño mobile-first, ancho máximo 448px, área táctil mínima ~34px.

## Cuidados

- `vite.config.js` usa `base: "./"`. Es obligatorio: con rutas absolutas el WebView de
  Android carga una pantalla en blanco.
- Las fechas se arman con `isoLocal()`, nunca con `toISOString()` (correría el día en Colombia).
- La ruleta calcula el giro para que la tajada elegida quede bajo la flecha de arriba;
  si cambias el ángulo inicial de las tajadas, ajusta también ese cálculo (`girar()` en
  `src/screens/Ruleta.jsx`). La vista de alineación la arma `formacion()` + `Cancha` en ese
  mismo archivo (el primer jugador de cada equipo es el arquero, abajo).
- `GIRO_MS` se acorta si el sistema pide menos movimiento; respétalo.
- La ruleta es configurable: **cantidad de equipos** (2 a `MAX_EQUIPOS`) y **jugadores por
  equipo** (`MIN_POR_EQUIPO`–`MAX_POR_EQUIPO`, por defecto 5 porque juegan fútbol 5).
  `ubicar()` solo considera equipos con cupo y devuelve `equipo: -1` cuando están todos
  llenos: ese jugador va a la **banca**. Si agregas más equipos, agrega colores a `PETOS`
  (hoy hay 6, y `MAX_EQUIPOS` sale de ahí).
- La carpeta `android/` y `assets/` no se despliegan a Vercel (ver `.vercelignore`).
