# ArroyitoFutStats ⚽

App de **fútbol 5** del grupo: quién vino, cuántos goles y asistencias metió cada uno,
promedios, la tabla del grupo y una ruleta que reparte los equipos y arma la alineación.

Funciona sola en el teléfono (sin cuentas). Y si conectas la nube (MongoDB Atlas + Vercel,
gratis), todo el grupo comparte la misma tabla y cada jugador sube su propia foto con un PIN.
Ver la sección **4b. Conectar la nube**.

---

## 1. Requisitos

- **Node.js 20 o superior** — https://nodejs.org
- Para el APK, cualquiera de estos tres caminos (ver más abajo):
  - una cuenta de GitHub (no instalas nada), o
  - Android Studio, o
  - el SDK de Android por línea de comandos

## 2. Correr la app en el computador

```bash
npm install
npm run dev
```

Abre http://localhost:5173. Para verla en tu celular mientras desarrollas, conéctalo a la
misma red wifi y entra a la dirección `http://TU-IP:5173` que imprime la terminal.

## 3. Generar el APK

### Opción A — GitHub Actions (recomendada, no instalas nada)

1. Sube esta carpeta a un repositorio de GitHub.
2. Entra a la pestaña **Actions** → **Generar APK** → **Run workflow**.
3. Cuando termine (unos 5 minutos), baja el artefacto `canchita-apk`.
4. Descomprime y pasa el `app-debug.apk` al teléfono (WhatsApp, cable o Drive).
5. En el celular, permite "instalar apps de origen desconocido" y ábrelo.

El flujo ya está configurado en `.github/workflows/android.yml`.

### Opción B — Android Studio

```bash
npm install
npm run android:open
```

Se abre el proyecto nativo. En Android Studio: **Build → Build Bundle(s) / APK(s) → Build APK(s)**.
También puedes conectar el celular por USB con depuración activada y darle *Run*.

### Opción C — Línea de comandos (con el SDK de Android instalado)

```bash
npm run android:apk
```

El archivo queda en `android/app/build/outputs/apk/debug/app-debug.apk`.

> Cada vez que cambies código de la app, corre `npm run android:sync` antes de compilar:
> eso reconstruye la web y la copia dentro del proyecto Android.

## 3b. iPhone / iOS (y cualquiera sin APK)

iOS **no permite instalar apps sueltas** como el APK de Android. Para una app nativa de
iPhone hace falta una **Mac con Xcode** y la **cuenta de Apple Developer (99 USD/año)**, sin
importar la herramienta que uses (Expo, Capacitor, etc.).

La vía gratis, y la recomendada: **usarla como PWA**. Como la app se despliega en Vercel
(sección 4b), cualquiera con iPhone puede instalarla así:

1. Abrir la URL de Vercel **en Safari** (tiene que ser Safari, no Chrome).
2. Botón **Compartir** → **Añadir a pantalla de inicio**.
3. Queda con ícono propio, a pantalla completa y sin barra del navegador, igual que una app.

En Android funciona igual desde Chrome ("Instalar aplicación"), por si alguien no quiere
el APK. Ya está todo configurado: `public/manifest.webmanifest` y los íconos.

> Si algún día quieres la app nativa en la App Store, Capacitor ya lo soporta
> (`npx cap add ios`), pero seguirás necesitando la Mac y la cuenta de Apple.

## 4. Estructura

```
src/
  App.jsx                 estado global, pestañas, ajustes, respaldo y sincronización con la nube
  tema.js                 colores, colores de peto y tipografía (empieza por aquí para cambiar el look)
  config.js               URL del backend en Vercel (déjalo vacío para usar la app solo local)
  lib/
    almacenamiento.js     guardar/leer en el teléfono + exportar/importar respaldo
    nube.js               cliente de la nube (datos y fotos con PIN)
    util.js               fechas, formato de nombres, compresión de fotos, cálculo de la tabla
  components/ui.jsx       avatar, botón, rótulo, marcador, rejilla de asistencia
  screens/
    Tabla.jsx             bota de oro, líderes y tabla general
    Nomina.jsx            lista de jugadores y fotos
    Partidos.jsx          historial de domingos
    EditorPartido.jsx     registrar/editar: asistencia → goles y asistencias
    Ruleta.jsx            sorteo de equipos + alineación en cancha con las fotos
    FichaJugador.jsx      estadísticas individuales
    SubirFoto.jsx         modal para que cada jugador suba su foto con PIN
api/                      backend serverless para Vercel (datos, fotos, ping) sobre MongoDB Atlas
public/                   manifest e iconos de la PWA (para instalar en iPhone/Android sin APK)
android/                  proyecto nativo (generado por Capacitor, ya incluido)
assets/                   icono y splash originales; regenera con `npx @capacitor/assets generate --android`
```

