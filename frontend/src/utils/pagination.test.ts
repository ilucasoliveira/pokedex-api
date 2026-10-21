import { describe, expect, it } from 'vitest'

import { pageItems } from './pagination'

describe('pageItems', () => {
  it('mostra todas as páginas quando são poucas', () => {
    expect(pageItems(1, 1)).toEqual([1])
    expect(pageItems(2, 4)).toEqual([1, 2, 3, 4])
  })

  it('usa reticências longe da página atual', () => {
    expect(pageItems(1, 43)).toEqual([1, 2, 'gap', 43])
    expect(pageItems(20, 43)).toEqual([1, 'gap', 19, 20, 21, 'gap', 43])
    expect(pageItems(43, 43)).toEqual([1, 'gap', 42, 43])
  })

  it('mostra o número em vez de reticências para uma página só', () => {
    expect(pageItems(4, 43)).toEqual([1, 2, 3, 4, 5, 'gap', 43])
  })
})
