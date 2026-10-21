import type { CSSProperties } from 'react'

import type { PokemonStats } from '../services/types'
import { t } from '../i18n'
import { formatStat, STAT_KEYS, statTotal } from '../utils/format'
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

  return (
    <dl className={styles.list}>
      {STAT_KEYS.map((key) => (
        <div key={key} className={styles.row}>
          <dt className={styles.label}>{formatStat(key)}</dt>
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
        <dt className={styles.label}>{t('stats.total')}</dt>
        <dd className={styles.value}>
          <span className={styles.number}>{statTotal(stats)}</span>
        </dd>
      </div>
    </dl>
  )
}
