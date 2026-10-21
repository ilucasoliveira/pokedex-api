import { getLanguage } from '../store/preferences'
import { en, pt, type MessageKey } from './messages'

export type { MessageKey } from './messages'

const MESSAGES = { pt, en }

/**
 * Texto da interface no idioma atual: t('favorite.add', { name: 'Pikachu' }).
 * Trocar o idioma remonta o app (ver main.tsx), então todo t() é refeito.
 */
export function t(key: MessageKey, params: Record<string, string | number> = {}): string {
  // Chave montada em tempo de execução (ex.: um gatilho novo da PokéAPI) e sem
  // tradução: devolve a própria chave, para quem chamou decidir o que mostrar.
  const template: string | undefined = MESSAGES[getLanguage()][key]
  return (template ?? key).replace(/\{(\w+)\}/g, (match, name: string) =>
    name in params ? String(params[name]) : match,
  )
}

/** Locale do Intl para números e listas: "pt-BR" ou "en-US". */
export function locale(): string {
  return getLanguage() === 'pt' ? 'pt-BR' : 'en-US'
}
