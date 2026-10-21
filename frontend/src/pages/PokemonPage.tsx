import { ArrowLeft, ChevronLeft, ChevronRight } from 'lucide-react'
import { useEffect, type ReactNode } from 'react'
import { Link, useLocation, useNavigate, useParams } from 'react-router'

import { PokemonSheet } from '../components/PokemonSheet'
import { ErrorPanel, SlowApiNotice, StatusPanel } from '../components/StatusPanel'
import { useDelayedFlag } from '../hooks/useDelayedFlag'
import { useDocumentTitle } from '../hooks/useDocumentTitle'
import { t } from '../i18n'
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
  // Navegando entre fichas, só ele segue junto (não o aviso de evolução).
  const from = (location.state as { from?: string } | null)?.from ?? '/pokedex'
  const navigationState = { from }
  const pokemon = query.data

  // Total da Pokédex (soma das gerações), para saber se existe um "próximo".
  const lastNumber = generations.data?.reduce((sum, generation) => sum + generation.count, 0) ?? 0
  const previousId = pokemon && pokemon.id > 1 && pokemon.id <= lastNumber ? pokemon.id - 1 : null
  const nextId = pokemon && pokemon.id < lastNumber ? pokemon.id + 1 : null

  useDocumentTitle(
    pokemon
      ? `${formatName(pokemon.name)} (${formatNumber(pokemon.id)})`
      : query.isError
        ? t('pokemon.titleNotFound')
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
      if (target) navigate(`/pokemon/${target}`, { state: { from } })
    }
    document.addEventListener('keydown', onKeyDown)
    return () => document.removeEventListener('keydown', onKeyDown)
  }, [previousId, nextId, navigate, from])

  let content: ReactNode
  if (query.isPending) {
    content = (
      <div className={styles.loading} role="status">
        <p>{t('pokemon.loading')}</p>
        <SlowApiNotice visible={slow} />
      </div>
    )
  } else if (query.isError) {
    content =
      query.error instanceof ApiError && query.error.status === 404 ? (
        <StatusPanel
          kind="empty"
          title={t('pokemon.notFoundTitle')}
          description={t('pokemon.notFoundDescription', { query: idOrName })}
          action={
            <Link to="/pokedex" className={buttons.secondary}>
              {t('pokemon.seePokedex')}
            </Link>
          }
        />
      ) : (
        <ErrorPanel title={t('pokemon.error')} onRetry={() => query.refetch()} />
      )
  } else {
    // key: cada Pokémon monta uma ficha nova (shiny desligado, animação de chegada etc.).
    content = <PokemonSheet key={query.data.id} pokemon={query.data} />
  }

  return (
    <div className={`container ${styles.page}`}>
      <div className={styles.topBar}>
        <Link to={from} className={styles.back}>
          <ArrowLeft size={18} aria-hidden="true" />
          {t('pokemon.back')}
        </Link>
        {(previousId || nextId) && (
          <nav className={styles.steps} aria-label={t('pokemon.neighbors')}>
            <p className={styles.hint}>
              <kbd>←</kbd> <kbd>→</kbd> {t('pokemon.keysHint')}
            </p>
            {previousId && (
              <Link to={`/pokemon/${previousId}`} state={navigationState} className={styles.step} aria-label={t('pokemon.previous', { number: formatNumber(previousId) })}>
                <ChevronLeft size={18} aria-hidden="true" />
                {formatNumber(previousId)}
              </Link>
            )}
            {nextId && (
              <Link to={`/pokemon/${nextId}`} state={navigationState} className={styles.step} aria-label={t('pokemon.next', { number: formatNumber(nextId) })}>
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
