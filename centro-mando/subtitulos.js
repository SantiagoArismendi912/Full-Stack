// Subtítulos de la locución (tiempos en segundos de la historia). Texto corregido: marca y términos bien escritos.
export const SUBTITULOS = [
 [
  1.69,
  4.29,
  "Cada mañana una empresa de limpieza y"
 ],
 [
  4.29,
  7.45,
  "mantenimiento enfrenta lo mismo."
 ],
 [
  7.45,
  9.97,
  "Personal repartido en decenas de sedes,"
 ],
 [
  9.97,
  12.57,
  "pedidos por mensajes, incidencias en"
 ],
 [
  12.57,
  15.73,
  "papel y nadie que vea el panorama"
 ],
 [
  15.73,
  16.52,
  "completo."
 ],
 [
  17.31,
  20.15,
  "Jornexa, gestión conectada. Convierte"
 ],
 [
  20.15,
  22.19,
  "esa operación en un centro de mando"
 ],
 [
  22.19,
  25.79,
  "vivo. Datos, contexto, decisión y acción"
 ],
 [
  25.79,
  26.95,
  "en un solo lugar."
 ],
 [
  27.78,
  30.34,
  "Primero, los datos. Amanece y el"
 ],
 [
  30.34,
  32.14,
  "personal marca su entrada desde el"
 ],
 [
  32.14,
  35.18,
  "celular. La geocerca confirma que cada"
 ],
 [
  35.18,
  37.66,
  "persona está donde debe estar y cada"
 ],
 [
  37.66,
  39.9,
  "jornada aparece en el mapa en tiempo"
 ],
 [
  39.9,
  40.5,
  "real."
 ],
 [
  41.26,
  43.9,
  "Después el contexto. Jornexa detecta lo"
 ],
 [
  43.9,
  46.22,
  "que necesita atención. Una entrada fuera"
 ],
 [
  46.22,
  48.34,
  "de la geocerca, una fuga de agua en el"
 ],
 [
  48.34,
  50.46,
  "centro comercial y el desinfectante del"
 ],
 [
  50.46,
  52.18,
  "colegio por debajo del mínimo."
 ],
 [
  52.89,
  55.53,
  "Y llega la decisión. El copiloto de"
 ],
 [
  55.53,
  58.17,
  "inteligencia artificial propone y"
 ],
 [
  58.17,
  61.65,
  "explica. Y tú tienes la última palabra."
 ],
 [
  61.65,
  63.29,
  "Apruebas con un solo clic."
 ],
 [
  64.15,
  67.03,
  "Entonces, la acción. La camioneta sale"
 ],
 [
  67.03,
  69.27,
  "con los insumos y el técnico llega a"
 ],
 [
  69.27,
  71.71,
  "resolver la incidencia. Hasta el nuevo"
 ],
 [
  71.71,
  74.15,
  "cliente, un hotel en construcción, pasa"
 ],
 [
  74.15,
  75.95,
  "de obra a operación."
 ],
 [
  76.7,
  77.5,
  "Jornexa."
 ],
 [
  77.74,
  80.4,
  "Software que entiende lo que está pasando,"
 ],
 [
  80.4,
  82.95,
  "propone qué hacer, y deja la decisión a las personas."
 ],
 [
  83.6,
  85.33,
  "¿Qué esperas? ¡Solicita tu demo!"
 ]
];

export function subtituloEn(t) {
  const s = t / 1000;
  return SUBTITULOS.find(([a, b]) => s >= a && s < b)?.[2] ?? '';
}
