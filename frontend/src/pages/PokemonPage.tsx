import { ArrowLeft, ChevronLeft, ChevronRight } from 'lucide-react'
import { useEffect, type ReactNode } from 'react'
import { Link, useLocation, useNavigate, useParams } from 'react-router'

import { PokemonSheet } from '../components/PokemonSheet'
import { ErrorPanel, SlowApiNotice, StatusPanel } from '../components/StatusPanel'
import { useDelayedFlag } from '../hooks/useDelayedFlag'
import { useDocumentTitle } from '../hooks/useDocumentTitle'
import { ApiError } from '../services/pokemonApi'
import { useGenerations, usePokemon } from '../services/queries'
import { markDiscovered } from '../store/journey'
import buttons from '../styles/buttons.module.css'
import { formatName, formatNumber } from '../utils/format'
import styles from './PokemonPage.module.css'

/** Teclas ← e → só navegam quando ninguém está digitando num campo. */
function isTyping(target: EventTarget | null): boolean {
  return (
    target instanceof HTMLElement &&
    (target.isContentEditable || ['INPUT', 'TEXTAREA', 'SELECT'].includes(target.tagName))
  )
}

export function PokemonPage() {
  const { idOrName = '' } = useParams()
  const location = useLocation()
  const navigate = useNavigate()
  const query = usePokemon(idOrName)
  const generations = useGenerations()
  const slow = useDelayedFlag(query.isPending, 4000)

  // O card guarda o endereço da lista (com filtros e página) para o "Voltar".
  const from = (location.state as { from?: string } | null)?.from ?? '/pokedex'
  const pokemon = query.data

  // Total da Pokédex (soma das gerações), para saber se existe um "próximo".
  const lastNumber = generations.data?.reduce((sum, generation) => sum + generation.count, 0) ?? 0
  const previousId = pokemon && pokemon.id > 1 && pokemon.id <= lastNumber ? pokemon.id - 1 : null
  const nextId = pokemon && pokemon.id < lastNumber ? pokemon.id + 1 : null

  useDocumentTitle(
    pokemon
      ? `${formatName(pokemon.name)} (${formatNumber(pokemon.id)})`
      : query.isError
        ? 'Pokémon não encontrado'
        : null,
  )

  // Abrir a ficha conta como "descobrir" este Pokémon na jornada.
  useEffect(() => {
    if (pokemon) markDiscovered(pokemon.id, pokemon.generation)
  }, [pokemon])

  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      if (event.altKey || event.ctrlKey || event.metaKey || event.shiftKey || isTyping(event.target)) return
      const target = event.key === 'ArrowLeft' ? previousId : event.key === 'ArrowRight' ? nextId : null
      if (target) navigate(`/pokemon/${target}`, { state: location.state })
    }
    document.addEventListener('keydown', onKeyDown)
    return () => document.removeEventListener('keydown', onKeyDown)
  }, [previousId, nextId, navigate, location.state])

  let content: ReactNode
  if (query.isPending) {
    content = (
      <div className={styles.loading} role="status">
        <p>Carregando Pokémon…</p>
        <SlowApiNotice visible={slow} />
      </div>
    )
  } else if (query.isError) {
    content =
      query.error instanceof ApiError && query.error.status === 404 ? (
        <StatusPanel
          kind="empty"
          title="Não encontramos esse Pokémon."
          description={`Nada com o nome ou número "${idOrName}" na Pokédex da Rota151.`}
          action={
            <Link to="/pokedex" className={buttons.secondary}>
              Ver a Pokédex
            </Link>
          }
        />
      ) : (
        <ErrorPanel title="Não foi possível carregar este Pokémon." onRetry={() => query.refetch()} />
      )
  } else {
    content = <PokemonSheet pokemon={query.data} />
  }

  return (
    <div className={`container ${styles.page}`}>
      <div className={styles.topBar}>
        <Link to={from} className={styles.back}>
          <ArrowLeft size={18} aria-hidden="true" />
          Voltar para a lista
        </Link>
        {(previousId || nextId) && (
          <nav className={styles.steps} aria-label="Pokémon vizinhos na Pokédex">
            <p className={styles.hint}>
              <kbd>←</kbd> <kbd>→</kbd> para navegar
            </p>
            {previousId && (
              <Link to={`/pokemon/${previousId}`} state={location.state} className={styles.step} aria-label={`Anterior: ${formatNumber(previousId)}`}>
                <ChevronLeft size={18} aria-hidden="true" />
                {formatNumber(previousId)}
              </Link>
            )}
            {nextId && (
              <Link to={`/pokemon/${nextId}`} state={location.state} className={styles.step} aria-label={`Próximo: ${formatNumber(nextId)}`}>
                {formatNumber(nextId)}
                <ChevronRight size={18} aria-hidden="true" />
              </Link>
            )}
          </nav>
        )}
      </div>
      {content}
    </div>
  )
}
