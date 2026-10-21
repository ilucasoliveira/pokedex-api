import type { CSSProperties } from 'react'

import type { PokemonStats } from '../services/types'
import { STAT_LABELS, statTotal } from '../utils/format'
import styles from './StatBars.module.css'

// Maior atributo base que existe (HP da Blissey). As barras são relativas a ele.
const MAX_STAT = 255

/** Faixa do valor, para a cor da barra. O número continua sendo o dado principal. */
function tier(value: number): string {
  if (value < 50) return styles.low
  if (value < 80) return styles.mid
  if (value < 110) return styles.good
  return styles.great
}

interface StatBarsProps {
  stats: PokemonStats
}

export function StatBars({ stats }: StatBarsProps) {
  const entries = Object.entries(STAT_LABELS) as [keyof PokemonStats, string][]

  return (
    <dl className={styles.list}>
      {entries.map(([key, label]) => (
        <div key={key} className={styles.row}>
          <dt className={styles.label}>{label}</dt>
          <dd className={styles.value}>
            <span className={styles.number}>{stats[key]}</span>
            <span className={styles.track} aria-hidden="true">
              <span
                className={`${styles.bar} ${tier(stats[key])}`}
                style={{ '--fill': stats[key] / MAX_STAT } as CSSProperties}
              />
            </span>
          </dd>
        </div>
      ))}
      <div className={`${styles.row} ${styles.total}`}>
        <dt className={styles.label}>Total</dt>
        <dd className={styles.value}>
          <span className={styles.number}>{statTotal(stats)}</span>
        </dd>
      </div>
    </dl>
  )
}
