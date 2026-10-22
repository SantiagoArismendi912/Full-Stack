// Estado central de la demo: reductor puro + almacén con suscripción.
// La escena 3D y el HUD solo se suscriben; nunca se llaman entre sí.
import { SEDES, LOTE, PERSONAL, INSUMOS_INICIALES, NOMBRES_INSUMO, ETAPAS_CRM } from './datos-demo.js';

const LIMITE_BITACORA = 60;
// No se reinicia con REINICIAR: así una entrega tardía nunca coincide con un pedido nuevo.
let seriePedidos = 0;

export const TODAS_LAS_SEDES = [...SEDES, LOTE];
export const buscarSede = (id) => TODAS_LAS_SEDES.find((s) => s.id === id) ?? null;
export const buscarPersona = (id) => PERSONAL.find((p) => p.id === id) ?? null;

export function crearEstadoInicial() {
  const personal = {};
  for (const p of PERSONAL) {
    personal[p.id] = { sede: null, enTurno: false, entradaHora: null, fueraZona: false, distanciaM: 0, sinSalida: false };
  }
  const incidencias = {};
  for (const s of TODAS_LAS_SEDES) incidencias[s.id] = [];
  return { hora: '06:00', personal, incidencias, insumos: structuredClone(INSUMOS_INICIALES), pedidos: [], crmEtapa: 0, loteConvertido: false, bitacora: [] };
}

function conPersona(estado, id, cambios) {
  return { ...estado, personal: { ...estado.personal, [id]: { ...estado.personal[id], ...cambios } } };
}

function conInsumo(estado, sedeId, insumo, actual) {
  const sede = estado.insumos[sedeId];
  return { ...estado, insumos: { ...estado.insumos, [sedeId]: { ...sede, [insumo]: { ...sede[insumo], actual } } } };
}

function pedidoPendiente(estado, sedeId, insumo) {
  return estado.pedidos.some((p) => p.sedeId === sedeId && p.insumo === insumo && p.estado === 'en_camino');
}

function cambiarIncidencia(estado, ev, desde, cambios) {
  const lista = estado.incidencias[ev.sedeId];
  if (!lista?.some((i) => i.id === ev.incidenciaId && i.estado === desde)) return null;
  const nueva = lista.map((i) => (i.id === ev.incidenciaId ? { ...i, ...cambios } : i));
  return { ...estado, incidencias: { ...estado.incidencias, [ev.sedeId]: nueva } };
}

// Devuelve el nuevo estado, o null si el evento no aplica (inválido, repetido o tardío).
function aplicar(estado, ev) {
  const persona = estado.personal[ev.personaId];
  switch (ev.tipo) {
    case 'HORA':
      return /^\d{2}:\d{2}$/.test(ev.hora) ? { ...estado, hora: ev.hora } : null;
    case 'ENTRADA': {
      const sede = buscarSede(ev.sedeId);
      if (!persona || !sede) return null;
      const distanciaM = Math.max(0, Number(ev.distanciaM) || 0);
      return conPersona(estado, ev.personaId, {
        sede: sede.id, enTurno: true, entradaHora: estado.hora, distanciaM, fueraZona: distanciaM > sede.radioM, sinSalida: false,
      });
    }
    case 'SALIDA':
      return persona?.enTurno ? conPersona(estado, ev.personaId, { enTurno: false, fueraZona: false, sinSalida: false }) : null;
    case 'SIN_SALIDA':
      return persona?.enTurno ? conPersona(estado, ev.personaId, { sinSalida: true }) : null;
    case 'JUSTIFICAR':
      return persona?.fueraZona ? conPersona(estado, ev.personaId, { fueraZona: false }) : null;
    case 'NOTIFICAR':
      return persona?.sinSalida ? conPersona(estado, ev.personaId, { sinSalida: false }) : null;
    case 'INCIDENCIA': {
      const lista = estado.incidencias[ev.sedeId];
      if (!lista || !ev.id || lista.some((i) => i.id === ev.id)) return null;
      const nueva = { id: ev.id, texto: String(ev.texto ?? ''), estado: 'abierta', responsable: null };
      return { ...estado, incidencias: { ...estado.incidencias, [ev.sedeId]: [...lista, nueva] } };
    }
    case 'ASIGNAR_MANTENIMIENTO':
      return persona ? cambiarIncidencia(estado, ev, 'abierta', { estado: 'asignada', responsable: ev.personaId }) : null;
    case 'RESOLVER_INCIDENCIA':
      return cambiarIncidencia(estado, ev, 'asignada', { estado: 'resuelta' });
    case 'CONSUMO': {
      const item = estado.insumos[ev.sedeId]?.[ev.insumo];
      return item ? conInsumo(estado, ev.sedeId, ev.insumo, Math.max(0, item.actual - (Number(ev.cantidad) || 0))) : null;
    }
    case 'APROBAR_PEDIDO': {
      const item = estado.insumos[ev.sedeId]?.[ev.insumo];
      if (!item || pedidoPendiente(estado, ev.sedeId, ev.insumo)) return null;
      seriePedidos += 1;
      const pedido = { id: `ped-${seriePedidos}`, sedeId: ev.sedeId, insumo: ev.insumo, cantidad: Math.max(1, Number(ev.cantidad) || 1), estado: 'en_camino' };
      return { ...estado, pedidos: [...estado.pedidos, pedido] };
    }
    case 'ENTREGA': {
      const pedido = estado.pedidos.find((p) => p.id === ev.pedidoId && p.estado === 'en_camino');
      if (!pedido) return null;
      const item = estado.insumos[pedido.sedeId][pedido.insumo];
      const conStock = conInsumo(estado, pedido.sedeId, pedido.insumo, item.actual + pedido.cantidad);
      return { ...conStock, pedidos: estado.pedidos.map((p) => (p.id === pedido.id ? { ...p, estado: 'entregado' } : p)) };
    }
    case 'CRM_AVANZAR':
      return estado.crmEtapa < 3 ? { ...estado, crmEtapa: estado.crmEtapa + 1 } : null;
    case 'CONVERTIR_CLIENTE':
      return estado.crmEtapa === 3 && !estado.loteConvertido ? { ...estado, crmEtapa: 4, loteConvertido: true } : null;
    case 'REINICIAR':
      return crearEstadoInicial();
    default:
      return null;
  }
}

