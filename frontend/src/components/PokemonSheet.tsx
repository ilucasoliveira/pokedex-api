import { Ruler, Sparkles, Weight } from 'lucide-react'
import { useState } from 'react'

import { t } from '../i18n'
import type { Pokemon } from '../services/types'
import {
  formatGeneration,
  formatHeight,
  formatName,
  formatNumber,
  formatWeight,
} from '../utils/format'
import { typeColors } from '../utils/typeColors'
import { CryButton } from './CryButton'
import { EvolutionChain } from './EvolutionChain'
import { FavoriteButton } from './FavoriteButton'
import { PokemonImage } from './PokemonImage'
import { StatBars } from './StatBars'
import { TypeList } from './TypeBadge'
import { TypeMatchups } from './TypeMatchups'
import styles from './PokemonSheet.module.css'

/** A arte shiny fica ao lado da normal no repositório da PokéAPI (.../official-artwork/shiny/25.png). */
function shinyArtwork(artwork: string | null): string | null {
  return artwork?.includes('/official-artwork/') ? artwork.replace('/official-artwork/', '/official-artwork/shiny/') : null
}

interface PokemonSheetProps {
  pokemon: Pokemon
  /** "page": ficha em página própria; "panel": coluna estreita do painel lateral. */
  variant?: 'page' | 'panel'
  /** Para onde os Pokémon da linha evolutiva levam. */
  evolutionHref?: (id: number) => string
}

export function PokemonSheet({ pokemon, variant = 'page', evolutionHref }: PokemonSheetProps) {
  const name = formatName(pokemon.name)
  const [shiny, setShiny] = useState(false)
  const shinyUrl = shinyArtwork(pokemon.artwork)
  const regularAbilities = pokemon.abilities.filter((ability) => !ability.is_hidden)
  const hiddenAbilities = pokemon.abilities.filter((ability) => ability.is_hidden)
  const Title = variant === 'page' ? 'h1' : 'h2'
  const Section = variant === 'page' ? 'h2' : 'h3'
  const ids = `ficha-${pokemon.id}`

  return (
    <article
      className={variant === 'page' ? styles.sheet : `${styles.sheet} ${styles.panel}`}
      aria-labelledby={`${ids}-nome`}
    >
      <div className={styles.hero} style={typeColors(pokemon.types[0])}>
        <div className={styles.artwork}>
          {/* No detalhe o guia prefere o artwork grande; o sprite é a reserva. */}
          <PokemonImage
            key={shiny ? 'shiny' : 'normal'}
            sources={shiny ? [shinyUrl, pokemon.artwork, pokemon.sprites] : [pokemon.artwork, pokemon.sprites]}
            pixelated={[pokemon.sprites]}
            alt={shiny ? t('sheet.artworkShiny', { name }) : t('sheet.artwork', { name })}
            size={240}
            loading="eager"
          />
          {shinyUrl && (
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
        </div>

        <div className={styles.identity}>
          <div className={styles.titleRow}>
            <div>
              <p className={styles.number}>{formatNumber(pokemon.id)}</p>
              <Title id={`${ids}-nome`} className={styles.name}>
                {name}
              </Title>
            </div>
            <FavoriteButton id={pokemon.id} name={name} className={styles.favorite} />
          </div>
          <TypeList types={pokemon.types} />
          <p className={styles.generation}>
            {pokemon.generation ? formatGeneration(pokemon.generation) : t('sheet.generationUnknown')}
          </p>
          <CryButton id={pokemon.id} name={name} />
          {pokemon.description ? (
            // A PokéAPI só tem esses textos em inglês; o lang avisa o leitor de tela.
            <figure className={styles.description}>
              <blockquote lang="en">{pokemon.description}</blockquote>
              <figcaption className={styles.descriptionSource}>{t('sheet.descriptionSource')}</figcaption>
            </figure>
          ) : (
            <p className={styles.muted}>{t('sheet.descriptionUnknown')}</p>
          )}
        </div>
      </div>

      <div className={styles.grid}>
        <section className={styles.section} aria-labelledby={`${ids}-medidas`}>
          <Section id={`${ids}-medidas`} className={styles.sectionTitle}>
            {t('sheet.measures')}
          </Section>
          <dl className={styles.measures}>
            <div className={styles.measure}>
              <dt>
                <Ruler size={20} aria-hidden="true" />
                {t('sheet.height')}
              </dt>
              <dd>{formatHeight(pokemon.height)}</dd>
            </div>
            <div className={styles.measure}>
              <dt>
                <Weight size={20} aria-hidden="true" />
                {t('sheet.weight')}
              </dt>
              <dd>{formatWeight(pokemon.weight)}</dd>
            </div>
          </dl>
        </section>

        <section className={styles.section} aria-labelledby={`${ids}-habilidades`}>
          <Section id={`${ids}-habilidades`} className={styles.sectionTitle}>
            {t('sheet.abilities')}
          </Section>
          {pokemon.abilities.length === 0 ? (
            <p className={styles.muted}>{t('sheet.notInformed')}</p>
          ) : (
            <div className={styles.abilities}>
              {regularAbilities.length > 0 && (
                <ul className={styles.pills}>
                  {regularAbilities.map((ability) => (
                    <li key={ability.name} className={styles.pill}>
                      {formatName(ability.name)}
                    </li>
                  ))}
                </ul>
              )}
              {hiddenAbilities.length > 0 && (
                <div>
                  <p className={styles.subTitle}>{t('sheet.hiddenAbility')}</p>
                  <ul className={styles.pills}>
                    {hiddenAbilities.map((ability) => (
                      <li key={ability.name} className={`${styles.pill} ${styles.hidden}`}>
                        {formatName(ability.name)}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          )}
        </section>

        <section className={`${styles.section} ${styles.wide}`} aria-labelledby={`${ids}-atributos`}>
          <Section id={`${ids}-atributos`} className={styles.sectionTitle}>
            {t('sheet.stats')}
          </Section>
          {pokemon.stats ? <StatBars stats={pokemon.stats} /> : <p className={styles.muted}>{t('sheet.notInformed')}</p>}
        </section>

        <section className={`${styles.section} ${styles.wide}`} aria-labelledby={`${ids}-tipos`}>
          <Section id={`${ids}-tipos`} className={styles.sectionTitle}>
            {t('sheet.matchups')}
          </Section>
          <TypeMatchups types={pokemon.types} />
        </section>

        <section className={`${styles.section} ${styles.wide}`} aria-labelledby={`${ids}-evolucao`}>
          <Section id={`${ids}-evolucao`} className={styles.sectionTitle}>
            {t('sheet.evolution')}
          </Section>
          <EvolutionChain chain={pokemon.evolution_chain} currentId={pokemon.id} hrefFor={evolutionHref} />
        </section>
      </div>
    </article>
  )
}
