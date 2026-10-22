// Control de reproducción de la historia: reproducir/pausar, ±5 s, velocidad, reinicio y barra de posición.
// Solo habla con el reproductor; no conoce la escena ni el estado.
import { VELOCIDADES } from './historia.js';

const $ = (id) => document.getElementById(id);
const formato = (ms) => {
  const s = Math.floor(ms / 1000);
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;
};

export function crearTransporte({ reproductor, guion, iniciar }) {
  const barra = $('trBarra');
  const play = $('trPlay');
  const vel = $('trVel');
  let arrastrando = false;
  let velocidad = 1;

  barra.max = String(reproductor.duracion);

  // Marcas de los 4 actos sobre la barra
  const primeros = new Map();
  for (const p of guion) if (p.acto && !primeros.has(p.acto)) primeros.set(p.acto, p.t);
  const NOMBRES = { 1: 'Datos', 2: 'Contexto', 3: 'Decisión', 4: 'Acción' };
  $('trActos').innerHTML = [...primeros].map(([acto, t]) => `<span style="left:${(t / reproductor.duracion) * 100}%">${NOMBRES[acto] ?? acto}</span>`).join('');

  function pintar({ t, duracion, pausado, activo }) {
    if (!arrastrando) barra.value = String(t);
    $('trTiempo').textContent = `${formato(t)} / ${formato(duracion)}`;
    const enMarcha = activo && !pausado;
    play.textContent = enMarcha ? '⏸' : '▶';
    play.setAttribute('aria-label', enMarcha ? 'Pausar' : 'Reproducir');
  }

  function alternar() {
    if (!reproductor.enCurso()) iniciar();
    else reproductor.alternar();
  }

  play.addEventListener('click', alternar);
  $('trInicio').addEventListener('click', () => iniciar());
  $('trAtras').addEventListener('click', () => reproductor.adelantar(-5000));
  $('trAdelante').addEventListener('click', () => reproductor.adelantar(5000));
  vel.addEventListener('click', () => {
    velocidad = VELOCIDADES[(VELOCIDADES.indexOf(velocidad) + 1) % VELOCIDADES.length];
    reproductor.fijarVelocidad(velocidad);
    vel.textContent = `${velocidad}×`;
    vel.setAttribute('aria-label', `Velocidad de reproducción: ${velocidad}x`);
  });

  barra.addEventListener('pointerdown', () => { arrastrando = true; });
  window.addEventListener('pointerup', () => { arrastrando = false; });
  barra.addEventListener('input', () => {
    if (!reproductor.enCurso()) iniciar();
    reproductor.buscar(Number(barra.value));
  });

  document.addEventListener('keydown', (e) => {
    if (e.target.closest?.('input, textarea, select, button, a, [contenteditable]') || e.metaKey || e.ctrlKey || e.altKey) return;
    if ($('formulario').hidden === false) return;
    if (e.key === ' ') { e.preventDefault(); alternar(); }
    else if (e.key === 'ArrowRight' && reproductor.enCurso()) reproductor.adelantar(5000);
    else if (e.key === 'ArrowLeft' && reproductor.enCurso()) reproductor.adelantar(-5000);
  });

  return { pintar };
}
