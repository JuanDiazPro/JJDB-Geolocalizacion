/* =========================================================================
   geo-helper.js — Módulo reutilizable de geolocalización (Vanilla JS)
   Tema 6.3 · PWA · Juan Jose Diaz Barroso
   -------------------------------------------------------------------------
   Encapsula navigator.geolocation y la Permissions API dentro de promesas.
   Regla del laboratorio: solo new Promise + .then/.catch, sin funciones
   asíncronas declarativas.
   ========================================================================= */

(function (global) {
  'use strict';

  /* Umbral de precisión: por debajo de 30 m se considera lectura GPS real. */
  var UMBRAL_GPS_ALTA = 30;

  /* Opciones por defecto para una lectura de alta precisión. */
  var OPCIONES_DEFAULT = {
    enableHighAccuracy: true,
    timeout: 8000,
    maximumAge: 30000
  };

  /* ---------------------------------------------------------------------
     Traducción de los códigos numéricos nativos a mensajes para el usuario.
     --------------------------------------------------------------------- */
  function traducirErrorGeolocalizacion(error) {
    var codigo = error && typeof error.code === 'number' ? error.code : 0;

    switch (codigo) {
      case 1: // PERMISSION_DENIED
        return 'Permiso de ubicación denegado. Puedes ingresar tu zona manualmente.';
      case 2: // POSITION_UNAVAILABLE
        return 'No fue posible determinar tu ubicación (señal GPS o Wi-Fi no disponible).';
      case 3: // TIMEOUT
        return 'Se agotó el tiempo de espera intentando obtener las coordenadas.';
      default:
        return 'Ocurrió un error inesperado al consultar la ubicación.';
    }
  }

  /* ---------------------------------------------------------------------
     Clasificación del margen de error (coords.accuracy) para la interfaz.
     --------------------------------------------------------------------- */
  function clasificarPrecision(precisionMetros) {
    var metros = Number(precisionMetros);

    if (!isFinite(metros) || metros < 0) {
      return {
        nivel: 'desconocida',
        etiqueta: 'Precisión desconocida',
        descripcion: 'El navegador no informó el margen de error de esta lectura.'
      };
    }

    if (metros < UMBRAL_GPS_ALTA) {
      return {
        nivel: 'alta',
        etiqueta: 'Precisión GPS Alta',
        descripcion: 'Lectura satelital o híbrida fiable, ideal para adjuntar al reporte.'
      };
    }

    return {
      nivel: 'aproximada',
      etiqueta: 'Ubicación Aproximada (Wi-Fi / IP)',
      descripcion:
        'El margen de error es amplio: la ubicación proviene de triangulación Wi-Fi o de la dirección IP.'
    };
  }

  /* ---------------------------------------------------------------------
     Normaliza GeolocationPosition para que cualquier módulo consumidor
     reciba siempre la misma estructura de datos.
     --------------------------------------------------------------------- */
  function normalizarPosicion(posicion) {
    var coords = posicion.coords;
    var precision = Math.round(coords.accuracy);

    return {
      latitud: coords.latitude,
      longitud: coords.longitude,
      precisionMetros: precision,
      altitud: typeof coords.altitude === 'number' ? Math.round(coords.altitude) : null,
      rumbo: typeof coords.heading === 'number' ? Math.round(coords.heading) : null,
      velocidad: typeof coords.speed === 'number' ? coords.speed : null,
      timestamp: posicion.timestamp,
      fuente: 'navegador',
      calidad: clasificarPrecision(precision)
    };
  }

  /* ---------------------------------------------------------------------
     Lectura única de la posición actual, promisificada.
     --------------------------------------------------------------------- */
  function obtenerUbicacionActual(opcionesPersonalizadas) {
    var opciones = Object.assign({}, OPCIONES_DEFAULT, opcionesPersonalizadas);

    return new Promise(function (resolve, reject) {
      if (!('geolocation' in navigator) || !navigator.geolocation) {
        reject(new Error('Este navegador no soporta la API de Geolocalización.'));
        return;
      }

      navigator.geolocation.getCurrentPosition(
        function (posicion) {
          resolve(normalizarPosicion(posicion));
        },
        function (error) {
          var fallo = new Error(traducirErrorGeolocalizacion(error));
          fallo.codigo = error && error.code ? error.code : 0;
          fallo.esPermisoDenegado = fallo.codigo === 1;
          fallo.esTimeout = fallo.codigo === 3;
          reject(fallo);
        },
        opciones
      );
    });
  }

  /* Lectura de baja precisión: útil para filtros rápidos en laptops sin GPS. */
  function obtenerUbicacionAproximada() {
    return obtenerUbicacionActual({
      enableHighAccuracy: false,
      timeout: 12000,
      maximumAge: 60000
    });
  }

  /* ---------------------------------------------------------------------
     Permissions API: estado previo del permiso ('granted' | 'denied' | 'prompt').
     --------------------------------------------------------------------- */
  function consultarEstadoPermisoGeo() {
    if (!('permissions' in navigator) || typeof navigator.permissions.query !== 'function') {
      return Promise.resolve('prompt');
    }

    return navigator.permissions
      .query({ name: 'geolocation' })
      .then(function (resultado) {
        return resultado.state;
      })
      .catch(function () {
        return 'prompt';
      });
  }

  /* Observa cambios del permiso (por ejemplo, cuando el usuario lo reactiva). */
  function observarEstadoPermisoGeo(alCambiar) {
    if (!('permissions' in navigator) || typeof navigator.permissions.query !== 'function') {
      return Promise.resolve(null);
    }

    return navigator.permissions
      .query({ name: 'geolocation' })
      .then(function (resultado) {
        var notificar = function () {
          if (typeof alCambiar === 'function') {
            alCambiar(resultado.state);
          }
        };

        resultado.onchange = notificar;
        notificar();
        return resultado;
      })
      .catch(function () {
        return null;
      });
  }

  /* ---------------------------------------------------------------------
     Utilidades de formato compartidas por cualquier pantalla de la PWA.
     --------------------------------------------------------------------- */
  function formatearCoordenadas(latitud, longitud) {
    var lat = Number(latitud);
    var lon = Number(longitud);

    if (!isFinite(lat) || !isFinite(lon)) {
      return '—';
    }

    var hemisferioLat = lat >= 0 ? 'N' : 'S';
    var hemisferioLon = lon >= 0 ? 'E' : 'O';

    return (
      Math.abs(lat).toFixed(5) + '° ' + hemisferioLat + ', ' +
      Math.abs(lon).toFixed(5) + '° ' + hemisferioLon
    );
  }

  function formatearPrecision(metros) {
    var valor = Number(metros);

    if (!isFinite(valor)) {
      return 'sin dato';
    }

    if (valor >= 1000) {
      return '± ' + (valor / 1000).toFixed(1) + ' km';
    }

    return '± ' + Math.round(valor) + ' m';
  }

  function formatearDistancia(metros) {
    var valor = Number(metros);

    if (!isFinite(valor)) {
      return '—';
    }

    if (valor < 1000) {
      return Math.round(valor) + ' m';
    }

    return (valor / 1000).toFixed(valor < 10000 ? 2 : 1) + ' km';
  }

  /* Distancia Haversine entre dos coordenadas (metros). */
  function distanciaEntreCoordenadas(origen, destino) {
    if (!origen || !destino) {
      return NaN;
    }

    var R = 6371000;
    var rad = Math.PI / 180;
    var dLat = (destino.latitud - origen.latitud) * rad;
    var dLon = (destino.longitud - origen.longitud) * rad;
    var a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(origen.latitud * rad) * Math.cos(destino.latitud * rad) *
      Math.sin(dLon / 2) * Math.sin(dLon / 2);

    return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  }

  function soportaGeolocalizacion() {
    return 'geolocation' in navigator && !!navigator.geolocation;
  }

  function soportaPermissionsApi() {
    return 'permissions' in navigator && typeof navigator.permissions.query === 'function';
  }

  /* ---------------------------------------------------------------------
     API pública del módulo.
     --------------------------------------------------------------------- */
  var GeoHelper = {
    UMBRAL_GPS_ALTA: UMBRAL_GPS_ALTA,
    obtenerUbicacionActual: obtenerUbicacionActual,
    obtenerUbicacionAproximada: obtenerUbicacionAproximada,
    consultarEstadoPermisoGeo: consultarEstadoPermisoGeo,
    observarEstadoPermisoGeo: observarEstadoPermisoGeo,
    clasificarPrecision: clasificarPrecision,
    traducirErrorGeolocalizacion: traducirErrorGeolocalizacion,
    formatearCoordenadas: formatearCoordenadas,
    formatearPrecision: formatearPrecision,
    formatearDistancia: formatearDistancia,
    distanciaEntreCoordenadas: distanciaEntreCoordenadas,
    soportaGeolocalizacion: soportaGeolocalizacion,
    soportaPermissionsApi: soportaPermissionsApi
  };

  global.GeoHelper = GeoHelper;

  /* Compatibilidad con los fragmentos del laboratorio que llaman a las
     funciones directamente desde el ámbito global. */
  global.obtenerUbicacionActual = obtenerUbicacionActual;
  global.consultarEstadoPermisoGeo = consultarEstadoPermisoGeo;
})(window);
