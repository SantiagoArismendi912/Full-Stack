// Datos ficticios de la demo. Ninguno corresponde a personas, empresas ni clientes reales.

export const EMPRESA = { nombre: 'Brillo Total Servicios', rubro: 'Limpieza y mantenimiento' };

export const SEDES = [
  { id: 'base', nombre: 'Base operativa', tipo: 'base', x: -4.5, z: -3.2, radioM: 0, horario: '06:00–22:00' },
  { id: 'oficina', nombre: 'Oficina Corporativa Delta', tipo: 'oficina', x: -14, z: -10, radioM: 120, horario: '06:30–14:30' },
  { id: 'clinica', nombre: 'Clínica Sur', tipo: 'clinica', x: 14, z: -10, radioM: 150, horario: '08:00–16:00' },
  { id: 'colegio', nombre: 'Colegio Norte', tipo: 'colegio', x: -16, z: 9.5, radioM: 150, horario: '07:00–15:00' },
  { id: 'comercial', nombre: 'Centro Comercial Paseo', tipo: 'comercial', x: 15, z: 9.5, radioM: 200, horario: '07:00–15:00' },
  { id: 'residencial', nombre: 'Edificio Mirador', tipo: 'residencial', x: 0, z: -20, radioM: 100, horario: '07:00–13:00' },
];

export const LOTE = { id: 'lote', nombre: 'Hotel Costa', tipo: 'hotel', x: 0, z: 18, radioM: 150, horario: 'A definir' };

export const NOMBRES_TIPO = {
  base: 'Base operativa', oficina: 'Oficina', clinica: 'Clínica', colegio: 'Colegio',
  comercial: 'Centro comercial', residencial: 'Edificio residencial', hotel: 'Hotel',
};

export const PERSONAL = [
  { id: 'ana', nombre: 'Ana Pereira', rol: 'limpieza', sede: 'clinica' },
  { id: 'luis', nombre: 'Luis Méndez', rol: 'limpieza', sede: 'oficina' },
  { id: 'sofia', nombre: 'Sofía Rodríguez', rol: 'limpieza', sede: 'colegio' },
  { id: 'marta', nombre: 'Marta Silva', rol: 'limpieza', sede: 'comercial' },
  { id: 'carla', nombre: 'Carla Núñez', rol: 'limpieza', sede: 'comercial' },
  { id: 'diego', nombre: 'Diego Fernández', rol: 'limpieza', sede: 'residencial' },
  { id: 'pablo', nombre: 'Pablo Suárez', rol: 'mantenimiento', sede: 'base' },
  { id: 'laura', nombre: 'Laura Gómez', rol: 'supervisor', sede: 'base' },
];

export const NOMBRES_ROL = { limpieza: 'Limpieza', mantenimiento: 'Mantenimiento', supervisor: 'Supervisión' };

export const INSUMOS_INICIALES = {
  oficina: { desinfectante: { actual: 8, minimo: 4 }, papel: { actual: 20, minimo: 10 } },
  clinica: { desinfectante: { actual: 9, minimo: 6 }, papel: { actual: 14, minimo: 10 } },
  colegio: { desinfectante: { actual: 5, minimo: 5 }, papel: { actual: 18, minimo: 12 } },
  comercial: { desinfectante: { actual: 10, minimo: 6 }, bolsas: { actual: 40, minimo: 20 } },
  residencial: { desinfectante: { actual: 6, minimo: 3 }, bolsas: { actual: 15, minimo: 10 } },
};

export const NOMBRES_INSUMO = { desinfectante: 'Desinfectante', papel: 'Papel higiénico', bolsas: 'Bolsas de residuos' };

export const ETAPAS_CRM = ['Prospecto', 'Cotización', 'Seguimiento', 'Aceptada', 'Cliente'];
