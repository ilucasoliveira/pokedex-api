import { t } from '../i18n'
import { formatType } from '../utils/format'
import { typeColors } from '../utils/typeColors'
import styles from './TypeBadge.module.css'

interface TypeBadgeProps {
  type: string
}

export function TypeBadge({ type }: TypeBadgeProps) {
  return (
    <span className={styles.badge} style={typeColors(type)}>
      {formatType(type)}
    </span>
  )
}

interface TypeListProps {
  types: string[]
}

export function TypeList({ types }: TypeListProps) {
  return (
    <ul className={styles.list} aria-label={t('types.list')}>
      {types.map((type) => (
        <li key={type}>
          <TypeBadge type={type} />
        </li>
      ))}
    </ul>
  )
}
