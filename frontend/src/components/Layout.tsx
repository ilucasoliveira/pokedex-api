import { Outlet, ScrollRestoration } from 'react-router'

import { t } from '../i18n'
import { Footer } from './Footer'
import { Header } from './Header'
import styles from './Layout.module.css'

export function Layout() {
  return (
    <>
      <a href="#conteudo" className={styles.skipLink}>
        {t('layout.skip')}
      </a>
      <Header />
      <main id="conteudo" tabIndex={-1} className={styles.main}>
        <Outlet />
      </main>
      <Footer />
      <ScrollRestoration />
    </>
  )
}
