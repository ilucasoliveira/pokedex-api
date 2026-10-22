import { Heart } from 'lucide-react'
import { Link } from 'react-router'

import { PokemonCard, PokemonCardSkeleton } from '../components/PokemonCard'
import { ErrorPanel, SlowApiNotice, StatusPanel } from '../components/StatusPanel'
import { useDelayedFlag } from '../hooks/useDelayedFlag'
import { useDocumentTitle } from '../hooks/useDocumentTitle'
import { t } from '../i18n'
import { MAX_IDS } from '../services/pokemonApi'
import { usePokemonsByIds } from '../services/queries'
import { useJourney } from '../store/journey'
import buttons from '../styles/buttons.module.css'
import { formatCount } from '../utils/format'
import catalog from '../components/Catalog.module.css'
import styles from './ExplorePage.module.css'

export function FavoritesPage() {
  useDocumentTitle(t('nav.favorites'))
  const { favorites } = useJourney()
  const query = usePokemonsByIds(favorites.slice(0, MAX_IDS))
  const slow = useDelayedFlag(query.isPending && favorites.length > 0, 4000)

  // A API devolve na ordem da Pokédex; aqui os mais recentes vêm primeiro.
  const byId = new Map((query.data?.data ?? []).map((pokemon) => [pokemon.id, pokemon]))
  const pokemons = favorites.flatMap((id) => byId.get(id) ?? [])

  return (
    <div className={`container ${styles.page}`}>
      <div className={styles.intro}>
        <h1 className={styles.title}>{t('nav.favorites')}</h1>
        <p className={styles.lead}>
          {favorites.length === 0
            ? t('favorites.leadEmpty')
            : favorites.length === 1
              ? t('favorites.leadOne')
              : t('favorites.leadOther', { count: formatCount(favorites.length) })}
        </p>
      </div>

      {favorites.length === 0 ? (
        <StatusPanel
          kind="empty"
          title={t('favorites.emptyTitle')}
          description={t('favorites.emptyDescription')}
          action={
            <Link to="/pokedex" className={buttons.primary}>
              <Heart size={18} aria-hidden="true" />
              {t('favorites.explore')}
            </Link>
          }
        />
      ) : query.isPending ? (
        <div>
          <SlowApiNotice visible={slow} />
          <ul className={catalog.grid} aria-label={t('favorites.loading')}>
            {favorites.slice(0, 8).map((id) => (
              <li key={id}>
                <PokemonCardSkeleton />
              </li>
            ))}
          </ul>
        </div>
      ) : query.isError ? (
        <ErrorPanel title={t('favorites.error')} onRetry={() => query.refetch()} />
      ) : (
        <>
          <ul className={catalog.grid}>
            {pokemons.map((pokemon, index) => (
              <li key={pokemon.id}>
                <PokemonCard pokemon={pokemon} eager={index < 4} headingLevel="h2" />
              </li>
            ))}
          </ul>
          {favorites.length > MAX_IDS && (
            <p className={styles.lead}>{t('favorites.limit', { max: MAX_IDS })}</p>
          )}
        </>
      )}
    </div>
  )
}
