import { act, renderHook } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'

import {
  discoveredCount,
  markDiscovered,
  pickUndiscovered,
  resetJourney,
  toggleFavorite,
  useJourney,
} from './journey'

describe('jornada', () => {
  it('adiciona e remove favoritos, do mais recente para o mais antigo', () => {
    const { result } = renderHook(() => useJourney())

    act(() => toggleFavorite(25))
    act(() => toggleFavorite(6))
    expect(result.current.favorites).toEqual([6, 25])

    act(() => toggleFavorite(25))
    expect(result.current.favorites).toEqual([6])
  })

  it('registra descobertos por geração e mantém os vistos recentemente sem repetir', () => {
    const { result } = renderHook(() => useJourney())

    act(() => markDiscovered(1, 1))
    act(() => markDiscovered(152, 2))
    act(() => markDiscovered(1, 1))

    expect(discoveredCount(result.current)).toBe(2)
    expect(discoveredCount(result.current, 1)).toBe(1)
    expect(result.current.recent).toEqual([1, 152])
  })

  it('salva no localStorage e recomeça do zero', () => {
    act(() => toggleFavorite(25))
    expect(window.localStorage.getItem('rota151:jornada:v1')).toContain('25')

    const { result } = renderHook(() => useJourney())
    act(() => resetJourney())
    expect(result.current).toEqual({ favorites: [], discovered: {}, recent: [] })
  })

  it('sorteia um Pokémon ainda não descoberto', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0)
    expect(pickUndiscovered(3, { 1: 1, 2: 1 })).toBe(3)
    // Com tudo descoberto, vale qualquer um.
    expect(pickUndiscovered(2, { 1: 1, 2: 1 })).toBe(1)
  })
})
