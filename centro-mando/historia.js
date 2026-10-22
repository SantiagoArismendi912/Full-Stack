// Modo Historia: guion de ~70 s en 4 actos (Datos → Contexto → Decisión → Acción).
// Para ajustar la duración se editan los tiempos `t` (ms) sin tocar la escena.
// El reproductor usa un reloj virtual: se puede pausar, cambiar de velocidad y moverse en el tiempo.
export const GUION = [
  { t: 0, acto: 1, rotulo: 'Datos · Amanece en Brillo Total Servicios y el personal marca su entrada', camara: 'general' },
  { t: 800, acto: 1, evento: { tipo: 'HORA', hora: '06:30' } },
  { t: 1500, acto: 1, evento: { tipo: 'ENTRADA', personaId: 'luis', sedeId: 'oficina', distanciaM: 20 } },
  { t: 3000, acto: 1, evento: { tipo: 'ENTRADA', personaId: 'sofia', sedeId: 'colegio', distanciaM: 15 } },
  { t: 4500, acto: 1, evento: { tipo: 'HORA', hora: '07:00' } },
  { t: 5000, acto: 1, evento: { tipo: 'ENTRADA', personaId: 'marta', sedeId: 'comercial', distanciaM: 30 } },
  { t: 6500, acto: 1, evento: { tipo: 'ENTRADA', personaId: 'carla', sedeId: 'comercial', distanciaM: 10 } },
  { t: 8000, acto: 1, evento: { tipo: 'ENTRADA', personaId: 'diego', sedeId: 'residencial', distanciaM: 25 } },
  { t: 10000, acto: 1, evento: { tipo: 'CRM_AVANZAR' } },
  { t: 12000, acto: 1, evento: { tipo: 'HORA', hora: '08:00' } },
  { t: 15000, acto: 2, rotulo: 'Contexto · Jornexa detecta lo que necesita atención', camara: 'clinica' },
  { t: 16000, acto: 2, evento: { tipo: 'ENTRADA', personaId: 'ana', sedeId: 'clinica', distanciaM: 180 } },
  { t: 19500, acto: 2, camara: 'comercial', evento: { tipo: 'HORA', hora: '10:15' } },
  { t: 20500, acto: 2, evento: { tipo: 'INCIDENCIA', sedeId: 'comercial', id: 'fuga-comercial', texto: 'Pérdida de agua en el baño del segundo piso.' } },
  { t: 24000, acto: 2, camara: 'colegio', evento: { tipo: 'CONSUMO', sedeId: 'colegio', insumo: 'desinfectante', cantidad: 3 } },
  { t: 27000, acto: 2, camara: 'general', evento: { tipo: 'CRM_AVANZAR' } },
  { t: 30000, acto: 3, rotulo: 'Decisión · El copiloto propone; la persona aprueba', evento: { tipo: 'HORA', hora: '11:00' } },
  { t: 32000, acto: 3, camara: 'clinica', aprobar: 'zona-ana' },
  { t: 37000, acto: 3, camara: 'colegio', aprobar: 'pedido-colegio-desinfectante' },
  { t: 43000, acto: 3, camara: 'comercial', aprobar: 'inc-fuga-comercial' },
  { t: 50000, acto: 4, rotulo: 'Acción · Jornexa ejecuta lo aprobado y deja registro', camara: 'general', evento: { tipo: 'CRM_AVANZAR' } },
  { t: 54000, acto: 4, camara: 'lote', aprobar: 'crm-lote' },
  { t: 62000, acto: 4, camara: 'general', evento: { tipo: 'HORA', hora: '18:00' } },
  { t: 70000, acto: 4, fin: true },
];

export const DURACION = Math.max(...GUION.map((p) => p.t));
export const VELOCIDADES = [0.5, 1, 2];

export const relojReal = {
  ahora: () => performance.now(),
  pedirCuadro: (fn) => requestAnimationFrame(fn),
  cancelarCuadro: (id) => cancelAnimationFrame(id),
};

