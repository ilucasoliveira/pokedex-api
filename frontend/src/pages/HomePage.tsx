import { ArrowRight } from 'lucide-react'
import { Link } from 'react-router'

import { Catalog } from '../components/Catalog'
import { HeroScene } from '../components/HeroScene'
import { JourneyPanel } from '../components/JourneyPanel'
import { RecentlyViewed } from '../components/RecentlyViewed'
import { useDocumentTitle } from '../hooks/useDocumentTitle'
import { t } from '../i18n'
import buttons from '../styles/buttons.module.css'
import styles from './HomePage.module.css'

export function HomePage() {
  useDocumentTitle(null)

  return (
    <>
      <section className={styles.hero} aria-labelledby="hero-titulo">
        <div className={`container ${styles.heroInner}`}>
          <div className={styles.heroText}>
            <p className={styles.eyebrow}>{t('brand.tagline')}</p>
            <h1 id="hero-titulo" className={styles.title}>
              {t('home.title')}
            </h1>
            <p className={styles.subtitle}>{t('home.subtitle')}</p>
            <div className={styles.heroActions}>
              <Link to="/pokedex" className={buttons.primary}>
                {t('home.explore')}
                <ArrowRight size={20} aria-hidden="true" />
              </Link>
              <Link to="/tipos" className={buttons.secondary}>
                {t('home.types')}
              </Link>
            </div>
          </div>
          <div className={styles.scene}>
            <HeroScene />
          </div>
        </div>
      </section>

      <div className={`container ${styles.content}`}>
        <JourneyPanel />
        <RecentlyViewed />
        <Catalog title={t('catalog.title')} headingLevel="h2" />
      </div>
    </>
  )
}
