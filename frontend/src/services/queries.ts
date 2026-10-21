import { keepPreviousData, QueryClient, useQuery } from '@tanstack/react-query'

import {
  ApiError,
  fetchGenerations,
  fetchPokemon,
  fetchPokemonList,
  fetchTypes,
  type PokemonFilters,
} from './pokemonApi'

export function createQueryClient(): QueryClient {
  return new QueryClient({
    defaultOptions: {
      queries: {
        // Os dados da Pokédex quase não mudam: 5 minutos sem buscar de novo.
        staleTime: 5 * 60 * 1000,
        refetchOnWindowFocus: false,
        // 404 é resposta definitiva; erros de rede e 5xx merecem mais duas tentativas.
        retry: (failureCount, error) =>
          !(error instanceof ApiError && error.status < 500) && failureCount < 2,
      },
    },
  })
}

export function usePokemonList(filters: PokemonFilters) {
  return useQuery({
    queryKey: ['pokemons', filters],
    queryFn: ({ signal }) => fetchPokemonList(filters, signal),
    // Mantém a página anterior na tela enquanto a próxima carrega.
    placeholderData: keepPreviousData,
  })
}

export function usePokemon(idOrName: string) {
  return useQuery({
    queryKey: ['pokemon', idOrName.toLowerCase()],
    queryFn: ({ signal }) => fetchPokemon(idOrName, signal),
  })
}

export function useTypes() {
  return useQuery({ queryKey: ['types'], queryFn: ({ signal }) => fetchTypes(signal) })
}

export function useGenerations() {
  return useQuery({
    queryKey: ['generations'],
    queryFn: ({ signal }) => fetchGenerations(signal),
  })
}
