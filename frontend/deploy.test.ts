import { createHash } from 'node:crypto'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'

import { describe, expect, it } from 'vitest'

// Confere a Content-Security-Policy do render.yaml contra o código. Uma CSP errada
// só aparece em produção (script bloqueado, tela piscando no tema errado, API
// recusada), então o CI precisa pegar antes.

// Os testes rodam a partir de frontend/ (npm test aqui e no CI).
const html = readFileSync(resolve('index.html'), 'utf8')
const renderYaml = readFileSync(resolve('..', 'render.yaml'), 'utf8')

function csp(): string {
  const match = renderYaml.match(/name: Content-Security-Policy\s+value: "([^"]+)"/)
  if (!match) throw new Error('Content-Security-Policy não encontrada no render.yaml')
  return match[1]
}

function directive(name: string): string[] {
  const found = csp()
    .split(';')
    .map((part) => part.trim().split(/\s+/))
    .find(([key]) => key === name)
  return found ? found.slice(1) : []
}

describe('Content-Security-Policy do site', () => {
  it('libera o script inline do index.html pelo hash', () => {
    const inline = [...html.matchAll(/<script(?![^>]*\bsrc=)[^>]*>([\s\S]*?)<\/script>/g)].map((match) => match[1])
    expect(inline.length).toBeGreaterThan(0)

    for (const script of inline) {
      const hash = `'sha256-${createHash('sha256').update(script).digest('base64')}'`
      expect(directive('script-src'), `atualize o hash no render.yaml para ${hash}`).toContain(hash)
    }
  })

  it('libera a API configurada no build do site', () => {
    const apiUrl = renderYaml.match(/key: VITE_API_URL\s+value: (\S+)/)?.[1]
    expect(apiUrl).toBeDefined()
    expect(directive('connect-src')).toContain(new URL(apiUrl!).origin)
  })

  it('não permite embutir o site nem scripts de fora', () => {
    expect(directive('frame-ancestors')).toEqual(["'none'"])
    expect(directive('object-src')).toEqual(["'none'"])
    expect(directive('script-src')).not.toContain("'unsafe-inline'")
  })
})
