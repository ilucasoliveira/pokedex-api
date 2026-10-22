import { Outlet, ScrollRestoration } from 'react-router'

import { WifiOff } from 'lucide-react'

import { useOnlineStatus } from '../hooks/useOnlineStatus'
import { t } from '../i18n'
import { Footer } from './Footer'
import { Header } from './Header'
import styles from './Layout.module.css'

export function Layout() {
  const online = useOnlineStatus()

  return (
    <>
      <a href="#conteudo" className={styles.skipLink}>
        {t('layout.skip')}
      </a>
      <Header />
      {!online && (
        <p className={styles.offline} role="status">
          <WifiOff size={16} aria-hidden="true" />
          {t('offline.banner')}
        </p>
      )}
      <main id="conteudo" tabIndex={-1} className={styles.main}>
        <Outlet />
      </main>
      <Footer />
      <ScrollRestoration />
    </>
  )
}
