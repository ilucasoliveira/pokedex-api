import { Link } from 'react-router'

import { ErrorPanel, SlowApiNotice } from '../components/StatusPanel'
import { useDelayedFlag } from '../hooks/useDelayedFlag'
import { useDocumentTitle } from '../hooks/useDocumentTitle'
import { useGenerations } from '../services/queries'
import { formatCount, formatGeneration } from '../utils/format'
import styles from './ExplorePage.module.css'

export function GenerationsPage() {
  useDocumentTitle('Gerações')
  const generations = useGenerations()
  const slow = useDelayedFlag(generations.isPending, 4000)

  return (
    <div className={`container ${styles.page}`}>
      <div className={styles.intro}>
        <h1 className={styles.title}>Gerações</h1>
        <p className={styles.lead}>
          Cada geração reúne os Pokémon que estrearam nela. Escolha uma para ver a lista.
        </p>
      </div>

      {generations.isPending ? (
        <div role="status">
          <p className={styles.lead}>Carregando gerações…</p>
          <SlowApiNotice visible={slow} />
        </div>
      ) : generations.isError ? (
        <ErrorPanel
          title="Não foi possível carregar as gerações."
          onRetry={() => generations.refetch()}
        />
      ) : (
        <ul className={styles.grid}>
          {(generations.data ?? []).map((generation) => (
            <li key={generation.id}>
              <Link to={`/pokedex?generation=${generation.id}`} className={styles.tile}>
                <span className={styles.tileName}>{formatGeneration(generation.id)}</span>
                <span className={styles.tileCount}>{formatCount(generation.count)} Pokémon</span>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
