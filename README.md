# Laboratorio 6.3 — Geolocalización en PWA

**Autor:** Juan Jose Diaz Barroso
**Asignatura:** Desarrollo de Aplicaciones Web Progresivas

- Demostración: https://juandiazpro.github.io/JJDB-Geolocalizacion/
- Repositorio: https://github.com/JuanDiazPro/JJDB-Geolocalizacion

## Descripción

Aplicación web que adjunta la ubicación a un reporte mediante un módulo reutilizable
(`geo-helper.js`). Antes de abrir el diálogo nativo se muestra una tarjeta de consentimiento.
Si el permiso se deniega o la lectura falla, se habilita la selección manual de zona.

## Funcionamiento

1. Al pulsar «Adjuntar mi ubicación» se consulta el estado del permiso con la Permissions API.
2. Si el estado es `granted`, se solicita la ubicación.
3. Si el estado es `prompt`, se muestra la tarjeta de pre-permiso y la lectura se ejecuta al
   confirmar.
4. Si el estado es `denied`, se muestra el aviso correspondiente y el selector manual de zona.
5. El resultado muestra las coordenadas, el margen de error (`coords.accuracy`) y una etiqueta:
   - Menos de 30 m: «Precisión GPS Alta».
   - 30 m o más: «Ubicación Aproximada (Wi-Fi / IP)».
6. Si ocurre un TIMEOUT u otro error, se muestra el mensaje y el selector manual de zona.

## Estructura

```
JJDB-Geolocalizacion/
├── index.html
├── styles.css
├── geo-helper.js
├── app.js
├── sw.js
├── manifest.json
├── icons/
└── README.md
```

## Reglas técnicas

| Regla | Implementación |
| --- | --- |
| JavaScript Vanilla | Sin librerías ni recursos externos. |
| Sin funciones asíncronas declarativas | Se usa `new Promise()` con `.then()` y `.catch()`. |
| Orden de scripts | `./geo-helper.js` antes de `./app.js`. |
| Precacheo | `./geo-helper.js` está incluido en el App Shell de `sw.js`. |
| HTTPS | GitHub Pages. |
| Rutas relativas | Todos los recursos usan `./`. |

## API de `geo-helper.js`

```js
GeoHelper.obtenerUbicacionActual(opciones)  // Promise<{ latitud, longitud, precisionMetros, timestamp, calidad }>
GeoHelper.consultarEstadoPermisoGeo()       // Promise<'granted' | 'denied' | 'prompt'>
GeoHelper.clasificarPrecision(metros)       // { nivel, etiqueta }
```

## Prueba local

```bash
python -m http.server 5500
```

Abrir `http://localhost:5500`.

---

Juan Jose Diaz Barroso · 2026
