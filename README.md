# Reporte con ubicación — Laboratorio 6.3

**Autor:** Juan Jose Diaz Barroso
**Asignatura:** Desarrollo de Aplicaciones Web Progresivas (PWA)
**Tema:** 6.3 — Geolocalización consciente y reutilizable (`geo-helper.js`)

- Demostración: https://juandiazpro.github.io/JJDB-Geolocalizacion/
- Repositorio: https://github.com/JuanDiazPro/JJDB-Geolocalizacion

## Descripción

Aplicación web para registrar reportes técnicos con ubicación. La solicitud de ubicación se
realiza únicamente después de una explicación previa y de una acción del usuario. El módulo
`geo-helper.js` concentra el acceso a `navigator.geolocation` y a la Permissions API, por lo que
cualquier otro flujo de la aplicación puede reutilizarlo.

### Flujo de la aplicación

1. Al pulsar «Adjuntar mi ubicación» se consulta el estado del permiso.
   - `granted`: se solicita la lectura de coordenadas.
   - `prompt`: se muestra una tarjeta informativa antes del diálogo nativo.
   - `denied`: se habilita directamente la selección manual de zona.
2. La lectura se ejecuta siempre desde un clic del usuario, requisito de Safari en iOS.
3. El resultado muestra las coordenadas, la hora y el margen de error (`coords.accuracy`).
   - Menos de 30 m: «Precisión GPS Alta».
   - 30 m o más: «Ubicación Aproximada (Wi-Fi / IP)».
4. Si el permiso se deniega, no hay señal o se produce un TIMEOUT, el reporte puede completarse
   con una zona manual. La aplicación no queda bloqueada.
5. El botón «Lectura rápida por Wi-Fi» reutiliza el mismo módulo con
   `enableHighAccuracy: false`.

## Estructura del proyecto

```
JJDB-Geolocalizacion/
├── index.html
├── styles.css
├── geo-helper.js
├── app.js
├── sw.js
├── manifest.json
├── icons/
│   ├── icon.svg
│   ├── icon-192.png
│   ├── icon-512.png
│   ├── favicon-32.png
│   └── apple-touch-icon.png
└── README.md
```

## Cumplimiento de las reglas técnicas

| Regla | Implementación |
| --- | --- |
| JavaScript Vanilla | Sin frameworks, librerías ni recursos externos. |
| Sin funciones asíncronas declarativas | La asincronía se construye con `new Promise()` y se consume con `.then()` y `.catch()`. |
| Orden de scripts | `./geo-helper.js` se carga antes de `./app.js`. |
| Precacheo | `./geo-helper.js` forma parte del App Shell en `sw.js`. |
| HTTPS | Publicado con GitHub Pages. |
| Rutas relativas | Todos los recursos usan `./` para funcionar bajo el subdirectorio del repositorio. |

## API de `geo-helper.js`

```js
GeoHelper.obtenerUbicacionActual(opciones)   // Promise<{ latitud, longitud, precisionMetros, calidad, timestamp }>
GeoHelper.obtenerUbicacionAproximada()       // Promise con enableHighAccuracy: false
GeoHelper.consultarEstadoPermisoGeo()        // Promise<'granted' | 'denied' | 'prompt'>
GeoHelper.observarEstadoPermisoGeo(callback) // Observa cambios del permiso
GeoHelper.clasificarPrecision(metros)        // { nivel, etiqueta, descripcion }
GeoHelper.formatearCoordenadas(lat, lon)     // "4.60971° N, 74.08175° O"
GeoHelper.formatearPrecision(metros)         // "± 18 m" o "± 1.2 km"
GeoHelper.distanciaEntreCoordenadas(a, b)    // Distancia en metros (Haversine)
```

Ejemplo de uso:

```js
GeoHelper.obtenerUbicacionActual({ enableHighAccuracy: true, timeout: 7000 })
  .then(function (ubicacion) {
    console.log(ubicacion.precisionMetros, ubicacion.calidad.etiqueta);
  })
  .catch(function (error) {
    console.warn('[Geo] Se activa el plan B:', error.message);
  });
```

## Prueba local

La Geolocation API requiere un contexto seguro. `localhost` está permitido:

```bash
python -m http.server 5500
```

Abrir `http://localhost:5500`.

## Comportamiento por plataforma

| Plataforma | Fuente | Margen típico | Observación |
| --- | --- | --- | --- |
| Android (Chrome) | GNSS, Wi-Fi y red celular | 3–50 m | Permite precisión exacta o aproximada. |
| iOS (Safari) | CoreLocation | 5–65 m | Exige un clic del usuario; la PWA instalada tiene permisos aislados. |
| Portátil sin GPS | Wi-Fi o dirección IP | 30 m–10 km | `enableHighAccuracy: true` puede finalizar en TIMEOUT. |

## Notas para la defensa

- El pre-permiso evita que el usuario bloquee el diálogo nativo por costumbre. Un bloqueo es
  irreversible desde JavaScript, por eso existe el plan B manual.
- El valor `accuracy` indica la confiabilidad de la coordenada. Un margen de 12 m permite ubicar
  una sucursal; uno de 5.000 m solo indica una ciudad aproximada.
- La reutilización se comprueba en dos flujos distintos que llaman a `obtenerUbicacionActual()`
  sin duplicar los callbacks de `navigator.geolocation`.

---

Juan Jose Diaz Barroso · 2026
