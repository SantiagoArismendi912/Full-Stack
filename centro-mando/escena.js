// Escena 3D isométrica ("Ciudad Jornexa") con Three.js.
// Misma interfaz que escenaNula (efectos.js): actualizar, enfocar, moverCamioneta, moverPersona, autoGiro, destruir.
import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { SEDES, LOTE, PERSONAL } from './datos-demo.js';
import { estadoSede } from './estado.js';
import { CALLES, HUELLAS, MEDIDAS, DEPOSITO, RADIO_VISUAL, ESTACIONAMIENTO_BASE, bahia, orientacionBahia, ruta, posicionEnSede as puestoEnSede, puestoMantenimiento } from './vias.js';

export function soportaWebGL() {
  try {
    const lienzo = document.createElement('canvas');
    return Boolean(window.WebGLRenderingContext && (lienzo.getContext('webgl2') || lienzo.getContext('webgl')));
  } catch {
    return false;
  }
}

const COLOR_ESTADO = { reposo: '#9ADBD4', activo: '#2E8B57', alerta: '#D9822B', incidencia: '#C0392B', obra: '#B9C9D6' };
const COLOR_ROL = { limpieza: '#21D4E8', mantenimiento: '#D9822B', supervisor: '#0A3D91' };
const ALTURA_ETIQUETA = { base: 5, oficina: 9, clinica: 6.5, colegio: 5.5, comercial: 5, residencial: 12, lote: 8 };
const NOMBRE_ETIQUETA = { base: 'Base Brillo Total', oficina: 'Oficina Delta' };
const ARBOLES = [[-22, -18], [-20, -4], [-8, -14], [8, -16], [20, -18], [22, -2], [-22, 18], [-9, 14], [8, 16], [22, 20],
  [-6, 4], [7, -5], [-24, 2], [24, 4], [-4, -26], [4, -26], [-14, 20], [12, 22], [-24, -10], [24, -12], [-10, -24], [10, 25]];
const VELOCIDAD_PERSONA = 6;
const VELOCIDAD_CAMIONETA = 9;

