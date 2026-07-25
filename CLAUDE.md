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
  jugadores: [{ id: "ab12cd3", nombre: "Juan Pérez" }],
  partidos: [{
    id: "xy98z",
    fecha: "2026-07-19",          // YYYY-MM-DD, siempre local
    att: ["ab12cd3", ...],        // quiénes asistieron
    g: { ab12cd3: 2 },            // goles por jugador
    a: { ab12cd3: 1 },            // asistencias por jugador
    at: { ab12cd3: 0 },           // atajadas por jugador (arqueros)
    creado: 1690000000000,        // ms; abre la ventana de votación del MVP (24h)
  }]
}

// fotos  → local: "canchita:fotos" { [id]: dataURL }
//          nube: colección "fotos" { _id: idJugador, data: dataURL, pinHash }
```

- `partidos` se mantiene ordenado por fecha descendente; `partidos[0]` es el más reciente.
- **MVP, banners y trofeos** viven en la nube:
  - `votos` (colección): `{ _id:"partidoId:votanteId", partidoId, votanteId, votadoId }`. Cada
    asistente vota una vez con su PIN personal; la votación dura 24h desde `partido.creado`
    (`votacionAbierta()` en util). El MVP se calcula (`mvpDePartido`), no se guarda.
  - `banners` (colección): `{ _id: jugadorId, banner: "idDiseño" }`. Solo el id de un fondo de
    `BANNERS` (tema.js); lo elige el jugador con su PIN. No es una imagen: no pesa.
  - Los **trofeos son calculados** (`calcularTrofeos` en util), históricos: títulos actuales
    (goleador, asistidor, mejor nota, más constante, rey del MVP) + MVP acumulado por partido.
    La pantalla `Vitrina` (5º tab) y la ficha los muestran.
- **La nota de rendimiento (0-10) es calculada, no se guarda.** `notaPartido(g, a, at)` en
  `src/lib/util.js` da la nota de un partido: `6.0 + 0.8·goles + 0.5·asistencias + 0.1·atajadas`,
  con tope 10. `calcularTabla` promedia esas notas partido a partido (el tope se aplica a cada
  partido, no a los totales). Es lo que la UI muestra como **NOTA** y lo que usa la ruleta
  para "repartir parejo".
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
- **Reseteo del PIN por correo (Brevo):** cada **jugador registra su propio correo** con su
  PIN en "Tu perfil" (`POST /api/banners` con `email`, guardado en la colección `pines`; nunca
  se expone completo — `/api/todo` solo lo devuelve enmascarado). El admin no maneja correos.
  (`/api/correo` existe como override admin pero no está cableado en la UI.)
  El jugador pide un código a su correo (`POST /api/reset {jugadorId}`)
  y lo confirma con el PIN nuevo (`POST /api/reset {jugadorId, codigo, pinNuevo}`). Código de
  6 dígitos, 10 min, colección `reset` con TTL, límite de intentos. El envío usa Brevo
  (`api/_correo.js`). Entradas en la app: enlace "¿Olvidaste tu PIN?" en la ficha, SubirFoto y
  ElegirBanner; pantalla `ResetPin`.
- Variables de entorno del backend: `MONGODB_URI` (obligatoria), `MONGODB_DB` (opc., default
  "canchita"), `ADMIN_PIN` (opc.), `SESSION_SECRET` (opc., recomendada), y para el reseteo por
  correo `BREVO_API_KEY` + `CORREO_REMITENTE` (el remitente verificado en Brevo). Se configuran
  en Vercel → Settings → Environment Variables; tras cambiarlas hay que **redesplegar**.
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
