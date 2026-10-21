import { describe, expect, it } from 'vitest'

import { node, PIKACHU } from '../test/render'
import type { Pokemon } from '../services/types'
import { findNode, stoneEvolutions, stoneSprite } from './stoneEvolution'

function withChain(id: number, chain: Pokemon['evolution_chain']): Pokemon {
  return { ...PIKACHU, id, evolution_chain: chain }
}

describe('evolução por pedra', () => {
  it('acha a pedra do Pikachu (Thunder Stone para Raichu)', () => {
    const [evolution] = stoneEvolutions(PIKACHU)
    expect(evolution.stone).toBe('thunder-stone')
    expect(evolution.target.name).toBe('raichu')
    expect(stoneSprite('thunder-stone')).toBe(
      'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/items/thunder-stone.png',
    )
  })

  it('não mostra pedra para quem evolui de outro jeito ou já é a última etapa', () => {
    expect(stoneEvolutions(withChain(172, PIKACHU.evolution_chain))).toEqual([]) // Pichu: amizade
    expect(stoneEvolutions(withChain(26, PIKACHU.evolution_chain))).toEqual([]) // Raichu
  })

  it('mostra todas as pedras de uma ramificação, como a do Gloom', () => {
    const chain = node(43, 'oddish', [
      node(44, 'gloom', [
        node(45, 'vileplume', [], { trigger: 'use-item', conditions: { item: 'leaf-stone' } }),
        node(182, 'bellossom', [], { trigger: 'use-item', conditions: { item: 'sun-stone' } }),
      ]),
    ])
    expect(stoneEvolutions(withChain(44, chain)).map((evolution) => evolution.target.name)).toEqual([
      'vileplume',
      'bellossom',
    ])
  })

  it('ignora itens que não são pedras e deixa o Eevee de fora', () => {
    const applin = node(840, 'applin', [
      node(841, 'flapple', [], { trigger: 'use-item', conditions: { item: 'tart-apple' } }),
    ])
    expect(stoneEvolutions(withChain(840, applin))).toEqual([])

    const eevee = node(133, 'eevee', [
      node(134, 'vaporeon', [], { trigger: 'use-item', conditions: { item: 'water-stone' } }),
    ])
    expect(stoneEvolutions(withChain(133, eevee))).toEqual([])
  })

  it('encontra uma etapa em qualquer nível da árvore', () => {
    expect(findNode(PIKACHU.evolution_chain, 26)?.name).toBe('raichu')
    expect(findNode(PIKACHU.evolution_chain, 999)).toBeNull()
  })
})