## 4b. Conectar la nube (para que todo el grupo comparta tabla y fotos)

Sin esto la app funciona, pero cada teléfono ve sus propios datos. Con esto, todos ven la
misma tabla y **cada jugador sube su propia foto protegida con un PIN**.

### Paso 1 — Base de datos en MongoDB Atlas (gratis)
1. Crea una cuenta en https://www.mongodb.com/atlas y un clúster **M0 (gratis)**.
2. En **Database Access** crea un usuario con contraseña.
3. En **Network Access** agrega la IP `0.0.0.0/0` (permitir desde cualquier lado; lo necesita Vercel).
4. En **Connect → Drivers** copia la *connection string*. Se ve así:
   `mongodb+srv://usuario:clave@cluster0.xxxx.mongodb.net/?retryWrites=true&w=majority`

### Paso 2 — Desplegar la API en Vercel (gratis, no se apaga)
1. Sube esta carpeta a un repositorio de GitHub.
2. Entra a https://vercel.com, **Add New → Project** e importa el repo.
3. En **Environment Variables** agrega:
   - `MONGODB_URI` = la *connection string* del paso 1.
   - `ADMIN_PIN` = *(opcional)* un PIN para que solo tú puedas editar partidos y nómina.
4. **Deploy**. Al terminar tendrás una URL como `https://canchita-arroyito.vercel.app`.

### Paso 3 — Conectar la app a esa URL
- Fácil: abre la app → **⚙ Ajustes → Conexión con la nube**, pega la URL, pon el PIN de
  administrador (si lo definiste), toca **Probar conexión** y luego **Guardar**.
- O fijo en el código: pon la URL en `src/config.js` (`API_BASE`) antes de compilar el APK,
  para que salga ya conectado.

> Las funciones serverless de Vercel no se "duermen" como otros hosts gratuitos: responden
> siempre (con un pequeño arranque en frío la primera vez). El plan gratis le sobra a un
> grupo de fútbol.

## 5. Cómo se calculan las estadísticas

| Dato | Fórmula |
|---|---|
| PJ | partidos en los que aparece marcado |
| **NOTA** | calificación sobre 10: `6.0 + 0.8×goles + 0.5×asistencias` por partido (tope 10), promediada |
| Goles por partido | goles ÷ PJ |
| Asistencia | PJ ÷ total de partidos del grupo |
| Bota de oro | más goles; si hay empate, mejor nota |
| Mejor nota | mejor promedio de notas con mínimo 2 partidos |

La **nota** funciona como las calificaciones del fútbol real: todos parten de 6.0 por
presentarse, y suben con goles y asistencias. Ejemplos: sin goles = 6.0 · 1 gol = 6.8 ·
2 goles = 7.6 · 3 goles y 1 asistencia = 8.9. El máximo por partido es 10.

En la ruleta eliges **cuántos equipos** (2 a 6) y **cuántos jugadores lleva cada equipo**
(por defecto 5, que es fútbol 5). Cada jugador entra al equipo con menos gente **que todavía
tenga cupo**; si llega más gente de la que cabe, los que sobran van a la **banca**. Con
**Repartir parejo** activado, en caso de empate elige el equipo con menor nota acumulada,
para que no queden todos los cracks del mismo lado. Al final ves cada equipo como una
**alineación sobre la cancha** con las fotos.

## 6. Cosas para tener en cuenta

- **Sin nube, los datos viven solo en ese teléfono.** Ajustes → Exportar guarda un `.json`
  con todo, incluidas las fotos. Importar lo restaura. Hazlo de vez en cuando.
- **Con nube** (sección 4b) todo el grupo comparte tabla y fotos, y cada quien sube su foto
  con su PIN. El respaldo sigue siendo útil como copia de seguridad.
- El APK de la Opción A viene firmado con la llave de depuración: sirve para instalarlo entre
  amigos, pero no para publicarlo en Play Store. Para eso hay que generar un keystore propio.

## 7. Ideas para pedirle a Claude Code

- "Agrega arquero como posición y una tabla aparte de vallas menos vencidas."
- "Guarda el resultado del partido (marcador por equipo) y una racha de victorias por jugador."
- "Haz que la ruleta recuerde los últimos equipos y evite repetir la misma pareja dos domingos seguidos."
- "Agrega tarjetas amarillas y rojas al editor de partido."
- "Sincroniza los datos con Supabase para que todo el grupo vea la tabla."
- "Cambia la paleta a los colores del Bucaramanga."
