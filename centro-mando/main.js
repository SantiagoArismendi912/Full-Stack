// Arranque: almacén de estado, escena 3D (o respaldo sin 3D), HUD, efectos y Modo Historia.
import { crearTienda } from './estado.js';
import { conectarEfectos, escenaNula } from './efectos.js';
import { crearHud } from './hud.js';
import { GUION, crearReproductor, debeIniciarHistoria, marcarHistoriaVista } from './historia.js';
import { crearTransporte } from './transporte.js';
import { crearVoz } from './voz.js';
import { subtituloEn } from './subtitulos.js';
import { iniciarFormulario } from './formulario.js';

const params = new URLSearchParams(location.search);
const modoVideo = params.get('video') === '1';
// En celular la escena se aligera; al grabar video (aun en formato vertical) se usa calidad completa.
const ligera = !modoVideo && matchMedia('(max-width: 767px)').matches;
const reducirMovimiento = matchMedia('(prefers-reduced-motion: reduce)').matches;
if (modoVideo) document.body.classList.add('modo-video');
if (params.get('solo-escena') === '1') document.body.classList.add('solo-escena');

let almacen = null;
try { almacen = window.localStorage; } catch { almacen = null; }

// Tema: claro por defecto; el oscuro es una preferencia de quien mira.
const CLAVE_TEMA = 'jornexa-centro-mando-tema';
function aplicarTema(tema) {
  document.documentElement.dataset.theme = tema;
  try { almacen?.setItem(CLAVE_TEMA, tema); } catch { /* sin almacenamiento */ }
}
try { if (almacen?.getItem(CLAVE_TEMA) === 'dark') document.documentElement.dataset.theme = 'dark'; } catch { /* sin almacenamiento */ }
document.getElementById('btnTema').addEventListener('click', () => {
  aplicarTema(document.documentElement.dataset.theme === 'dark' ? 'light' : 'dark');
});

const tienda = crearTienda();
let escena = escenaNula;

const hud = crearHud({ tienda, obtenerEscena: () => escena, alCambiarModo: (modo) => cambiarModo(modo) });

conectarEfectos(tienda, {
  moverCamioneta: (sedeId) => escena.moverCamioneta(sedeId),
  moverPersona: (personaId, sedeId) => escena.moverPersona(personaId, sedeId),
});

tienda.suscribir((estado) => {
  escena.actualizar(estado);
  hud.renderizar(estado);
});

async function cargarEscena() {
  if (params.get('sin3d') === '1') throw new Error('3D desactivado por parámetro');
  const modulo = await import('./escena.js');
  if (!modulo.soportaWebGL()) throw new Error('WebGL no disponible');
  return modulo.crearEscena(document.getElementById('escena'), {
    ligera, reducirMovimiento, alSeleccionar: (id) => hud.abrirSede(id),
  });
}

try {
  escena = await cargarEscena();
  escena.actualizar(tienda.obtener());
} catch (error) {
  console.warn('[Jornexa demo] usando respaldo sin 3D:', error.message);
  escena = escenaNula;
  document.body.classList.add('sin-3d');
}

hud.renderizar(tienda.obtener());

// ---------- Modo Historia ----------
let transporte = null;
// Sin voz en el modo video (grabación) ni con movimiento reducido, donde la historia avanza por actos.
const voz = crearVoz({ almacen, deshabilitada: modoVideo || reducirMovimiento });
const cajaSubtitulo = document.getElementById('subtitulo');

