/* =========================================================================
   geo-helper.js — Módulo reutilizable de geolocalización
   Laboratorio 6.3 · Juan Jose Diaz Barroso
   Encapsula navigator.geolocation y la Permissions API en promesas.
   Sin funciones asíncronas declarativas: new Promise + .then / .catch.
   ========================================================================= */

(function (global) {
  'use strict';

  var UMBRAL_GPS_ALTA = 30;

  function traducirErrorGeolocalizacion(error) {
    switch (error.code) {
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

  function clasificarPrecision(precisionMetros) {
    if (precisionMetros < UMBRAL_GPS_ALTA) {
      return {
        nivel: 'alta',
        etiqueta: 'Precisión GPS Alta'
      };
    }

    return {
      nivel: 'aproximada',
      etiqueta: 'Ubicación Aproximada (Wi-Fi / IP)'
    };
  }

  function obtenerUbicacionActual(opcionesPersonalizadas) {
    var opciones = Object.assign(
      {
        enableHighAccuracy: true,
        timeout: 8000,
        maximumAge: 30000
      },
      opcionesPersonalizadas
    );

    return new Promise(function (resolve, reject) {
      if (!('geolocation' in navigator)) {
        reject(new Error('Este navegador no soporta la API de Geolocalización.'));
        return;
      }

      navigator.geolocation.getCurrentPosition(
        function (posicion) {
          var precisionMetros = Math.round(posicion.coords.accuracy);

          resolve({
            latitud: posicion.coords.latitude,
            longitud: posicion.coords.longitude,
            precisionMetros: precisionMetros,
            timestamp: posicion.timestamp,
            calidad: clasificarPrecision(precisionMetros)
          });
        },
        function (error) {
          var fallo = new Error(traducirErrorGeolocalizacion(error));
          fallo.codigo = error.code;
          reject(fallo);
        },
        opciones
      );
    });
  }

  function consultarEstadoPermisoGeo() {
    if (!('permissions' in navigator)) {
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

  global.GeoHelper = {
    obtenerUbicacionActual: obtenerUbicacionActual,
    consultarEstadoPermisoGeo: consultarEstadoPermisoGeo,
    clasificarPrecision: clasificarPrecision,
    traducirErrorGeolocalizacion: traducirErrorGeolocalizacion
  };

  global.obtenerUbicacionActual = obtenerUbicacionActual;
  global.consultarEstadoPermisoGeo = consultarEstadoPermisoGeo;
})(window);
