import '@testing-library/jest-dom/vitest'
import { cleanup } from '@testing-library/react'
import { afterEach, vi } from 'vitest'

import { resetJourney } from '../store/journey'
import { setLanguage, setTheme } from '../store/preferences'

// Os testes conferem os textos em português; o teste de idioma troca na hora.
setLanguage('pt')

afterEach(() => {
  cleanup()
  vi.restoreAllMocks()
  // Favoritos e descobertos não passam de um teste para o outro.
  resetJourney()
  window.localStorage.clear()
  setLanguage('pt')
  setTheme('light')
})

// O jsdom não implementa rolagem; o catálogo rola até os resultados ao trocar de página.
Element.prototype.scrollIntoView = vi.fn()
