import { useSyncExternalStore } from 'react'

// Instalação do app (PWA). No Android e no Chrome do computador, o navegador
// dispara "beforeinstallprompt" quando o site pode ser instalado; guardamos o
// evento para abrir o instalador pelo nosso botão. O iPhone não tem esse evento:
// lá a instalação é pelo menu Compartilhar do Safari, e o botão só explica.
// Este módulo é importado no main.tsx, antes do React, para não perder o evento.

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>
}

export interface InstallState {
  /** O navegador deixou o site abrir o instalador (Android, Chrome do computador). */
  canPrompt: boolean
  /** Já está aberto como app instalado. */
  standalone: boolean
  /** iPhone ou iPad: instalação pelo Safari, com instruções. */
  ios: boolean
}

let deferred: BeforeInstallPromptEvent | null = null
const listeners = new Set<() => void>()

function isStandalone(): boolean {
  return (
    (typeof window.matchMedia === 'function' && window.matchMedia('(display-mode: standalone)').matches) ||
    (navigator as Navigator & { standalone?: boolean }).standalone === true
  )
}

function isIos(): boolean {
  // iPadOS se apresenta como Mac; o toque denuncia.
  return /iphone|ipad|ipod/i.test(navigator.userAgent) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1)
}

let state: InstallState = { canPrompt: false, standalone: false, ios: false }

// Relido a cada leitura (o app pode passar a rodar instalado), mas devolve o mesmo
// objeto enquanto nada mudar, como o useSyncExternalStore exige.
function getSnapshot(): InstallState {
  const next = { canPrompt: deferred !== null, standalone: isStandalone(), ios: isIos() }
  if (next.canPrompt !== state.canPrompt || next.standalone !== state.standalone || next.ios !== state.ios) {
    state = next
  }
  return state
}

function refresh() {
  listeners.forEach((listener) => listener())
}

if (typeof window !== 'undefined') {
  window.addEventListener('beforeinstallprompt', (event) => {
    // Sem isto, o Chrome mostra a própria faixa de instalação além do nosso botão.
    event.preventDefault()
    deferred = event as BeforeInstallPromptEvent
    refresh()
  })
  window.addEventListener('appinstalled', () => {
    deferred = null
    refresh()
  })
}

export function useInstallState(): InstallState {
  return useSyncExternalStore(
    (listener) => {
      listeners.add(listener)
      return () => listeners.delete(listener)
    },
    getSnapshot,
    () => state,
  )
}

/** Abre o instalador do navegador. O evento só pode ser usado uma vez. */
export async function promptInstall(): Promise<void> {
  if (!deferred) return
  const event = deferred
  deferred = null
  await event.prompt()
  await event.userChoice
  refresh()
}