// Subtítulos (botón CC): sin preferencia, en celular solo se ven si la voz está silenciada o bloqueada;
// en escritorio siempre. Un toque en CC fija la preferencia (se recuerda).
const CLAVE_CC = 'jornexa-centro-mando-cc';
let prefCC = null;
try { prefCC = almacen?.getItem(CLAVE_CC); } catch { prefCC = null; }
const esCelular = () => matchMedia('(max-width: 767px)').matches;
const botonCC = document.getElementById('trCC');
if (modoVideo || reducirMovimiento) botonCC.hidden = true;
const ccVisible = () => (prefCC === 'on' ? true : prefCC === 'off' ? false : esCelular() ? !voz.conVoz() : true);
let ultimoCC = null;
function pintarCC() {
  const v = ccVisible();
  if (v === ultimoCC) return;
  ultimoCC = v;
  botonCC.setAttribute('aria-pressed', String(v));
  botonCC.classList.toggle('apagado', !v);
}
let ultimaInfo = null;
function pintarSubtitulo() {
  pintarCC();
  const texto = ultimaInfo?.activo && !modoVideo && !reducirMovimiento && ccVisible() ? subtituloEn(ultimaInfo.t) : '';
  if (cajaSubtitulo.textContent !== texto) { cajaSubtitulo.textContent = texto; cajaSubtitulo.hidden = !texto; }
}
// El primer toque en la página desbloquea el audio y apaga los subtítulos automáticos antes de que llegue el «click»:
// se recuerda lo que se veía al pulsar para que CC haga lo que la persona espera.
let vistoAlPulsar = null;
botonCC.addEventListener('pointerdown', () => { vistoAlPulsar = ultimoCC; });
botonCC.addEventListener('click', () => {
  prefCC = (vistoAlPulsar ?? ultimoCC) ? 'off' : 'on';
  vistoAlPulsar = null;
  try { almacen?.setItem(CLAVE_CC, prefCC); } catch { /* sin almacenamiento */ }
  pintarSubtitulo(); // también con la historia en pausa
});

// Copiloto plegable en celular: un toque en el encabezado lo abre o lo cierra.
const panelCopiloto = document.getElementById('copiloto');
panelCopiloto.querySelector('header').addEventListener('click', () => {
  if (!esCelular()) return;
  const abierto = panelCopiloto.classList.toggle('abierto');
  document.body.classList.toggle('copiloto-abierto', abierto);
});
const reproductor = crearReproductor({
  alTiempo: (info) => {
    transporte?.pintar(info);
    voz.sincronizar(info);
    ultimaInfo = info;
    pintarSubtitulo();
  },
  despachar: tienda.despachar,
  aprobar: (id, opciones) => hud.aprobarConCursor(id, opciones),
  alPaso: (paso, { rapido }) => {
    if (paso.rotulo) hud.mostrarRotulo(paso.rotulo, paso.acto);
    if (paso.camara && !rapido) escena.enfocar(paso.camara);
  },
  alTerminar: () => {
    marcarHistoriaVista(almacen);
    escena.enfocar('general');
    hud.mostrarBotonActo(false);
    hud.cerrarSede();
    hud.mostrarCierre();
    hud.marcarModo('explorar');
    escena.autoGiro(!modoVideo);
  },
});

function iniciarHistoria() {
  document.getElementById('cierre').hidden = true;
  hud.cerrarSede();
  hud.marcarModo('historia');
  escena.autoGiro(false);
  if (reducirMovimiento) {
    reproductor.iniciarManual();
    hud.mostrarBotonActo(true);
    hud.mostrarAviso('Movimiento reducido: avanza la historia con «Siguiente acto».');
  } else {
    reproductor.iniciar();
  }
}

function cambiarModo(modo) {
  if (modo === 'historia') {
    iniciarHistoria();
    return;
  }
  reproductor.detener();
  hud.mostrarBotonActo(false);
  hud.marcarModo('explorar');
  escena.enfocar('general');
  escena.autoGiro(true);
}

transporte = crearTransporte({ reproductor, guion: GUION, iniciar: iniciarHistoria });
if (reducirMovimiento) document.getElementById('transporte').hidden = true; // con movimiento reducido se avanza por actos

document.getElementById('btnHistoria').addEventListener('click', () => cambiarModo('historia'));
document.getElementById('btnExplorar').addEventListener('click', () => cambiarModo('explorar'));
document.getElementById('btnSaltar').addEventListener('click', () => reproductor.saltar());
document.getElementById('btnSiguienteActo').addEventListener('click', () => reproductor.avanzarActo());

if (debeIniciarHistoria(almacen, { modoVideo })) {
  iniciarHistoria();
} else {
  hud.marcarModo('explorar');
  escena.autoGiro(true);
}

iniciarFormulario();

window.__jornexa = { tienda, reproductor, obtenerEscena: () => escena }; // solo para depuración desde el navegador
