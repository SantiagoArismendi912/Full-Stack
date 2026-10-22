// Copiloto Jornexa IA: detecta situaciones, las explica y propone una acción.
// Respuestas locales con guion: nunca ejecuta nada sin que una persona apruebe.
import { PERSONAL, NOMBRES_INSUMO, LOTE } from './datos-demo.js';
import { buscarSede, buscarPersona } from './estado.js';

export function detectar(estado) {
  const propuestas = [];

  for (const [id, p] of Object.entries(estado.personal)) {
    if (!p.enTurno) continue;
    const persona = buscarPersona(id);
    const sede = buscarSede(p.sede);
    if (p.fueraZona) {
      propuestas.push({
        id: `zona-${id}`, tipo: 'alerta', sedeId: sede.id,
        titulo: `${persona.nombre} marcó entrada fuera de geocerca`,
        detalle: `${sede.nombre}: a ${p.distanciaM} m; radio autorizado ${sede.radioM} m.`,
        acciones: [{ etiqueta: 'Solicitar justificación', evento: { tipo: 'JUSTIFICAR', personaId: id } }],
      });
    }
    if (p.sinSalida) {
      propuestas.push({
        id: `salida-${id}`, tipo: 'alerta', sedeId: sede.id,
        titulo: `Jornada de ${persona.nombre} sin salida`,
        detalle: `Entrada a las ${p.entradaHora} en ${sede.nombre}; no registra salida.`,
        acciones: [{ etiqueta: 'Notificar a supervisión', evento: { tipo: 'NOTIFICAR', personaId: id } }],
      });
    }
  }

  const mantenimiento = PERSONAL.find((p) => p.rol === 'mantenimiento');
  for (const [sedeId, lista] of Object.entries(estado.incidencias)) {
    for (const inc of lista) {
      if (inc.estado !== 'abierta') continue;
      propuestas.push({
        id: `inc-${inc.id}`, tipo: 'incidencia', sedeId,
        titulo: `Incidencia en ${buscarSede(sedeId).nombre}`,
        detalle: inc.texto,
        acciones: [{
          etiqueta: `Asignar a ${mantenimiento.nombre} (mantenimiento)`,
          evento: { tipo: 'ASIGNAR_MANTENIMIENTO', sedeId, incidenciaId: inc.id, personaId: mantenimiento.id },
        }],
      });
    }
  }

  for (const [sedeId, items] of Object.entries(estado.insumos)) {
    for (const [insumo, item] of Object.entries(items)) {
      if (item.actual >= item.minimo) continue;
      if (estado.pedidos.some((p) => p.sedeId === sedeId && p.insumo === insumo && p.estado === 'en_camino')) continue;
      const cantidad = item.minimo * 2 - item.actual;
      propuestas.push({
        id: `pedido-${sedeId}-${insumo}`, tipo: 'insumo', sedeId,
        titulo: `${NOMBRES_INSUMO[insumo]} bajo el mínimo`,
        detalle: `${buscarSede(sedeId).nombre}: quedan ${item.actual} (mínimo ${item.minimo}). Propuesta: reponer ${cantidad}.`,
        acciones: [{ etiqueta: 'Aprobar pedido', evento: { tipo: 'APROBAR_PEDIDO', sedeId, insumo, cantidad } }],
      });
    }
  }

  if (estado.crmEtapa === 3 && !estado.loteConvertido) {
    propuestas.push({
      id: 'crm-lote', tipo: 'comercial', sedeId: LOTE.id,
      titulo: `${LOTE.nombre} aceptó la cotización`,
      detalle: 'Convertir el prospecto en cliente crea su sede y su planificación.',
      acciones: [{ etiqueta: 'Convertir en cliente', evento: { tipo: 'CONVERTIR_CLIENTE' } }],
    });
  }

  return propuestas;
}

export function buscarPropuesta(estado, id) {
  return detectar(estado).find((p) => p.id === id) ?? null;
}

// Copiadas del demo interactivo 06 (Index.html), que ya fueron revisadas.
const RESPUESTAS = {
  entrada: '<b>Marcar entrada:</b> desde “Marcar Entrada / Salida”, elegís el servicio asignado y registrás la entrada. La hora la registra el servidor. Si ese cliente tiene geocerca activa, la ubicación se consulta al marcar.',
  incidencia: '<b>Registrar incidencia:</b> desde el celular podés informar el motivo, una nota y, si corresponde, una foto. El responsable la revisa y registra su resolución.',
  pedido: '<b>Pedir materiales:</b> el personal solicita lo necesario desde el módulo de pedidos. El responsable puede aprobar, rechazar o entregar; el stock se descuenta al momento de entregar.',
  cliente: '<b>Portal del cliente:</b> el cliente autorizado puede consultar su propio servicio, novedades ya resueltas y estado de cuenta, sin acceder a costos, nómina, otros clientes ni stock.',
  crm: '<b>CRM y cotización:</b> permite registrar prospectos, crear cotizaciones, enviarlas, hacer seguimiento y convertir una cotización aceptada en cliente.',
  control: '<b>Control:</b> el dashboard reúne jornadas y operación; además se consultan stock, pedidos, gastos, reportes y auditoría según el permiso del usuario.',
  acceso: '<b>Accesos:</b> cada rol visualiza los módulos que le corresponden. La ayuda acompaña el uso de esas funciones.',
};

export function responderChat(pregunta) {
  const texto = String(pregunta ?? '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');
  if (/geocerca|ubicacion|localizacion|radio/.test(texto)) return RESPUESTAS.entrada;
  if (/entrada|salida|marcar|jornada|hora/.test(texto)) return RESPUESTAS.entrada;
  if (/incidencia|problema|inconveniente/.test(texto)) return RESPUESTAS.incidencia;
  if (/material|pedido|insumo|stock/.test(texto)) return RESPUESTAS.pedido;
  if (/cotizacion|prospecto|crm|comercial/.test(texto)) return RESPUESTAS.crm;
  if (/gasto|reporte|auditoria|dashboard|control/.test(texto)) return RESPUESTAS.control;
  if (/cliente|portal/.test(texto)) return RESPUESTAS.cliente;
  if (/usuario|rol|permiso|acceso|contrasena/.test(texto)) return RESPUESTAS.acceso;
  return 'En esta demo puedo ayudarte con jornadas, geocerca, incidencias, pedidos, clientes, CRM, gastos, reportes, auditoría y accesos.';
}
