// Solicitud de demo: validación y normalización (sin DOM; se prueba con node).

export const ORGANIZACIONES = { independiente: 'Independiente', pyme: 'Pyme', empresa: 'Empresa mediana o grande', otra: 'Otra' };
export const RUBROS = {
  limpieza: 'Limpieza', mantenimiento: 'Mantenimiento de edificios', ambos: 'Limpieza y mantenimiento',
  seguridad: 'Seguridad', servicios: 'Servicios generales', otro: 'Otro',
};
export const PERSONAL = { '1-10': '1 a 10', '11-50': '11 a 50', '51-200': '51 a 200', '200+': 'Más de 200' };
export const CONTACTOS = { whatsapp: 'WhatsApp', llamada: 'Llamada', email: 'Email' };
export const ORIGENES = {
  recomendacion: 'Me lo recomendaron', linkedin: 'LinkedIn', instagram: 'Instagram',
  facebook: 'Facebook', google: 'Google', otro: 'Otro',
};

const texto = (v, max) => String(v ?? '').replace(/\s+/g, ' ').trim().slice(0, max);
const deLista = (v, lista) => (Object.hasOwn(lista, v) ? v : '');

export function validarSolicitud(campos = {}) {
  const errores = {};
  const datos = {
    nombre: texto(campos.nombre, 80),
    organizacion: deLista(campos.organizacion, ORGANIZACIONES),
    organizacionOtra: texto(campos.organizacionOtra, 60),
    empresa: texto(campos.empresa, 80),
    rubro: deLista(campos.rubro, RUBROS),
    personal: deLista(campos.personal, PERSONAL),
    telefono: texto(campos.telefono, 25),
    email: texto(campos.email, 120).toLowerCase(),
    contactoPreferido: deLista(campos.contactoPreferido, CONTACTOS) || 'whatsapp',
    origen: deLista(campos.origen, ORIGENES),
    origenDetalle: texto(campos.origenDetalle, 80),
    comentario: String(campos.comentario ?? '').trim().slice(0, 500),
    consentimiento: campos.consentimiento === true,
  };

  if (!datos.nombre) errores.nombre = 'Escribe tu nombre y apellido.';
  else if (datos.nombre.split(' ').length < 2) errores.nombre = 'Agrega también tu apellido.';

  if (!datos.organizacion) errores.organizacion = 'Elige dónde trabajas.';
  else if (datos.organizacion === 'otra' && !datos.organizacionOtra) errores.organizacionOtra = 'Cuéntanos qué tipo de organización es.';

  const digitos = datos.telefono.replace(/\D/g, '');
  if (!datos.telefono) errores.telefono = 'Escribe un número de contacto.';
  else if (!/^\+?[\d\s\-().]+$/.test(datos.telefono) || digitos.length < 8 || digitos.length > 15) {
    errores.telefono = 'Revisa el número: incluye el código de área (8 a 15 dígitos).';
  }

  if (!datos.email) errores.email = 'Escribe tu email.';
  else if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(datos.email)) errores.email = 'Revisa el email: debe ser como nombre@empresa.com.';

  if (!datos.consentimiento) errores.consentimiento = 'Necesitamos tu autorización para contactarte.';

  // Campo trampa invisible: solo un robot lo completa.
  if (texto(campos.sitio, 200)) return { ok: false, spam: true, errores, datos };

  return { ok: Object.keys(errores).length === 0, errores, datos };
}

export function armarRegistro(datos, { ahora = new Date(), pagina = 'demo' } = {}) {
  return { ...datos, fecha: ahora.toISOString(), pagina, estado: 'nueva', version: 1 };
}
