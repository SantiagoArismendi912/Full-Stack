// Efectos asíncronos: lo aprobado se anima en la escena y, al terminar, se registra en el estado.
const pausa = (ms) => new Promise((r) => setTimeout(r, ms));

// Escena vacía con la misma forma que crearEscena (escena.js): se usa sin WebGL o antes de cargar el 3D.
export const escenaNula = {
  actualizar() {},
  enfocar() {},
  moverCamioneta: () => Promise.resolve(),
  moverPersona: () => Promise.resolve(),
  autoGiro() {},
  destruir() {},
};

async function animar(promesa) {
  try {
    await promesa();
  } catch (error) {
    console.error('[Jornexa demo] animación', error);
  }
}

export function conectarEfectos(tienda, escena, { esperar = pausa } = {}) {
  // Cada REINICIAR (inicio o salto en la línea de tiempo) invalida las animaciones que quedaron en vuelo.
  let generacion = 0;
  return tienda.suscribir(async (estado, evento) => {
    if (evento.tipo === 'REINICIAR') generacion += 1;
    const mia = generacion;
    if (evento.tipo === 'APROBAR_PEDIDO') {
      const pedido = estado.pedidos.at(-1);
      await animar(() => escena.moverCamioneta(pedido.sedeId));
      if (mia !== generacion) return;
      tienda.despachar({ tipo: 'ENTREGA', pedidoId: pedido.id });
    }
    if (evento.tipo === 'ASIGNAR_MANTENIMIENTO') {
      await animar(() => escena.moverPersona(evento.personaId, evento.sedeId));
      if (mia !== generacion) return;
      await esperar(1500);
      if (mia !== generacion) return;
      tienda.despachar({ tipo: 'RESOLVER_INCIDENCIA', sedeId: evento.sedeId, incidenciaId: evento.incidenciaId });
    }
  });
}
