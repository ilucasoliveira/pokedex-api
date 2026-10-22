import { describe, expect, it } from 'vitest'

import { catalogQuery, correctFilters, normalizeSearch, readCatalogParams } from './catalogParams'

describe('parâmetros do catálogo', () => {
  it('normaliza a busca: espaços, # e maiúsculas', () => {
    expect(normalizeSearch('  #025 ')).toBe('025')
    expect(normalizeSearch('PiKa')).toBe('pika')
  })

  it('lê a URL e ignora valores inválidos', () => {
    expect(readCatalogParams(new URLSearchParams('search=Pika&type=Fire&generation=2&page=3'))).toEqual({
      search: 'pika',
      type: 'fire',
      generation: 2,
      sort: 'number',
      page: 3,
    })
    expect(readCatalogParams(new URLSearchParams('generation=abc&page=0&sort=peso'))).toEqual({
      search: '',
      type: '',
      generation: null,
      sort: 'number',
      page: 1,
    })
    expect(readCatalogParams(new URLSearchParams('sort=-speed')).sort).toBe('-speed')
  })

  it('monta a query string sem os valores padrão', () => {
    expect(catalogQuery({ search: '', type: '', generation: null, sort: 'number', page: 1 })).toBe('')
    expect(catalogQuery({ search: 'char', type: 'fire', generation: 1, sort: '-speed', page: 2 })).toBe(
      '?search=char&type=fire&generation=1&sort=-speed&page=2',
    )
  })
})

describe('correção dos filtros', () => {
  const base = { search: '', type: '', generation: null, sort: 'number', page: 1 } as const
  const known = { totalPages: 43, types: ['fire', 'water'], generations: [1, 2] }

  it('não mexe no que existe', () => {
    expect(correctFilters({ ...base, type: 'fire', generation: 2, page: 43 }, known)).toBeNull()
  })

  it('leva a página além da última para a última', () => {
    expect(correctFilters({ ...base, page: 999 }, known)).toEqual({ ...base, page: 43 })
  })

  it('tira tipo e geração que não existem e volta para a página 1', () => {
    expect(correctFilters({ ...base, type: 'banana', generation: 99, page: 5 }, known)).toEqual(base)
  })

  it('espera os dados carregarem antes de corrigir', () => {
    expect(correctFilters({ ...base, type: 'banana', page: 999 }, { totalPages: null, types: null, generations: null })).toBeNull()
  })

  it('busca sem resultado (0 páginas) fica como está, com o aviso de vazio', () => {
    expect(correctFilters({ ...base, search: 'zzz', page: 3 }, { ...known, totalPages: 0 })).toBeNull()
  })
})
