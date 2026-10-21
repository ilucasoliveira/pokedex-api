import { Catalog } from '../components/Catalog'
import { useDocumentTitle } from '../hooks/useDocumentTitle'

export function PokedexPage() {
  useDocumentTitle('Pokédex')

  return (
    <div className="container" style={{ paddingTop: 'var(--space-32)' }}>
      <Catalog title="Pokédex" headingLevel="h1" />
    </div>
  )
}
