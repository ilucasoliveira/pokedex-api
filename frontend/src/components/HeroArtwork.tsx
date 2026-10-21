import { useQueryClient } from '@tanstack/react-query'
import { Sparkles } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import { useLocation, useNavigate } from 'react-router'

import { useMediaQuery } from '../hooks/useMediaQuery'
import { t } from '../i18n'
import { fetchPokemon } from '../services/pokemonApi'
import type { Pokemon } from '../services/types'
import { playEvolvedFanfare, playEvolvingTheme, stopEvolutionSound } from '../utils/evolutionSound'
import { stoneEvolutions, type StoneEvolution } from '../utils/stoneEvolution'
import { EvolutionFx } from './EvolutionFx'
import { EvolutionStones } from './EvolutionStones'
import { PokemonImage } from './PokemonImage'
import styles from './PokemonSheet.module.css'

// Duração da animação de evolução (tem que bater com EvolutionFx.module.css).
const EVOLVE_MS = 2600
const EVOLVE_REDUCED_MS = 400
const ARRIVE_FX_MS = 1500
const ARRIVE_BANNER_MS = 4200

/** A arte shiny fica ao lado da normal no repositório da PokéAPI (.../official-artwork/shiny/25.png). */
function shinyArtwork(artwork: string | null): string | null {
  return artwork?.includes('/official-artwork/') ? artwork.replace('/official-artwork/', '/official-artwork/shiny/') : null
}

interface NavigationState {
  from?: string
  /** Nome do Pokémon que acabou de evoluir para este (anima a chegada). */
  evolvedFrom?: string
}

interface HeroArtworkProps {
  pokemon: Pokemon
  /** Nome já formatado. */
  name: string
  /** Só a ficha em página própria tem as pedras de evolução (o painel lateral não). */
  interactive: boolean
}

export function HeroArtwork({ pokemon, name, interactive }: HeroArtworkProps) {
  const location = useLocation()
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const reducedMotion = useMediaQuery('(prefers-reduced-motion: reduce)')
  const zoneRef = useRef<HTMLDivElement>(null)

  const [shiny, setShiny] = useState(false)
  const [drop, setDrop] = useState({ dragging: false, over: false })
  const [evolving, setEvolving] = useState<StoneEvolution | null>(null)

  const navigationState = (location.state ?? {}) as NavigationState
  // A chegada é decidida uma vez, ao abrir a ficha (que é remontada a cada Pokémon).
  const [arrivedFrom] = useState(interactive ? (navigationState.evolvedFrom ?? null) : null)
  const [arrivingFx, setArrivingFx] = useState(Boolean(arrivedFrom))
  const [arrivalBanner, setArrivalBanner] = useState(Boolean(arrivedFrom))

  const shinyUrl = shinyArtwork(pokemon.artwork)
  const evolutions = interactive ? stoneEvolutions(pokemon) : []

  function evolve(evolution: StoneEvolution) {
    if (evolving) return
    setEvolving(evolution)
    playEvolvingTheme(reducedMotion ? EVOLVE_REDUCED_MS : EVOLVE_MS)
    // Enquanto a animação roda, a ficha e a arte do evoluído já vão sendo baixadas.
    const id = String(evolution.target.id)
    void queryClient.prefetchQuery({ queryKey: ['pokemon', id], queryFn: ({ signal }) => fetchPokemon(id, signal) })
    if (evolution.target.artwork) new Image().src = evolution.target.artwork
  }

  // Fim da animação: troca para a ficha do Pokémon evoluído.
  useEffect(() => {
    if (!evolving) return
    const timer = window.setTimeout(
      () =>
        navigate(`/pokemon/${evolving.target.id}`, {
          state: { from: navigationState.from, evolvedFrom: name } satisfies NavigationState,
        }),
      reducedMotion ? EVOLVE_REDUCED_MS : EVOLVE_MS,
    )
    return () => window.clearTimeout(timer)
  }, [evolving, navigate, navigationState.from, name, reducedMotion])

  // Chegada: a luz se dissipa, o balão some e o "evolvedFrom" sai do histórico
  // (para recarregar a página ou navegar não repetir a animação).
  useEffect(() => {
    if (!arrivedFrom) return
    playEvolvedFanfare()
    const fxTimer = window.setTimeout(() => setArrivingFx(false), ARRIVE_FX_MS)
    const bannerTimer = window.setTimeout(() => {
      setArrivalBanner(false)
      navigate(`${location.pathname}${location.search}`, {
        replace: true,
        preventScrollReset: true,
        state: { from: navigationState.from } satisfies NavigationState,
      })
    }, ARRIVE_BANNER_MS)
    return () => {
      window.clearTimeout(fxTimer)
      window.clearTimeout(bannerTimer)
    }
    // As dependências só mudam depois do replace, quando os timers já dispararam.
  }, [arrivedFrom, location.pathname, location.search, navigate, navigationState.from])

  // Saiu da página no meio da evolução: a música para junto.
  useEffect(() => () => stopEvolutionSound(), [])

  const classes = [
    styles.artwork,
    drop.dragging ? styles.dropReady : '',
    drop.over ? styles.dropOver : '',
    evolving ? styles.evolvingArt : '',
    arrivingFx ? styles.arrivingArt : '',
  ]
    .filter(Boolean)
    .join(' ')

  return (
    <div className={classes} ref={zoneRef}>
      {/* No detalhe o guia prefere o artwork grande; o sprite é a reserva. */}
      <PokemonImage
        key={shiny ? 'shiny' : 'normal'}
        sources={shiny ? [shinyUrl, pokemon.artwork, pokemon.sprites] : [pokemon.artwork, pokemon.sprites]}
        pixelated={[pokemon.sprites]}
        alt={shiny ? t('sheet.artworkShiny', { name }) : t('sheet.artwork', { name })}
        size={240}
        loading="eager"
      />

      {shinyUrl && !evolving && (
        <button
          type="button"
          className={shiny ? `${styles.shiny} ${styles.shinyOn}` : styles.shiny}
          aria-pressed={shiny}
          onClick={() => setShiny((value) => !value)}
        >
          <Sparkles size={16} aria-hidden="true" />
          {t('sheet.shiny')}
        </button>
      )}

      {evolutions.length > 0 && !evolving && (
        <EvolutionStones
          evolutions={evolutions}
          name={name}
          dropZoneRef={zoneRef}
          onDragStateChange={setDrop}
          onEvolve={evolve}
        />
      )}

      {evolving && <EvolutionFx phase="evolving" />}
      {arrivingFx && <EvolutionFx phase="arriving" />}

      {arrivalBanner && arrivedFrom && (
        <p className={styles.arrivalBanner}>
          <strong>{t('evolve.congrats')}</strong> {t('evolve.done', { from: arrivedFrom, to: name })}
        </p>
      )}

      {/* Anúncio para leitores de tela durante a evolução. */}
      <p className="visually-hidden" role="status">
        {evolving ? t('evolve.evolving', { name }) : ''}
        {arrivalBanner && arrivedFrom ? t('evolve.done', { from: arrivedFrom, to: name }) : ''}
      </p>
    </div>
  )
}
