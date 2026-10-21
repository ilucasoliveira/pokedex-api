import { Compass, Heart, RotateCcw, Trophy } from 'lucide-react'
import { Link, useNavigate } from 'react-router'

import { useGenerations } from '../services/queries'
import { discoveredCount, pickUndiscovered, resetJourney, useJourney } from '../store/journey'
import buttons from '../styles/buttons.module.css'
import { formatCount } from '../utils/format'
import styles from './JourneyPanel.module.css'

/** Progresso da Pokédex do visitante: "Explorar · Descobrir · Completar". */
export function JourneyPanel() {
  const journey = useJourney()
  const generations = useGenerations()
  const navigate = useNavigate()

  const total = generations.data?.reduce((sum, generation) => sum + generation.count, 0) ?? 0
  const found = discoveredCount(journey)
  const percent = total ? Math.min(100, (found / total) * 100) : 0
  const complete = total > 0 && found >= total

  function discoverNew() {
    navigate(`/pokemon/${pickUndiscovered(total, journey.discovered)}`)
  }

  function restart() {
    if (window.confirm('Apagar seus favoritos e os Pokémon descobertos neste navegador?')) {
      resetJourney()
    }
  }

  return (
    <section className={styles.panel} aria-labelledby="jornada-titulo">
      <div className={styles.text}>
        <p className={styles.eyebrow}>Sua jornada</p>
        <h2 id="jornada-titulo" className={styles.title}>
          {complete
            ? 'Pokédex completa!'
            : found === 0
              ? 'Comece sua Pokédex'
              : `${formatCount(found)} de ${formatCount(total)} descobertos`}
        </h2>
        <p className={styles.lead}>
          {complete
            ? 'Você abriu a ficha de todos os Pokémon. Uma jornada e tanto.'
            : found === 0
              ? 'Cada ficha que você abre entra para a sua Pokédex. Quantos você consegue descobrir?'
              : 'Cada ficha aberta conta. Seu progresso fica salvo neste navegador.'}
        </p>
      </div>

      {total > 0 && (
        <div className={styles.progress}>
          <div
            className={styles.track}
            role="progressbar"
            aria-valuemin={0}
            aria-valuemax={total}
            aria-valuenow={found}
            aria-label="Pokémon descobertos"
          >
            <span className={styles.fill} style={{ width: `${percent}%` }} />
          </div>
          <span className={styles.percent}>{percent.toLocaleString('pt-BR', { maximumFractionDigits: 1 })}%</span>
        </div>
      )}

      <div className={styles.actions}>
        <button type="button" className={buttons.primary} onClick={discoverNew} disabled={total === 0}>
          {complete ? <Trophy size={18} aria-hidden="true" /> : <Compass size={18} aria-hidden="true" />}
          {complete ? 'Rever um Pokémon' : 'Descobrir um Pokémon novo'}
        </button>
        <Link to="/favoritos" className={buttons.secondary}>
          <Heart size={18} aria-hidden="true" />
          Favoritos ({journey.favorites.length})
        </Link>
        {(found > 0 || journey.favorites.length > 0) && (
          <button type="button" className={styles.reset} onClick={restart}>
            <RotateCcw size={16} aria-hidden="true" />
            Recomeçar
          </button>
        )}
      </div>
    </section>
  )
}
