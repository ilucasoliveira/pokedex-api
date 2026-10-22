import { useDocumentTitle } from '../hooks/useDocumentTitle'
import { t } from '../i18n'
import { API_URL } from '../services/pokemonApi'
import { InstallApp } from '../components/InstallApp'
import { getLanguage } from '../store/preferences'
import styles from './AboutPage.module.css'

const REPOSITORY_URL = 'https://github.com/ilucasoliveira/pokedex-api'

// Texto corrido com links: mais fácil de manter como dois blocos do que picado em chaves.
function ContentPt() {
  return (
    <>
      <p>
        A Rota151 é um atlas digital do universo Pokémon: uma Pokédex para buscar por nome ou
        número, filtrar por tipo e geração e conhecer os atributos, as habilidades, as fraquezas e
        a linha evolutiva de cada Pokémon.
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

      <h2 className={styles.subtitle}>App no celular</h2>
      <p>
        A Rota151 pode ser instalada no Android e no iPhone, como um app: ícone na tela inicial,
        tela cheia e funcionamento sem internet para o que você já viu. Não precisa de loja, e as
        atualizações chegam sozinhas.
      </p>
      <InstallApp />

      <h2 className={styles.subtitle}>Sua jornada</h2>
      <p>
        Cada ficha que você abre entra para a sua Pokédex, e o coração guarda os favoritos. Tudo
        isso, assim como o idioma e o tema escolhidos, fica salvo só neste navegador: não há conta,
        cadastro nem envio para o servidor. O botão “Recomeçar”, na página inicial, apaga o
        progresso.
      </p>
      <p>
        A tabela de fraquezas segue as regras dos jogos a partir da Geração VI e não considera
        habilidades. A arte shiny e o grito vêm do repositório público da PokéAPI.
      </p>

      <h2 className={styles.subtitle}>Projeto</h2>
      <p>
        Projeto final do curso Full Stack Python da EBAC, por Lucas de Oliveira Pimentel. O código
        da API e deste site está no <a href={REPOSITORY_URL}>GitHub</a>.
      </p>

      <h2 className={styles.subtitle}>Aviso</h2>
      <p>
        Projeto de fã, sem fins lucrativos e sem afiliação com Nintendo, Game Freak ou The Pokémon
        Company. Pokémon e os nomes relacionados são marcas de seus respectivos donos. As imagens
        vêm do repositório público da PokéAPI.
      </p>
    </>
  )
}

function ContentEn() {
  return (
    <>
      <p>
        Rota151 is a digital atlas of the Pokémon world: a Pokédex to search by name or number,
        filter by type and generation, and learn each Pokémon's stats, abilities, weaknesses and
        evolution chain.
      </p>

      <h2 className={styles.subtitle}>How it works</h2>
      <p>
        The data comes from <a href="https://pokeapi.co/">PokéAPI</a>, but the site doesn't call
        it directly. A dedicated API, built with FastAPI, imports and organizes everything in a
        PostgreSQL database, caches it in Redis, and serves each Pokémon page in a single request.
        Its documentation is at <a href={`${API_URL}/docs`}>{API_URL}/docs</a>.
      </p>
      <p>Ability and item names are kept as PokéAPI provides them.</p>

      <h2 className={styles.subtitle}>Mobile app</h2>
      <p>
        Rota151 can be installed on Android and iPhone like an app: an icon on your home screen,
        full screen, and offline access to what you've already seen. No app store needed, and
        updates arrive on their own.
      </p>
      <InstallApp />

      <h2 className={styles.subtitle}>Your journey</h2>
      <p>
        Every page you open goes into your Pokédex, and the heart keeps your favorites. All of
        this, along with your language and theme, is saved only in this browser: no account, no
        sign-up, nothing sent to the server. The “Start over” button on the home page clears your
        progress.
      </p>
      <p>
        The weakness chart follows the game rules from Generation VI on and doesn't consider
        abilities. Shiny artwork and cries come from PokéAPI's public repository.
      </p>

      <h2 className={styles.subtitle}>Project</h2>
      <p>
        Final project of EBAC's Full Stack Python course, by Lucas de Oliveira Pimentel. The code
        for the API and this site is on <a href={REPOSITORY_URL}>GitHub</a>.
      </p>

      <h2 className={styles.subtitle}>Disclaimer</h2>
      <p>
        Non-profit fan project, not affiliated with Nintendo, Game Freak or The Pokémon Company.
        Pokémon and related names are trademarks of their respective owners. Images come from
        PokéAPI's public repository.
      </p>
    </>
  )
}

export function AboutPage() {
  useDocumentTitle(t('nav.about'))

  return (
    <div className={`container ${styles.page}`}>
      <h1 className={styles.title}>{t('about.title')}</h1>
      {getLanguage() === 'pt' ? <ContentPt /> : <ContentEn />}
    </div>
  )
}
