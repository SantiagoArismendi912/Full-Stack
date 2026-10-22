// Trazado de la ciudad: calles, huellas de los edificios, estacionamientos y recorridos.
// Sin Three.js: lo usa escena.js y se prueba con node (pruebas/vias.test.js).
// Reglas:
//  - vehículos y personas solo circulan por calles y nunca atraviesan un edificio;
//  - la camioneta usa su carril; el personal camina por la vereda del lado opuesto;
//  - la camioneta estaciona al costado de la fachada (del lado del cruce) y el personal
//    se ubica sobre la vereda frente a la fachada: nunca coinciden.
import { SEDES, LOTE } from './datos-demo.js';

const sedePorId = (id) => [...SEDES, LOTE].find((s) => s.id === id);
const BASE = sedePorId('base');

// Medidas del cuerpo principal de cada edificio (escena.js construye con estas medidas).
export const MEDIDAS = {
  base: { w: 5, d: 3 }, deposito: { w: 4, d: 3 },
  oficina: { w: 4.5, d: 4.5 }, clinica: { w: 6, d: 4 }, colegio: { w: 7, d: 4 },
  comercial: { w: 8, d: 5 }, residencial: { w: 3.5, d: 3.5 }, hotel: { w: 5, d: 4 },
};
export const RADIO_VISUAL = { oficina: 5, clinica: 5, colegio: 6, comercial: 6.5, residencial: 4.5, lote: 5 };
export const DEPOSITO = { x: BASE.x + 9, z: BASE.z };

// Calles como rectángulos { x0, x1, z0, z1 }.
const calle = (x0, x1, z0, z1) => ({ x0, x1, z0, z1 });
export const CALLES = [
  calle(-24, 24, -1.2, 1.2), // avenida este–oeste
  calle(-1.2, 1.2, -17.5, 14.5), // avenida norte–sur
  calle(-18, 18, -7.4, -5.0), // calle norte: oficina y clínica
  calle(-20, 19, 12.2, 14.6), // calle sur: colegio, centro comercial y hotel (lado visible para la cámara)
];

// Carril de la camioneta y vereda del personal en cada vía (coordenada fija).
const AV_X = { vehiculo: -0.6, peaton: 0.8 }; // avenida este–oeste (coordenada z)
const AV_Z = { vehiculo: 0.6, peaton: -0.8 }; // avenida norte–sur (coordenada x)
const CARRILES = {
  norte: { vehiculo: -5.6, peaton: -7.0 },
  sur: { vehiculo: 13.9, peaton: 12.6 },
};
const CRUCE_VEHICULO = { x: AV_Z.vehiculo, z: AV_X.vehiculo };
const CRUCE_PEATON = { x: AV_Z.peaton, z: AV_X.peaton };

// calle: norte | sur | eje (al final de la avenida norte–sur). lado: hacia dónde queda el
// estacionamiento respecto de la fachada (siempre hacia el cruce). frente: +1 = fachada hacia +z.
const VIAS = {
  oficina: { calle: 'norte', lado: 1, frente: 1 },
  clinica: { calle: 'norte', lado: -1, frente: 1 },
  colegio: { calle: 'sur', lado: 1, frente: 1 },
  comercial: { calle: 'sur', lado: -1, frente: 1 },
  residencial: { calle: 'eje', bahiaZ: -13.5, frente: 1 },
  lote: { calle: 'eje', bahiaZ: 11, frente: -1 },
};

export const ESTACIONAMIENTO_BASE = { x: DEPOSITO.x, z: AV_X.vehiculo }; // frente al depósito
const PLAZA_BASE = { x: DEPOSITO.x + 5, z: BASE.z }; // donde espera el personal
const SALIDA_PLAZA = { x: PLAZA_BASE.x, z: AV_X.peaton };

function huella(id, x, z, { w, d }) {
  return { id, x0: x - w / 2, x1: x + w / 2, z0: z - d / 2, z1: z + d / 2 };
}
export const HUELLAS = [
  huella('base', BASE.x, BASE.z, MEDIDAS.base),
  huella('deposito', DEPOSITO.x, DEPOSITO.z, MEDIDAS.deposito),
  ...SEDES.filter((s) => s.id !== 'base').map((s) => huella(s.id, s.x, s.z, MEDIDAS[s.tipo])),
  huella('lote', LOTE.x, LOTE.z, MEDIDAS.hotel),
];
const huellaDe = (id) => HUELLAS.find((h) => h.id === id);

