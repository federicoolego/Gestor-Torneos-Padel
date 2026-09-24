import type { Categoria } from './types'

/**
 * Espejo en el cliente de la regla que valida la base (pareja_puede_jugar).
 * - Un caballero solo juega categorías de caballeros.
 * - Una dama juega damas, o caballeros con 2 categorías de ventaja (dama 5ta = caballero 7ma).
 * - La pareja juega en la categoría de su jugador mejor categorizado o superiores.
 */
export function nivelEfectivo(jugador: Categoria, torneo: Categoria): number | null {
  if (torneo.genero === 'damas' && jugador.genero === 'caballeros') return null
  if (torneo.genero === 'caballeros' && jugador.genero === 'damas') return jugador.nivel + 2
  return jugador.nivel
}

export function parejaPuedeJugar(j1: Categoria, j2: Categoria, torneo: Categoria): boolean {
  const a = nivelEfectivo(j1, torneo)
  const b = nivelEfectivo(j2, torneo)
  if (a === null || b === null) return false
  return torneo.nivel <= Math.min(a, b)
}

export function categoriasHabilitadas(j1: Categoria, j2: Categoria, todas: Categoria[]): Categoria[] {
  return todas.filter((c) => parejaPuedeJugar(j1, j2, c))
}
