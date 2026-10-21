import { API_URL } from '../services/pokemonApi'
import styles from './Footer.module.css'

const REPOSITORY_URL = 'https://github.com/ilucasoliveira/pokedex-api'

export function Footer() {
  return (
    <footer className={styles.footer}>
      <div className={`container ${styles.inner}`}>
        <p>
          Dados e imagens da <a href="https://pokeapi.co/">PokéAPI</a>, servidos pela{' '}
          <a href={`${API_URL}/docs`}>API da Rota151</a>. Código no{' '}
          <a href={REPOSITORY_URL}>GitHub</a>.
        </p>
        <p className={styles.disclaimer}>
          Projeto de fã, sem fins lucrativos e sem afiliação com Nintendo, Game Freak ou The
          Pokémon Company. Pokémon e os nomes relacionados são marcas de seus respectivos donos.
        </p>
      </div>
    </footer>
  )
}
