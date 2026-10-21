import { describe, expect, it } from 'vitest'

import { catalogQuery, normalizeSearch, readCatalogParams } from './catalogParams'

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
      page: 3,
    })
    expect(readCatalogParams(new URLSearchParams('generation=abc&page=0'))).toEqual({
      search: '',
      type: '',
      generation: null,
      page: 1,
    })
  })

  it('monta a query string sem os valores padrão', () => {
    expect(catalogQuery({ search: '', type: '', generation: null, page: 1 })).toBe('')
    expect(catalogQuery({ search: 'char', type: 'fire', generation: 1, page: 2 })).toBe(
      '?search=char&type=fire&generation=1&page=2',
    )
  })
})
