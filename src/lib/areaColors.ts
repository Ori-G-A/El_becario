/**
 * Paleta para ÁREAS — tonos "carpeta/marcador de oficina".
 *
 * Deliberadamente distintos de los tokens reservados:
 *   - rojo/ámbar/verde = SOLO estado RAG
 *   - azul --sello = SOLO acción
 * Estos colores etiquetan ámbitos de vida, no comunican estado ni acción.
 */
export const AREA_COLORS = [
  '#8A63D2', // violeta
  '#E8639B', // rosa
  '#2AA9B5', // teal
  '#C77D3A', // manila / madera
  '#6B8E9E', // azul pizarra (apagado, ≠ --sello)
  '#B5495B', // vino
  '#5C8A4A', // oliva (apagado, ≠ rag-verde)
  '#D98C2B', // mostaza (≠ rag-ambar)
] as const

export const DEFAULT_AREA_COLOR = AREA_COLORS[0]
