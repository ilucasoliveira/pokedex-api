import { Link } from 'react-router'

import { ErrorPanel, SlowApiNotice } from '../components/StatusPanel'
import { useDelayedFlag } from '../hooks/useDelayedFlag'
import { useDocumentTitle } from '../hooks/useDocumentTitle'
import { useTypes } from '../services/queries'
import { formatCount, formatType } from '../utils/format'
import { typeColors } from '../utils/typeColors'
import styles from './ExplorePage.module.css'

export function TypesPage() {
  useDocumentTitle('Tipos')
  const types = useTypes()
  const slow = useDelayedFlag(types.isPending, 4000)

  const sorted = [...(types.data ?? [])].sort((a, b) =>
    formatType(a.name).localeCompare(formatType(b.name), 'pt-BR'),
  )

  return (
    <div className={`container ${styles.page}`}>
      <div className={styles.intro}>
        <h1 className={styles.title}>Tipos</h1>
        <p className={styles.lead}>
          Escolha um tipo para ver todos os Pokémon que o têm. Um Pokémon com dois tipos aparece
          nos dois.
        </p>
      </div>

      {types.isPending ? (
        <div role="status">
          <p className={styles.lead}>Carregando tipos…</p>
          <SlowApiNotice visible={slow} />
        </div>
      ) : types.isError ? (
        <ErrorPanel title="Não foi possível carregar os tipos." onRetry={() => types.refetch()} />
      ) : (
        <ul className={styles.grid}>
          {sorted.map((type) => (
            <li key={type.name}>
              <Link to={`/pokedex?type=${type.name}`} className={styles.tile} style={typeColors(type.name)}>
                <span className={styles.tileName}>{formatType(type.name)}</span>
                <span className={styles.tileCount}>{formatCount(type.count)} Pokémon</span>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
