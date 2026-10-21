import { Link, useLocation } from 'react-router'

import type { PokemonSummary } from '../services/types'
import { formatName, formatNumber } from '../utils/format'
import { typeColors } from '../utils/typeColors'
import { PokemonImage } from './PokemonImage'
import { TypeList } from './TypeBadge'
import styles from './PokemonCard.module.css'

interface PokemonCardProps {
  pokemon: PokemonSummary
  /** Os cards da primeira dobra carregam a imagem na hora. */
  eager?: boolean
}

export function PokemonCard({ pokemon, eager = false }: PokemonCardProps) {
  const location = useLocation()
  const name = formatName(pokemon.name)

  return (
    <article className={styles.card} style={typeColors(pokemon.types[0])}>
      {/* O card inteiro leva ao detalhe. O endereço atual vai junto para o "Voltar" do detalhe. */}
      <Link
        to={`/pokemon/${pokemon.id}`}
        state={{ from: `${location.pathname}${location.search}` }}
        className={styles.link}
      >
        <span className={styles.number}>{formatNumber(pokemon.id)}</span>
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
      <TypeList types={pokemon.types} />
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
