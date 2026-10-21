import { defenseMatchups, formatMultiplier, type Matchup } from '../utils/typeChart'
import { t } from '../i18n'
import { formatType } from '../utils/format'
import { TypeBadge } from './TypeBadge'
import styles from './TypeMatchups.module.css'

interface TypeMatchupsProps {
  types: string[]
}

export function TypeMatchups({ types }: TypeMatchupsProps) {
  const { weak, resistant, immune } = defenseMatchups(types)

  if (weak.length + resistant.length + immune.length === 0) {
    return <p className={styles.note}>{t('sheet.notInformed')}</p>
  }

  return (
    <div className={styles.matchups}>
      <Group title={t('matchups.weak')} items={weak} />
      <Group title={t('matchups.resistant')} items={resistant} />
      <Group title={t('matchups.immune')} items={immune} />
      <p className={styles.note}>{t('matchups.note')}</p>
    </div>
  )
}

interface GroupProps {
  title: string
  items: Matchup[]
}

function Group({ title, items }: GroupProps) {
  if (items.length === 0) return null
  return (
    <div className={styles.group}>
      <h3 className={styles.title}>{title}</h3>
      <ul className={styles.list}>
        {items.map((item) => (
          <li
            key={item.type}
            className={styles.item}
            aria-label={`${formatType(item.type)}: ${formatMultiplier(item.multiplier)}`}
          >
            <TypeBadge type={item.type} />
            <span
              className={[
                styles.multiplier,
                item.multiplier >= 4 ? styles.double : '',
                item.multiplier === 0.25 ? styles.quarter : '',
              ].join(' ')}
              aria-hidden="true"
            >
              {formatMultiplier(item.multiplier)}
            </span>
          </li>
        ))}
      </ul>
    </div>
  )
}
