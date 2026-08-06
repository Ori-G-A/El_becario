import type { CategoriaIniciativa } from '../types/database'

/**
 * Taxonomía fija (migración 14). Es el contrato con `amiga`: los nombres y el
 * significado no cambian, para que la serie histórica siga siendo comparable.
 *
 * `sueno` y `foco_profundo` NO están acá: los deriva la vista `uso_del_tiempo`
 * desde el tipo del bloque, no se eligen en la iniciativa.
 */
export const CATEGORIA_INICIATIVA: Record<
  CategoriaIniciativa,
  { label: string; ayuda: string }
> = {
  trabajo: {
    label: 'Trabajo',
    ayuda: 'Produce algo para alguien más: colegio, universidad, Oulad, encargos.',
  },
  ejercicio: {
    label: 'Ejercicio',
    ayuda: 'Movimiento con intención: gimnasio, caminata, deporte, estiramiento.',
  },
  cuidado_personal: {
    label: 'Cuidado personal',
    ayuda: 'Mantenimiento del cuerpo y los trámites de estar viva: aseo, salud, casa.',
  },
  comida: {
    label: 'Comida',
    ayuda: 'Comer y lo que come tiempo alrededor: cocinar, mercado, sobremesa.',
  },
  traslado: {
    label: 'Traslado',
    ayuda: 'Tiempo en movimiento entre dos lugares. No es trabajo aunque vaya al trabajo.',
  },
  libre: {
    label: 'Libre',
    ayuda: 'Sin entregable: ocio, gente querida, leer por gusto, no hacer nada.',
  },
}

export const CATEGORIAS_INICIATIVA = Object.keys(
  CATEGORIA_INICIATIVA,
) as CategoriaIniciativa[]
