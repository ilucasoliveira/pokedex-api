import { Search, X } from 'lucide-react'
import { useEffect, useRef, useState, type FormEvent } from 'react'

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
        Buscar Pokémon por nome ou número
      </label>
      <Search size={20} className={styles.icon} aria-hidden="true" />
      <input
        ref={inputRef}
        id="busca"
        type="search"
        className={styles.input}
        placeholder="Buscar nome ou nº"
        autoComplete="off"
        spellCheck={false}
        enterKeyHint="search"
        value={draft}
        onChange={(event) => setDraft(event.target.value)}
      />
      {draft && (
        <button type="button" className={styles.clear} onClick={handleClear}>
          <X size={20} aria-hidden="true" />
          <span className="visually-hidden">Limpar busca</span>
        </button>
      )}
    </form>
  )
}