export function bahia(id) {
  if (id === 'base') return { ...ESTACIONAMIENTO_BASE };
  const via = VIAS[id];
  if (via.calle === 'eje') return { x: AV_Z.vehiculo, z: via.bahiaZ };
  const s = sedePorId(id);
  return { x: s.x + via.lado * (MEDIDAS[s.tipo].w / 2 + 3), z: CARRILES[via.calle].vehiculo };
}

// Orientación de la camioneta estacionada: a lo largo de x (calles este–oeste) o de z.
export const orientacionBahia = (id) => (VIAS[id]?.calle === 'eje' ? 'z' : 'x');

// Línea de la vereda frente a la fachada, a 0,6 del edificio.
function lineaFachada(id) {
  const h = huellaDe(id);
  return VIAS[id].frente > 0 ? h.z1 + 0.6 : h.z0 - 0.6;
}

// Puesto de una persona: en fila sobre la vereda frente a la fachada; fuera de geocerca,
// más allá del radio autorizado (y corrida hacia un costado en las sedes al final de la avenida).
export function posicionEnSede(id, indice = 0, total = 1, fuera = false) {
  if (id === 'base') {
    const ang = (indice / Math.max(1, total)) * Math.PI * 2;
    return { x: PLAZA_BASE.x + Math.cos(ang) * 1.3, z: PLAZA_BASE.z + Math.sin(ang) * 1.3 };
  }
  const s = sedePorId(id);
  const via = VIAS[id];
  if (fuera) {
    return { x: s.x + (via.calle === 'eje' ? -3 : 0), z: s.z + via.frente * (RADIO_VISUAL[id] + 2.2) };
  }
  return { x: s.x + (indice - (total - 1) / 2) * 1.1, z: lineaFachada(id) };
}

// El operario de mantenimiento se ubica en la fachada, del lado opuesto al estacionamiento.
export function puestoMantenimiento(id) {
  const s = sedePorId(id);
  const via = VIAS[id];
  const lado = via.calle === 'eje' ? 1 : via.lado;
  return { x: s.x - lado * 2, z: lineaFachada(id) };
}

// ---------- Recorridos ----------
function vehiculoHaciaCruce(id) {
  const via = VIAS[id];
  if (id === 'base' || via.calle === 'eje') return [CRUCE_VEHICULO];
  return [{ x: AV_Z.vehiculo, z: CARRILES[via.calle].vehiculo }, CRUCE_VEHICULO];
}
function vehiculoDesdeCruce(id) {
  if (id === 'base') return [ESTACIONAMIENTO_BASE];
  const via = VIAS[id];
  if (via.calle === 'eje') return [bahia(id)];
  return [{ x: AV_Z.vehiculo, z: CARRILES[via.calle].vehiculo }, bahia(id)];
}

function peatonHaciaCruce(id, desde) {
  if (id === 'base') return [SALIDA_PLAZA, CRUCE_PEATON];
  const via = VIAS[id];
  if (via.calle === 'eje') return [{ x: AV_Z.peaton, z: desde.z }, CRUCE_PEATON];
  const vereda = CARRILES[via.calle].peaton;
  return [{ x: desde.x, z: vereda }, { x: AV_Z.peaton, z: vereda }, CRUCE_PEATON];
}
function peatonDesdeCruce(id, destino) {
  if (id === 'base') return [SALIDA_PLAZA];
  const via = VIAS[id];
  if (via.calle === 'eje') return [{ x: AV_Z.peaton, z: destino.z }];
  const vereda = CARRILES[via.calle].peaton;
  return [{ x: AV_Z.peaton, z: vereda }, { x: destino.x, z: vereda }];
}

// Puntos a recorrer (sin incluir el de partida) para ir de una sede a otra y terminar en `destino`.
// Para personas, `desde` es la posición actual (define por dónde sale a la vereda).
export function ruta(desdeId, haciaId, destino, { vehiculo = false, desde = null } = {}) {
  if (desdeId === haciaId) return [{ ...destino }];
  const origen = desde ?? (desdeId === 'base' ? PLAZA_BASE : posicionEnSede(desdeId));
  const puntos = vehiculo
    ? [...vehiculoHaciaCruce(desdeId), ...vehiculoDesdeCruce(haciaId), { ...destino }]
    : [...peatonHaciaCruce(desdeId, origen), ...peatonDesdeCruce(haciaId, destino), { ...destino }];
  return puntos.filter((p, i) => i === 0 || p.x !== puntos[i - 1].x || p.z !== puntos[i - 1].z);
}
