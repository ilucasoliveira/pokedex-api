import { ArrowLeft, Ruler, Weight } from 'lucide-react'
import type { ReactNode } from 'react'
import { Link, useLocation, useParams } from 'react-router'

import { EvolutionChain } from '../components/EvolutionChain'
import { PokemonImage } from '../components/PokemonImage'
import { StatBars } from '../components/StatBars'
import { ErrorPanel, SlowApiNotice, StatusPanel } from '../components/StatusPanel'
import { TypeList } from '../components/TypeBadge'
import { useDelayedFlag } from '../hooks/useDelayedFlag'
import { useDocumentTitle } from '../hooks/useDocumentTitle'
import { ApiError } from '../services/pokemonApi'
import { usePokemon } from '../services/queries'
import type { Pokemon } from '../services/types'
import buttons from '../styles/buttons.module.css'
import {
  formatGeneration,
  formatHeight,
  formatName,
  formatNumber,
  formatWeight,
} from '../utils/format'
import { typeColors } from '../utils/typeColors'
import styles from './PokemonPage.module.css'

const NOT_INFORMED = 'Não informado'

export function PokemonPage() {
  const { idOrName = '' } = useParams()
  const location = useLocation()
  const query = usePokemon(idOrName)
  const slow = useDelayedFlag(query.isPending, 4000)

  // O card guarda o endereço da lista (com filtros e página) para o "Voltar".
  const from = (location.state as { from?: string } | null)?.from ?? '/pokedex'
  const pokemon = query.data

  useDocumentTitle(
    pokemon
      ? `${formatName(pokemon.name)} (${formatNumber(pokemon.id)})`
      : query.isError
        ? 'Pokémon não encontrado'
        : null,
  )

  let content: ReactNode
  if (query.isPending) {
    content = (
      <div className={styles.loading} role="status">
        <p>Carregando Pokémon…</p>
        <SlowApiNotice visible={slow} />
      </div>
    )
  } else if (query.isError) {
    content =
      query.error instanceof ApiError && query.error.status === 404 ? (
        <StatusPanel
          kind="empty"
          title="Não encontramos esse Pokémon."
          description={`Nada com o nome ou número "${idOrName}" na Pokédex da Rota151.`}
          action={
            <Link to="/pokedex" className={buttons.secondary}>
              Ver a Pokédex
            </Link>
          }
        />
      ) : (
        <ErrorPanel title="Não foi possível carregar este Pokémon." onRetry={() => query.refetch()} />
      )
  } else {
    content = <PokemonDetails pokemon={query.data} />
  }

  return (
    <div className={`container ${styles.page}`}>
      <Link to={from} className={styles.back}>
        <ArrowLeft size={18} aria-hidden="true" />
        Voltar para a lista
      </Link>
      {content}
    </div>
  )
}

interface PokemonDetailsProps {
  pokemon: Pokemon
}

function PokemonDetails({ pokemon }: PokemonDetailsProps) {
  const name = formatName(pokemon.name)
  const regularAbilities = pokemon.abilities.filter((ability) => !ability.is_hidden)
  const hiddenAbilities = pokemon.abilities.filter((ability) => ability.is_hidden)

  return (
    <article className={styles.details} aria-labelledby="pokemon-nome">
      <div className={styles.hero} style={typeColors(pokemon.types[0])}>
        <div className={styles.artwork}>
          {/* No detalhe o guia prefere o artwork grande; o sprite é a reserva. */}
          <PokemonImage
            sources={[pokemon.artwork, pokemon.sprites]}
            pixelated={[pokemon.sprites]}
            alt={`Arte de ${name}`}
            size={240}
            loading="eager"
          />
        </div>
        <div className={styles.identity}>
          <p className={styles.number}>{formatNumber(pokemon.id)}</p>
          <h1 id="pokemon-nome" className={styles.name}>
            {name}
          </h1>
          <TypeList types={pokemon.types} />
          <p className={styles.generation}>
            {pokemon.generation ? formatGeneration(pokemon.generation) : `Geração: ${NOT_INFORMED}`}
          </p>
          {pokemon.description ? (
            // A PokéAPI só tem esses textos em inglês; o lang avisa o leitor de tela.
            <figure className={styles.description}>
              <blockquote lang="en">{pokemon.description}</blockquote>
              <figcaption className={styles.descriptionSource}>Texto da Pokédex, em inglês</figcaption>
            </figure>
          ) : (
            <p className={styles.muted}>Descrição: {NOT_INFORMED}</p>
          )}
        </div>
      </div>

      <div className={styles.grid}>
        <section className={styles.panel} aria-labelledby="medidas">
          <h2 id="medidas" className={styles.panelTitle}>
            Medidas
          </h2>
          <dl className={styles.measures}>
            <div className={styles.measure}>
              <dt>
                <Ruler size={20} aria-hidden="true" />
                Altura
              </dt>
              <dd>{formatHeight(pokemon.height)}</dd>
            </div>
            <div className={styles.measure}>
              <dt>
                <Weight size={20} aria-hidden="true" />
                Peso
              </dt>
              <dd>{formatWeight(pokemon.weight)}</dd>
            </div>
          </dl>
        </section>

        <section className={styles.panel} aria-labelledby="habilidades">
          <h2 id="habilidades" className={styles.panelTitle}>
            Habilidades
          </h2>
          {pokemon.abilities.length === 0 ? (
            <p className={styles.muted}>{NOT_INFORMED}</p>
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
                  <h3 className={styles.subTitle}>Habilidade oculta</h3>
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

        <section className={`${styles.panel} ${styles.wide}`} aria-labelledby="atributos">
          <h2 id="atributos" className={styles.panelTitle}>
            Atributos base
          </h2>
          {pokemon.stats ? <StatBars stats={pokemon.stats} /> : <p className={styles.muted}>{NOT_INFORMED}</p>}
        </section>

        <section className={`${styles.panel} ${styles.wide}`} aria-labelledby="evolucao">
          <h2 id="evolucao" className={styles.panelTitle}>
            Linha evolutiva
          </h2>
          <EvolutionChain chain={pokemon.evolution_chain} currentId={pokemon.id} />
        </section>
      </div>
    </article>
  )
}
