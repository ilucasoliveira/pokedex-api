import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { render } from '@testing-library/react'
import { createMemoryRouter } from 'react-router'
import { vi } from 'vitest'

import { App } from '../App'
import { routes } from '../routes'
import type { EvolutionNode, Pokemon, PokemonSummary } from '../services/types'

/** Renderiza o app inteiro numa rota, com React Query sem novas tentativas. */
export function renderRoute(path: string) {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false, staleTime: Infinity } },
  })
  const router = createMemoryRouter(routes, { initialEntries: [path] })
  render(
    <QueryClientProvider client={queryClient}>
      <App router={router} />
    </QueryClientProvider>,
  )
  return { router }
}

type Handler = (url: URL) => { status?: number; body: unknown } | undefined

/** Substitui o fetch: cada requisição passa pelo handler; sem resposta, devolve 404. */
export function mockApi(handler: Handler) {
  return vi.spyOn(globalThis, 'fetch').mockImplementation(async (input) => {
    const url = new URL(String(input))
    const result = handler(url) ?? { status: 404, body: { detail: 'Not found' } }
    return new Response(JSON.stringify(result.body), {
      status: result.status ?? 200,
      headers: { 'Content-Type': 'application/json' },
    })
  })
}

export function summary(id: number, name: string, types: string[] = ['normal']): PokemonSummary {
  return {
    id,
    name,
    height: 4,
    weight: 60,
    types,
    sprites: `https://img.test/${id}.png`,
    artwork: `https://img.test/art/${id}.png`,
    generation: 1,
    stats: { hp: 50, attack: 50, defense: 50, special_attack: 50, special_defense: 50, speed: 50 },
  }
}

export function node(id: number, name: string, evolvesTo: EvolutionNode[] = [], extra: Partial<EvolutionNode> = {}): EvolutionNode {
  return {
    id,
    name,
    trigger: null,
    conditions: {},
    sprites: `https://img.test/${id}.png`,
    artwork: `https://img.test/art/${id}.png`,
    evolves_to: evolvesTo,
    ...extra,
  }
}

export const PIKACHU: Pokemon = {
  ...summary(25, 'pikachu', ['electric']),
  description: 'It stores electricity in its cheeks.',
  stats: { hp: 35, attack: 55, defense: 40, special_attack: 50, special_defense: 50, speed: 90 },
  abilities: [
    { name: 'static', is_hidden: false },
    { name: 'lightning-rod', is_hidden: true },
  ],
  evolution_chain: node(172, 'pichu', [
    node(25, 'pikachu', [node(26, 'raichu', [], { trigger: 'use-item', conditions: { item: 'thunder-stone' } })], {
      trigger: 'level-up',
      conditions: { min_happiness: 220 },
    }),
  ]),
}