// Reproductor con reloj virtual: la historia avanza con `t` (ms de historia), que se puede pausar,
// acelerar y mover. Para ir a un instante se reinicia el estado y se reaplican los pasos hasta ahí.
export function crearReproductor({
  guion = GUION, despachar, aprobar, alPaso = () => {}, alTerminar = () => {}, alTiempo = () => {}, reloj = relojReal,
}) {
  const pasos = [...guion].sort((a, b) => a.t - b.t);
  const duracion = pasos.at(-1).t;
  let siguiente = 0;
  let activo = false;
  let pausado = false;
  let velocidad = 1;
  let t = 0;
  let ultimo = 0;
  let cuadro = null;

  const avisar = () => alTiempo({ t, duracion, pausado, velocidad, activo });

  function detenerReloj() {
    if (cuadro !== null) reloj.cancelarCuadro(cuadro);
    cuadro = null;
  }

  function ejecutar(paso, rapido = false) {
    siguiente += 1;
    if (paso.evento) despachar(paso.evento);
    if (paso.aprobar) aprobar(paso.aprobar, { rapido });
    alPaso(paso, { rapido });
    if (paso.fin) {
      activo = false;
      pausado = false;
      t = duracion;
      detenerReloj();
      avisar();
      alTerminar();
    }
  }

  function cuadroSiguiente(ahora) {
    cuadro = null;
    if (!activo || pausado) return;
    t = Math.min(duracion, t + Math.min(ahora - ultimo, 100) * velocidad); // tope: al volver a la pestaña no salta
    ultimo = ahora;
    while (activo && siguiente < pasos.length && pasos[siguiente].t <= t) ejecutar(pasos[siguiente]);
    if (activo) {
      avisar();
      cuadro = reloj.pedirCuadro(cuadroSiguiente);
    }
  }

  function correr() {
    detenerReloj();
    ultimo = reloj.ahora();
    cuadro = reloj.pedirCuadro(cuadroSiguiente);
  }

  function preparar() {
    detenerReloj();
    siguiente = 0;
    t = 0;
    pausado = false;
    despachar({ tipo: 'REINICIAR' });
    activo = true;
  }

  // Reaplica de golpe los pasos hasta `ms`, sin cursor ni cámara; no ejecuta el cierre.
  function reproducirHasta(ms) {
    let conCamara = null;
    while (siguiente < pasos.length && pasos[siguiente].t <= ms && !pasos[siguiente].fin) {
      const paso = pasos[siguiente];
      if (paso.camara) conCamara = paso.camara;
      ejecutar(paso, true);
    }
    t = ms;
    if (conCamara) alPaso({ camara: conCamara }, { rapido: false });
  }

  return {
    duracion,
    iniciar() {
      preparar();
      correr();
      avisar();
    },
    iniciarManual() {
      preparar();
    },
    pausar() {
      if (!activo || pausado) return;
      pausado = true;
      detenerReloj();
      avisar();
    },
    reanudar() {
      if (!activo || !pausado) return;
      pausado = false;
      correr();
      avisar();
    },
    alternar() {
      if (pausado) this.reanudar(); else this.pausar();
    },
    buscar(ms) {
      if (!activo) return;
      const destino = Math.min(Math.max(0, ms), duracion - 1);
      if (destino < t) {
        siguiente = 0;
        despachar({ tipo: 'REINICIAR' });
      }
      reproducirHasta(destino);
      ultimo = reloj.ahora();
      avisar();
    },
    adelantar(deltaMs) {
      this.buscar(t + deltaMs);
    },
    fijarVelocidad(v) {
      velocidad = v;
      avisar();
    },
    avanzarActo() {
      if (!activo || siguiente >= pasos.length) return;
      const acto = pasos[siguiente].acto;
      while (activo && siguiente < pasos.length && pasos[siguiente].acto === acto) ejecutar(pasos[siguiente], true);
    },
    saltar() {
      if (!activo) return;
      detenerReloj();
      while (activo && siguiente < pasos.length) ejecutar(pasos[siguiente], true);
    },
    detener() {
      detenerReloj();
      activo = false;
      pausado = false;
      avisar();
    },
    enCurso: () => activo,
    estaPausado: () => pausado,
    tiempo: () => t,
    actoActual: () => (siguiente === 0 ? 0 : pasos[siguiente - 1].acto),
  };
}

export const CLAVE_VISTA = 'jornexa-centro-mando-historia-vista';

export function debeIniciarHistoria(almacen, { modoVideo = false } = {}) {
  if (modoVideo) return true;
  try {
    return almacen?.getItem(CLAVE_VISTA) !== '1';
  } catch {
    return true;
  }
}

export function marcarHistoriaVista(almacen) {
  try {
    almacen?.setItem(CLAVE_VISTA, '1');
  } catch {
    // Almacenamiento no disponible (navegación privada): la historia se repetirá en la próxima visita.
  }
}
