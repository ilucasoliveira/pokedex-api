import { ChevronLeft, ChevronRight, ExternalLink, X } from 'lucide-react'
import { useEffect, useRef } from 'react'
import { Link } from 'react-router'

import { ApiError } from '../services/pokemonApi'
import { usePokemon } from '../services/queries'
import { markDiscovered } from '../store/journey'
import { formatName, formatNumber } from '../utils/format'
import { PokemonSheet } from './PokemonSheet'
import { ErrorPanel } from './StatusPanel'
import styles from './DetailPanel.module.css'

interface DetailPanelProps {
  id: number
  /** Números da página atual, para o anterior/próximo do painel. */
  pageIds: number[]
  onSelect: (id: number) => void
  onClose: () => void
  /** Endereço relativo (?selected=…) que abre outro Pokémon neste painel. */
  hrefFor: (id: number) => string
  /** Endereço da lista atual, para o "Voltar" da ficha completa. */
  from: string
}

/** Desktop (≥ 1280 px): a ficha abre ao lado da lista, sem sair da página. */
export function DetailPanel({ id, pageIds, onSelect, onClose, hrefFor, from }: DetailPanelProps) {
  const query = usePokemon(String(id))
  const headingRef = useRef<HTMLDivElement>(null)
  const pokemon = query.data

  const position = pageIds.indexOf(id)
  const previousId = position > 0 ? pageIds[position - 1] : null
  const nextId = position >= 0 && position < pageIds.length - 1 ? pageIds[position + 1] : null

  useEffect(() => {
    if (pokemon) markDiscovered(pokemon.id, pokemon.generation)
  }, [pokemon])

  // Ao abrir, o foco vai para o painel (leitor de tela e teclado). Trocar de
  // Pokémon pelas setas do painel mantém o foco no botão, para repetir o clique.
  useEffect(() => {
    headingRef.current?.focus({ preventScroll: true })
  }, [])

  // Escape fecha o painel.
  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') onClose()
    }
    document.addEventListener('keydown', onKeyDown)
    return () => document.removeEventListener('keydown', onKeyDown)
  }, [onClose])

  return (
    <aside className={styles.panel} aria-label="Detalhes do Pokémon selecionado">
      <div className={styles.toolbar} ref={headingRef} tabIndex={-1}>
        <span className={styles.label}>{formatNumber(id)}</span>
        <div className={styles.actions}>
          <button
            type="button"
            className={styles.icon}
            disabled={!previousId}
            onClick={() => previousId && onSelect(previousId)}
            aria-label="Pokémon anterior da lista"
          >
            <ChevronLeft size={20} aria-hidden="true" />
          </button>
          <button
            type="button"
            className={styles.icon}
            disabled={!nextId}
            onClick={() => nextId && onSelect(nextId)}
            aria-label="Próximo Pokémon da lista"
          >
            <ChevronRight size={20} aria-hidden="true" />
          </button>
          <button type="button" className={styles.icon} onClick={onClose} aria-label="Fechar detalhes">
            <X size={20} aria-hidden="true" />
          </button>
        </div>
      </div>

      <div className={styles.body}>
        {query.isPending ? (
          <p className={styles.loading} role="status">
            Carregando…
          </p>
        ) : query.isError ? (
          query.error instanceof ApiError && query.error.status === 404 ? (
            <p className={styles.loading}>Não encontramos esse Pokémon.</p>
          ) : (
            <ErrorPanel title="Não foi possível carregar este Pokémon." onRetry={() => query.refetch()} />
          )
        ) : (
          <>
            <PokemonSheet key={query.data.id} pokemon={query.data} variant="panel" evolutionHref={hrefFor} />
            <Link to={`/pokemon/${query.data.id}`} state={{ from }} className={styles.full}>
              Ver a ficha completa de {formatName(query.data.name)}
              <ExternalLink size={16} aria-hidden="true" />
            </Link>
          </>
        )}
      </div>
    </aside>
  )
}
