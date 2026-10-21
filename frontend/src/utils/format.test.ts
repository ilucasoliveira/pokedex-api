import { describe, expect, it } from 'vitest'

import { node } from '../test/render'
import {
  formatEvolutionCondition,
  formatGeneration,
  formatHeight,
  formatName,
  formatNumber,
  formatType,
  formatWeight,
} from './format'

describe('formatação', () => {
  it('mostra o número com quatro dígitos sem cortar números maiores', () => {
    expect(formatNumber(25)).toBe('#0025')
    expect(formatNumber(1025)).toBe('#1025')
    expect(formatNumber(10191)).toBe('#10191')
  })

  it('converte decímetros e hectogramas para o formato brasileiro', () => {
    expect(formatHeight(4)).toBe('0,4 m')
    expect(formatHeight(17)).toBe('1,7 m')
    expect(formatWeight(60)).toBe('6,0 kg')
    expect(formatWeight(9999)).toBe('999,9 kg')
  })

  it('transforma nomes da API em nomes legíveis', () => {
    expect(formatName('lightning-rod')).toBe('Lightning Rod')
    expect(formatName('urshifu-single-strike')).toBe('Urshifu Single Strike')
  })

  it('traduz os tipos conhecidos e mantém os desconhecidos', () => {
    expect(formatType('fire')).toBe('Fogo')
    expect(formatType('stellar')).toBe('Stellar')
  })

  it('escreve a geração em algarismos romanos', () => {
    expect(formatGeneration(1)).toBe('Geração I')
    expect(formatGeneration(4)).toBe('Geração IV')
    expect(formatGeneration(9)).toBe('Geração IX')
  })
})

describe('condição de evolução', () => {
  it('resume subir de nível e usar item', () => {
    expect(formatEvolutionCondition(node(2, 'ivysaur', [], { trigger: 'level-up', conditions: { min_level: 16 } }))).toBe('Nível 16')
    expect(formatEvolutionCondition(node(26, 'raichu', [], { trigger: 'use-item', conditions: { item: 'thunder-stone' } }))).toBe(
      'Usar Thunder Stone',
    )
  })

  it('junta o gatilho com as demais condições', () => {
    const espeon = node(196, 'espeon', [], {
      trigger: 'level-up',
      conditions: { min_happiness: 160, time_of_day: 'day' },
    })
    expect(formatEvolutionCondition(espeon)).toBe('Subir de nível, amizade 160+, de dia')
  })

  it('mantém zero como condição válida e descreve gatilhos desconhecidos', () => {
    const hitmontop = node(237, 'hitmontop', [], {
      trigger: 'level-up',
      conditions: { min_level: 20, relative_physical_stats: 0 },
    })
    expect(formatEvolutionCondition(hitmontop)).toBe('Subir de nível, nível 20, Ataque igual à Defesa')
    expect(formatEvolutionCondition(node(1, 'x', [], { trigger: 'gimmighoul-coins' }))).toBe('Gimmighoul Coins')
  })

  it('não mostra nada na primeira etapa', () => {
    expect(formatEvolutionCondition(node(172, 'pichu'))).toBeNull()
  })
})
