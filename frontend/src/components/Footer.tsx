import { t } from '../i18n'
import { API_URL } from '../services/pokemonApi'
import { InstallApp } from './InstallApp'
import styles from './Footer.module.css'

const REPOSITORY_URL = 'https://github.com/ilucasoliveira/pokedex-api'
const AUTHOR_URL = 'https://github.com/ilucasoliveira'
// Ano do copyright, calculado quando o site carrega.
const YEAR = new Date().getFullYear()

// Rodapé centralizado: fontes, aviso de projeto de fã e, por último, os créditos.
export function Footer() {
  return (
    <footer className={styles.footer}>
      <div className={`container ${styles.inner}`}>
        <InstallApp />
        <p className={styles.sources}>
          <span>
            {t('footer.data')} <a href="https://pokeapi.co/">PokéAPI</a>
          </span>
          <span aria-hidden="true">·</span>
          <a href={`${API_URL}/docs`}>{t('footer.api')}</a>
          <span aria-hidden="true">·</span>
          <span>
            {t('footer.code')} <a href={REPOSITORY_URL}>GitHub</a>
          </span>
        </p>
        <p className={styles.disclaimer}>{t('footer.disclaimer')}</p>
        <p className={styles.credits}>
          {t('footer.credits', { year: YEAR })} <a href={AUTHOR_URL}>Lucas de Oliveira</a>
        </p>
      </div>
    </footer>
  )
}
