import { fireEvent, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { mockApi, PIKACHU, renderRoute, summary } from '../test/render'
import type { Pokemon } from '../services/types'

// A evolução (0,4 s com movimento reduzido) mais a troca de página passam do limite
// padrão de 1 s quando a máquina está ocupada (CI). Folga para não ficar instável.
const WAIT = { timeout: 4000 }

const RAICHU: Pokemon = {
  ...PIKACHU,
  ...summary(26, 'raichu', ['electric']),
  description: 'Its long tail serves as a ground.',
  abilities: PIKACHU.abilities,
  evolution_chain: PIKACHU.evolution_chain,
}

function mockEvolutionApi() {
  return mockApi((url) => {
    if (url.pathname === '/pokemons/25') return { body: PIKACHU }
    if (url.pathname === '/pokemons/26') return { body: RAICHU }
    if (url.pathname === '/generations') return { body: [{ id: 1, count: 151 }] }
    return { body: [] }
  })
}

beforeEach(() => {
  // Movimento reduzido: a animação dura 0,4 s em vez de 2,6 s, e o teste fica rápido.
  vi.stubGlobal('matchMedia', (query: string) => ({
    matches: query.includes('reduced-motion'),
    media: query,
    addEventListener: () => {},
    removeEventListener: () => {},
  }))
})

afterEach(() => {
  vi.unstubAllGlobals()
})

describe('evolução por pedra na ficha', () => {
  it('mostra a pedra como easter egg: sem dica na tela, fixa no canto', async () => {
    mockEvolutionApi()
    renderRoute('/pokemon/25')

    // O leitor de tela recebe a descrição completa; quem vê, só a pedra.
    const stone = await screen.findByRole('button', { name: 'Usar Thunder Stone em Pikachu: evolui para Raichu' })
    expect(stone).toHaveAttribute('title', 'Thunder Stone')
    expect(screen.queryByText(/Arraste/)).not.toBeInTheDocument()
    // Fica fora da arte (portal no <body>), para ser fixa no canto da tela.
    const artwork = screen.getByRole('img', { name: 'Arte de Pikachu' }).parentElement!
    expect(artwork).not.toContainElement(stone)
  })

  it('pelo teclado, Enter na pedra evolui e abre a ficha do Raichu com o aviso', async () => {
    mockEvolutionApi()
    const { router } = renderRoute('/pokemon/25')
    const stone = await screen.findByRole('button', { name: /Usar Thunder Stone/ })

    stone.focus()
    await userEvent.keyboard('{Enter}')

    expect(document.body).toHaveTextContent('Pikachu está evoluindo…')
    await waitFor(() => expect(router.state.location.pathname).toBe('/pokemon/26'), WAIT)
    expect(await screen.findByRole('heading', { level: 1, name: 'Raichu' }, WAIT)).toBeInTheDocument()
    // Balão visível sobre a arte (o mesmo texto também é anunciado ao leitor de tela).
    expect(screen.getByText('Parabéns!').parentElement).toHaveTextContent('Parabéns! Pikachu evoluiu para Raichu!')
    // O Raichu não evolui mais: nada de pedra.
    expect(screen.queryByRole('button', { name: /Usar .* Stone/ })).not.toBeInTheDocument()
  })

  it('arrastar e soltar sobre o Pokémon evolui; soltar fora devolve a pedra', async () => {
    mockEvolutionApi()
    const { router } = renderRoute('/pokemon/25')
    const stone = await screen.findByRole('button', { name: /Usar Thunder Stone/ })
    const artwork = screen.getByRole('img', { name: 'Arte de Pikachu' }).parentElement!
    artwork.getBoundingClientRect = () => ({ left: 0, top: 0, right: 200, bottom: 200, width: 200, height: 200, x: 0, y: 0, toJSON: () => ({}) })

    // Solta fora da arte: nada acontece.
    fireEvent.pointerDown(stone, { button: 0, clientX: 300, clientY: 300, pointerId: 1 })
    fireEvent.pointerMove(stone, { clientX: 400, clientY: 400, pointerId: 1 })
    fireEvent.pointerUp(stone, { clientX: 400, clientY: 400, pointerId: 1 })
    expect(router.state.location.pathname).toBe('/pokemon/25')
    expect(screen.getByRole('button', { name: /Usar Thunder Stone/ })).toBeInTheDocument()

    // Solta sobre o Pikachu: evolui.
    fireEvent.pointerDown(stone, { button: 0, clientX: 300, clientY: 300, pointerId: 1 })
    fireEvent.pointerMove(stone, { clientX: 100, clientY: 100, pointerId: 1 })
    expect(artwork.className).toContain('dropOver')
    fireEvent.pointerUp(stone, { clientX: 100, clientY: 100, pointerId: 1 })

    await waitFor(() => expect(router.state.location.pathname).toBe('/pokemon/26'), WAIT)
  })

  it('o painel lateral não tem pedra (só a ficha em página própria)', async () => {
    vi.stubGlobal('matchMedia', (query: string) => ({
      matches: query.includes('1280px'),
      media: query,
      addEventListener: () => {},
      removeEventListener: () => {},
    }))
    mockApi((url) => {
      if (url.pathname === '/pokemons/25') return { body: PIKACHU }
      if (url.pathname === '/pokemons') {
        return { body: { data: [summary(25, 'pikachu')], pagination: { total: 1, limit: 24, offset: 0, next: null, previous: null } } }
      }
      return { body: [] }
    })
    renderRoute('/pokedex?selected=25')

    const panel = await screen.findByRole('complementary')
    await within(panel).findByRole('heading', { name: 'Pikachu' })
    expect(within(panel).queryByRole('button', { name: /Usar Thunder Stone/ })).not.toBeInTheDocument()
  })
})
