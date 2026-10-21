import { ArrowRight } from 'lucide-react'
import { Link } from 'react-router'

import { t } from '../i18n'
import type { EvolutionNode } from '../services/types'
import { formatEvolutionCondition, formatName, formatNumber } from '../utils/format'
import { PokemonImage } from './PokemonImage'
import styles from './EvolutionChain.module.css'

const MAX_BRANCHES_IN_COLUMN = 3

interface EvolutionChainProps {
  chain: EvolutionNode | null
  /** Número do pokémon da página, destacado na cadeia. */
  currentId: number
  /** Para onde cada etapa leva. Padrão: a ficha do Pokémon. */
  hrefFor?: (id: number) => string
}

const defaultHref = (id: number) => `/pokemon/${id}`

export function EvolutionChain({ chain, currentId, hrefFor = defaultHref }: EvolutionChainProps) {
  if (!chain) {
    return <p className={styles.empty}>{t('evolution.none')}</p>
  }
  if (chain.evolves_to.length === 0) {
    return <p className={styles.empty}>{t('evolution.noEvolve')}</p>
  }

  return (
    // A cadeia pode ser mais larga que a tela (Eevee): a área rola na horizontal
    // e recebe foco para dar para rolar pelo teclado.
    <div className={styles.scroller} tabIndex={0} role="region" aria-label={t('evolution.stages')}>
      <ol className={styles.tree}>
        <Stage node={chain} currentId={currentId} hrefFor={hrefFor} />
      </ol>
    </div>
  )
}

interface StageProps {
  node: EvolutionNode
  currentId: number
  hrefFor: (id: number) => string
}

// Cada etapa é um item com a lista das próximas. Mais de uma próxima = ramificação.
function Stage({ node, currentId, hrefFor }: StageProps) {
  return (
    <li className={styles.stage}>
      <EvolutionCell node={node} current={node.id === currentId} href={hrefFor(node.id)} />
      {node.evolves_to.length > 0 && (
        // Muitas ramificações (Eevee) viram uma grade em vez de uma coluna comprida.
        <ol
          className={
            node.evolves_to.length > MAX_BRANCHES_IN_COLUMN
              ? `${styles.next} ${styles.manyBranches}`
              : styles.next
          }
        >
          {node.evolves_to.map((child) => (
            <li key={child.id} className={styles.branch}>
              <span className={styles.connector}>
                <ArrowRight size={20} aria-hidden="true" />
                <span className={styles.condition}>{formatEvolutionCondition(child)}</span>
              </span>
              <ol className={styles.tree}>
                <Stage node={child} currentId={currentId} hrefFor={hrefFor} />
              </ol>
            </li>
          ))}
        </ol>
      )}
    </li>
  )
}

interface EvolutionCellProps {
  node: EvolutionNode
  current: boolean
  href: string
}

function EvolutionCell({ node, current, href }: EvolutionCellProps) {
  const content = (
    <>
      <PokemonImage
        sources={[node.artwork, node.sprites]}
        pixelated={[node.sprites]}
        alt=""
        size={64}
      />
      <span className={styles.name}>{formatName(node.name)}</span>
      <span className={styles.number}>{formatNumber(node.id)}</span>
    </>
  )

  if (current) {
    return (
      <span className={`${styles.cell} ${styles.current}`} aria-current="page">
        {content}
      </span>
    )
  }
  return (
    // Links relativos (?selected=…) trocam o Pokémon do painel lateral sem rolar a página.
    <Link to={href} className={styles.cell} preventScrollReset={href.startsWith('?')}>
      {content}
    </Link>
  )
}
