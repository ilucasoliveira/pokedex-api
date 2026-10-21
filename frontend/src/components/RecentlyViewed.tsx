import { useState } from 'react'
import { Link } from 'react-router'

import { usePokemonsByIds } from '../services/queries'
import { useJourney } from '../store/journey'
import { formatName, formatNumber } from '../utils/format'
import { typeColors } from '../utils/typeColors'
import { PokemonImage } from './PokemonImage'
import styles from './RecentlyViewed.module.css'

/** Faixa com os últimos Pokémon abertos, para retomar a exploração. */
export function RecentlyViewed() {
  const journey = useJourney()
  // A lista é a de quando a página abriu: ver um Pokémon no painel lateral não
  // insere nada no meio da tela (sem conteúdo pulando enquanto o usuário navega).
  const [recent] = useState(journey.recent)
  const query = usePokemonsByIds(recent)

  if (recent.length === 0 || !query.data) return null

  // A API devolve na ordem da Pokédex; aqui o mais recente vem primeiro.
  const byId = new Map(query.data.data.map((pokemon) => [pokemon.id, pokemon]))
  const pokemons = recent.flatMap((id) => byId.get(id) ?? [])
  if (pokemons.length === 0) return null

  return (
    <section className={styles.section} aria-labelledby="recentes-titulo">
      <h2 id="recentes-titulo" className={styles.title}>
        Vistos recentemente
      </h2>
      <ul className={styles.list}>
        {pokemons.map((pokemon) => (
          <li key={pokemon.id}>
            <Link to={`/pokemon/${pokemon.id}`} className={styles.item} style={typeColors(pokemon.types[0])}>
              <PokemonImage
                sources={[pokemon.sprites, pokemon.artwork]}
                pixelated={[pokemon.sprites]}
                alt=""
                size={72}
              />
              <span className={styles.name}>{formatName(pokemon.name)}</span>
              <span className={styles.number}>{formatNumber(pokemon.id)}</span>
            </Link>
          </li>
        ))}
      </ul>
    </section>
  )
}
