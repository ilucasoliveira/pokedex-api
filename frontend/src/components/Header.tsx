import { Menu, X } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import { Link, NavLink, useLocation } from 'react-router'

import { t, type MessageKey } from '../i18n'
import { useJourney } from '../store/journey'
import { PreferenceToggles } from './PreferenceToggles'
import { Logo } from './Logo'
import styles from './Header.module.css'

const NAV_ITEMS: { to: string; label: MessageKey; end: boolean }[] = [
  { to: '/', label: 'nav.home', end: true },
  { to: '/pokedex', label: 'nav.pokedex', end: false },
  { to: '/tipos', label: 'nav.types', end: false },
  { to: '/geracoes', label: 'nav.generations', end: false },
  { to: '/favoritos', label: 'nav.favorites', end: false },
  { to: '/sobre', label: 'nav.about', end: false },
]

export function Header() {
  const toggleRef = useRef<HTMLButtonElement>(null)
  const { pathname } = useLocation()
  // Guarda a página em que o menu foi aberto: ao navegar, ele fecha sozinho.
  const [openedAt, setOpenedAt] = useState<string | null>(null)
  const menuOpen = openedAt === pathname
  const { favorites } = useJourney()

  // Escape fecha o menu e devolve o foco ao botão que o abriu.
  useEffect(() => {
    if (!menuOpen) return
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') {
        setOpenedAt(null)
        toggleRef.current?.focus()
      }
    }
    document.addEventListener('keydown', onKeyDown)
    return () => document.removeEventListener('keydown', onKeyDown)
  }, [menuOpen])

  return (
    <header className={styles.header}>
      <div className={`container ${styles.inner}`}>
        <Link to="/" className={styles.brand} aria-label={t('brand.home')}>
          <Logo />
        </Link>

        {/* Idioma, tema e (no celular) o botão do menu, antes do menu na ordem do teclado. */}
        <div className={styles.actions}>
          <PreferenceToggles />
          <button
            ref={toggleRef}
            type="button"
            className={styles.toggle}
            aria-expanded={menuOpen}
            aria-controls="menu-principal"
            onClick={() => setOpenedAt(menuOpen ? null : pathname)}
          >
            {menuOpen ? <X size={24} aria-hidden="true" /> : <Menu size={24} aria-hidden="true" />}
            <span className="visually-hidden">{menuOpen ? t('menu.close') : t('menu.open')}</span>
          </button>
        </div>

        <nav
          id="menu-principal"
          aria-label={t('nav.label')}
          className={menuOpen ? `${styles.nav} ${styles.open}` : styles.nav}
        >
          <ul className={styles.list}>
            {NAV_ITEMS.map((item) => (
              <li key={item.to}>
                <NavLink
                  to={item.to}
                  end={item.end}
                  className={({ isActive }) => (isActive ? `${styles.link} ${styles.active}` : styles.link)}
                >
                  {t(item.label)}
                  {item.to === '/favoritos' && favorites.length > 0 && (
                    <span className={styles.badge}>
                      <span className="visually-hidden">: </span>
                      {favorites.length}
                    </span>
                  )}
                </NavLink>
              </li>
            ))}
          </ul>
        </nav>
      </div>
    </header>
  )
}
