import { t } from '../i18n'
import { API_URL } from '../services/pokemonApi'
import styles from './Footer.module.css'

const REPOSITORY_URL = 'https://github.com/ilucasoliveira/pokedex-api'

export function Footer() {
  return (
    <footer className={styles.footer}>
      <div className={`container ${styles.inner}`}>
        <p>
          {t('footer.data')} <a href="https://pokeapi.co/">PokéAPI</a>
          {t('footer.servedBy')} <a href={`${API_URL}/docs`}>{t('footer.api')}</a>
          {t('footer.code')} <a href={REPOSITORY_URL}>GitHub</a>.
        </p>
        <p className={styles.disclaimer}>{t('footer.disclaimer')}</p>
      </div>
    </footer>
  )
}
