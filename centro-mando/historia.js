// Modo Historia: guion de ~90 s sincronizado con la voz: intro (problema y Jornexa) y 4 actos (Datos → Contexto → Decisión → Acción).
// Para ajustar la duración se editan los tiempos `t` (ms) sin tocar la escena.
// El reproductor usa un reloj virtual: se puede pausar, cambiar de velocidad y moverse en el tiempo.
export const GUION = [
  // Sincronizado con la locución de Nyla (assets/demo-audio.mp3): cada bloque de voz abre un acto.
  { t: 0, acto: 0, rotulo: 'El problema · Notas, mensajes y planillas: nadie ve todo', camara: 'general' },
  { t: 17200, acto: 0, rotulo: 'Jornexa · Gestión conectada: un centro de mando vivo', camara: 'general' },
  { t: 27800, acto: 1, rotulo: 'Datos · Amanece y el personal marca su entrada', camara: 'general' },
  { t: 28300, acto: 1, evento: { tipo: 'HORA', hora: '06:30' } },
  { t: 29500, acto: 1, evento: { tipo: 'ENTRADA', personaId: 'luis', sedeId: 'oficina', distanciaM: 20 } },
  { t: 31200, acto: 1, evento: { tipo: 'ENTRADA', personaId: 'sofia', sedeId: 'colegio', distanciaM: 15 } },
  { t: 32800, acto: 1, evento: { tipo: 'HORA', hora: '07:00' } },
  { t: 34500, acto: 1, evento: { tipo: 'ENTRADA', personaId: 'marta', sedeId: 'comercial', distanciaM: 30 } },
  { t: 35800, acto: 1, evento: { tipo: 'ENTRADA', personaId: 'carla', sedeId: 'comercial', distanciaM: 10 } },
  { t: 37200, acto: 1, evento: { tipo: 'ENTRADA', personaId: 'diego', sedeId: 'residencial', distanciaM: 25 } },
  { t: 38800, acto: 1, evento: { tipo: 'CRM_AVANZAR' } },
  { t: 40000, acto: 1, evento: { tipo: 'HORA', hora: '08:00' } },
  { t: 41260, acto: 2, rotulo: 'Contexto · Jornexa detecta lo que necesita atención', camara: 'clinica' },
  { t: 45500, acto: 2, evento: { tipo: 'ENTRADA', personaId: 'ana', sedeId: 'clinica', distanciaM: 180 } },
  { t: 47300, acto: 2, camara: 'comercial', evento: { tipo: 'HORA', hora: '10:15' } },
  { t: 47600, acto: 2, evento: { tipo: 'INCIDENCIA', sedeId: 'comercial', id: 'fuga-comercial', texto: 'Pérdida de agua en el baño del segundo piso.' } },
  { t: 49700, acto: 2, camara: 'colegio' },
  { t: 49900, acto: 2, evento: { tipo: 'CONSUMO', sedeId: 'colegio', insumo: 'desinfectante', cantidad: 3 } },
  { t: 51400, acto: 2, camara: 'general', evento: { tipo: 'CRM_AVANZAR' } },
  { t: 52900, acto: 3, rotulo: 'Decisión · El copiloto propone; tú tienes la última palabra', evento: { tipo: 'HORA', hora: '11:00' } },
  { t: 54000, acto: 3, camara: 'clinica' },
  { t: 54500, acto: 3, aprobar: 'zona-ana' },
  { t: 58200, acto: 3, camara: 'colegio' },
  { t: 59000, acto: 3, aprobar: 'pedido-colegio-desinfectante' },
  { t: 61000, acto: 3, camara: 'comercial' },
  { t: 61900, acto: 3, aprobar: 'inc-fuga-comercial' },
  { t: 64030, acto: 4, rotulo: 'Acción · Jornexa ejecuta lo aprobado y deja registro', camara: 'general' },
  { t: 64500, acto: 4, evento: { tipo: 'CRM_AVANZAR' } },
  { t: 70800, acto: 4, camara: 'lote' },
  { t: 72300, acto: 4, aprobar: 'crm-lote' },
  { t: 76700, acto: 4, rotulo: 'Jornexa · Software que entiende, propone y deja la decisión a las personas', camara: 'general' },
  { t: 77000, acto: 4, evento: { tipo: 'HORA', hora: '18:00' } },
  { t: 88500, acto: 4, fin: true },
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
