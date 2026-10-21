import { Search, X } from 'lucide-react'
import { useEffect, useRef, useState, type FormEvent } from 'react'

import { t } from '../i18n'
import { normalizeSearch } from '../utils/catalogParams'
import styles from './SearchBar.module.css'

const DEBOUNCE_MS = 300

interface SearchBarProps {
  /** Busca atual, vinda da URL. */
  value: string
  onSearch: (value: string) => void
}

export function SearchBar({ value, onSearch }: SearchBarProps) {
  const [draft, setDraft] = useState(value)
  const [syncedValue, setSyncedValue] = useState(value)
  const inputRef = useRef<HTMLInputElement>(null)

  // Se a busca mudar por fora (Voltar do navegador, "Limpar filtros"), o campo acompanha.
  // A comparação normalizada evita apagar o espaço que o usuário acabou de digitar.
  // Ajuste durante o render, como recomenda o React, em vez de um efeito.
  if (value !== syncedValue) {
    setSyncedValue(value)
    if (normalizeSearch(draft) !== value) setDraft(value)
  }

  // Busca enquanto digita, depois de uma pausa curta.
  useEffect(() => {
    const next = normalizeSearch(draft)
    if (next === value) return
    const timer = window.setTimeout(() => onSearch(next), DEBOUNCE_MS)
    return () => window.clearTimeout(timer)
  }, [draft, value, onSearch])

  // Atalho "/": leva o foco à busca de qualquer ponto da página.
  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      const target = event.target as HTMLElement | null
      const typing = target && (target.isContentEditable || ['INPUT', 'TEXTAREA', 'SELECT'].includes(target.tagName))
      if (event.key === '/' && !typing && !event.ctrlKey && !event.metaKey && !event.altKey) {
        event.preventDefault()
        inputRef.current?.focus()
      }
    }
    document.addEventListener('keydown', onKeyDown)
    return () => document.removeEventListener('keydown', onKeyDown)
  }, [])

  function handleSubmit(event: FormEvent) {
    event.preventDefault()
    onSearch(normalizeSearch(draft))
  }

  function handleClear() {
    setDraft('')
    onSearch('')
    inputRef.current?.focus()
  }

  return (
    <form role="search" className={styles.form} onSubmit={handleSubmit}>
      <label htmlFor="busca" className="visually-hidden">
        {t('search.label')}
      </label>
      <Search size={20} className={styles.icon} aria-hidden="true" />
      <input
        ref={inputRef}
        id="busca"
        type="search"
        className={styles.input}
        placeholder={t('search.placeholder')}
        autoComplete="off"
        spellCheck={false}
        enterKeyHint="search"
        aria-keyshortcuts="/"
        value={draft}
        onChange={(event) => setDraft(event.target.value)}
      />
      {!draft && (
        <kbd className={styles.shortcut} aria-hidden="true" title={t('search.shortcut')}>
          /
        </kbd>
      )}
      {draft && (
        <button type="button" className={styles.clear} onClick={handleClear}>
          <X size={20} aria-hidden="true" />
          <span className="visually-hidden">{t('search.clear')}</span>
        </button>
      )}
    </form>
  )
}
