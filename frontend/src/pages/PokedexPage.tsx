import { Catalog } from '../components/Catalog'
import { useDocumentTitle } from '../hooks/useDocumentTitle'
import { t } from '../i18n'

export function PokedexPage() {
  useDocumentTitle(t('nav.pokedex'))

  return (
    <div className="container" style={{ paddingTop: 'var(--space-32)' }}>
      <Catalog title={t('catalog.title')} headingLevel="h1" />
    </div>
  )
}
