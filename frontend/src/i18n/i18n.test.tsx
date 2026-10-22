import { act, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it } from 'vitest'

import { setLanguage } from '../store/preferences'
import { mockApi, PIKACHU, renderRoute } from '../test/render'
import { formatEvolutionCondition, formatHeight, formatType } from '../utils/format'
import { node } from '../test/render'
import { en, pt } from './messages'
import { t } from '.'

describe('idiomas', () => {
  it('tem as mesmas chaves em português e inglês, sem textos vazios', () => {
    expect(Object.keys(en).sort()).toEqual(Object.keys(pt).sort())
    expect(Object.values(en).every((text) => text.trim().length > 0)).toBe(true)
  })

  it('troca parâmetros e formata números, tipos e condições no idioma atual', () => {
    expect(t('favorite.add', { name: 'Pikachu' })).toBe('Adicionar Pikachu aos favoritos')
    expect(formatHeight(4)).toBe('0,4 m')
    expect(formatType('fire')).toBe('Fogo')

    act(() => setLanguage('en'))
    expect(t('favorite.add', { name: 'Pikachu' })).toBe('Add Pikachu to favorites')
    expect(formatHeight(4)).toBe('0.4 m')
    expect(formatType('fire')).toBe('Fire')
    expect(
      formatEvolutionCondition(node(2, 'ivysaur', [], { trigger: 'level-up', conditions: { min_level: 16 } })),
    ).toBe('Level 16')
    expect(document.documentElement.lang).toBe('en')
  })

  it('o botão de idioma troca a interface inteira e guarda a escolha', async () => {
    mockApi((url) => (url.pathname === '/pokemons/25' ? { body: PIKACHU } : { body: [] }))
    renderRoute('/pokemon/25')
    await screen.findByRole('heading', { level: 1, name: 'Pikachu' })
    expect(screen.getByRole('heading', { name: 'Atributos base' })).toBeInTheDocument()

    await userEvent.click(screen.getByRole('button', { name: 'EN: Switch to English' }))

    expect(await screen.findByRole('heading', { name: 'Base stats' })).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Back to list' })).toBeInTheDocument()
    const types = screen.getAllByRole('list', { name: 'Types' })[0]
    expect(within(types).getByText('Electric')).toBeInTheDocument()
    expect(window.localStorage.getItem('rota151:idioma')).toBe('en')
    expect(screen.getByRole('button', { name: 'PT: Mudar para português' })).toBeInTheDocument()
  })
})

describe('tema', () => {
  it('alterna entre claro e escuro e guarda a escolha', async () => {
    mockApi(() => ({ body: [] }))
    renderRoute('/sobre')

    await userEvent.click(screen.getByRole('button', { name: 'Ativar modo escuro' }))

    expect(document.documentElement.dataset.theme).toBe('dark')
    expect(window.localStorage.getItem('rota151:tema')).toBe('dark')
    await userEvent.click(screen.getByRole('button', { name: 'Ativar modo claro' }))
    expect(document.documentElement.dataset.theme).toBe('light')
  })
})

describe('rodapé', () => {
  it('mostra o copyright do ano atual e o autor nos dois idiomas', async () => {
    mockApi(() => ({ body: [] }))
    renderRoute('/sobre')
    const year = new Date().getFullYear()

    const footer = screen.getByRole('contentinfo')
    expect(footer).toHaveTextContent(`© ${year} Rota151 · Desenvolvido por Lucas de Oliveira`)
    expect(within(footer).getByRole('link', { name: 'Lucas de Oliveira' })).toHaveAttribute(
      'href',
      'https://github.com/ilucasoliveira',
    )

    await userEvent.click(screen.getByRole('button', { name: 'EN: Switch to English' }))
    expect(screen.getByRole('contentinfo')).toHaveTextContent(`© ${year} Rota151 · Built by Lucas de Oliveira`)
  })
})