function sedeDelEvento(estado, ev) {
  if (ev.sedeId) return ev.sedeId;
  if (ev.personaId) return estado.personal[ev.personaId]?.sede ?? null;
  if (ev.pedidoId) return estado.pedidos.find((p) => p.id === ev.pedidoId)?.sedeId ?? null;
  if (ev.tipo === 'CRM_AVANZAR' || ev.tipo === 'CONVERTIR_CLIENTE') return LOTE.id;
  return null;
}

function describirEvento(estado, ev) {
  const persona = buscarPersona(ev.personaId)?.nombre ?? '';
  const sede = buscarSede(sedeDelEvento(estado, ev))?.nombre ?? '';
  const insumo = NOMBRES_INSUMO[ev.insumo] ?? '';
  switch (ev.tipo) {
    case 'ENTRADA': return `${persona} marcó entrada en ${sede}`;
    case 'SALIDA': return `${persona} marcó salida`;
    case 'SIN_SALIDA': return `${persona} sin salida registrada`;
    case 'JUSTIFICAR': return `Se solicitó justificación a ${persona}`;
    case 'NOTIFICAR': return `Supervisión notificada: ${persona}`;
    case 'INCIDENCIA': return `Incidencia en ${sede}: ${ev.texto}`;
    case 'ASIGNAR_MANTENIMIENTO': return `${persona} (mantenimiento) asignado a ${sede}`;
    case 'RESOLVER_INCIDENCIA': return `Incidencia resuelta en ${sede}`;
    case 'CONSUMO': return `Consumo de ${insumo} en ${sede}`;
    case 'APROBAR_PEDIDO': return `Pedido aprobado: ${insumo} para ${sede}`;
    case 'ENTREGA': return `Pedido entregado en ${sede}`;
    case 'CRM_AVANZAR': return `${LOTE.nombre}: ${ETAPAS_CRM[estado.crmEtapa + 1]}`;
    case 'CONVERTIR_CLIENTE': return `${LOTE.nombre} ahora es cliente`;
    default: return ev.tipo;
  }
}

export function reducir(estado, evento) {
  if (!evento || typeof evento.tipo !== 'string') return estado;
  const nuevo = aplicar(estado, evento);
  if (!nuevo) return estado;
  if (evento.tipo === 'REINICIAR' || evento.tipo === 'HORA') return nuevo;
  const entrada = { hora: nuevo.hora, tipo: evento.tipo, sedeId: sedeDelEvento(estado, evento), texto: describirEvento(estado, evento) };
  return { ...nuevo, bitacora: [...nuevo.bitacora, entrada].slice(-LIMITE_BITACORA) };
}

export function estadoSede(estado, sedeId) {
  if (sedeId === LOTE.id && !estado.loteConvertido) return 'obra';
  if (estado.incidencias[sedeId]?.some((i) => i.estado !== 'resuelta')) return 'incidencia';
  const enSede = Object.values(estado.personal).filter((p) => p.enTurno && p.sede === sedeId);
  if (enSede.some((p) => p.fueraZona || p.sinSalida)) return 'alerta';
  return enSede.length ? 'activo' : 'reposo';
}

export function calcularIndicadores(estado) {
  const planificados = PERSONAL.filter((p) => p.rol === 'limpieza');
  const marcaron = planificados.filter((p) => estado.personal[p.id].entradaHora !== null).length;
  return {
    jornadasActivas: Object.values(estado.personal).filter((p) => p.enTurno).length,
    cumplimiento: Math.round((100 * marcaron) / planificados.length),
    incidenciasAbiertas: Object.values(estado.incidencias).flat().filter((i) => i.estado !== 'resuelta').length,
    insumosCriticos: Object.values(estado.insumos).flatMap(Object.values).filter((i) => i.actual < i.minimo).length,
  };
}

export function crearTienda(inicial = crearEstadoInicial()) {
  let estado = inicial;
  const suscriptores = new Set();
  return {
    obtener: () => estado,
    despachar(evento) {
      const nuevo = reducir(estado, evento);
      if (nuevo === estado) return estado;
      estado = nuevo;
      for (const fn of suscriptores) {
        try { fn(estado, evento); } catch (error) { console.error('[Jornexa demo]', error); }
      }
      return estado;
    },
    suscribir(fn) {
      suscriptores.add(fn);
      return () => suscriptores.delete(fn);
    },
  };
}
