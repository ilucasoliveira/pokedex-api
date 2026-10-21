import { ArrowRight } from 'lucide-react'
import { Link } from 'react-router'

import type { EvolutionNode } from '../services/types'
import { formatEvolutionCondition, formatName, formatNumber } from '../utils/format'
import { PokemonImage } from './PokemonImage'
import styles from './EvolutionChain.module.css'

const MAX_BRANCHES_IN_COLUMN = 3

interface EvolutionChainProps {
  chain: EvolutionNode | null
  /** Número do pokémon da página, destacado na cadeia. */
  currentId: number
}

export function EvolutionChain({ chain, currentId }: EvolutionChainProps) {
  if (!chain) {
    return <p className={styles.empty}>Evolução não disponível.</p>
  }
  if (chain.evolves_to.length === 0) {
    return <p className={styles.empty}>Este Pokémon não evolui.</p>
  }

  return (
    // A cadeia pode ser mais larga que a tela (Eevee): a área rola na horizontal
    // e recebe foco para dar para rolar pelo teclado.
    <div className={styles.scroller} tabIndex={0} role="region" aria-label="Etapas da evolução">
      <ol className={styles.tree}>
        <Stage node={chain} currentId={currentId} />
      </ol>
    </div>
  )
}

interface StageProps {
  node: EvolutionNode
  currentId: number
}

// Cada etapa é um item com a lista das próximas. Mais de uma próxima = ramificação.
function Stage({ node, currentId }: StageProps) {
  return (
    <li className={styles.stage}>
      <EvolutionCell node={node} current={node.id === currentId} />
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
                <Stage node={child} currentId={currentId} />
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
}

function EvolutionCell({ node, current }: EvolutionCellProps) {
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
    <Link to={`/pokemon/${node.id}`} className={styles.cell}>
      {content}
    </Link>
  )
}
