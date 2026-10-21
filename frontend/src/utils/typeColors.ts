import type { CSSProperties } from 'react'

import { KNOWN_TYPES } from './format'

/** Cores do tipo (tokens do kit) como variáveis CSS para badges, cards e fundos. */
export function typeColors(type: string | undefined): CSSProperties {
  // Tipos fora dos 18 do kit (ex.: "stellar") usam a cor neutra.
  if (!type || !KNOWN_TYPES.includes(type)) return {}
  return {
    '--badge-bg': `var(--type-${type}-bg)`,
    '--badge-fg': `var(--type-${type}-fg)`,
  } as CSSProperties
}
