import type { CSSProperties } from 'react'

import styles from './EvolutionFx.module.css'

const SPARKLES = 12

interface EvolutionFxProps {
  /** "evolving": brilho girando, anel e explosão de luz; "arriving": a luz se dissipa. */
  phase: 'evolving' | 'arriving'
}

/** Estrela de 4 pontas em pixel art, como nos efeitos de referência. */
function Sparkle({ index, total }: { index: number; total: number }) {
  return (
    <span className={styles.sparkleSlot} style={{ '--angle': `${(360 / total) * index}deg` } as CSSProperties}>
      <svg className={styles.sparkle} viewBox="0 0 10 10" shapeRendering="crispEdges">
        <path d="M5 0 L6 4 L10 5 L6 6 L5 10 L4 6 L0 5 L4 4 Z" />
      </svg>
    </span>
  )
}

/** Camada de efeitos da evolução, desenhada sobre a arte. Puramente decorativa. */
export function EvolutionFx({ phase }: EvolutionFxProps) {
  return (
    <div className={`${styles.fx} ${styles[phase]}`} aria-hidden="true">
      <div className={styles.glow} />
      <div className={styles.ring} />
      <div className={styles.orbit}>
        {Array.from({ length: SPARKLES }, (_, index) => (
          <Sparkle key={index} index={index} total={SPARKLES} />
        ))}
      </div>
      <svg className={styles.burst} viewBox="-50 -50 100 100">
        <polygon points="0,-48 7,-12 40,-34 13,-4 48,0 13,4 40,34 7,12 0,48 -7,12 -40,34 -13,4 -48,0 -13,-4 -40,-34 -7,-12" />
      </svg>
      <div className={styles.flash} />
    </div>
  )
}
