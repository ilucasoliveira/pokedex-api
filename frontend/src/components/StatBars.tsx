import type { PokemonStats } from '../services/types'
import { STAT_LABELS } from '../utils/format'
import styles from './StatBars.module.css'

// Maior atributo base que existe (HP da Blissey). As barras são relativas a ele.
const MAX_STAT = 255

interface StatBarsProps {
  stats: PokemonStats
}

export function StatBars({ stats }: StatBarsProps) {
  const entries = Object.entries(STAT_LABELS) as [keyof PokemonStats, string][]
  const total = entries.reduce((sum, [key]) => sum + stats[key], 0)

  return (
    <dl className={styles.list}>
      {entries.map(([key, label]) => (
        <div key={key} className={styles.row}>
          <dt className={styles.label}>{label}</dt>
          <dd className={styles.value}>
            {/* O número é o dado; a barra é só orientação visual. */}
            <span className={styles.number}>{stats[key]}</span>
            <span className={styles.track} aria-hidden="true">
              <span className={styles.bar} style={{ width: `${(stats[key] / MAX_STAT) * 100}%` }} />
            </span>
          </dd>
        </div>
      ))}
      <div className={`${styles.row} ${styles.total}`}>
        <dt className={styles.label}>Total</dt>
        <dd className={styles.value}>
          <span className={styles.number}>{total}</span>
        </dd>
      </div>
    </dl>
  )
}
