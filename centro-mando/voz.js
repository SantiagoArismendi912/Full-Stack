// Voz y música del demo: un solo audio ya mezclado (locución de Nyla + música + efectos) que sigue al reloj de la historia.
// Pausar, mover la barra y cambiar la velocidad también afectan al audio. Si el navegador bloquea el sonido
// automático (pasa al abrir la página sin tocarla), se muestra un aviso para activarlo con un toque.
const ARCHIVO = 'assets/demo-audio.mp3';
const CLAVE_SILENCIO = 'jornexa-centro-mando-silencio';
const $ = (id) => document.getElementById(id);

export function crearVoz({ almacen = null, deshabilitada = false } = {}) {
  const audio = new Audio();
  audio.preload = 'auto';
  audio.src = ARCHIVO;
  window.__voz = audio; // solo para depuración desde el navegador
  let silencio = false;
  try { silencio = almacen?.getItem(CLAVE_SILENCIO) === '1'; } catch { /* sin almacenamiento */ }
  let bloqueado = false;      // el navegador rechazó play(): se reintenta tras un gesto de la persona
  let intentando = false;
  let ultimaCorreccion = 0;
  const boton = $('trSonido');
  const aviso = $('avisoSonido');

  function pintar() {
    boton.setAttribute('aria-pressed', String(!silencio));
    boton.setAttribute('aria-label', silencio ? 'Activar voz y música' : 'Silenciar voz y música');
    boton.title = silencio ? 'Activar voz y música' : 'Silenciar voz y música';
    boton.classList.toggle('apagado', silencio);
    if (silencio) aviso.hidden = true;
  }

  async function reproducir() {
    intentando = true;
    try {
      await audio.play();
      bloqueado = false;
      aviso.hidden = true;
    } catch {
      bloqueado = true;
      aviso.hidden = silencio;
    } finally {
      intentando = false;
    }
  }

  const desbloquear = () => { if (bloqueado) { bloqueado = false; aviso.hidden = true; } };
  window.addEventListener('pointerdown', desbloquear, { capture: true });
  window.addEventListener('keydown', desbloquear, { capture: true });
  aviso.addEventListener('click', () => { silencio = false; audio.muted = false; pintar(); bloqueado = false; reproducir(); });

  boton.addEventListener('click', () => {
    silencio = !silencio;
    audio.muted = silencio;
    try { almacen?.setItem(CLAVE_SILENCIO, silencio ? '1' : '0'); } catch { /* sin almacenamiento */ }
    pintar();
  });

  pintar();
  if (deshabilitada) boton.hidden = true;

  return {
    conVoz: () => !silencio && !bloqueado && !deshabilitada,   // la persona está oyendo la voz (no silenciada ni bloqueada)
    // Se llama en cada cuadro con el estado del reproductor: {t (ms), pausado, velocidad, activo}
    sincronizar({ t, pausado, velocidad, activo }) {
      if (deshabilitada) return;
      audio.muted = silencio;
      audio.playbackRate = velocidad;
      if (!activo) {
        if (!audio.paused) audio.pause();
        aviso.hidden = true;
        return;
      }
      // Corrige solo desvíos grandes y no más de una vez cada 0,6 s: reposicionar en cada cuadro impediría que suene.
      const objetivo = t / 1000;
      const ahora = performance.now();
      if (!audio.seeking && audio.readyState >= 2 && Math.abs(audio.currentTime - objetivo) > 0.4 && ahora - ultimaCorreccion > 600) {
        ultimaCorreccion = ahora;
        try { audio.currentTime = Math.min(objetivo, audio.duration || objetivo); } catch { /* sin metadatos aún */ }
      }
      if (!pausado && audio.paused && !intentando && !bloqueado) reproducir();
      else if (pausado && !audio.paused) audio.pause();
    },
  };
}
