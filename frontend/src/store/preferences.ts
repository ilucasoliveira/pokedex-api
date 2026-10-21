import { useSyncExternalStore } from 'react'

// Preferências de exibição: idioma e tema. Ficam no localStorage; sem escolha
// salva, valem o idioma e o tema do sistema. O index.html aplica as duas antes
// do React carregar, para a página não piscar no tema ou idioma errado.

export type Language = 'pt' | 'en'
export type Theme = 'light' | 'dark'

const LANGUAGE_KEY = 'rota151:idioma'
const THEME_KEY = 'rota151:tema'

function readStorage(key: string): string | null {
  try {
    return window.localStorage.getItem(key)
  } catch {
    return null
  }
}

function writeStorage(key: string, value: string) {
  try {
    window.localStorage.setItem(key, value)
  } catch {
    // Armazenamento bloqueado: a escolha vale só nesta visita.
  }
}

function initialLanguage(): Language {
  const saved = readStorage(LANGUAGE_KEY)
  if (saved === 'pt' || saved === 'en') return saved
  // Português para quem usa o navegador em português; inglês para o resto.
  return navigator.language.toLowerCase().startsWith('pt') ? 'pt' : 'en'
}

function initialTheme(): Theme {
  const saved = readStorage(THEME_KEY)
  if (saved === 'light' || saved === 'dark') return saved
  return typeof window.matchMedia === 'function' && window.matchMedia('(prefers-color-scheme: dark)').matches
    ? 'dark'
    : 'light'
}

interface Preferences {
  language: Language
  theme: Theme
}

let preferences: Preferences =
  typeof window === 'undefined' ? { language: 'pt', theme: 'light' } : { language: initialLanguage(), theme: initialTheme() }

const listeners = new Set<() => void>()

function apply() {
  const root = document.documentElement
  root.lang = preferences.language === 'pt' ? 'pt-BR' : 'en'
  root.dataset.theme = preferences.theme
  // Cor da barra do navegador no celular acompanha o tema.
  document
    .querySelector('meta[name="theme-color"]')
    ?.setAttribute('content', preferences.theme === 'dark' ? '#15130F' : '#FDF6E9')
}

function update(next: Preferences) {
  preferences = next
  apply()
  listeners.forEach((listener) => listener())
}

if (typeof document !== 'undefined') apply()

function subscribe(listener: () => void) {
  listeners.add(listener)
  return () => listeners.delete(listener)
}

export function usePreferences(): Preferences {
  return useSyncExternalStore(subscribe, () => preferences, () => preferences)
}

/** Idioma atual, para quem formata textos fora de componentes. */
export function getLanguage(): Language {
  return preferences.language
}

export function setLanguage(language: Language) {
  writeStorage(LANGUAGE_KEY, language)
  update({ ...preferences, language })
}

export function setTheme(theme: Theme) {
  writeStorage(THEME_KEY, theme)
  update({ ...preferences, theme })
}
