import { CloudOff, RefreshCw, SearchX } from 'lucide-react'
import type { ReactNode } from 'react'

import buttons from '../styles/buttons.module.css'
import styles from './StatusPanel.module.css'

interface StatusPanelProps {
  kind: 'empty' | 'error'
  title: string
  description: string
  action?: ReactNode
}

export function StatusPanel({ kind, title, description, action }: StatusPanelProps) {
  const Icon = kind === 'error' ? CloudOff : SearchX
  return (
    <div className={styles.panel} role={kind === 'error' ? 'alert' : 'status'}>
      <Icon size={40} className={styles.icon} aria-hidden="true" />
      <div className={styles.text}>
        <h2 className={styles.title}>{title}</h2>
        <p>{description}</p>
        {action && <div className={styles.action}>{action}</div>}
      </div>
    </div>
  )
}

interface ErrorPanelProps {
  title: string
  onRetry: () => void
}

export function ErrorPanel({ title, onRetry }: ErrorPanelProps) {
  return (
    <StatusPanel
      kind="error"
      title={title}
      description="A API não respondeu como esperado. Confira sua conexão e tente de novo em alguns instantes."
      action={
        <button type="button" className={buttons.danger} onClick={onRetry}>
          <RefreshCw size={18} aria-hidden="true" />
          Tentar novamente
        </button>
      }
    />
  )
}

interface SlowApiNoticeProps {
  visible: boolean
}

/** Aviso para a primeira requisição depois que a API do Render "dormiu". */
export function SlowApiNotice({ visible }: SlowApiNoticeProps) {
  return (
    <p className={styles.slow} role="status">
      {visible
        ? 'A API está acordando (o servidor gratuito dorme quando fica parado). Isso pode levar até um minuto.'
        : ''}
    </p>
  )
}
