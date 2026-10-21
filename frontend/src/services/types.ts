// Formatos devolvidos pela API (ver backend/app/schemas.py). Unidades como na
// PokéAPI: height em decímetros e weight em hectogramas.

export interface PokemonSummary {
  id: number
  name: string
  height: number
  weight: number
  types: string[]
  sprites: string | null
  artwork: string | null
  generation: number | null
  stats: PokemonStats | null
}

export interface PokemonStats {
  hp: number
  attack: number
  defense: number
  special_attack: number
  special_defense: number
  speed: number
}

export interface PokemonAbility {
  name: string
  is_hidden: boolean
}

export interface EvolutionNode {
  id: number
  name: string
  trigger: string | null
  conditions: Record<string, string | number | boolean>
  sprites: string | null
  artwork: string | null
  evolves_to: EvolutionNode[]
}

export interface Pokemon extends PokemonSummary {
  description: string | null
  abilities: PokemonAbility[]
  evolution_chain: EvolutionNode | null
}

export interface Pagination {
  total: number
  limit: number
  offset: number
  next: string | null
  previous: string | null
}

export interface PokemonList {
  data: PokemonSummary[]
  pagination: Pagination
}

export interface TypeCount {
  name: string
  count: number
}

export interface GenerationCount {
  id: number
  count: number
}
