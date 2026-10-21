import { DEFAULT_SORT, SORT_KEYS, type PokemonFilters, type SortKey } from '../services/pokemonApi'

// Busca, filtros e página ficam na URL (?search=pika&type=electric&generation=1&page=2),
// para o link poder ser compartilhado e o "Voltar" do navegador funcionar.

/** "#025 " → "025": o usuário pode digitar com # e não precisa dos zeros à esquerda. */
export function normalizeSearch(value: string): string {
  return value.trim().replace(/^#/, '').trim().toLowerCase()
}

function positiveInt(value: string | null): number | null {
  if (!value || !/^\d+$/.test(value)) return null
  const number = Number(value)
  return number >= 1 ? number : null
}

function readSort(value: string | null): SortKey {
  return SORT_KEYS.find((key) => key === value) ?? DEFAULT_SORT
}

export function readCatalogParams(params: URLSearchParams): PokemonFilters {
  return {
    search: normalizeSearch(params.get('search') ?? ''),
    type: (params.get('type') ?? '').trim().toLowerCase(),
    generation: positiveInt(params.get('generation')),
    sort: readSort(params.get('sort')),
    page: positiveInt(params.get('page')) ?? 1,
  }
}

/** Monta a query string omitindo valores padrão (página 1, filtros vazios). */
export function catalogQuery(filters: PokemonFilters): string {
  const params = new URLSearchParams()
  if (filters.search) params.set('search', filters.search)
  if (filters.type) params.set('type', filters.type)
  if (filters.generation) params.set('generation', String(filters.generation))
  if (filters.sort !== DEFAULT_SORT) params.set('sort', filters.sort)
  if (filters.page > 1) params.set('page', String(filters.page))
  const query = params.toString()
  return query ? `?${query}` : ''
}

export function hasActiveFilters(filters: PokemonFilters): boolean {
  return Boolean(filters.search || filters.type || filters.generation)
}
