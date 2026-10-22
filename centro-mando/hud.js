// HUD: indicadores, copiloto, panel de sede, línea de tiempo, chat, rótulos y cursor simulado.
// No conoce Three.js: habla con la escena solo a través de obtenerEscena().
import { calcularIndicadores, estadoSede, buscarSede, buscarPersona } from './estado.js';
import { detectar, buscarPropuesta, responderChat } from './copiloto.js';
import { PERSONAL, NOMBRES_INSUMO, NOMBRES_ROL, NOMBRES_TIPO, ETAPAS_CRM, LOTE } from './datos-demo.js';

const $ = (id) => document.getElementById(id);
const esc = (t) => String(t ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const pausa = (ms) => new Promise((r) => setTimeout(r, ms));
const esCelular = () => matchMedia('(max-width: 767px)').matches;

const ETIQUETA_ESTADO = {
  reposo: 'Sin actividad', activo: 'Operando con normalidad', alerta: 'Requiere atención',
  incidencia: 'Incidencia abierta', obra: 'Prospecto en CRM',
};
const NIVEL_PUNTO = {
  ENTRADA: 'ok', SALIDA: 'ok', INCIDENCIA: 'bad', CONSUMO: 'warn', SIN_SALIDA: 'warn',
  CRM_AVANZAR: 'info', CONVERTIR_CLIENTE: 'info',
};
const PLANIFICADOS = PERSONAL.filter((p) => p.rol === 'limpieza').length;

function minutos(hora) {
  const [h, m] = hora.split(':').map(Number);
  return h * 60 + m;
}
const porcentajeDia = (hora) => Math.min(100, Math.max(0, ((minutos(hora) - 360) / 960) * 100));

export function crearHud({ tienda, obtenerEscena, alCambiarModo = () => {} }) {
  let sedeAbierta = null;
  let firmaPropuestas = null;

  // ---------- Indicadores ----------
  function escribirKpi(id, valor) {
    const el = $(id);
    if (el.textContent === String(valor)) return;
    el.textContent = valor;
    el.classList.remove('cambio');
    void el.offsetWidth; // reinicia la animación
    el.classList.add('cambio');
  }

  function renderizarIndicadores(estado) {
    const k = calcularIndicadores(estado);
    escribirKpi('kpiJornadas', k.jornadasActivas);
    $('kpiJornadasNota').textContent = `de ${PLANIFICADOS} planificadas`;
    escribirKpi('kpiCumplimiento', `${k.cumplimiento} %`);

    escribirKpi('kpiIncidencias', k.incidenciasAbiertas);
    $('kpiIncidenciasCaja').className = `kpi vidrio ${k.incidenciasAbiertas ? 'bad' : 'ok'}`;
    const conIncidencia = Object.entries(estado.incidencias).find(([, l]) => l.some((i) => i.estado !== 'resuelta'));
    $('kpiIncidenciasNota').textContent = conIncidencia ? buscarSede(conIncidencia[0]).nombre : 'Sin novedades';

    escribirKpi('kpiInsumos', k.insumosCriticos);
    $('kpiInsumosCaja').className = `kpi vidrio ${k.insumosCriticos ? 'warn' : 'ok'}`;
    const conFalta = Object.entries(estado.insumos).find(([, items]) => Object.values(items).some((i) => i.actual < i.minimo));
    $('kpiInsumosNota').textContent = conFalta ? buscarSede(conFalta[0]).nombre : 'Stock en orden';
  }

  // ---------- Copiloto ----------
  function renderizarCopiloto(estado) {
    const propuestas = detectar(estado);
    const firma = propuestas.map((p) => p.id).join('|');
    const contador = $('copilotoContador');
    contador.hidden = propuestas.length < 2;
    contador.textContent = `${propuestas.length} propuestas`;
    if (firma === firmaPropuestas) return; // evita reconstruir (y perder el foco) si nada cambió
    firmaPropuestas = firma;
    const lista = $('copilotoLista');
    if (!propuestas.length) {
      lista.innerHTML = '<p class="vacio">Todo en orden. Jornexa sigue observando la operación.</p>';
      return;
    }
    lista.innerHTML = propuestas.map((p) => `
      <article class="propuesta ${esc(p.tipo)}" data-propuesta="${esc(p.id)}">
        <h3>${esc(p.titulo)}</h3>
        <p>${esc(p.detalle)}</p>
        <div class="acciones">
          ${p.acciones.map((a, i) => `<button class="btn" type="button" data-accion="${i}">${esc(a.etiqueta)}</button>`).join('')}
          <button class="btn sec" type="button" data-ver="${esc(p.sedeId)}">Ver en mapa</button>
        </div>
      </article>`).join('');
  }

  $('copilotoLista').addEventListener('click', (e) => {
    const boton = e.target.closest('button');
    if (!boton) return;
    const id = boton.closest('[data-propuesta]')?.dataset.propuesta;
    if (boton.dataset.ver) {
      obtenerEscena().enfocar(boton.dataset.ver);
      abrirSede(boton.dataset.ver);
      return;
    }
    const propuesta = buscarPropuesta(tienda.obtener(), id);
    const accion = propuesta?.acciones[Number(boton.dataset.accion)];
    if (accion) tienda.despachar(accion.evento);
  });

  async function aprobarConCursor(id, { rapido = false } = {}) {
    if (!buscarPropuesta(tienda.obtener(), id)) return; // ya se resolvió (por ejemplo, la aprobó la persona)
    const boton = document.querySelector(`[data-propuesta="${CSS.escape(id)}"] [data-accion="0"]`);
    const cursor = $('cursorSimulado');
    const visible = boton && !rapido && !esCelular() && boton.getClientRects().length;
    if (visible) {
      boton.scrollIntoView({ block: 'nearest' });
      const r = boton.getBoundingClientRect();
      cursor.classList.add('visible');
      cursor.style.transform = `translate(${r.left + r.width * 0.55}px, ${r.top + r.height * 0.5}px)`;
      await pausa(750);
      boton.classList.add('presionado');
      await pausa(250);
    }
    const propuesta = buscarPropuesta(tienda.obtener(), id); // se vuelve a buscar: pudo cambiar durante la espera
    if (propuesta) tienda.despachar(propuesta.acciones[0].evento);
    if (visible) setTimeout(() => cursor.classList.remove('visible'), 600);
  }

  // ---------- Panel de sede ----------
  function filaPersona(estado, p) {
    const e = estado.personal[p.id];
    let marca = '<em class="neutro">Pendiente</em>';
    if (e.enTurno && e.fueraZona) marca = '<em class="warn">Fuera de zona</em>';
    else if (e.enTurno && e.sinSalida) marca = '<em class="warn">Sin salida</em>';
    else if (e.enTurno) marca = `<em>En sede · ${esc(e.entradaHora)}</em>`;
    return `<div class="fila"><span>${esc(p.nombre)} <small>· ${esc(NOMBRES_ROL[p.rol].toLowerCase())}</small></span>${marca}</div>`;
  }

  function renderizarSede(estado) {
    const sede = buscarSede(sedeAbierta);
    if (!sede) return;
    const est = estadoSede(estado, sede.id);
    const planificados = PERSONAL.filter((p) => p.sede === sede.id && (sede.id === 'base' || p.rol === 'limpieza'));
    const asignados = Object.values(estado.incidencias[sede.id] ?? []).filter((i) => i.responsable && i.estado !== 'resuelta')
      .map((i) => PERSONAL.find((p) => p.id === i.responsable)).filter((p) => p && !planificados.includes(p));
    const presentes = Object.values(estado.personal).filter((p) => p.enTurno && p.sede === sede.id).length;
    const abiertas = (estado.incidencias[sede.id] ?? []).filter((i) => i.estado !== 'resuelta');
    const insumos = estado.insumos[sede.id] ?? {};
    const actividad = estado.bitacora.filter((b) => b.sedeId === sede.id).slice(-3).reverse();

    $('sedeTipo').textContent = `Sede · ${NOMBRES_TIPO[sede.tipo]}`;
    $('sedeNombre').textContent = sede.id === LOTE.id && !estado.loteConvertido ? `${sede.nombre} · prospecto` : sede.nombre;

    let html = `<div class="estado ${est}">● ${ETIQUETA_ESTADO[est]}</div><div class="detalle">`;
    if (sede.id === LOTE.id && !estado.loteConvertido) {
      html += '<h3>Seguimiento comercial</h3>' + ETAPAS_CRM.map((etapa, i) => {
        const marca = i < estado.crmEtapa ? '<em>Hecho</em>' : i === estado.crmEtapa ? '<em class="warn">Actual</em>' : '<em class="neutro">Pendiente</em>';
        return `<div class="fila"><span>${esc(etapa)}</span>${marca}</div>`;
      }).join('');
    } else {
      html += `<div class="grilla">
        <div>Presentes<b>${presentes} / ${planificados.length}</b></div>
        <div>Horario<b>${esc(sede.horario)}</b></div>
        <div>Radio geocerca<b>${sede.radioM ? `${sede.radioM} m` : '—'}</b></div>
        <div>Incidencias<b>${abiertas.length}</b></div>
      </div>`;
      if (planificados.length || asignados.length) {
        html += '<h3>Personal</h3>' + [...planificados, ...asignados].map((p) => filaPersona(estado, p)).join('');
      }
      if (abiertas.length) {
        html += '<h3>Incidencias</h3>' + abiertas.map((i) => {
          const quien = i.responsable ? `<em class="warn">${esc(buscarPersona(i.responsable).nombre)} en camino</em>` : '<em class="bad">Abierta</em>';
          return `<div class="fila"><span>${esc(i.texto)}</span>${quien}</div>`;
        }).join('');
      }
      const items = Object.entries(insumos);
      if (items.length) {
        html += '<h3>Insumos</h3>' + items.map(([clave, it]) => {
          const ancho = Math.min(100, Math.round((it.actual / (it.minimo * 2)) * 100));
          const bajo = it.actual < it.minimo;
          return `<div class="fila"><span>${esc(NOMBRES_INSUMO[clave])} <small>${it.actual} / mín. ${it.minimo}</small></span><span class="barra-stock${bajo ? ' bajo' : ''}"><i style="width:${ancho}%"></i></span></div>`;
        }).join('');
      }
    }
    if (actividad.length) {
      html += '<h3>Última actividad</h3>' + actividad.map((b) => `<div class="fila"><span><small>${esc(b.hora)}</small> · ${esc(b.texto)}</span></div>`).join('');
    }
    $('panelSedeContenido').innerHTML = html + '</div>';
  }

  function abrirSede(id) {
    if (!buscarSede(id)) return;
    sedeAbierta = id;
    const panel = $('panelSede');
    panel.hidden = false;
    panel.classList.remove('expandida');
    document.body.classList.add('panel-abierto');
    renderizarSede(tienda.obtener());
  }

  function cerrarSede() {
    sedeAbierta = null;
    $('panelSede').hidden = true;
    document.body.classList.remove('panel-abierto');
  }

  $('cerrarSede').addEventListener('click', (e) => { e.stopPropagation(); cerrarSede(); });
  $('panelSede').addEventListener('click', (e) => {
    if (esCelular() && !e.target.closest('button')) $('panelSede').classList.toggle('expandida');
  });
  document.addEventListener('keydown', (e) => { if (e.key === 'Escape') { cerrarSede(); $('cierre').hidden = true; } });

  // ---------- Línea de tiempo ----------
  function renderizarLineaTiempo(estado) {
    $('avance').style.width = `${porcentajeDia(estado.hora)}%`;
    const eje = $('lineaTiempo');
    eje.querySelectorAll('.punto').forEach((p) => p.remove());
    estado.bitacora.forEach((b, i) => {
      const punto = document.createElement('button');
      punto.type = 'button';
      punto.className = `punto ${NIVEL_PUNTO[b.tipo] ?? 'hecho'}`;
      punto.style.left = `${porcentajeDia(b.hora)}%`;
      punto.title = `${b.hora} · ${b.texto}`;
      punto.setAttribute('aria-label', punto.title);
      punto.dataset.indice = i;
      eje.appendChild(punto);
    });
  }

  $('lineaTiempo').addEventListener('click', (e) => {
    const punto = e.target.closest('.punto');
    if (!punto) return;
    const entrada = tienda.obtener().bitacora[Number(punto.dataset.indice)];
    if (entrada?.sedeId) {
      obtenerEscena().enfocar(entrada.sedeId);
      abrirSede(entrada.sedeId);
    }
  });

  // ---------- Chat ----------
  function preguntar(texto) {
    const limpio = String(texto ?? '').trim().slice(0, 200);
    if (!limpio) return;
    const mensajes = $('chatMensajes');
    const yo = document.createElement('div');
    yo.className = 'msg yo';
    yo.textContent = limpio;
    const ia = document.createElement('div');
    ia.className = 'msg';
    ia.innerHTML = responderChat(limpio); // respuestas fijas del propio código, nunca texto del usuario
    mensajes.append(yo, ia);
    mensajes.scrollTop = mensajes.scrollHeight;
  }
  $('chatForm').addEventListener('submit', (e) => {
    e.preventDefault();
    preguntar($('chatEntrada').value);
    $('chatEntrada').value = '';
  });
  document.querySelectorAll('.chip[data-pregunta]').forEach((chip) => chip.addEventListener('click', () => preguntar(chip.dataset.pregunta)));

  // ---------- Rótulo, modos y cierre ----------
  let rotuloTimer;
  function mostrarRotulo(texto, acto) {
    const el = $('rotulo');
    clearTimeout(rotuloTimer);
    el.classList.add('oculto');
    rotuloTimer = setTimeout(() => {
      const [titulo, ...resto] = String(texto).split(' · ');
      el.innerHTML = `<span>${acto ? `${acto} · ` : ''}${esc(titulo)}</span>${esc(resto.join(' · '))}`;
      el.classList.remove('oculto');
    }, 250);
  }
  function ocultarRotulo() {
    clearTimeout(rotuloTimer); // evita que un rótulo pendiente reaparezca después de ocultarlo
    $('rotulo').classList.add('oculto');
  }

  function mostrarCierre() {
    $('cierre').hidden = false;
    $('ctaCierre').focus();
  }
  $('btnCierreExplorar').addEventListener('click', () => { $('cierre').hidden = true; alCambiarModo('explorar'); });
  $('cierre').addEventListener('click', (e) => { if (e.target.id === 'cierre') $('cierre').hidden = true; });

  function marcarModo(modo) {
    $('btnHistoria').setAttribute('aria-pressed', String(modo === 'historia'));
    $('btnExplorar').setAttribute('aria-pressed', String(modo !== 'historia'));
    $('btnSaltar').hidden = modo !== 'historia';
    if (modo !== 'historia') ocultarRotulo();
  }

  function mostrarBotonActo(visible) { $('btnSiguienteActo').hidden = !visible; }

  function mostrarAviso(texto) {
    const aviso = document.createElement('div');
    aviso.className = 'aviso';
    aviso.setAttribute('role', 'status');
    aviso.textContent = texto;
    document.body.appendChild(aviso);
    setTimeout(() => aviso.remove(), 2600);
  }

  // ---------- Render general ----------
  function renderizar(estado) {
    $('reloj').textContent = estado.hora;
    renderizarIndicadores(estado);
    renderizarCopiloto(estado);
    renderizarLineaTiempo(estado);
    if (sedeAbierta) renderizarSede(estado);
  }

  return { renderizar, mostrarRotulo, ocultarRotulo, aprobarConCursor, abrirSede, cerrarSede, mostrarCierre, mostrarBotonActo, marcarModo, mostrarAviso };
}
