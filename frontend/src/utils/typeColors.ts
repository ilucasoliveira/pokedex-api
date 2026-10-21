import type { CSSProperties } from 'react'

import { TYPE_LABELS } from './format'

/** Cores do tipo (tokens do kit) como variáveis CSS para badges, cards e fundos. */
export function typeColors(type: string | undefined): CSSProperties {
  // Tipos fora dos 18 do kit (ex.: "stellar") usam a cor neutra.
  if (!type || !(type in TYPE_LABELS)) return {}
  return {
    '--badge-bg': `var(--type-${type}-bg)`,
    '--badge-fg': `var(--type-${type}-fg)`,
  } as CSSProperties
}
