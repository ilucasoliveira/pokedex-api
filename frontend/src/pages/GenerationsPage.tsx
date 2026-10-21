import { Link } from 'react-router'

import { ErrorPanel, SlowApiNotice } from '../components/StatusPanel'
import { useDelayedFlag } from '../hooks/useDelayedFlag'
import { useDocumentTitle } from '../hooks/useDocumentTitle'
import { t } from '../i18n'
import { useGenerations } from '../services/queries'
import { discoveredCount, useJourney } from '../store/journey'
import { formatCount, formatGeneration } from '../utils/format'
import styles from './ExplorePage.module.css'

export function GenerationsPage() {
  useDocumentTitle(t('nav.generations'))
  const generations = useGenerations()
  const journey = useJourney()
  const slow = useDelayedFlag(generations.isPending, 4000)

  return (
    <div className={`container ${styles.page}`}>
      <div className={styles.intro}>
        <h1 className={styles.title}>{t('nav.generations')}</h1>
        <p className={styles.lead}>{t('generations.lead')}</p>
      </div>

      {generations.isPending ? (
        <div role="status">
          <p className={styles.lead}>{t('generations.loading')}</p>
          <SlowApiNotice visible={slow} />
        </div>
      ) : generations.isError ? (
        <ErrorPanel
          title={t('generations.error')}
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
                  <span className={styles.tileCount}>{t('count.pokemon', { count: formatCount(generation.count) })}</span>
                  <span className={styles.progress}>
                    <span className={styles.progressTrack} aria-hidden="true">
                      <span
                        className={styles.progressFill}
                        style={{ width: `${Math.min(100, (found / generation.count) * 100)}%` }}
                      />
                    </span>
                    <span className={styles.progressText}>
                      {found === generation.count ? t('generations.complete') : t('generations.found', { count: formatCount(found) })}
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
