import { screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, describe, expect, it, vi } from 'vitest'

import { mockApi, PIKACHU, renderRoute, summary } from '../test/render'
import type { Pokemon } from '../services/types'

const PAGE = { limit: 24, offset: 0, next: null, previous: null }
const LIST = [summary(4, 'charmander', ['fire']), summary(25, 'pikachu', ['electric'])]

/** API falsa com listagem, ficha do Pikachu, ids e gerações (total 151). */
function mockFullApi(overrides: Partial<Pokemon> = {}) {
  return mockApi((url) => {
    if (url.pathname === '/generations') return { body: [{ id: 1, count: 151 }] }
    if (url.pathname === '/types') return { body: [] }
    if (url.pathname === '/pokemons/25' || url.pathname === '/pokemons/pikachu') {
      return { body: { ...PIKACHU, ...overrides } }
    }
    if (url.pathname === '/pokemons') {
      const ids = url.searchParams.get('ids')
      const sort = url.searchParams.get('sort')
      let data = ids ? LIST.filter((p) => ids.split(',').includes(String(p.id))) : LIST
      if (sort === '-speed') data = [...data].reverse()
      return { body: { data, pagination: { ...PAGE, total: data.length } } }
    }
    return undefined
  })
}

function stubMatchMedia(matches: boolean) {
  vi.stubGlobal('matchMedia', (query: string) => ({
    matches,
    media: query,
    addEventListener: () => {},
    removeEventListener: () => {},
  }))
}

afterEach(() => {
  vi.unstubAllGlobals()
})

describe('favoritos', () => {
  it('favorita pelo card sem abrir a ficha e mostra na página de favoritos', async () => {
    mockFullApi()
    const { router } = renderRoute('/pokedex')
    const card = (await screen.findByRole('link', { name: /charmander/i })).closest('article')!

    await userEvent.click(within(card).getByRole('button', { name: 'Adicionar Charmander aos favoritos' }))

    expect(router.state.location.pathname).toBe('/pokedex')
    expect(within(card).getByRole('button', { name: 'Remover Charmander dos favoritos' })).toHaveAttribute(
      'aria-pressed',
      'true',
    )
    // O contador aparece no menu.
    expect(screen.getByRole('link', { name: /Favoritos.*1/ })).toBeInTheDocument()

    await userEvent.click(screen.getByRole('link', { name: /Favoritos/ }))
    expect(await screen.findByRole('heading', { level: 1, name: 'Favoritos' })).toBeInTheDocument()
    expect(await screen.findByRole('link', { name: /charmander/i })).toBeInTheDocument()
    expect(screen.queryByRole('link', { name: /pikachu/i })).not.toBeInTheDocument()
  })

  it('mostra o estado vazio quando não há favoritos', async () => {
    mockFullApi()
    renderRoute('/favoritos')

    expect(await screen.findByText('Sua lista de favoritos está vazia.')).toBeInTheDocument()
  })
})

describe('jornada', () => {
  it('abrir a ficha conta como descoberto e aparece no início', async () => {
    mockFullApi()
    const { router } = renderRoute('/pokemon/pikachu')
    await screen.findByRole('heading', { level: 1, name: 'Pikachu' })

    await router.navigate('/')
    expect(await screen.findByRole('heading', { name: '1 de 151 descobertos' })).toBeInTheDocument()
    expect(screen.getByRole('progressbar', { name: 'Pokémon descobertos' })).toHaveAttribute('aria-valuenow', '1')
    // E entra nos vistos recentemente.
    const recent = await screen.findByRole('region', { name: 'Vistos recentemente' })
    expect(within(recent).getByRole('link', { name: /Pikachu/ })).toHaveAttribute('href', '/pokemon/25')
  })
})

describe('ordenação', () => {
  it('ordena pela URL e mostra o atributo nos cards', async () => {
    mockFullApi()
    const { router } = renderRoute('/pokedex')
    await screen.findByText('2 Pokémon encontrados')

    await userEvent.selectOptions(screen.getByLabelText('Ordenar'), '-speed')

    await waitFor(() => expect(router.state.location.search).toBe('?sort=-speed'))
    const cards = await screen.findAllByRole('article')
    expect(within(cards[0]).getByRole('link', { name: /pikachu/i })).toBeInTheDocument()
    expect(within(cards[0]).getByText('Velocidade')).toBeInTheDocument()
  })
})

describe('painel lateral', () => {
  it('no desktop, o card abre a ficha ao lado da lista e o Escape fecha', async () => {
    stubMatchMedia(true)
    mockFullApi()
    const { router } = renderRoute('/pokedex')

    await userEvent.click(await screen.findByRole('link', { name: /pikachu/i }))

    expect(router.state.location.pathname).toBe('/pokedex')
    expect(router.state.location.search).toBe('?selected=25')
    const panel = await screen.findByRole('complementary', { name: 'Detalhes do Pokémon selecionado' })
    expect(await within(panel).findByRole('heading', { name: 'Pikachu' })).toBeInTheDocument()
    expect(within(panel).getByRole('link', { name: /ficha completa/ })).toHaveAttribute('href', '/pokemon/25')

    await userEvent.keyboard('{Escape}')
    await waitFor(() => expect(router.state.location.search).toBe(''))
  })

  it('no celular, o card abre a página do Pokémon', async () => {
    stubMatchMedia(false)
    mockFullApi()
    const { router } = renderRoute('/pokedex')

    await userEvent.click(await screen.findByRole('link', { name: /pikachu/i }))

    await waitFor(() => expect(router.state.location.pathname).toBe('/pokemon/25'))
  })
})

describe('ficha', () => {
  it('navega para o vizinho pelas setas do teclado', async () => {
    mockFullApi()
    const { router } = renderRoute('/pokemon/25')
    await screen.findByRole('heading', { level: 1, name: 'Pikachu' })
    await screen.findByRole('link', { name: 'Próximo: #0026' })

    await userEvent.keyboard('{ArrowRight}')
    expect(router.state.location.pathname).toBe('/pokemon/26')
  })

  it('mostra fraquezas e resistências do tipo', async () => {
    mockFullApi()
    renderRoute('/pokemon/25')

    const section = (await screen.findByRole('heading', { name: 'Fraquezas e resistências' })).closest('section')!
    expect(within(section).getByRole('listitem', { name: 'Terrestre: ×2' })).toBeInTheDocument()
    expect(within(section).getByRole('listitem', { name: 'Voador: ×½' })).toBeInTheDocument()
  })

  it('alterna a arte shiny', async () => {
    mockFullApi({ artwork: 'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/other/official-artwork/25.png' })
    renderRoute('/pokemon/25')

    const button = await screen.findByRole('button', { name: 'Shiny' })
    await userEvent.click(button)

    expect(button).toHaveAttribute('aria-pressed', 'true')
    expect(screen.getByRole('img', { name: 'Arte de Pikachu na versão shiny' })).toHaveAttribute(
      'src',
      'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/other/official-artwork/shiny/25.png',
    )
  })
})
