import { screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it } from 'vitest'

import { mockApi, renderRoute, summary } from '../test/render'

const POKEMONS = [
  summary(4, 'charmander', ['fire']),
  summary(5, 'charmeleon', ['fire']),
  summary(25, 'pikachu', ['electric']),
]

/** API falsa que filtra de verdade por search e type, como o back-end. */
function mockCatalogApi() {
  return mockApi((url) => {
    if (url.pathname === '/types') {
      return { body: [{ name: 'electric', count: 1 }, { name: 'fire', count: 2 }] }
    }
    if (url.pathname === '/generations') return { body: [{ id: 1, count: 3 }] }
    if (url.pathname === '/pokemons') {
      const search = url.searchParams.get('search') ?? ''
      const type = url.searchParams.get('type') ?? ''
      const data = POKEMONS.filter(
        (p) => p.name.includes(search) && (!type || p.types.includes(type)),
      )
      const pagination = { total: data.length, limit: 24, offset: 0, next: null, previous: null }
      return { body: { data, pagination } }
    }
    return undefined
  })
}

describe('catálogo', () => {
  it('não reaproveita os <li> do esqueleto para os cards (evita pulo de layout)', async () => {
    mockCatalogApi()
    renderRoute('/pokedex')
    const skeleton = new Set(within(screen.getByRole('list', { name: 'Carregando Pokémon' })).getAllByRole('listitem'))

    const cards = await screen.findAllByRole('article')

    expect(cards.map((card) => card.closest('li')).filter((item) => item && skeleton.has(item))).toEqual([])
  })

  it('corrige a URL com página além da última ou tipo e geração que não existem', async () => {
    mockCatalogApi()
    const { router } = renderRoute('/pokedex?page=999&sort=-speed')

    await waitFor(() => expect(router.state.location.search).toBe('?sort=-speed'))
    expect(await screen.findAllByRole('article')).toHaveLength(3)

    await router.navigate('/pokedex?type=banana&generation=99')
    await waitFor(() => expect(router.state.location.search).toBe(''))
    expect(screen.getByLabelText('Tipo')).toHaveValue('')
    expect(await screen.findByText('3 Pokémon encontrados')).toBeInTheDocument()
  })

  it('lista os pokémons com o total vindo da API', async () => {
    mockCatalogApi()
    renderRoute('/pokedex')

    expect(await screen.findByText('3 Pokémon encontrados')).toBeInTheDocument()
    const items = screen.getAllByRole('article')
    expect(items).toHaveLength(3)
    expect(within(items[0]).getByText('#0004')).toBeInTheDocument()
    expect(within(items[0]).getByRole('link', { name: /charmander/i })).toHaveAttribute('href', '/pokemon/4')
    expect(within(items[0]).getByText('Fogo')).toBeInTheDocument()
  })

  it('busca enquanto digita e guarda a busca na URL', async () => {
    const fetchMock = mockCatalogApi()
    const { router } = renderRoute('/pokedex')
    await screen.findByText('3 Pokémon encontrados')

    await userEvent.type(screen.getByLabelText('Buscar Pokémon por nome ou número'), 'Char')

    expect(await screen.findByText('2 Pokémon encontrados')).toBeInTheDocument()
    expect(router.state.location.search).toBe('?search=char')
    const lastCall = String(fetchMock.mock.calls.at(-1)?.[0])
    expect(lastCall).toContain('search=char')
  })

  it('filtra por tipo, volta para a página 1 e permite limpar', async () => {
    mockCatalogApi()
    const { router } = renderRoute('/pokedex?page=3')
    await screen.findByText(/Pokémon encontrad/)

    const typeSelect = screen.getByLabelText('Tipo')
    await screen.findByRole('option', { name: 'Elétrico (1)' })
    await userEvent.selectOptions(typeSelect, 'electric')

    expect(await screen.findByText('1 Pokémon encontrado')).toBeInTheDocument()
    expect(router.state.location.search).toBe('?type=electric')

    await userEvent.click(screen.getByRole('button', { name: 'Limpar filtros' }))
    expect(await screen.findByText('3 Pokémon encontrados')).toBeInTheDocument()
    expect(router.state.location.search).toBe('')
  })

  it('mostra o estado vazio com ação para limpar', async () => {
    mockCatalogApi()
    renderRoute('/pokedex?search=zzz')

    expect(await screen.findByText('Não encontramos esse Pokémon.')).toBeInTheDocument()
    expect(screen.getAllByRole('button', { name: 'Limpar filtros' })).toHaveLength(2)
  })

  it('mostra o erro e tenta de novo', async () => {
    let fail = true
    mockApi((url) => {
      if (url.pathname !== '/pokemons') return { body: [] }
      if (fail) return { status: 500, body: { detail: 'boom' } }
      return { body: { data: [summary(1, 'bulbasaur')], pagination: { total: 1, limit: 24, offset: 0, next: null, previous: null } } }
    })
    renderRoute('/pokedex')

    expect(await screen.findByRole('alert')).toHaveTextContent('Não foi possível carregar os Pokémon.')
    fail = false
    await userEvent.click(screen.getByRole('button', { name: 'Tentar novamente' }))

    await waitFor(() => expect(screen.getByText('1 Pokémon encontrado')).toBeInTheDocument())
  })
})
