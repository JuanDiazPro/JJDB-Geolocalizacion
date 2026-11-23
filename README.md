# GeoConsciente · Laboratorio 6.3

**Autor:** Juan Jose Diaz Barroso
**Asignatura:** Desarrollo de Aplicaciones Web Progresivas (PWA)
**Tema:** 6.3 — Geolocalización consciente y reutilizable (`geo-helper.js`)

🔗 **Demo en GitHub Pages:** <https://juandiazpro.github.io/JJDB-Geolocalizacion/>
📦 **Repositorio:** <https://github.com/JuanDiazPro/JJDB-Geolocalizacion>

---

## ¿Qué resuelve esta práctica?

Una PWA de reportes técnicos que adjunta la ubicación del dispositivo **solo después de explicar
para qué la necesita**. Toda la lógica de geolocalización vive en un módulo reutilizable
(`geo-helper.js`), de modo que cualquier pantalla puede pedir coordenadas con una sola línea.

### Flujo implementado

1. **Pre-permiso:** al pulsar «Adjuntar mi ubicación» se consulta la Permissions API.
   - `granted` → lectura directa de coordenadas.
   - `prompt` → aparece una tarjeta que explica el beneficio antes del diálogo nativo.
   - `denied` → se abre el plan B manual con instrucciones para reactivar el permiso.
2. **Lectura real:** solo se ejecuta `getCurrentPosition()` desde un clic del usuario
   (obligatorio en iOS/WebKit).
3. **Diagnóstico:** se muestra `coords.accuracy` como **± X m** y se clasifica:
   - `< 30 m` → **Precisión GPS Alta** (verde).
   - `≥ 30 m` → **Ubicación Aproximada (Wi-Fi / IP)** (ámbar).
4. **Degradación elegante:** ante `PERMISSION_DENIED`, `POSITION_UNAVAILABLE`, `TIMEOUT` o un
   navegador sin soporte, el reporte nunca se bloquea: se habilita el selector manual de zona.
5. **Reutilización:** el botón «Lectura rápida (Wi-Fi)» usa el mismo helper con
   `enableHighAccuracy: false`, ideal para laptops sin GPS.

---

## Estructura del proyecto

```
JJDB-Geolocalizacion/
├── index.html          # Interfaz: pre-permiso, resultado, plan B y reporte
├── styles.css          # Diseño responsive con modo oscuro suave
├── geo-helper.js       # Módulo de geolocalización promisificado (reutilizable)
├── app.js              # Lógica de UI y consumo del helper
├── sw.js               # Service Worker con App Shell (incluye geo-helper.js)
├── manifest.json       # Metadatos de instalación de la PWA
├── icons/
│   ├── icon.svg
│   ├── icon-192.png
│   ├── icon-512.png
│   └── apple-touch-icon.png
└── README.md
```

---

## Cumplimiento de las reglas técnicas

| Regla | Implementación |
| --- | --- |
| 100 % JavaScript Vanilla | Sin frameworks, sin librerías, sin CDN. |
| Cero `async` / `await` | Toda la asincronía usa `new Promise()` + `.then()` / `.catch()` (revisable en `geo-helper.js` y `app.js`). |
| Orden de scripts | `./geo-helper.js` se carga antes de `./app.js`. |
| Precacheo | `./geo-helper.js` está en `APP_SHELL` dentro de `sw.js`. |
| HTTPS | Desplegado en GitHub Pages. |
| Rutas relativas | Todos los recursos usan `./` para funcionar bajo el subdirectorio del repositorio. |

---

## API de `geo-helper.js`

```js
GeoHelper.obtenerUbicacionActual(opciones)   // Promise<{ latitud, longitud, precisionMetros, calidad, timestamp }>
GeoHelper.obtenerUbicacionAproximada()       // Promise con enableHighAccuracy: false
GeoHelper.consultarEstadoPermisoGeo()        // Promise<'granted' | 'denied' | 'prompt'>
GeoHelper.observarEstadoPermisoGeo(callback) // Detecta cambios de permiso
GeoHelper.clasificarPrecision(metros)        // { nivel, etiqueta, descripcion }
GeoHelper.formatearCoordenadas(lat, lon)     // "4.60971° N, 74.08175° O"
GeoHelper.formatearPrecision(metros)         // "± 18 m" o "± 1.2 km"
GeoHelper.distanciaEntreCoordenadas(a, b)    // Metros (Haversine)
```

Ejemplo de consumo desde cualquier módulo:

```js
GeoHelper.obtenerUbicacionActual({ enableHighAccuracy: true, timeout: 7000 })
  .then(function (ubicacion) {
    console.log(ubicacion.precisionMetros, ubicacion.calidad.etiqueta);
  })
  .catch(function (error) {
    console.warn('[Geo] Plan B:', error.message);
  });
```

> El objeto de salida está normalizado: `latitud`, `longitud`, `precisionMetros`,
> `altitud`, `timestamp` y `calidad`, para que ningún consumidor dependa del formato nativo.

---

## Cómo probarlo en local

La Geolocation API exige un contexto seguro. `localhost` está permitido:

```bash
python -m http.server 5500
# Abrir http://localhost:5500
```

El Service Worker requiere `localhost` o HTTPS y se registra al cargar la página.

---

## Comportamiento por plataforma

| Plataforma | Fuente | Accuracy típico | Detalle |
| --- | --- | --- | --- |
| Android (Chrome) | GNSS + Wi-Fi + red celular | 3–50 m | Permite precisión exacta o aproximada. |
| iOS (Safari) | CoreLocation | 5–65 m | Exige gesto de usuario; permisos aislados en PWA instalada. |
| Laptop sin GPS | Wi-Fi / IP | 30 m–10 km | `enableHighAccuracy: true` puede acabar en `TIMEOUT (3)`. |

---

## Nota sobre la defensa oral

- **¿Por qué pre-permiso?** Un `PERMISSION_DENIED` es irreversible desde JavaScript: si el usuario
  bloquea el diálogo nativo, la app debe seguir funcionando con el selector manual.
- **¿Por qué `accuracy` importa?** Una coordenada sin margen de error es engañosa: 12 m permite
  ubicar una sucursal; 5.000 m solo indica una ciudad aproximada.
- **¿Dónde se ve la reutilización?** Dos flujos distintos (lectura precisa y lectura rápida)
  consumen `obtenerUbicacionActual()` sin duplicar callbacks de `navigator.geolocation`.

---

© 2026 · Juan Jose Diaz Barroso · PWA Tema 6.3
