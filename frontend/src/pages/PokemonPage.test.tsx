import { screen, within } from '@testing-library/react'
import { describe, expect, it } from 'vitest'

import { mockApi, node, PIKACHU, renderRoute } from '../test/render'
import type { Pokemon } from '../services/types'

function mockPokemon(pokemon: Pokemon) {
  return mockApi((url) =>
    url.pathname === `/pokemons/${pokemon.name}` || url.pathname === `/pokemons/${pokemon.id}`
      ? { body: pokemon }
      : undefined,
  )
}

describe('página do pokémon', () => {
  it('mostra a ficha completa em português', async () => {
    mockPokemon(PIKACHU)
    renderRoute('/pokemon/pikachu')

    const title = await screen.findByRole('heading', { level: 1, name: 'Pikachu' })
    expect(document.title).toBe('Pikachu (#0025) · Rota151')
    expect(title.previousElementSibling).toHaveTextContent('#0025')
    expect(within(screen.getAllByRole('list', { name: 'Tipos' })[0]).getByText('Elétrico')).toBeInTheDocument()
    expect(screen.getByText('Geração I')).toBeInTheDocument()
    expect(screen.getByText('0,4 m')).toBeInTheDocument()
    expect(screen.getByText('6,0 kg')).toBeInTheDocument()
    // A descrição vem em inglês da PokéAPI e é marcada como tal.
    expect(screen.getByText(PIKACHU.description!)).toHaveAttribute('lang', 'en')
  })

  it('separa a habilidade oculta e mostra os atributos com valor', async () => {
    mockPokemon(PIKACHU)
    renderRoute('/pokemon/pikachu')

    const abilities = (await screen.findByRole('heading', { name: 'Habilidades' })).closest('section')!
    expect(within(abilities).getByText('Static')).toBeInTheDocument()
    const hidden = within(abilities).getByText('Habilidade oculta').parentElement!
    expect(within(hidden).getByText('Lightning Rod')).toBeInTheDocument()

    const stats = screen.getByRole('heading', { name: 'Atributos base' }).closest('section')!
    expect(within(stats).getByText('Velocidade').nextElementSibling).toHaveTextContent('90')
    expect(within(stats).getByText('Total').nextElementSibling).toHaveTextContent('320')
  })

  it('desenha a linha evolutiva com o pokémon atual destacado', async () => {
    mockPokemon(PIKACHU)
    renderRoute('/pokemon/pikachu')

    const chain = await screen.findByRole('region', { name: 'Etapas da evolução' })
    expect(within(chain).getByRole('link', { name: /Pichu/ })).toHaveAttribute('href', '/pokemon/172')
    expect(within(chain).getByRole('link', { name: /Raichu/ })).toHaveAttribute('href', '/pokemon/26')
    expect(within(chain).getByText('Pikachu').closest('[aria-current="page"]')).not.toBeNull()
    expect(within(chain).getByText('Subir de nível, amizade 220+')).toBeInTheDocument()
    expect(within(chain).getByText('Usar Thunder Stone')).toBeInTheDocument()
  })

  it('mostra as ramificações de uma cadeia como a do Eevee', async () => {
    const eevee: Pokemon = {
      ...PIKACHU,
      id: 133,
      name: 'eevee',
      types: ['normal'],
      evolution_chain: node(133, 'eevee', [
        node(134, 'vaporeon', [], { trigger: 'use-item', conditions: { item: 'water-stone' } }),
        node(135, 'jolteon', [], { trigger: 'use-item', conditions: { item: 'thunder-stone' } }),
        node(136, 'flareon', [], { trigger: 'use-item', conditions: { item: 'fire-stone' } }),
        node(196, 'espeon', [], { trigger: 'level-up', conditions: { min_happiness: 160, time_of_day: 'day' } }),
      ]),
    }
    mockPokemon(eevee)
    renderRoute('/pokemon/eevee')

    const chain = await screen.findByRole('region', { name: 'Etapas da evolução' })
    for (const name of ['Vaporeon', 'Jolteon', 'Flareon', 'Espeon']) {
      expect(within(chain).getByRole('link', { name: new RegExp(name) })).toBeInTheDocument()
    }
  })

  it('avisa quando faltam dados em vez de esconder o painel', async () => {
    mockPokemon({ ...PIKACHU, description: null, stats: null, abilities: [], generation: null, evolution_chain: null })
    renderRoute('/pokemon/pikachu')

    await screen.findByRole('heading', { level: 1, name: 'Pikachu' })
    expect(screen.getByText('Evolução não disponível.')).toBeInTheDocument()
    expect(screen.getByText('Descrição: não informada')).toBeInTheDocument()
    expect(screen.getByText('Geração: não informada')).toBeInTheDocument()
    expect(screen.getAllByText('Não informado')).toHaveLength(2)
  })

  it('mostra "não encontrado" para um pokémon que não existe', async () => {
    mockApi(() => undefined)
    renderRoute('/pokemon/missingno')

    expect(await screen.findByText('Não encontramos esse Pokémon.')).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Ver a Pokédex' })).toHaveAttribute('href', '/pokedex')
  })
})
