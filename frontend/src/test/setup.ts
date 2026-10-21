import '@testing-library/jest-dom/vitest'
import { cleanup } from '@testing-library/react'
import { afterEach, vi } from 'vitest'

afterEach(() => {
  cleanup()
  vi.restoreAllMocks()
})

// O jsdom não implementa rolagem; o catálogo rola até os resultados ao trocar de página.
Element.prototype.scrollIntoView = vi.fn()
