import { Link } from 'react-router'

import { ErrorPanel, SlowApiNotice } from '../components/StatusPanel'
import { useDelayedFlag } from '../hooks/useDelayedFlag'
import { useDocumentTitle } from '../hooks/useDocumentTitle'
import { useGenerations } from '../services/queries'
import { discoveredCount, useJourney } from '../store/journey'
import { formatCount, formatGeneration } from '../utils/format'
import styles from './ExplorePage.module.css'

export function GenerationsPage() {
  useDocumentTitle('Gerações')
  const generations = useGenerations()
  const journey = useJourney()
  const slow = useDelayedFlag(generations.isPending, 4000)

  return (
    <div className={`container ${styles.page}`}>
      <div className={styles.intro}>
        <h1 className={styles.title}>Gerações</h1>
        <p className={styles.lead}>
          Cada geração reúne os Pokémon que estrearam nela. Escolha uma para ver a lista; a
          barra mostra quantos você já descobriu.
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
          {(generations.data ?? []).map((generation) => {
            const found = discoveredCount(journey, generation.id)
            return (
              <li key={generation.id}>
                <Link to={`/pokedex?generation=${generation.id}`} className={styles.tile}>
                  <span className={styles.tileName}>{formatGeneration(generation.id)}</span>
                  <span className={styles.tileCount}>{formatCount(generation.count)} Pokémon</span>
                  <span className={styles.progress}>
                    <span className={styles.progressTrack} aria-hidden="true">
                      <span
                        className={styles.progressFill}
                        style={{ width: `${Math.min(100, (found / generation.count) * 100)}%` }}
                      />
                    </span>
                    <span className={styles.progressText}>
                      {found === generation.count ? 'Completa!' : `${formatCount(found)} descobertos`}
                    </span>
                  </span>
                </Link>
              </li>
            )
          })}
        </ul>
      )}
    </div>
  )
}
