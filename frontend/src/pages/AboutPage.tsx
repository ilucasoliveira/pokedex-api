import { useDocumentTitle } from '../hooks/useDocumentTitle'
import { API_URL } from '../services/pokemonApi'
import styles from './AboutPage.module.css'

export function AboutPage() {
  useDocumentTitle('Sobre')

  return (
    <div className={`container ${styles.page}`}>
      <h1 className={styles.title}>Sobre a Rota151</h1>

      <p>
        A Rota151 é um atlas digital do universo Pokémon: uma Pokédex para buscar por nome ou
        número, filtrar por tipo e geração e conhecer os atributos, as habilidades e a linha
        evolutiva de cada Pokémon.
      </p>

      <h2 className={styles.subtitle}>Como funciona</h2>
      <p>
        Os dados vêm da <a href="https://pokeapi.co/">PokéAPI</a>, mas o site não a consulta
        direto. Uma API própria, feita com FastAPI, importa e organiza tudo num banco
        PostgreSQL, com cache no Redis, e entrega cada ficha pronta numa requisição só. A
        documentação dela está em <a href={`${API_URL}/docs`}>{API_URL}/docs</a>.
      </p>
      <p>
        As descrições da Pokédex aparecem em inglês, porque é assim que a PokéAPI as oferece.
        Nomes de habilidades e itens também ficam no original.
      </p>

      <h2 className={styles.subtitle}>Projeto</h2>
      <p>
        Projeto final do curso Full Stack Python da EBAC, por Lucas de Oliveira Pimentel. O código
        da API e deste site está no{' '}
        <a href="https://github.com/ilucasoliveira/pokedex-api">GitHub</a>.
      </p>

      <h2 className={styles.subtitle}>Aviso</h2>
      <p>
        Projeto de fã, sem fins lucrativos e sem afiliação com Nintendo, Game Freak ou The Pokémon
        Company. Pokémon e os nomes relacionados são marcas de seus respectivos donos. As imagens
        vêm do repositório público da PokéAPI.
      </p>
    </div>
  )
}
