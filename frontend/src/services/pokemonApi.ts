import type {
  GenerationCount,
  Pokemon,
  PokemonList,
  TypeCount,
} from './types'

// Sem VITE_API_URL, o front usa a API publicada (o CORS dela já libera o Vite local).
const DEFAULT_API_URL = 'https://pokedex-api-cb8d.onrender.com'

export const API_URL = (import.meta.env.VITE_API_URL || DEFAULT_API_URL).replace(/\/$/, '')

export const PAGE_SIZE = 24

export class ApiError extends Error {
  readonly status: number

  constructor(status: number, message: string) {
    super(message)
    this.name = 'ApiError'
    this.status = status
  }
}

async function request<T>(path: string, signal?: AbortSignal): Promise<T> {
  const response = await fetch(`${API_URL}${path}`, {
    signal,
    headers: { Accept: 'application/json' },
  })

  if (!response.ok) {
    let detail = response.statusText
    try {
      const body: unknown = await response.json()
      if (body && typeof body === 'object' && 'detail' in body && typeof body.detail === 'string') {
        detail = body.detail
      }
    } catch {
      // Corpo sem JSON: fica o statusText.
    }
    throw new ApiError(response.status, detail)
  }

  return (await response.json()) as T
}

export interface PokemonFilters {
  search: string
  type: string
  generation: number | null
  sort: SortKey
  page: number
}

/** Ordenações aceitas pela API em ?sort= (o "-" inverte). */
export const SORT_KEYS = [
  'number',
  '-number',
  'name',
  '-name',
  '-total',
  '-hp',
  '-attack',
  '-defense',
  '-special_attack',
  '-special_defense',
  '-speed',
] as const

export type SortKey = (typeof SORT_KEYS)[number]

export const DEFAULT_SORT: SortKey = 'number'

/** A API aceita até 100 números em ?ids=. */
export const MAX_IDS = 100

export function fetchPokemonList(
  filters: PokemonFilters,
  signal?: AbortSignal,
): Promise<PokemonList> {
  const params = new URLSearchParams({
    limit: String(PAGE_SIZE),
    offset: String((filters.page - 1) * PAGE_SIZE),
  })
  if (filters.search) params.set('search', filters.search)
  if (filters.type) params.set('type', filters.type)
  if (filters.generation) params.set('generation', String(filters.generation))
  if (filters.sort !== DEFAULT_SORT) params.set('sort', filters.sort)

  return request<PokemonList>(`/pokemons?${params}`, signal)
}

/** Pokémon pelos números (favoritos, vistos recentemente), na ordem da Pokédex. */
export function fetchPokemonsByIds(ids: number[], signal?: AbortSignal): Promise<PokemonList> {
  const params = new URLSearchParams({
    ids: ids.slice(0, MAX_IDS).join(','),
    limit: String(MAX_IDS),
  })
  return request<PokemonList>(`/pokemons?${params}`, signal)
}

export function fetchPokemon(idOrName: string, signal?: AbortSignal): Promise<Pokemon> {
  return request<Pokemon>(`/pokemons/${encodeURIComponent(idOrName)}`, signal)
}

export function fetchTypes(signal?: AbortSignal): Promise<TypeCount[]> {
  return request<TypeCount[]>('/types', signal)
}

export function fetchGenerations(signal?: AbortSignal): Promise<GenerationCount[]> {
  return request<GenerationCount[]>('/generations', signal)
}
