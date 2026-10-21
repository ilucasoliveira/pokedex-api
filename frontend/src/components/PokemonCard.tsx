import { Check } from 'lucide-react'
import type { MouseEvent } from 'react'
import { Link, useLocation } from 'react-router'

import { t } from '../i18n'
import type { PokemonSummary } from '../services/types'
import { useJourney } from '../store/journey'
import {
  formatName,
  formatNumber,
  statLabel,
  statValue,
  type StatSortKey,
} from '../utils/format'
import { typeColors } from '../utils/typeColors'
import { FavoriteButton } from './FavoriteButton'
import { PokemonImage } from './PokemonImage'
import { TypeList } from './TypeBadge'
import styles from './PokemonCard.module.css'

interface PokemonCardProps {
  pokemon: PokemonSummary
  /** Os cards da primeira dobra carregam a imagem na hora. */
  eager?: boolean
  /** Atributo da ordenação atual: o card mostra o valor dele. */
  highlightStat?: StatSortKey | null
  /** No desktop, o clique abre o painel lateral em vez de trocar de página. */
  onSelect?: (id: number) => void
  selected?: boolean
}

export function PokemonCard({
  pokemon,
  eager = false,
  highlightStat = null,
  onSelect,
  selected = false,
}: PokemonCardProps) {
  const location = useLocation()
  const { discovered } = useJourney()
  const name = formatName(pokemon.name)
  const seen = String(pokemon.id) in discovered
  const highlighted = highlightStat ? statValue(pokemon.stats, highlightStat) : null

  function handleClick(event: MouseEvent<HTMLAnchorElement>) {
    // Ctrl/Cmd/Shift ou botão do meio continuam abrindo a ficha (nova aba etc.).
    if (!onSelect || event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) {
      return
    }
    event.preventDefault()
    onSelect(pokemon.id)
  }

  return (
    <article
      className={selected ? `${styles.card} ${styles.selected}` : styles.card}
      style={typeColors(pokemon.types[0])}
    >
      {/* O card inteiro leva ao detalhe. O endereço atual vai junto para o "Voltar" do detalhe. */}
      <Link
        to={`/pokemon/${pokemon.id}`}
        state={{ from: `${location.pathname}${location.search}` }}
        className={styles.link}
        onClick={handleClick}
        aria-current={selected ? 'true' : undefined}
      >
        <span className={styles.number}>
          {formatNumber(pokemon.id)}
          {seen && (
            <span className={styles.seen} title={t('card.seen')}>
              <Check size={12} strokeWidth={3} aria-hidden="true" />
              <span className="visually-hidden">{t('card.seenHidden')}</span>
            </span>
          )}
        </span>
        <span className={styles.imageBox}>
          {/* Nos cards o guia prefere o sprite retrô; o artwork é a reserva. */}
          <PokemonImage
            sources={[pokemon.sprites, pokemon.artwork]}
            pixelated={[pokemon.sprites]}
            alt=""
            size={152}
            loading={eager ? 'eager' : 'lazy'}
          />
        </span>
        <h3 className={styles.name}>{name}</h3>
      </Link>
      <FavoriteButton id={pokemon.id} name={name} className={styles.favorite} />
      <TypeList types={pokemon.types} />
      {highlightStat && highlighted !== null && (
        <p className={styles.stat}>
          {statLabel(highlightStat)} <strong>{highlighted}</strong>
        </p>
      )}
    </article>
  )
}

export function PokemonCardSkeleton() {
  return (
    <div className={`${styles.card} ${styles.skeleton}`} aria-hidden="true">
      <span className={styles.skeletonLine} style={{ width: 56 }} />
      <span className={styles.skeletonImage} />
      <span className={styles.skeletonLine} style={{ width: '70%', height: 20 }} />
      <span className={styles.skeletonLine} style={{ width: 72, height: 28 }} />
    </div>
  )
}
