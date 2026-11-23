/* =========================================================================
   app.js — Flujo de pre-permiso, lectura y plan B manual
   Laboratorio 6.3 · Juan Jose Diaz Barroso
   Sin funciones asíncronas declarativas: promesas con .then / .catch.
   ========================================================================= */

(function () {
  'use strict';

  var Geo = window.GeoHelper;
  var cargando = false;
  var el = {};

  function iniciar() {
    el.btnSolicitar = document.getElementById('btn-solicitar');
    el.prepermiso = document.getElementById('zona-prepermiso');
    el.btnConfirmar = document.getElementById('btn-confirmar-ubicacion');
    el.btnPrefieroManual = document.getElementById('btn-prefiero-manual');
    el.mensaje = document.getElementById('mensaje');
    el.resultado = document.getElementById('resultado');
    el.coords = document.getElementById('resultado-coords');
    el.precision = document.getElementById('resultado-precision');
    el.badge = document.getElementById('badge-calidad');
    el.nota = document.getElementById('resultado-nota');
    el.selector = document.getElementById('selector-manual');
    el.selectorMotivo = document.getElementById('selector-motivo');
    el.selectZona = document.getElementById('select-zona');
    el.selectorHint = document.getElementById('selector-hint');
    el.zonaGuardada = document.getElementById('zona-guardada');

    el.btnSolicitar.addEventListener('click', solicitarUbicacion);
    el.btnConfirmar.addEventListener('click', function () {
      ocultarPrePermiso();
      leerUbicacion();
    });
    el.btnPrefieroManual.addEventListener('click', function () {
      ocultarPrePermiso();
      mostrarPlanB('', 'Selecciona una zona para completar el reporte.');
    });
    el.selector.addEventListener('submit', guardarZona);
  }

  function solicitarUbicacion() {
    if (cargando) {
      return;
    }

    ocultarPrePermiso();
    ocultarMensaje();
    ocultarResultado();
    ocultarSelector();
    el.zonaGuardada.hidden = true;

    if (!('geolocation' in navigator)) {
      mostrarPlanB(
        'Este navegador no soporta la API de Geolocalización.',
        'Selecciona una zona para completar el reporte.'
      );
      return;
    }

    Geo.consultarEstadoPermisoGeo()
      .then(function (estado) {
        if (estado === 'granted') {
          leerUbicacion();
          return;
        }

        if (estado === 'denied') {
          mostrarPlanB(
            'El permiso de ubicación está bloqueado. Habilítalo desde la configuración del navegador para volver a intentarlo.',
            'También puedes completar el reporte con una zona manual.'
          );
          return;
        }

        mostrarPrePermiso();
      })
      .catch(function () {
        mostrarPrePermiso();
      });
  }

  function leerUbicacion() {
    if (cargando) {
      return;
    }

    cargando = true;
    el.btnSolicitar.disabled = true;
    el.btnSolicitar.textContent = 'Obteniendo ubicación…';

    Geo.obtenerUbicacionActual()
      .then(function (ubicacion) {
        restaurarBoton();
        mostrarResultado(ubicacion);
      })
      .catch(function (error) {
        restaurarBoton();

        mostrarPlanB(
          error.message,
          'Selecciona una zona para completar el reporte.'
        );
      });
  }

  function restaurarBoton() {
    cargando = false;
    el.btnSolicitar.disabled = false;
    el.btnSolicitar.textContent = 'Adjuntar mi ubicación';
  }

  function mostrarPrePermiso() {
    el.prepermiso.hidden = false;
  }

  function ocultarPrePermiso() {
    el.prepermiso.hidden = true;
  }

  function mostrarResultado(ubicacion) {
    el.coords.textContent =
      ubicacion.latitud.toFixed(5) + ', ' + ubicacion.longitud.toFixed(5);
    el.precision.textContent = '± ' + ubicacion.precisionMetros + ' m';
    el.badge.textContent = ubicacion.calidad.etiqueta;
    el.badge.setAttribute('data-nivel', ubicacion.calidad.nivel);

    el.nota.textContent = ubicacion.calidad.nivel === 'alta'
      ? 'La lectura corresponde a GPS de alta precisión.'
      : 'La lectura proviene de Wi-Fi o de la dirección IP, por lo que el margen de error es mayor.';

    ocultarMensaje();
    ocultarSelector();
    el.resultado.hidden = false;
  }

  function mostrarPlanB(textoMensaje, textoSelector) {
    if (textoMensaje) {
      el.mensaje.textContent = textoMensaje;
      el.mensaje.hidden = false;
    } else {
      ocultarMensaje();
    }

    el.selectorMotivo.textContent = textoSelector;
    el.selectorHint.textContent = '';
    el.zonaGuardada.hidden = true;
    el.resultado.hidden = true;
    el.selector.hidden = false;
  }

  function ocultarMensaje() {
    el.mensaje.hidden = true;
  }

  function ocultarResultado() {
    el.resultado.hidden = true;
  }

  function ocultarSelector() {
    el.selector.hidden = true;
  }

  function guardarZona(evento) {
    evento.preventDefault();

    var zona = el.selectZona.value;

    if (!zona) {
      el.selectorHint.textContent = 'Selecciona una zona para continuar.';
      return;
    }

    ocultarSelector();
    ocultarMensaje();
    ocultarResultado();

    el.zonaGuardada.textContent = 'Ubicación manual guardada: ' + zona;
    el.zonaGuardada.hidden = false;
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', iniciar);
  } else {
    iniciar();
  }
})();
