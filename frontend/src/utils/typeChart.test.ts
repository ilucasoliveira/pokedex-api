import { describe, expect, it } from 'vitest'

import { defenseMatchups, formatMultiplier } from './typeChart'

function asMap(types: string[]) {
  const { weak, resistant, immune } = defenseMatchups(types)
  return Object.fromEntries([...weak, ...resistant, ...immune].map((m) => [m.type, m.multiplier]))
}

describe('tabela de tipos', () => {
  it('calcula fraquezas e resistências de um tipo só', () => {
    const pikachu = asMap(['electric'])
    expect(pikachu.ground).toBe(2)
    expect(pikachu.flying).toBe(0.5)
    expect(pikachu.steel).toBe(0.5)
    expect(pikachu.electric).toBe(0.5)
    expect(pikachu.water).toBeUndefined()
  })

  it('multiplica os dois tipos: ×4, ×¼ e imunidade', () => {
    const charizard = asMap(['fire', 'flying'])
    expect(charizard.rock).toBe(4)
    expect(charizard.grass).toBe(0.25)
    expect(charizard.ground).toBe(0)
    expect(charizard.water).toBe(2)
  })

  it('ordena do mais forte para o mais fraco e separa as imunidades', () => {
    const { weak, resistant, immune } = defenseMatchups(['fire', 'flying'])
    expect(weak[0]).toEqual({ type: 'rock', multiplier: 4 })
    expect(resistant[0]).toEqual({ type: 'grass', multiplier: 0.25 })
    expect(immune).toEqual([{ type: 'ground', multiplier: 0 }])
  })

  it('ignora tipos fora da tabela', () => {
    expect(defenseMatchups(['stellar'])).toEqual({ weak: [], resistant: [], immune: [] })
  })

  it('escreve os multiplicadores como no jogo', () => {
    expect(formatMultiplier(4)).toBe('×4')
    expect(formatMultiplier(0.5)).toBe('×½')
    expect(formatMultiplier(0.25)).toBe('×¼')
  })
})
