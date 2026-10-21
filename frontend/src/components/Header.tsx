import { Menu, X } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import { Link, NavLink, useLocation } from 'react-router'

import { Logo } from './Logo'
import styles from './Header.module.css'

const NAV_ITEMS = [
  { to: '/', label: 'Início', end: true },
  { to: '/pokedex', label: 'Pokédex', end: false },
  { to: '/tipos', label: 'Tipos', end: false },
  { to: '/geracoes', label: 'Gerações', end: false },
  { to: '/sobre', label: 'Sobre', end: false },
]

export function Header() {
  const toggleRef = useRef<HTMLButtonElement>(null)
  const { pathname } = useLocation()
  // Guarda a página em que o menu foi aberto: ao navegar, ele fecha sozinho.
  const [openedAt, setOpenedAt] = useState<string | null>(null)
  const menuOpen = openedAt === pathname

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
        <Link to="/" className={styles.brand} aria-label="Rota151, página inicial">
          <Logo />
        </Link>

        <button
          ref={toggleRef}
          type="button"
          className={styles.toggle}
          aria-expanded={menuOpen}
          aria-controls="menu-principal"
          onClick={() => setOpenedAt(menuOpen ? null : pathname)}
        >
          {menuOpen ? <X size={24} aria-hidden="true" /> : <Menu size={24} aria-hidden="true" />}
          <span className="visually-hidden">{menuOpen ? 'Fechar menu' : 'Abrir menu'}</span>
        </button>

        <nav
          id="menu-principal"
          aria-label="Principal"
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
                  {item.label}
                </NavLink>
              </li>
            ))}
          </ul>
        </nav>
      </div>
    </header>
  )
}
