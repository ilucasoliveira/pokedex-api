import { ArrowRight } from 'lucide-react'
import { Link } from 'react-router'

import symbolUrl from '../assets/simbolo-rota151.svg'
import { Catalog } from '../components/Catalog'
import { useDocumentTitle } from '../hooks/useDocumentTitle'
import buttons from '../styles/buttons.module.css'
import styles from './HomePage.module.css'

export function HomePage() {
  useDocumentTitle(null)

  return (
    <>
      <section className={styles.hero} aria-labelledby="hero-titulo">
        <div className={`container ${styles.heroInner}`}>
          <div className={styles.heroText}>
            <p className={styles.eyebrow}>Rota 151</p>
            <h1 id="hero-titulo" className={styles.title}>
              Toda grande jornada começa com um encontro.
            </h1>
            <p className={styles.subtitle}>
              Explore a Pokédex completa: busque por nome ou número, filtre por tipo e geração e
              descubra atributos, habilidades e evoluções.
            </p>
            <Link to="/pokedex" className={buttons.primary}>
              Explorar Pokémon
              <ArrowRight size={20} aria-hidden="true" />
            </Link>
          </div>
          <img src={symbolUrl} alt="" className={styles.symbol} width={160} height={192} />
        </div>
      </section>

      <div className="container">
        <Catalog title="Pokédex" headingLevel="h2" />
      </div>
    </>
  )
}
