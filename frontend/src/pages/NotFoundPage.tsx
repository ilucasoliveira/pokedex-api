import { Link } from 'react-router'

import { StatusPanel } from '../components/StatusPanel'
import { useDocumentTitle } from '../hooks/useDocumentTitle'
import { t } from '../i18n'
import buttons from '../styles/buttons.module.css'

export function NotFoundPage() {
  useDocumentTitle(t('notFound.title'))

  return (
    <div className="container" style={{ paddingTop: 'var(--space-32)' }}>
      <h1 className="visually-hidden">{t('notFound.title')}</h1>
      <StatusPanel
        kind="empty"
        title={t('notFound.heading')}
        description={t('notFound.description')}
        action={
          <Link to="/" className={buttons.primary}>
            {t('notFound.home')}
          </Link>
        }
      />
    </div>
  )
}
