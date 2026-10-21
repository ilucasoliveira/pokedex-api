import symbolUrl from '../assets/simbolo-rota151.svg'
import { t } from '../i18n'
import styles from './Logo.module.css'

interface LogoProps {
  showTagline?: boolean
}

// O logo do kit tem o nome em <text> dentro do SVG; como <img>, ele não usaria a
// Rubik carregada na página. Aqui o símbolo é a imagem e o nome é texto de verdade.
export function Logo({ showTagline = true }: LogoProps) {
  return (
    <span className={styles.logo}>
      <img src={symbolUrl} alt="" className={styles.symbol} width={30} height={36} />
      <span className={styles.text}>
        <span className={styles.name}>
          Rota<span className={styles.number}>151</span>
        </span>
        {showTagline && (
          <span className={styles.tagline} aria-hidden="true">
            {t('brand.tagline')}
          </span>
        )}
      </span>
    </span>
  )
}