export function crearEscena(contenedor, { ligera = false, reducirMovimiento = false, alSeleccionar = () => {} } = {}) {
  // ---------- Render, cámara y controles ----------
  const renderer = new THREE.WebGLRenderer({ antialias: !ligera, alpha: true, preserveDrawingBuffer: false });
  renderer.setPixelRatio(ligera ? 1 : Math.min(window.devicePixelRatio, 2));
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.shadowMap.enabled = !ligera;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  contenedor.appendChild(renderer.domElement);

  const capaEtiquetas = document.createElement('div');
  capaEtiquetas.className = 'etiquetas';
  contenedor.appendChild(capaEtiquetas);

  const escena = new THREE.Scene();
  const camara = new THREE.OrthographicCamera(-1, 1, 1, -1, 0.1, 500);
  camara.position.set(40, 40, 40);
  const ZOOM_GENERAL = 1;
  camara.zoom = ZOOM_GENERAL;

  const controles = new OrbitControls(camara, renderer.domElement);
  controles.enableDamping = true;
  controles.dampingFactor = 0.08;
  controles.minZoom = 0.6;
  controles.maxZoom = 2.5;
  controles.minPolarAngle = 0.6;
  controles.maxPolarAngle = 1.1;
  controles.screenSpacePanning = false;
  controles.autoRotateSpeed = 0.4;
  controles.target.set(0, 0, 0);
  controles.addEventListener('start', () => { enfoque = null; });

  // ---------- Luces ----------
  escena.add(new THREE.HemisphereLight('#FFFFFF', '#9ADBD4', 1.6));
  const sol = new THREE.DirectionalLight('#FFF4E5', 1.6);
  sol.position.set(28, 50, 18);
  sol.castShadow = !ligera;
  sol.shadow.mapSize.set(2048, 2048);
  Object.assign(sol.shadow.camera, { left: -40, right: 40, top: 40, bottom: -40, near: 1, far: 140 });
  sol.shadow.bias = -0.0008;
  escena.add(sol);

  // ---------- Utilidades de construcción ----------
  const materiales = new Map();
  const mat = (color, extra = {}) => {
    const clave = color + JSON.stringify(extra);
    if (!materiales.has(clave)) materiales.set(clave, new THREE.MeshStandardMaterial({ color, roughness: 0.85, metalness: 0, flatShading: true, ...extra }));
    return materiales.get(clave);
  };
  const geoCaja = new THREE.BoxGeometry(1, 1, 1);
  function caja(w, h, d, color, x, y, z, padre = escena) {
    const m = new THREE.Mesh(geoCaja, mat(color));
    m.scale.set(w, h, d);
    m.position.set(x, y + h / 2, z);
    m.castShadow = !ligera;
    m.receiveShadow = !ligera;
    padre.add(m);
    return m;
  }
  function plano(w, d, color, x, z, y = 0.02, padre = escena) {
    const m = caja(w, 0.04, d, color, x, y - 0.02, z, padre);
    m.castShadow = false;
    return m;
  }
  function ventanas(padre, cx, cz, w, h, d, pisos, color, y0 = 0) {
    if (ligera && pisos > 3) pisos = Math.ceil(pisos / 2);
    const paso = (h - 0.8) / pisos;
    for (let i = 0; i < pisos; i += 1) {
      const y = y0 + 0.6 + i * paso;
      for (let x = cx - w / 2 + 0.6; x <= cx + w / 2 - 0.6; x += 1.3) caja(0.6, 0.45, 0.06, color, x, y, cz + d / 2 + 0.02, padre).castShadow = false;
      for (let z = cz - d / 2 + 0.6; z <= cz + d / 2 - 0.6; z += 1.3) caja(0.06, 0.45, 0.6, color, cx + w / 2 + 0.02, y, z, padre).castShadow = false;
    }
  }

  // ---------- Suelo y calles ----------
  caja(56, 0.6, 58, '#E4EFEF', 0, -0.6, -1);
  for (const c of CALLES) plano(c.x1 - c.x0, c.z1 - c.z0, '#D3E2EA', (c.x0 + c.x1) / 2, (c.z0 + c.z1) / 2);
  for (const x of [-21, -15, -9, 13, 19]) plano(2.4, 0.18, '#FFFFFF', x, 0, 0.04);
  // Estacionamientos marcados sobre la calle frente a cada sede y al depósito.
  for (const id of ['base', 'oficina', 'clinica', 'colegio', 'comercial', 'residencial']) {
    const b = bahia(id);
    const [w, d] = orientacionBahia(id) === 'z' ? [1.6, 4.2] : [4.2, 1.6];
    plano(w, d, '#FFFFFF', b.x, b.z, 0.035);
    plano(w - 0.3, d - 0.3, '#C4D7E2', b.x, b.z, 0.04);
  }

  // Los árboles nunca quedan sobre una calle ni dentro de un edificio.
  const libre = ([x, z]) => ![...CALLES, ...HUELLAS].some((r) => x > r.x0 - 1 && x < r.x1 + 1 && z > r.z0 - 1 && z < r.z1 + 1);
  const arboles = ARBOLES.filter(libre);
  for (const [x, z] of ligera ? arboles.filter((_, i) => i % 2 === 0) : arboles) {
    const arbol = new THREE.Group();
    const tronco = new THREE.Mesh(new THREE.CylinderGeometry(0.15, 0.2, 0.8, 6), mat('#6B5B4A'));
    tronco.position.y = 0.4;
    const copa = new THREE.Mesh(new THREE.ConeGeometry(0.9, 2.2, 7), mat('#0B6075'));
    copa.position.y = 1.8;
    copa.castShadow = !ligera;
    arbol.add(tronco, copa);
    arbol.position.set(x, 0, z);
    escena.add(arbol);
  }

  // ---------- Edificios ----------
  const BLANCO = '#F7FAFC';
  const edificios = {
    base(g, s) {
      const { w, d } = MEDIDAS.base;
      caja(w, 3.2, d, '#0A3D91', s.x, 0, s.z, g); ventanas(g, s.x, s.z, w, 3.2, d, 2, '#BDE9F4');
      const dep = MEDIDAS.deposito;
      caja(dep.w, 2, dep.d, BLANCO, DEPOSITO.x, 0, DEPOSITO.z, g); caja(dep.w + 0.1, 0.25, dep.d + 0.1, '#21D4E8', DEPOSITO.x, 2, DEPOSITO.z, g);
    },
    oficina(g, s) {
      caja(4.5, 7, 4.5, BLANCO, s.x, 0, s.z, g); caja(4.7, 0.4, 4.7, '#0B6075', s.x, 7, s.z, g);
      ventanas(g, s.x, s.z, 4.5, 7, 4.5, 5, '#0B6075');
    },
    clinica(g, s) {
      caja(6, 3.5, 4, BLANCO, s.x, 0, s.z, g); ventanas(g, s.x, s.z, 6, 3.5, 4, 2, '#21D4E8');
      caja(2, 1, 2, BLANCO, s.x, 3.5, s.z, g);
      caja(1.4, 0.4, 0.4, '#C0392B', s.x, 4.6, s.z, g); caja(0.4, 0.4, 1.4, '#C0392B', s.x, 4.6, s.z, g);
    },
    colegio(g, s) {
      caja(7, 3, 4, BLANCO, s.x, 0, s.z, g); caja(7.2, 0.5, 4.2, '#072E73', s.x, 3, s.z, g);
      ventanas(g, s.x, s.z, 7, 3, 4, 2, '#0A3D91'); plano(8, 2.5, '#BFE3C9', s.x, s.z - 3.6, 0.03, g);
    },
    comercial(g, s) {
      caja(8, 2.6, 5, BLANCO, s.x, 0, s.z, g); caja(8.2, 0.35, 5.2, '#21D4E8', s.x, 2.6, s.z, g);
      ventanas(g, s.x, s.z, 8, 2.6, 5, 1, '#21D4E8'); plano(8, 2.3, '#C9D8E6', s.x, s.z - 4.2, 0.03, g);
    },
    residencial(g, s) {
      caja(3.5, 10, 3.5, BLANCO, s.x, 0, s.z, g); caja(3.7, 0.4, 3.7, '#0A3D91', s.x, 10, s.z, g);
      ventanas(g, s.x, s.z, 3.5, 10, 3.5, 7, '#0B6075');
    },
  };

  const sedes = {};
  const hitboxes = [];
  const geoAnillo = new Map();
  for (const s of [...SEDES, LOTE]) {
    const grupo = new THREE.Group();
    escena.add(grupo);
    const r = RADIO_VISUAL[s.id] ?? 0;
    const registro = { s, grupo, r };
    if (edificios[s.tipo]) edificios[s.tipo](grupo, s);
    if (r) {
      if (!geoAnillo.has(r)) geoAnillo.set(r, [new THREE.RingGeometry(r - 0.22, r, 72), new THREE.CircleGeometry(r, 72)]);
      const [ga, gd] = geoAnillo.get(r);
      registro.anillo = new THREE.Mesh(ga, new THREE.MeshBasicMaterial({ color: COLOR_ESTADO.reposo, transparent: true, opacity: 0.95, depthWrite: false }));
      registro.disco = new THREE.Mesh(gd, new THREE.MeshBasicMaterial({ color: COLOR_ESTADO.reposo, transparent: true, opacity: 0.12, depthWrite: false }));
      for (const m of [registro.anillo, registro.disco]) {
        m.rotation.x = -Math.PI / 2;
        m.position.set(s.x, 0.06, s.z);
        escena.add(m);
      }
      const pin = new THREE.Group();
      const punta = new THREE.Mesh(new THREE.ConeGeometry(0.55, 1.3, 12), new THREE.MeshStandardMaterial({ color: COLOR_ESTADO.alerta }));
      punta.rotation.x = Math.PI;
      const bola = new THREE.Mesh(new THREE.SphereGeometry(0.75, 16, 12), punta.material);
      bola.position.y = 1;
      pin.add(punta, bola);
      pin.position.set(s.x, ALTURA_ETIQUETA[s.id] - 1.2, s.z);
      pin.visible = false;
      escena.add(pin);
      registro.pin = pin;
    }
    const tam = Math.max(r * 1.6, 6);
    const hit = new THREE.Mesh(geoCaja, new THREE.MeshBasicMaterial({ transparent: true, opacity: 0, depthWrite: false }));
    hit.scale.set(tam, ALTURA_ETIQUETA[s.id], tam);
    hit.position.set(s.x, ALTURA_ETIQUETA[s.id] / 2, s.z);
    hit.userData.sedeId = s.id;
    escena.add(hit);
    hitboxes.push(hit);

    const etiqueta = document.createElement('div');
    etiqueta.className = 'etiqueta';
    etiqueta.textContent = NOMBRE_ETIQUETA[s.id] ?? s.nombre;
    capaEtiquetas.appendChild(etiqueta);
    registro.etiqueta = etiqueta;
    registro.puntoEtiqueta = new THREE.Vector3(s.x, ALTURA_ETIQUETA[s.id], s.z);
    sedes[s.id] = registro;
  }


  // Grúa torre: mástil de celosía, pluma con carro, contrapluma con contrapeso, cabina, cable y gancho.
  function barra(a, b, grosor, color, padre) {
    const dir = new THREE.Vector3().subVectors(b, a);
    const m = new THREE.Mesh(geoCaja, mat(color));
    m.scale.set(dir.length(), grosor, grosor);
    m.position.copy(a).addScaledVector(dir, 0.5);
    m.quaternion.setFromUnitVectors(new THREE.Vector3(1, 0, 0), dir.normalize());
    m.castShadow = !ligera;
    padre.add(m);
    return m;
  }
  function crearGrua(cx, cz, padre) {
    const AMARILLO = '#F2B01E', ACERO = '#5E7378', ALTO = 10, LADO = 0.9;
    const g = new THREE.Group();
    g.position.set(cx, 0, cz);
    caja(2.2, 0.4, 2.2, '#9AA7B0', 0, 0, 0, g); // zapata de hormigón
    caja(1.4, 0.3, 1.4, '#7A8791', 0, 0.4, 0, g);
    const h = LADO / 2;
    const esquinas = [[-h, -h], [h, -h], [h, h], [-h, h]];
    for (const [x, z] of esquinas) caja(0.1, ALTO, 0.1, AMARILLO, x, 0.7, z, g);
    for (let y = 0.7, i = 0; y < ALTO + 0.7 - 0.01; y += 1.1, i += 1) {
      for (let k = 0; k < 4; k += 1) {
        const [x1, z1] = esquinas[k], [x2, z2] = esquinas[(k + 1) % 4];
        barra(new THREE.Vector3(x1, y, z1), new THREE.Vector3(x2, y, z2), 0.06, AMARILLO, g);
        const sube = i % 2 === 0;
        barra(new THREE.Vector3(x1, sube ? y : y + 1.1, z1), new THREE.Vector3(x2, sube ? y + 1.1 : y, z2), 0.045, AMARILLO, g);
      }
    }
    const yTope = ALTO + 0.7;
    caja(1.3, 0.35, 1.3, ACERO, 0, yTope, 0, g); // corona de giro
    const giro = new THREE.Group();
    giro.position.y = yTope + 0.35;
    g.add(giro);
    caja(0.9, 0.9, 0.9, AMARILLO, -0.2, 0, 0, giro);
    const cabina = caja(0.8, 0.8, 0.7, AMARILLO, 0.1, 0.1, 0.8, giro);
    caja(0.5, 0.4, 0.04, '#BDE9F4', 0.1, 0.35, 1.17, giro); // parabrisas
    cabina.castShadow = !ligera;
    // Torre de tirantes
    const cima = new THREE.Vector3(0, 2.6, 0);
    barra(new THREE.Vector3(0, 0.9, 0), cima, 0.1, AMARILLO, giro);
    // Pluma (hacia +X) y contrapluma (hacia -X)
    const LARGO = 7.2, CONTRA = 2.8;
    const pluma = new THREE.Group();
    giro.add(pluma);
    for (const dz of [-0.14, 0.14]) barra(new THREE.Vector3(-CONTRA, 0.95, dz), new THREE.Vector3(LARGO, 0.95, dz), 0.07, AMARILLO, pluma);
    barra(new THREE.Vector3(-CONTRA, 1.35, 0), new THREE.Vector3(LARGO - 0.3, 1.2, 0), 0.07, AMARILLO, pluma);
    for (let x = -CONTRA; x < LARGO - 0.4; x += 0.7) {
      barra(new THREE.Vector3(x, 0.95, -0.14), new THREE.Vector3(x + 0.35, 1.3, 0), 0.04, AMARILLO, pluma);
      barra(new THREE.Vector3(x + 0.35, 1.3, 0), new THREE.Vector3(x + 0.7, 0.95, 0.14), 0.04, AMARILLO, pluma);
    }
    // Tirantes desde la cima
    barra(cima, new THREE.Vector3(LARGO * 0.62, 1.15, 0).add(new THREE.Vector3(0, 0, 0)), 0.03, ACERO, giro);
    barra(cima, new THREE.Vector3(-CONTRA + 0.2, 0.95, 0), 0.03, ACERO, giro);
    // Contrapeso
    for (let i = 0; i < 3; i += 1) caja(0.55, 0.8, 0.5, '#8E9AA3', -CONTRA + 0.15 + i * 0.6, 0.15, 0, pluma);
    // Carro, cable y gancho
    const carro = new THREE.Group();
    carro.position.set(4, 0.95, 0);
    pluma.add(carro);
    caja(0.5, 0.12, 0.4, ACERO, -0.25, -0.12, -0.2, carro);
    const cable = new THREE.Mesh(geoCaja, mat('#2B3338'));
    carro.add(cable);
    const colgante = new THREE.Group();
    carro.add(colgante);
    caja(0.3, 0.22, 0.26, '#D9822B', -0.15, -0.1, -0.13, colgante);
    caja(0.07, 0.3, 0.07, '#2B3338', -0.035, -0.4, -0.035, colgante); // gancho
    const viga = caja(1.6, 0.14, 0.18, '#0A3D91', -0.8, -0.65, -0.09, colgante); // carga: viga
    viga.visible = true;
    padre.add(g);
    return { giro, pluma, carro, cable, colgante, base: -Math.PI / 4, ALTURA_PLUMA: yTope + 0.35 + 0.95 };
  }
  function animarGrua(t) {
    const a = reducirMovimiento ? 0 : Math.sin(t * 0.22);
    grua.giro.rotation.y = grua.base + a * 0.55;
    const x = 4.2 + (reducirMovimiento ? 0 : Math.sin(t * 0.5) * 1.8);
    grua.carro.position.x = x;
    const caida = grua.ALTURA_PLUMA - (reducirMovimiento ? 4.2 : 3.8 + Math.sin(t * 0.8) * 1.7); // altura del gancho
    const largo = Math.max(0.4, grua.ALTURA_PLUMA - caida);
    grua.cable.scale.set(0.03, largo, 0.03);
    grua.cable.position.set(0, -largo / 2, 0);
    grua.colgante.position.y = -largo;
  }

  // Lote: obra (cerca + grúa) y hotel que crece al convertirse en cliente.
  const obra = new THREE.Group();
  plano(6, 6, '#EADFCB', LOTE.x, LOTE.z, 0.03, obra);
  const grua = crearGrua(LOTE.x - 2.4, LOTE.z - 2.4, obra);
  caja(2, 0.8, 2, '#C9D8E6', LOTE.x + 1.5, 0, LOTE.z + 1, obra);
  escena.add(obra);
  const hotel = new THREE.Group();
  caja(5, 4.5, 4, BLANCO, 0, 0, 0, hotel); caja(5.2, 0.4, 4.2, '#0A3D91', 0, 4.5, 0, hotel);
  ventanas(hotel, 0, 0, 5, 4.5, 4, 3, '#21D4E8');
  hotel.position.set(LOTE.x, 0, LOTE.z);
  hotel.scale.setScalar(0.001);
  hotel.visible = false;
  escena.add(hotel);

  // ---------- Personas y camioneta ----------
  const v3 = (p) => new THREE.Vector3(p.x, 0, p.z);
  const personas = {};
  const geoCuerpo = new THREE.CapsuleGeometry(0.35, 0.6, 4, 8);
  const geoCabeza = new THREE.SphereGeometry(0.28, 12, 8);
  PERSONAL.forEach((p, i) => {
    const g = new THREE.Group();
    const cuerpo = new THREE.Mesh(geoCuerpo, mat(COLOR_ROL[p.rol]));
    cuerpo.position.y = 0.65;
    cuerpo.castShadow = !ligera;
    const cabeza = new THREE.Mesh(geoCabeza, mat('#F2D2B6'));
    cabeza.position.y = 1.35;
    g.add(cuerpo, cabeza);
    const casa = v3(puestoEnSede('base', i, PERSONAL.length));
    g.position.copy(casa);
    escena.add(g);
    // sedeActual: dónde está (o hacia dónde va) la persona; define el recorrido por calles.
    personas[p.id] = { p, g, casa, destino: casa.clone(), sedeActual: 'base' };
  });

  const camioneta = new THREE.Group();
  caja(2.6, 1.3, 1.3, '#0A3D91', -0.5, 0.25, 0, camioneta);
  caja(1, 1, 1.3, '#FFFFFF', 1.3, 0.25, 0, camioneta);
  for (const [x, z] of [[-1.2, 0.65], [-1.2, -0.65], [1.2, 0.65], [1.2, -0.65]]) {
    const rueda = new THREE.Mesh(new THREE.CylinderGeometry(0.3, 0.3, 0.2, 10), mat('#1D1F24'));
    rueda.rotation.x = Math.PI / 2;
    rueda.position.set(x, 0.3, z);
    camioneta.add(rueda);
  }
  const ESTACIONAMIENTO = v3(ESTACIONAMIENTO_BASE);
  camioneta.position.copy(ESTACIONAMIENTO);
  escena.add(camioneta);

  // ---------- Movimiento: siempre por calles (vias.js), nunca a través de edificios ----------
  const movimientos = new Set();
  function cancelarMovimiento(obj) {
    for (const m of movimientos) if (m.obj === obj) { movimientos.delete(m); m.resolver(); }
  }
  function mover(obj, puntos, velocidad) {
    return new Promise((resolver) => {
      cancelarMovimiento(obj);
      const recorrido = puntos.map(v3);
      if (reducirMovimiento) {
        obj.position.copy(recorrido.at(-1));
        resolver();
        return;
      }
      movimientos.add({ obj, puntos: recorrido, velocidad, resolver, t: 0 });
    });
  }
  function avanzarMovimientos(dt) {
    for (const m of movimientos) {
      let restante = m.velocidad * dt;
      m.t += dt;
      while (restante > 0 && m.puntos.length) {
        const objetivo = m.puntos[0];
        const delta = objetivo.clone().sub(m.obj.position).setY(0);
        const dist = delta.length();
        if (dist > 0.001) m.obj.rotation.y = Math.atan2(delta.x, delta.z) - (m.obj === camioneta ? Math.PI / 2 : 0);
        if (dist <= restante) { m.obj.position.copy(objetivo); m.puntos.shift(); restante -= dist; } else { m.obj.position.add(delta.multiplyScalar(restante / dist)); restante = 0; }
      }
      if (m.obj !== camioneta) m.obj.position.y = m.puntos.length ? Math.abs(Math.sin(m.t * 12)) * 0.12 : 0;
      if (!m.puntos.length) { m.obj.position.y = 0; movimientos.delete(m); m.resolver(); }
    }
  }

  function caminar(per, sedeDestino, destino) {
    const puntos = ruta(per.sedeActual, sedeDestino, destino, { desde: { x: per.g.position.x, z: per.g.position.z } });
    per.sedeActual = sedeDestino;
    per.destino = v3(destino);
    return mover(per.g, puntos, VELOCIDAD_PERSONA);
  }

  // ---------- Estado → escena ----------
  const destinosForzados = new Map(); // personaId → { sedeId }
  let ultimoEstado = null;
  let colaCamioneta = Promise.resolve();

  function actualizar(estado) {
    const reinicio = estado.bitacora.length === 0 && ultimoEstado && ultimoEstado.bitacora.length > 0;
    ultimoEstado = estado;

    for (const reg of Object.values(sedes)) {
      if (!reg.anillo) continue;
      const est = estadoSede(estado, reg.s.id);
      reg.estado = est;
      reg.anillo.material.color.set(COLOR_ESTADO[est]);
      reg.disco.material.color.set(COLOR_ESTADO[est]);
      reg.pin.visible = est === 'alerta' || est === 'incidencia';
      reg.pin.children[0].material.color.set(COLOR_ESTADO[est]);
    }
    sedes.lote.etiqueta.textContent = estado.loteConvertido ? LOTE.nombre : `${LOTE.nombre} · prospecto`;
    if (estado.loteConvertido && !hotel.visible) {
      hotel.visible = true;
      crecimiento = reducirMovimiento ? 1 : 0;
    }
    if (!estado.loteConvertido && hotel.visible) {
      hotel.visible = false;
      hotel.scale.setScalar(0.001);
      obra.visible = true;
    }

    // Libera al operario de mantenimiento cuando su incidencia se resolvió.
    for (const [id, f] of destinosForzados) {
      const pendientes = (estado.incidencias[f.sedeId] ?? []).some((i) => i.responsable === id && i.estado !== 'resuelta');
      if (!pendientes) destinosForzados.delete(id);
    }

    const porSede = {};
    for (const [id, e] of Object.entries(estado.personal)) if (e.enTurno) (porSede[e.sede] ??= []).push(id);
    for (const [id, per] of Object.entries(personas)) {
      const e = estado.personal[id];
      let sedeDestino = 'base';
      let destino = per.casa;
      if (destinosForzados.has(id)) {
        sedeDestino = destinosForzados.get(id).sedeId;
        destino = puestoMantenimiento(sedeDestino);
      } else if (e.enTurno) {
        sedeDestino = e.sede;
        destino = puestoEnSede(e.sede, porSede[e.sede].indexOf(id), porSede[e.sede].length, e.fueraZona);
      }
      if (reinicio) {
        cancelarMovimiento(per.g);
        per.g.position.copy(v3(destino));
        per.destino = v3(destino);
        per.sedeActual = sedeDestino;
      } else if (v3(destino).distanceTo(per.destino) > 0.05) {
        caminar(per, sedeDestino, destino);
      }
    }
    if (reinicio) {
      cancelarMovimiento(camioneta);
      camioneta.position.copy(ESTACIONAMIENTO);
      camioneta.rotation.y = 0;
    }
  }

  function moverPersona(personaId, sedeId) {
    const per = personas[personaId];
    if (!per || !sedes[sedeId]) return Promise.resolve();
    destinosForzados.set(personaId, { sedeId });
    return caminar(per, sedeId, puestoMantenimiento(sedeId));
  }

  // La camioneta sale del estacionamiento de la base, va por calles hasta el estacionamiento
  // frente a la sede (sin entrar al edificio), descarga y vuelve por el mismo camino.
  function moverCamioneta(sedeId) {
    if (!sedes[sedeId] || sedeId === 'base') return Promise.resolve();
    let llegada;
    const viaje = colaCamioneta.then(async () => {
      await mover(camioneta, ruta('base', sedeId, bahia(sedeId), { vehiculo: true }), VELOCIDAD_CAMIONETA);
      llegada();
      await new Promise((r) => setTimeout(r, 900));
      await mover(camioneta, ruta(sedeId, 'base', ESTACIONAMIENTO_BASE, { vehiculo: true }), VELOCIDAD_CAMIONETA);
      camioneta.rotation.y = 0;
    });
    colaCamioneta = viaje.catch(() => {});
    return new Promise((r) => { llegada = r; });
  }

  // ---------- Cámara: encuadre y enfoque ----------
  let enfoque = null;
  function enfocar(objetivo) {
    const reg = sedes[objetivo];
    const destino = reg ? new THREE.Vector3(reg.s.x, objetivo === 'lote' ? 5 : 0, reg.s.z) : new THREE.Vector3(0, 0, 0); // el lote sube el encuadre para que entre la grúa
    const zoom = reg ? (objetivo === 'lote' ? 1.55 : ligera ? 1.5 : 1.7) : ZOOM_GENERAL;
    if (reducirMovimiento) {
      const delta = destino.clone().sub(controles.target);
      controles.target.add(delta);
      camara.position.add(delta);
      camara.zoom = zoom;
      camara.updateProjectionMatrix();
      return;
    }
    enfoque = { desde: controles.target.clone(), hasta: destino, zoomDesde: camara.zoom, zoomHasta: zoom, t: 0 };
  }
  function avanzarEnfoque(dt) {
    if (!enfoque) return;
    enfoque.t = Math.min(1, enfoque.t + dt / 1.2);
    const k = enfoque.t < 0.5 ? 2 * enfoque.t * enfoque.t : 1 - (-2 * enfoque.t + 2) ** 2 / 2;
    const nuevo = enfoque.desde.clone().lerp(enfoque.hasta, k);
    const delta = nuevo.sub(controles.target);
    controles.target.add(delta);
    camara.position.add(delta);
    camara.zoom = enfoque.zoomDesde + (enfoque.zoomHasta - enfoque.zoomDesde) * k;
    camara.updateProjectionMatrix();
    if (enfoque.t >= 1) enfoque = null;
  }

  function redimensionar() {
    const w = contenedor.clientWidth || window.innerWidth;
    const h = contenedor.clientHeight || window.innerHeight;
    renderer.setSize(w, h, false);
    const aspecto = w / h;
    const mitad = aspecto >= 1 ? 25 : 25.5 / aspecto;
    const corrimiento = w >= 768 ? mitad * aspecto * 0.08 : 0; // deja espacio a los paneles de la izquierda
    // En celular la ciudad se centra en el espacio libre entre los indicadores (arriba) y el copiloto (abajo).
    const elevar = w < 768 ? -mitad * 0.06 : 0;
    Object.assign(camara, { left: -mitad * aspecto - corrimiento, right: mitad * aspecto - corrimiento, top: mitad - elevar, bottom: -mitad - elevar });
    camara.updateProjectionMatrix();
  }
  const observador = new ResizeObserver(redimensionar);
  observador.observe(contenedor);
  redimensionar();

  // ---------- Selección ----------
  const rayo = new THREE.Raycaster();
  let inicioPuntero = null;
  const alBajar = (e) => { inicioPuntero = { x: e.clientX, y: e.clientY }; };
  const alSubir = (e) => {
    if (!inicioPuntero || Math.hypot(e.clientX - inicioPuntero.x, e.clientY - inicioPuntero.y) > 5) return;
    const r = renderer.domElement.getBoundingClientRect();
    rayo.setFromCamera(new THREE.Vector2(((e.clientX - r.left) / r.width) * 2 - 1, -((e.clientY - r.top) / r.height) * 2 + 1), camara);
    const golpe = rayo.intersectObjects(hitboxes, false)[0];
    if (golpe) alSeleccionar(golpe.object.userData.sedeId);
  };
  renderer.domElement.addEventListener('pointerdown', alBajar);
  renderer.domElement.addEventListener('pointerup', alSubir);

  // ---------- Bucle ----------
  const reloj = new THREE.Clock();
  let crecimiento = 1;
  let tiempo = 0;
  const proyeccion = new THREE.Vector3();
  renderer.setAnimationLoop(() => {
    const dt = Math.min(reloj.getDelta(), 0.05);
    if (document.hidden) return;
    tiempo += dt;
    avanzarMovimientos(dt);
    if (obra.visible) animarGrua(tiempo);
    avanzarEnfoque(dt);
    if (crecimiento < 1) {
      crecimiento = Math.min(1, crecimiento + dt / 1.4);
      const k = 1 - (1 - crecimiento) ** 3;
      hotel.scale.set(1, Math.max(0.001, k), 1);
      obra.visible = crecimiento < 0.4;
    } else if (hotel.visible) {
      hotel.scale.setScalar(1);
      obra.visible = false;
    }
    for (const reg of Object.values(sedes)) {
      if (reg.pin?.visible) {
        reg.pin.position.y = ALTURA_ETIQUETA[reg.s.id] - 1.2 + (reducirMovimiento ? 0 : Math.sin(tiempo * 3) * 0.3);
        reg.anillo.material.opacity = reducirMovimiento ? 0.95 : 0.6 + Math.abs(Math.sin(tiempo * 3)) * 0.4;
        reg.disco.material.opacity = reducirMovimiento ? 0.18 : 0.1 + Math.abs(Math.sin(tiempo * 3)) * 0.14;
      } else if (reg.anillo) {
        reg.anillo.material.opacity = 0.95;
        reg.disco.material.opacity = 0.12;
      }
    }
    controles.update();
    renderer.render(escena, camara);
    const r = renderer.domElement.getBoundingClientRect();
    for (const reg of Object.values(sedes)) {
      proyeccion.copy(reg.puntoEtiqueta).project(camara);
      reg.etiqueta.style.left = `${((proyeccion.x + 1) / 2) * r.width}px`;
      reg.etiqueta.style.top = `${((1 - proyeccion.y) / 2) * r.height - 6}px`;
    }
  });

  return {
    actualizar,
    enfocar,
    moverCamioneta,
    moverPersona,
    autoGiro(activo) { controles.autoRotate = Boolean(activo) && !reducirMovimiento; },
    destruir() {
      renderer.setAnimationLoop(null);
      observador.disconnect();
      renderer.domElement.removeEventListener('pointerdown', alBajar);
      renderer.domElement.removeEventListener('pointerup', alSubir);
      controles.dispose();
      escena.traverse((o) => { o.geometry?.dispose(); o.material?.dispose?.(); });
      renderer.dispose();
      contenedor.replaceChildren();
    },
  };
}
