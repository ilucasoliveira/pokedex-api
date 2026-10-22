import { act, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, describe, expect, it, vi } from 'vitest'

import { InstallApp } from './InstallApp'

const IPHONE = 'Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15 Version/18.0 Mobile/15E148 Safari/604.1'

function stubStandalone(matches: boolean) {
  vi.stubGlobal('matchMedia', (query: string) => ({
    matches: matches && query.includes('standalone'),
    media: query,
    addEventListener: () => {},
    removeEventListener: () => {},
  }))
}

/** Simula o Chrome avisando que o site pode ser instalado. */
function fireInstallPrompt() {
  const prompt = vi.fn(async () => {})
  const event = Object.assign(new Event('beforeinstallprompt', { cancelable: true }), {
    prompt,
    userChoice: Promise.resolve({ outcome: 'accepted' as const }),
  })
  act(() => {
    window.dispatchEvent(event)
  })
  return { event, prompt }
}

afterEach(() => {
  vi.unstubAllGlobals()
  // O evento guardado não passa de um teste para o outro.
  act(() => {
    window.dispatchEvent(new Event('appinstalled'))
  })
})

describe('instalar o app', () => {
  it('não aparece em navegador sem instalação', () => {
    render(<InstallApp />)
    expect(screen.queryByRole('button')).not.toBeInTheDocument()
  })

  it('abre o instalador do navegador quando ele permite (Android)', async () => {
    render(<InstallApp />)
    const { event, prompt } = fireInstallPrompt()
    expect(event.defaultPrevented).toBe(true)

    await userEvent.click(screen.getByRole('button', { name: 'Instalar o app' }))

    expect(prompt).toHaveBeenCalledOnce()
    expect(screen.queryByRole('button', { name: 'Instalar o app' })).not.toBeInTheDocument()
  })

  it('explica o caminho pelo Safari no iPhone', async () => {
    vi.spyOn(navigator, 'userAgent', 'get').mockReturnValue(IPHONE)
    render(<InstallApp />)

    const button = screen.getByRole('button', { name: 'Instalar no iPhone' })
    expect(button).toHaveAttribute('aria-expanded', 'false')
    await userEvent.click(button)

    expect(button).toHaveAttribute('aria-expanded', 'true')
    expect(screen.getByText(/Adicionar à Tela de Início/)).toBeInTheDocument()
  })

  it('some quando o site já está aberto como app', () => {
    stubStandalone(true)
    render(<InstallApp />)
    fireInstallPrompt()
    expect(screen.queryByRole('button')).not.toBeInTheDocument()
  })
})
