import { act, screen } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'

import { mockApi, renderRoute } from '../test/render'

afterEach(() => {
  vi.restoreAllMocks()
})

describe('aviso de offline', () => {
  it('aparece quando a conexão cai e some quando volta', async () => {
    mockApi(() => undefined)
    const onLine = vi.spyOn(navigator, 'onLine', 'get').mockReturnValue(true)
    renderRoute('/sobre')
    await screen.findByRole('heading', { level: 1 })
    expect(screen.queryByText(/Você está offline/)).not.toBeInTheDocument()

    onLine.mockReturnValue(false)
    act(() => {
      window.dispatchEvent(new Event('offline'))
    })
    expect(screen.getByRole('status')).toHaveTextContent('Você está offline.')

    onLine.mockReturnValue(true)
    act(() => {
      window.dispatchEvent(new Event('online'))
    })
    expect(screen.queryByText(/Você está offline/)).not.toBeInTheDocument()
  })
})
