import { Link } from 'react-router'

import { StatusPanel } from '../components/StatusPanel'
import { useDocumentTitle } from '../hooks/useDocumentTitle'
import buttons from '../styles/buttons.module.css'

export function NotFoundPage() {
  useDocumentTitle('Página não encontrada')

  return (
    <div className="container" style={{ paddingTop: 'var(--space-32)' }}>
      <h1 className="visually-hidden">Página não encontrada</h1>
      <StatusPanel
        kind="empty"
        title="Esta rota não existe."
        description="O endereço pode ter mudado ou estar com algum erro de digitação."
        action={
          <Link to="/" className={buttons.primary}>
            Voltar para o início
          </Link>
        }
      />
    </div>
  )
}
