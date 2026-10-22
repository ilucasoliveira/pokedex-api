import { Moon, Sun } from 'lucide-react'

import { t } from '../i18n'
import { setLanguage, setTheme, usePreferences } from '../store/preferences'
import styles from './PreferenceToggles.module.css'

/** Botões de idioma (PT/EN) e de tema (claro/escuro) no header. */
export function PreferenceToggles() {
  const { language, theme } = usePreferences()
  const nextLanguage = language === 'pt' ? 'en' : 'pt'

  return (
    <div className={styles.toggles}>
      <button
        type="button"
        className={styles.button}
        onClick={() => setLanguage(nextLanguage)}
        // O rótulo está no idioma de destino ("Switch to English"), para quem não lê o atual,
        // e começa pelo texto visível ("EN"): quem usa comando de voz fala o que vê.
        aria-label={`${nextLanguage.toUpperCase()}: ${t('language.switch')}`}
        lang={nextLanguage === 'pt' ? 'pt-BR' : 'en'}
        title={t('language.switch')}
      >
        <span aria-hidden="true" className={styles.language}>
          {nextLanguage.toUpperCase()}
        </span>
      </button>
      <button
        type="button"
        className={styles.button}
        onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
        aria-label={theme === 'dark' ? t('theme.toLight') : t('theme.toDark')}
        title={theme === 'dark' ? t('theme.toLight') : t('theme.toDark')}
      >
        {theme === 'dark' ? <Sun size={20} aria-hidden="true" /> : <Moon size={20} aria-hidden="true" />}
      </button>
    </div>
  )
}
