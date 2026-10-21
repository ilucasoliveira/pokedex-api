import { Heart } from 'lucide-react'
import { Link } from 'react-router'

import { PokemonCard, PokemonCardSkeleton } from '../components/PokemonCard'
import { ErrorPanel, SlowApiNotice, StatusPanel } from '../components/StatusPanel'
import { useDelayedFlag } from '../hooks/useDelayedFlag'
import { useDocumentTitle } from '../hooks/useDocumentTitle'
import { MAX_IDS } from '../services/pokemonApi'
import { usePokemonsByIds } from '../services/queries'
import { useJourney } from '../store/journey'
import buttons from '../styles/buttons.module.css'
import { formatCount } from '../utils/format'
import catalog from '../components/Catalog.module.css'
import styles from './ExplorePage.module.css'

export function FavoritesPage() {
  useDocumentTitle('Favoritos')
  const { favorites } = useJourney()
  const query = usePokemonsByIds(favorites.slice(0, MAX_IDS))
  const slow = useDelayedFlag(query.isPending && favorites.length > 0, 4000)

  // A API devolve na ordem da Pokédex; aqui os mais recentes vêm primeiro.
  const byId = new Map((query.data?.data ?? []).map((pokemon) => [pokemon.id, pokemon]))
  const pokemons = favorites.flatMap((id) => byId.get(id) ?? [])

  return (
    <div className={`container ${styles.page}`}>
      <div className={styles.intro}>
        <h1 className={styles.title}>Favoritos</h1>
        <p className={styles.lead}>
          {favorites.length === 0
            ? 'Toque no coração de um Pokémon para guardá-lo aqui.'
            : `${formatCount(favorites.length)} ${favorites.length === 1 ? 'Pokémon guardado' : 'Pokémon guardados'}, do mais recente para o mais antigo. Ficam salvos só neste navegador.`}
        </p>
      </div>

      {favorites.length === 0 ? (
        <StatusPanel
          kind="empty"
          title="Sua lista de favoritos está vazia."
          description="Explore a Pokédex e use o coração nos cards ou na ficha de cada Pokémon."
          action={
            <Link to="/pokedex" className={buttons.primary}>
              <Heart size={18} aria-hidden="true" />
              Explorar a Pokédex
            </Link>
          }
        />
      ) : query.isPending ? (
        <div>
          <SlowApiNotice visible={slow} />
          <ul className={catalog.grid} aria-label="Carregando favoritos">
            {favorites.slice(0, 8).map((id) => (
              <li key={id}>
                <PokemonCardSkeleton />
              </li>
            ))}
          </ul>
        </div>
      ) : query.isError ? (
        <ErrorPanel title="Não foi possível carregar os favoritos." onRetry={() => query.refetch()} />
      ) : (
        <>
          <ul className={catalog.grid}>
            {pokemons.map((pokemon, index) => (
              <li key={pokemon.id}>
                <PokemonCard pokemon={pokemon} eager={index < 4} />
              </li>
            ))}
          </ul>
          {favorites.length > MAX_IDS && (
            <p className={styles.lead}>Mostrando os {MAX_IDS} favoritos mais recentes.</p>
          )}
        </>
      )}
    </div>
  )
}
