/* =========================================================================
   app.js — Lógica de interfaz, pre-permiso y consumo de geo-helper.js
   Tema 6.3 · PWA · Juan Jose Diaz Barroso
   Sin funciones asíncronas declarativas: toda la asincronía usa promesas
   con .then() y .catch().
   ========================================================================= */

(function () {
  'use strict';

  var Geo = window.GeoHelper;

  /* Estado en memoria de la aplicación. */
  var estado = {
    permiso: 'desconocido',
    plataforma: 'desconocido',
    esIOS: false,
    esAndroid: false,
    intencionPendiente: 'alta',
    consentimientoEnSesion: false,
    ubicacion: null,
    reportes: 0,
    eventos: 0,
    cargando: false
  };

  var el = {};
  var UMBRAL = 300;

  /* ---------------------------------------------------------------------
     Arranque
     --------------------------------------------------------------------- */
  function iniciar() {
    capturarElementos();
    detectarPlataforma();
    verificarSoporte();
    conectarEventos();
    revisarPermiso(true);
    observarPermiso();
    registrar('Aplicación lista. Aún no se ha solicitado ninguna ubicación.', 'info');
    actualizarResumen();

    if ('serviceWorker' in navigator) {
      window.addEventListener('load', function () {
        navigator.serviceWorker
          .register('./sw.js')
          .then(function () {
            pintarTag(el.tagSW, 'Activo', 'ok');
            registrar('Service Worker registrado: la app funciona sin conexión.', 'ok');
          })
          .catch(function () {
            pintarTag(el.tagSW, 'No disponible', 'warn');
          });
      });
    } else {
      pintarTag(el.tagSW, 'No soportado', 'warn');
    }

    if (window.matchMedia && window.matchMedia('(display-mode: standalone)').matches) {
      registrar('Modo PWA instalada detectado.', 'info');
    }
  }

  function capturarElementos() {
    el.chip = document.getElementById('chip-permiso');
    el.chipTexto = document.getElementById('chip-permiso-texto');
    el.heroEstado = document.getElementById('hero-estado');

    el.btnSolicitar = document.getElementById('btn-solicitar');
    el.btnSolicitarLabel = el.btnSolicitar.querySelector('.btn-label');
    el.btnRapida = document.getElementById('btn-lectura-rapida');

    el.prepermiso = document.getElementById('zona-prepermiso');
    el.btnConfirmar = document.getElementById('btn-confirmar-ubicacion');
    el.btnPrefieroManual = document.getElementById('btn-prefiero-manual');

    el.errorBanner = document.getElementById('error-banner');
    el.errorTitulo = document.getElementById('error-titulo');
    el.errorTexto = document.getElementById('error-texto');
    el.btnErrorManual = document.getElementById('btn-error-manual');
    el.btnErrorReintentar = document.getElementById('btn-error-reintentar');

    el.resultado = document.getElementById('resultado');
    el.resCoords = document.getElementById('resultado-coords');
    el.resPrecision = document.getElementById('resultado-precision');
    el.resBadge = document.getElementById('badge-calidad');
    el.resBarra = document.getElementById('barra-precision');
    el.resNota = document.getElementById('resultado-nota');
    el.resFuente = document.getElementById('resultado-fuente');
    el.resHora = document.getElementById('resultado-hora');
    el.resAltitud = document.getElementById('resultado-altitud');
    el.resEnlace = document.getElementById('resultado-enlace');
    el.btnRepetir = document.getElementById('btn-repetir-lectura');

    el.selector = document.getElementById('selector-manual');
    el.selectZona = document.getElementById('select-zona');
    el.campoOtra = document.getElementById('campo-otra-zona');
    el.inputOtra = document.getElementById('input-otra-zona');
    el.inputReferencia = document.getElementById('input-referencia');
    el.selectorMotivo = document.getElementById('selector-motivo');
    el.selectorHint = document.getElementById('selector-hint');
    el.btnCancelarZona = document.getElementById('btn-cancelar-zona');

    el.resumen = document.getElementById('resumen-ubicacion');
    el.resumenValor = document.getElementById('resumen-valor');
    el.btnQuitarUbicacion = document.getElementById('btn-quitar-ubicacion');

    el.formReporte = document.getElementById('form-reporte');
    el.descripcion = document.getElementById('input-descripcion');
    el.reporteHint = document.getElementById('reporte-hint');
    el.listaReportes = document.getElementById('lista-reportes');

    el.log = document.getElementById('log');
    el.logContador = document.getElementById('log-contador');

    el.rapidaVacia = document.getElementById('rapida-vacia');
    el.rapidaResultado = document.getElementById('rapida-resultado');
    el.rapidaCoords = document.getElementById('rapida-coords');
    el.rapidaBadge = document.getElementById('rapida-badge');
    el.rapidaMeta = document.getElementById('rapida-meta');

    el.tagHTTPS = document.getElementById('device-https');
    el.tagSoporte = document.getElementById('device-soporte');
    el.tagPermissions = document.getElementById('device-permissions');
    el.tagSW = document.getElementById('device-sw');
    el.devicePlataforma = document.getElementById('device-plataforma');
    el.deviceFuente = document.getElementById('device-fuente');
    el.notaPlataforma = document.getElementById('nota-plataforma');
  }

  /* ---------------------------------------------------------------------
     Detección de plataforma y capacidades
     --------------------------------------------------------------------- */
  function detectarPlataforma() {
    var ua = navigator.userAgent || '';
    var esIPad = navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1;

    estado.esIOS = /iPad|iPhone|iPod/.test(ua) || esIPad;
    estado.esAndroid = /Android/.test(ua);

    if (estado.esIOS) {
      estado.plataforma = 'iOS / WebKit';
      el.devicePlataforma.textContent = 'iPhone o iPad · WebKit';
      el.deviceFuente.textContent = 'CoreLocation: GPS + Wi-Fi + Bluetooth';
      el.notaPlataforma.textContent =
        'Safari exige un clic directo para pedir la ubicación. Si instalaste la PWA, sus permisos están aislados de los de Safari.';
    } else if (estado.esAndroid) {
      estado.plataforma = 'Android / Chrome';
      el.devicePlataforma.textContent = 'Android · Chrome / WebView';
      el.deviceFuente.textContent = 'GNSS + torres celulares + Wi-Fi';
      el.notaPlataforma.textContent =
        'Android 12+ permite elegir entre ubicación precisa o aproximada. La PWA comparte permisos con Chrome.';
    } else {
      estado.plataforma = 'Escritorio';
      el.devicePlataforma.textContent = 'Laptop / Escritorio';
      el.deviceFuente.textContent = 'Triangulación Wi-Fi o dirección IP';
      el.notaPlataforma.textContent =
        'Sin chip GPS, enableHighAccuracy solo escanea redes Wi-Fi por más tiempo y puede terminar en TIMEOUT.';
    }
  }

  function verificarSoporte() {
    var seguro = window.isSecureContext || location.protocol === 'https:' || location.hostname === 'localhost';
    pintarTag(el.tagHTTPS, seguro ? 'Seguro' : 'Sin HTTPS', seguro ? 'ok' : 'error');

    if (Geo.soportaGeolocalizacion()) {
      pintarTag(el.tagSoporte, 'Disponible', 'ok');
    } else {
      pintarTag(el.tagSoporte, 'No disponible', 'error');
    }

    pintarTag(el.tagPermissions, Geo.soportaPermissionsApi() ? 'Disponible' : 'No disponible', Geo.soportaPermissionsApi() ? 'ok' : 'warn');
  }

  function pintarTag(nodo, texto, tono) {
    if (!nodo) {
      return;
    }
    nodo.textContent = texto;
    nodo.setAttribute('data-tono', tono || 'neutro');
  }

  /* ---------------------------------------------------------------------
     Eventos
     --------------------------------------------------------------------- */
  function conectarEventos() {
    el.btnSolicitar.addEventListener('click', function () {
      iniciarSolicitud('alta');
    });

    el.btnRapida.addEventListener('click', function () {
      iniciarSolicitud('rapida');
    });

    el.btnConfirmar.addEventListener('click', function () {
      var intencion = estado.intencionPendiente;
      ocultarPrePermiso();
      ejecutarLectura(intencion);
    });

    el.btnPrefieroManual.addEventListener('click', function () {
      ocultarPrePermiso();
      mostrarSelector('Preferiste no compartir tu ubicación. Elige una zona para continuar.');
    });

    el.btnErrorManual.addEventListener('click', function () {
      mostrarSelector('Usa el plan B para completar el reporte sin GPS.');
    });

    el.btnErrorReintentar.addEventListener('click', function () {
      ocultarError();
      ejecutarLectura('alta');
    });

    el.btnRepetir.addEventListener('click', function () {
      ejecutarLectura('alta');
    });

    el.selectZona.addEventListener('change', function () {
      var esOtra = el.selectZona.value === 'Otra ciudad / zona';
      el.campoOtra.hidden = !esOtra;
      if (esOtra) {
        el.inputOtra.focus();
      }
    });

    el.selector.addEventListener('submit', guardarZonaManual);

    el.btnCancelarZona.addEventListener('click', function () {
      ocultarSelector();
    });

    el.btnQuitarUbicacion.addEventListener('click', function () {
      estado.ubicacion = null;
      actualizarResumen();
      el.resultado.hidden = true;
      el.rapidaResultado.hidden = true;
      el.rapidaVacia.hidden = false;
      el.heroEstado.textContent = 'Esperando tu decisión';
      registrar('Ubicación quitada del reporte.', 'info');
    });

    el.formReporte.addEventListener('submit', enviarReporte);
  }

  /* ---------------------------------------------------------------------
     Flujo de pre-permiso
     --------------------------------------------------------------------- */
  function iniciarSolicitud(intencion) {
    if (estado.cargando) {
      return;
    }

    if (!Geo.soportaGeolocalizacion()) {
      registrar('El navegador no soporta la Geolocation API.', 'error');
      mostrarSelector('Este navegador no expone la API de geolocalización. Usa el plan B manual.');
      return;
    }

    estado.intencionPendiente = intencion;

    revisarPermiso(false).then(function (permiso) {
      if (permiso === 'denied') {
        mostrarSelector('Bloqueaste el permiso de ubicación. Puedes completar el reporte con una zona manual.');
        registrar('Permiso bloqueado: se activó el plan B manual.', 'warn');
        return;
      }

      /* En iOS la Permissions API suele responder 'prompt' aunque el permiso
         ya se haya concedido: recordamos el consentimiento de esta sesión. */
      if (permiso === 'granted' || estado.consentimientoEnSesion) {
        ejecutarLectura(intencion);
        return;
      }

      mostrarPrePermiso(intencion);
    });
  }

  function revisarPermiso(esInicial) {
    return Geo.consultarEstadoPermisoGeo()
      .then(function (permiso) {
        var anterior = estado.permiso;
        actualizarEstadoPermiso(permiso);

        if (!esInicial && anterior !== permiso) {
          registrar('El estado del permiso cambió a «' + permiso + '».', 'info');
        }

        return permiso;
      })
      .catch(function () {
        actualizarEstadoPermiso('prompt');
        return 'prompt';
      });
  }

  function observarPermiso() {
    Geo.observarEstadoPermisoGeo(function (permiso) {
      if (permiso !== estado.permiso) {
        actualizarEstadoPermiso(permiso);
      }
    });
  }

  function actualizarEstadoPermiso(permiso) {
    estado.permiso = permiso;

    var textos = {
      granted: 'Permiso concedido',
      denied: 'Permiso bloqueado',
      prompt: 'Permiso sin decidir',
      desconocido: 'Consultando permiso…'
    };

    el.chip.setAttribute('data-estado', permiso);
    el.chipTexto.textContent = textos[permiso] || textos.desconocido;

    if (permiso === 'prompt' && estado.consentimientoEnSesion) {
      el.chip.setAttribute('data-estado', 'granted');
      el.chipTexto.textContent = 'Concedido en esta sesión';
    }

    if (permiso === 'denied') {
      el.heroEstado.textContent = 'Permiso bloqueado · plan B disponible';
    } else if (permiso === 'granted') {
      el.heroEstado.textContent = 'Permiso concedido · listo para medir';
    } else if (estado.ubicacion) {
      el.heroEstado.textContent = 'Ubicación adjunta al reporte';
    } else {
      el.heroEstado.textContent = 'Esperando tu decisión';
    }
  }

  function mostrarPrePermiso(intencion) {
    estado.intencionPendiente = intencion;
    el.prepermiso.hidden = false;
    el.prepermiso.classList.remove('entrando');
    void el.prepermiso.offsetWidth;
    el.prepermiso.classList.add('entrando');
    el.prepermiso.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    registrar('Tarjeta de pre-permiso mostrada: aún no se pidió la ubicación.', 'info');
  }

  function ocultarPrePermiso() {
    el.prepermiso.hidden = true;
  }

  /* ---------------------------------------------------------------------
     Lectura de coordenadas (consume geo-helper.js)
     --------------------------------------------------------------------- */
  function ejecutarLectura(perfil) {
    if (estado.cargando) {
      return;
    }

    if (!Geo.soportaGeolocalizacion()) {
      mostrarSelector('Este navegador no soporta la Geolocation API.');
      return;
    }

    ocultarPrePermiso();
    ocultarError();
    marcarCargando(perfil, true);

    var opciones = perfil === 'rapida'
      ? { enableHighAccuracy: false, timeout: 12000, maximumAge: 60000 }
      : { enableHighAccuracy: true, timeout: 9000, maximumAge: 0 };

    registrar(
      perfil === 'rapida'
        ? 'Solicitando lectura aproximada (Wi-Fi / IP)…'
        : 'Solicitando coordenadas de alta precisión…',
      'info'
    );

    Geo.obtenerUbicacionActual(opciones)
      .then(function (ubicacion) {
        marcarCargando(perfil, false);

        if (perfil === 'rapida') {
          renderizarLecturaRapida(ubicacion);
          registrar('Lectura aproximada obtenida: ' + Geo.formatearPrecision(ubicacion.precisionMetros) + '.', 'ok');
          return;
        }

        renderizarUbicacion(ubicacion);
        registrar(
          'Ubicación fijada: ' + Geo.formatearPrecision(ubicacion.precisionMetros) +
          ' · ' + ubicacion.calidad.etiqueta + '.',
          'ok'
        );
      })
      .catch(function (error) {
        marcarCargando(perfil, false);
        manejarError(error, perfil);
      });
  }

  function marcarCargando(perfil, activo) {
    estado.cargando = activo;
    var boton = perfil === 'rapida' ? el.btnRapida : el.btnSolicitar;

    boton.disabled = activo;
    boton.classList.toggle('is-loading', activo);
    el.btnSolicitar.disabled = activo;
    el.btnRapida.disabled = activo;

    if (perfil !== 'rapida') {
      el.btnSolicitarLabel.textContent = activo ? 'Obteniendo coordenadas…' : 'Adjuntar mi ubicación';
    }
  }

  function manejarError(error, perfil) {
    var titulo = 'No pudimos obtener tu ubicación';
    var detalle = error && error.message ? error.message : 'Error desconocido.';

    if (error && error.esPermisoDenegado) {
      titulo = 'Permiso de ubicación bloqueado';
      detalle = mensajeReactivacion();
      actualizarEstadoPermiso('denied');
    } else if (error && error.esTimeout) {
      titulo = 'Tiempo de espera agotado';
      detalle = estado.esIOS
        ? 'Safari tardó demasiado en responder. Busca un lugar con mejor señal o elige tu zona manualmente.'
        : 'Tu equipo no logró fijar la posición. En laptops sin GPS es normal: usa una zona manual.';
    } else if (perfil === 'rapida') {
      titulo = 'Lectura aproximada no disponible';
      detalle = detalle + ' Puedes continuar con el plan B manual.';
    }

    el.errorTitulo.textContent = titulo;
    el.errorTexto.textContent = detalle;
    el.errorBanner.hidden = false;
    mostrarSelector('No bloqueamos tu reporte: elige una zona manualmente para continuar.');
    registrar('Error de geolocalización: ' + (error && error.message ? error.message : 'desconocido'), 'error');
    actualizarHeroTrasError(perfil);
  }

  function actualizarHeroTrasError(perfil) {
    if (estado.permiso === 'denied') {
      el.heroEstado.textContent = 'Permiso bloqueado · plan B disponible';
    } else if (perfil === 'rapida') {
      el.heroEstado.textContent = 'Lectura aproximada fallida';
    } else {
      el.heroEstado.textContent = 'Sin coordenadas · plan B disponible';
    }
  }

  function ocultarError() {
    el.errorBanner.hidden = true;
  }

  function mensajeReactivacion() {
    if (estado.esIOS) {
      return 'Reactivar en Ajustes → Safari → Ubicación, o en Ajustes → GeoConsciente si usas la PWA instalada.';
    }
    if (estado.esAndroid) {
      return 'Toca el candado junto a la URL → Permisos → Ubicación → Permitir.';
    }
    return 'Haz clic en el icono de permisos de la barra de direcciones y habilita la ubicación para este sitio.';
  }

  /* ---------------------------------------------------------------------
     Render de resultados
     --------------------------------------------------------------------- */
  function renderizarUbicacion(ubicacion) {
    var calidad = ubicacion.calidad;

    el.resCoords.textContent = Geo.formatearCoordenadas(ubicacion.latitud, ubicacion.longitud);
    el.resPrecision.textContent = Geo.formatearPrecision(ubicacion.precisionMetros);
    el.resBadge.textContent = calidad.etiqueta;
    el.resBadge.setAttribute('data-nivel', calidad.nivel);
    el.resNota.textContent = calidad.descripcion;
    el.resFuente.textContent = ubicacion.precisionMetros < 30 ? 'GPS / GNSS (alta precisión)' : 'Wi-Fi / IP (aproximada)';
    el.resHora.textContent = formatearHora(ubicacion.timestamp);
    el.resAltitud.textContent = ubicacion.altitud === null ? 'No disponible' : ubicacion.altitud + ' m';

    el.resBarra.style.width = calcularAnchoBarra(ubicacion.precisionMetros) + '%';
    el.resBarra.setAttribute('data-nivel', calidad.nivel);

    el.resEnlace.href =
      'https://www.openstreetmap.org/?mlat=' + ubicacion.latitud +
      '&mlon=' + ubicacion.longitud +
      '#map=17/' + ubicacion.latitud + '/' + ubicacion.longitud;

    el.resultado.hidden = false;
    ocultarError();
    ocultarSelector();
    el.resultado.scrollIntoView({ behavior: 'smooth', block: 'nearest' });

    estado.ubicacion = {
      tipo: 'gps',
      latitud: ubicacion.latitud,
      longitud: ubicacion.longitud,
      precisionMetros: ubicacion.precisionMetros,
      etiqueta: calidad.etiqueta,
      timestamp: ubicacion.timestamp
    };

    estado.consentimientoEnSesion = true;

    actualizarResumen();
    actualizarEstadoPermiso(estado.permiso);
    el.heroEstado.textContent = 'Ubicación lista · ' + Geo.formatearPrecision(ubicacion.precisionMetros);
  }

  function renderizarLecturaRapida(ubicacion) {
    el.rapidaVacia.hidden = true;
    el.rapidaResultado.hidden = false;
    el.rapidaCoords.textContent = Geo.formatearCoordenadas(ubicacion.latitud, ubicacion.longitud);
    el.rapidaBadge.textContent = ubicacion.calidad.nivel === 'alta' ? 'Alta' : 'Aproximada';
    el.rapidaBadge.setAttribute('data-nivel', ubicacion.calidad.nivel);
    el.rapidaMeta.textContent =
      Geo.formatearPrecision(ubicacion.precisionMetros) + ' · ' + ubicacion.calidad.etiqueta +
      ' · ' + formatearHora(ubicacion.timestamp);
  }

  function calcularAnchoBarra(metros) {
    if (!isFinite(metros)) {
      return 100;
    }
    return Math.min(100, Math.max(4, (metros / UMBRAL) * 100));
  }

  function formatearHora(timestamp) {
    return new Date(timestamp).toLocaleTimeString('es', {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit'
    });
  }

  /* ---------------------------------------------------------------------
     Plan B: selector manual de zona
     --------------------------------------------------------------------- */
  function mostrarSelector(motivo) {
    el.selector.hidden = false;
    el.selectorMotivo.textContent = motivo;
    el.selectorHint.textContent = estado.permiso === 'denied' ? mensajeReactivacion() : '';
    el.selectorHint.setAttribute('data-tono', estado.permiso === 'denied' ? 'warn' : 'neutro');

    if (!el.selectZona.value) {
      el.selectZona.value = '';
    }

    requestAnimationFrame(function () {
      el.selectZona.focus({ preventScroll: true });
      el.selector.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    });
  }

  function ocultarSelector() {
    el.selector.hidden = true;
    el.selectorHint.textContent = '';
  }

  function guardarZonaManual(evento) {
    evento.preventDefault();

    var zona = el.selectZona.value;
    var referencia = el.inputReferencia.value.trim();

    if (!zona) {
      el.selectorHint.textContent = 'Elige una zona de la lista para continuar.';
      el.selectorHint.setAttribute('data-tono', 'error');
      el.selectZona.focus();
      return;
    }

    if (zona === 'Otra ciudad / zona') {
      zona = el.inputOtra.value.trim();
      if (!zona) {
        el.selectorHint.textContent = 'Escribe el nombre de tu ciudad o zona.';
        el.selectorHint.setAttribute('data-tono', 'error');
        el.inputOtra.focus();
        return;
      }
    }

    estado.ubicacion = {
      tipo: 'manual',
      zona: zona,
      referencia: referencia,
      timestamp: Date.now(),
      precisionMetros: null
    };

    actualizarResumen();
    ocultarSelector();
    ocultarError();
    el.resultado.hidden = true;
    el.heroEstado.textContent = 'Zona manual adjunta';
    el.reporteHint.textContent = 'Zona manual guardada. Ya puedes enviar el reporte.';
    el.reporteHint.removeAttribute('data-error');
    registrar('Zona manual guardada: ' + zona + (referencia ? ' · ' + referencia : '') + '.', 'ok');
  }

  /* ---------------------------------------------------------------------
     Resumen de ubicación y reporte
     --------------------------------------------------------------------- */
  function actualizarResumen() {
    var u = estado.ubicacion;

    if (!u) {
      el.resumen.setAttribute('data-estado', 'pendiente');
      el.resumenValor.textContent = 'Todavía no has adjuntado una ubicación.';
      el.btnQuitarUbicacion.hidden = true;
      el.reporteHint.textContent = 'Describe la incidencia y adjunta una ubicación para enviar.';
      el.reporteHint.removeAttribute('data-error');
      return;
    }

    el.resumen.setAttribute('data-estado', 'adjunta');
    el.btnQuitarUbicacion.hidden = false;

    if (u.tipo === 'gps') {
      el.resumenValor.textContent =
        Geo.formatearCoordenadas(u.latitud, u.longitud) + ' · ' +
        Geo.formatearPrecision(u.precisionMetros) + ' · ' + u.etiqueta;
      el.reporteHint.textContent = 'Coordenadas adjuntas (' + Geo.formatearPrecision(u.precisionMetros) + '). Listo para enviar.';
    } else {
      el.resumenValor.textContent =
        u.zona + (u.referencia ? ' · ' + u.referencia : '') + ' · Zona manual (sin GPS)';
      el.reporteHint.textContent = 'Zona manual adjunta. Listo para enviar.';
    }

    el.reporteHint.removeAttribute('data-error');
  }

  function enviarReporte(evento) {
    evento.preventDefault();

    var descripcion = el.descripcion.value.trim();

    if (!descripcion) {
      el.reporteHint.textContent = 'Escribe una breve descripción de la incidencia.';
      el.reporteHint.setAttribute('data-error', 'true');
      el.descripcion.focus();
      return;
    }

    if (!estado.ubicacion) {
      el.reporteHint.textContent = 'Adjunta tu ubicación o elige una zona manual antes de enviar.';
      el.reporteHint.setAttribute('data-error', 'true');
      document.getElementById('card-solicitud').scrollIntoView({ behavior: 'smooth', block: 'start' });
      return;
    }

    estado.reportes += 1;

    var item = document.createElement('li');
    item.className = 'reporte-item';

    var titulo = document.createElement('p');
    titulo.className = 'reporte-item-titulo';
    titulo.textContent = 'Reporte #' + estado.reportes + ' · ' + descripcion;

    var meta = document.createElement('p');
    meta.className = 'reporte-item-meta';
    meta.textContent = (estado.ubicacion.tipo === 'gps'
      ? Geo.formatearCoordenadas(estado.ubicacion.latitud, estado.ubicacion.longitud) +
        ' · ' + Geo.formatearPrecision(estado.ubicacion.precisionMetros)
      : estado.ubicacion.zona + ' · manual') +
      ' · Encolado localmente (demo)';

    var estadoTag = document.createElement('span');
    estadoTag.className = 'reporte-item-tag';
    estadoTag.textContent = 'En cola';

    item.appendChild(titulo);
    item.appendChild(meta);
    item.appendChild(estadoTag);
    el.listaReportes.insertBefore(item, el.listaReportes.firstChild);

    el.descripcion.value = '';
    registrar('Reporte #' + estado.reportes + ' generado con ubicación ' +
      (estado.ubicacion.tipo === 'gps' ? 'GPS' : 'manual') + '.', 'ok');

    el.reporteHint.textContent = 'Reporte generado. En una PWA real se encolaría en IndexedDB.';
    el.reporteHint.removeAttribute('data-error');
  }

  /* ---------------------------------------------------------------------
     Bitácora
     --------------------------------------------------------------------- */
  function registrar(mensaje, tipo) {
    estado.eventos += 1;

    var vacio = el.log.querySelector('.log-vacio');
    if (vacio) {
      vacio.remove();
    }

    var item = document.createElement('li');
    item.className = 'log-item log-' + (tipo || 'info');

    var hora = document.createElement('span');
    hora.className = 'log-hora';
    hora.textContent = new Date().toLocaleTimeString('es', { hour12: false });

    var punto = document.createElement('span');
    punto.className = 'log-dot';
    punto.setAttribute('aria-hidden', 'true');

    var texto = document.createElement('span');
    texto.className = 'log-texto';
    texto.textContent = mensaje;

    item.appendChild(hora);
    item.appendChild(punto);
    item.appendChild(texto);
    el.log.insertBefore(item, el.log.firstChild);

    while (el.log.children.length > 14) {
      el.log.removeChild(el.log.lastElementChild);
    }

    el.logContador.textContent = estado.eventos + (estado.eventos === 1 ? ' evento' : ' eventos');
  }

  /* --------------------------------------------------------------------- */
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', iniciar);
  } else {
    iniciar();
  }
})();
