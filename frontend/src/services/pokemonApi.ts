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
  page: number
}

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
