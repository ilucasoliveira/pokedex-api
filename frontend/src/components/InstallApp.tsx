import { Download, Share } from 'lucide-react'
import { useState } from 'react'

import { t } from '../i18n'
import { promptInstall, useInstallState } from '../store/installPrompt'
import styles from './InstallApp.module.css'

/** Botão "Instalar o app": abre o instalador (Android) ou explica o caminho (iPhone). */
export function InstallApp() {
  const { canPrompt, standalone, ios } = useInstallState()
  const [showIosHelp, setShowIosHelp] = useState(false)

  // Já instalado, ou navegador sem instalação (Firefox no computador, por exemplo).
  if (standalone || (!canPrompt && !ios)) return null

  if (canPrompt) {
    return (
      <button type="button" className={styles.button} onClick={() => void promptInstall()}>
        <Download size={18} aria-hidden="true" />
        {t('install.button')}
      </button>
    )
  }

  return (
    <div className={styles.ios}>
      <button
        type="button"
        className={styles.button}
        aria-expanded={showIosHelp}
        aria-controls="instalar-iphone"
        onClick={() => setShowIosHelp((open) => !open)}
      >
        <Share size={18} aria-hidden="true" />
        {t('install.ios')}
      </button>
      {showIosHelp && (
        <p id="instalar-iphone" className={styles.help}>
          {t('install.iosHelp')}
        </p>
      )}
    </div>
  )
}
