// Formulario «Agenda una demo con DVelaris»: se abre desde cualquier enlace a #contacto.
// Destino de las solicitudes, en este orden:
//  1. Vista previa en claude.ai: base de datos del Artifact, documento solicitudes/<id> (cada persona escribe solo el suyo;
//     solo la dueña o el dueño del Artifact las lee).
//  2. Web pública: el endpoint de <meta name="jornexa-formulario" content="https://…"> (POST JSON).
//  3. Sin destino: se avisa con claridad y no se pierde lo escrito.
import { validarSolicitud, armarRegistro } from './solicitud.js';

const $ = (id) => document.getElementById(id);
const CAMPOS = ['nombre', 'organizacionOtra', 'empresa', 'rubro', 'telefono', 'email', 'origen', 'origenDetalle', 'comentario', 'sitio'];

// Se resuelve en segundo plano al cargar; use() puede tardar o devolver null.
function prepararDestinoClaude() {
  if (!window.claude?.use) return Promise.resolve(null);
  return Promise.all([window.claude.use('db'), window.claude.use('user')])
    .then(async ([db, user]) => {
      if (!db || !user) return null;
      const id = await user.id();
      if (!id) return null;
      // Un documento por persona: su última solicitud y las fechas de las anteriores.
      return {
        nombre: 'vista-previa',
        enviar: async (registro) => {
          const ref = db.doc(`solicitudes/${id}`);
          const previa = await ref.get();
          const fechas = previa.exists ? [...(previa.data().envios ?? [])] : [];
          await ref.set({ ...registro, envios: [...fechas, registro.fecha].slice(-10) });
        },
      };
    })
    .catch(() => null);
}

function destinoWeb() {
  const url = document.querySelector('meta[name="jornexa-formulario"]')?.content?.trim();
  if (!url) return null;
  return {
    nombre: 'web',
    enviar: async (registro) => {
      const r = await fetch(url, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(registro) });
      if (!r.ok) throw new Error(`HTTP ${r.status}`);
    },
  };
}

export function iniciarFormulario() {
  const capa = $('formulario');
  const form = $('formSolicitud');
  const destinoClaude = prepararDestinoClaude();
  let ultimoFoco = null;

  function leer() {
    const campos = {};
    for (const c of CAMPOS) campos[c] = $(`f-${c}`).value;
    campos.organizacion = form.querySelector('input[name="organizacion"]:checked')?.value ?? '';
    campos.personal = form.querySelector('input[name="personal"]:checked')?.value ?? '';
    campos.contactoPreferido = form.querySelector('input[name="contactoPreferido"]:checked')?.value ?? '';
    campos.consentimiento = $('f-consentimiento').checked;
    return campos;
  }

  function mostrarErrores(errores) {
    form.querySelectorAll('.error-campo').forEach((e) => { e.textContent = ''; });
    form.querySelectorAll('[aria-invalid]').forEach((e) => e.removeAttribute('aria-invalid'));
    let primero = null;
    for (const [campo, mensaje] of Object.entries(errores)) {
      const caja = $(`e-${campo}`);
      if (caja) caja.textContent = mensaje;
      const control = $(`f-${campo}`) ?? form.querySelector(`input[name="${campo}"]`);
      if (control) {
        control.setAttribute('aria-invalid', 'true');
        primero ??= control;
      }
    }
    primero?.focus();
  }

  function actualizarCondicionales() {
    const org = form.querySelector('input[name="organizacion"]:checked')?.value;
    $('g-organizacionOtra').hidden = org !== 'otra';
    $('g-empresa').hidden = org === 'independiente';
    const origen = $('f-origen').value;
    $('g-origenDetalle').hidden = !(origen === 'recomendacion' || origen === 'otro');
    $('l-origenDetalle').textContent = origen === 'recomendacion' ? '¿Quién te lo recomendó? (opcional)' : '¿Dónde nos viste? (opcional)';
  }

  function estado(texto, tipo = '') {
    const caja = $('formEstado');
    caja.textContent = texto;
    caja.className = `estado-envio ${tipo}`;
    caja.hidden = !texto;
  }

  function abrir() {
    ultimoFoco = document.activeElement;
    capa.hidden = false;
    form.hidden = false;
    $('formGracias').hidden = true;
    estado('');
    actualizarCondicionales();
    $('f-nombre').focus();
  }

  function cerrar() {
    capa.hidden = true;
    if (location.hash === '#contacto') history.replaceState(null, '', location.pathname + location.search);
    ultimoFoco?.focus?.();
  }

  // Cualquier enlace a #contacto abre el formulario.
  document.addEventListener('click', (e) => {
    const enlace = e.target.closest('a[href="#contacto"]');
    if (!enlace) return;
    e.preventDefault();
    $('cierre').hidden = true;
    abrir();
  });
  $('formCerrar').addEventListener('click', cerrar);
  $('formListo').addEventListener('click', cerrar);
  capa.addEventListener('click', (e) => { if (e.target === capa) cerrar(); });
  capa.addEventListener('keydown', (e) => { if (e.key === 'Escape') { e.stopPropagation(); cerrar(); } });
  form.addEventListener('change', actualizarCondicionales);

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const resultado = validarSolicitud(leer());
    if (resultado.spam) {
      // A un robot se le muestra el mismo agradecimiento, sin guardar nada.
      form.hidden = true;
      $('formGracias').hidden = false;
      return;
    }
    if (!resultado.ok) {
      mostrarErrores(resultado.errores);
      estado('Revisa los campos marcados.', 'es-aviso');
      return;
    }
    mostrarErrores({});
    const destino = (await destinoClaude) ?? destinoWeb();
    if (!destino) {
      estado('Esta copia de la demo todavía no está conectada a un destino de envío, así que la solicitud no se mandó. Tus datos siguen escritos en el formulario.', 'es-aviso');
      return;
    }
    const boton = $('formEnviar');
    boton.disabled = true;
    boton.textContent = 'Enviando…';
    estado('');
    try {
      await destino.enviar(armarRegistro(resultado.datos, { pagina: destino.nombre }));
      $('graciasNombre').textContent = resultado.datos.nombre.split(' ')[0];
      $('graciasCanal').textContent = { whatsapp: 'por WhatsApp', llamada: 'por teléfono', email: 'por email' }[resultado.datos.contactoPreferido];
      form.reset();
      form.hidden = true;
      $('formGracias').hidden = false;
      $('formListo').focus();
    } catch (error) {
      const codigo = error?.code;
      estado(codigo === 'invalid_argument' || codigo === 'not_granted'
        ? 'Tu acceso a esta vista no permite enviar solicitudes. Pide a quien te compartió la demo que te dé permiso de colaborador.'
        : 'No pudimos enviar tu solicitud. Revisa tu conexión e inténtalo de nuevo; lo que escribiste sigue aquí.', 'es-error');
    } finally {
      boton.disabled = false;
      boton.textContent = 'Solicitar demo';
    }
  });

  if (location.hash === '#contacto') abrir();
}
