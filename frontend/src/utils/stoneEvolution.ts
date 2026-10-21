import type { EvolutionNode, Pokemon } from '../services/types'

// Só pedras de evolução: outros itens (maçãs, armaduras, panelas) ficam de fora.
export const EVOLUTION_STONES = [
  'fire-stone',
  'water-stone',
  'thunder-stone',
  'leaf-stone',
  'moon-stone',
  'sun-stone',
  'shiny-stone',
  'dusk-stone',
  'dawn-stone',
  'ice-stone',
]

// O Eevee terá uma experiência própria (várias pedras, amizade, dia e noite).
const EXCLUDED_POKEMON = new Set([133])

export interface StoneEvolution {
  /** Nome da pedra na API, ex.: "thunder-stone". */
  stone: string
  /** Etapa para a qual a pedra evolui. */
  target: EvolutionNode
}

/** Sprite oficial da pedra no repositório da PokéAPI (pixel art, fundo transparente). */
export function stoneSprite(stone: string): string {
  return `https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/items/${stone}.png`
}

export function findNode(node: EvolutionNode | null, id: number): EvolutionNode | null {
  if (!node) return null
  if (node.id === id) return node
  for (const child of node.evolves_to) {
    const found = findNode(child, id)
    if (found) return found
  }
  return null
}

/** Pedras que evoluem este Pokémon (o Gloom tem duas: Leaf e Sun). */
export function stoneEvolutions(pokemon: Pokemon): StoneEvolution[] {
  if (EXCLUDED_POKEMON.has(pokemon.id)) return []
  const current = findNode(pokemon.evolution_chain, pokemon.id)
  if (!current) return []
  return current.evolves_to.flatMap((child) => {
    const stone = child.conditions.item
    return child.trigger === 'use-item' && typeof stone === 'string' && EVOLUTION_STONES.includes(stone)
      ? [{ stone, target: child }]
      : []
  })
}
