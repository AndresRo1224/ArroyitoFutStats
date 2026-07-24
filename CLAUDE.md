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
  }]
}

// fotos  → local: "canchita:fotos" { [id]: dataURL }
//          nube: colección "fotos" { _id: idJugador, data: dataURL, pinHash }
```

- `partidos` se mantiene ordenado por fecha descendente; `partidos[0]` es el más reciente.
- **La nota de rendimiento (0-10) es calculada, no se guarda.** `notaPartido(g, a)` en
  `src/lib/util.js` da la nota de un partido: `6.0 + 0.8·goles + 0.5·asistencias`, con tope
  10. `calcularTabla` promedia esas notas partido a partido (el tope se aplica a cada
  partido, no a los totales). Es lo que la UI muestra como **NOTA** y lo que usa la ruleta
  para "repartir parejo".
- Las fotos van aparte porque son pesadas; se comprimen a 240×240 JPEG antes de guardar.
- Un jugador borrado desaparece de la nómina pero sus ids pueden seguir en partidos viejos:
  todo lo que recorre `att` debe tolerar ids desconocidos (ver `calcularTabla`).

## Nube (opcional)

- El backend son funciones serverless en `api/` (`datos.js`, `fotos.js`, `ping.js`), pensadas
  para Vercel. `api/_db.js` cachea la conexión a Mongo y trae los helpers de PIN (scrypt).
- El cliente vive en `src/lib/nube.js`. La URL base se toma de `src/config.js` (`API_BASE`)
  o del override que el usuario guarda en Ajustes (`localStorage "canchita:api"`).
- **Cada jugador sube su propia foto con un PIN.** La primera vez fija el PIN; para cambiarla
  después hay que reenviar ese mismo PIN (verificado en el servidor). Ver `POST /api/fotos`.
- Guardar `datos` puede protegerse con `ADMIN_PIN` (variable de entorno en Vercel); el cliente
  lo manda en la cabecera `x-admin-pin` (`localStorage "canchita:admin"`).
- La app es **local-first**: carga el cache local al instante y luego refresca desde la nube;
  los cambios se cachean local y se empujan a la nube con un pequeño retardo.
- Variables de entorno del backend: `MONGODB_URI` (obligatoria), `MONGODB_DB` (opc., default
  "canchita"), `ADMIN_PIN` (opc.).

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
