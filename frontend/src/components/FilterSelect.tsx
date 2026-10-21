import { ChevronDown } from 'lucide-react'

import styles from './FilterSelect.module.css'

export interface FilterOption {
  value: string
  label: string
}

interface FilterSelectProps {
  id: string
  label: string
  placeholder: string
  value: string
  options: FilterOption[]
  loading?: boolean
  onChange: (value: string) => void
}

// <select> nativo: teclado, leitores de tela e o seletor do celular já funcionam.
export function FilterSelect({
  id,
  label,
  placeholder,
  value,
  options,
  loading = false,
  onChange,
}: FilterSelectProps) {
  return (
    <div className={styles.field}>
      <label htmlFor={id} className={styles.label}>
        {label}
      </label>
      <div className={styles.control}>
        <select
          id={id}
          className={styles.select}
          value={value}
          onChange={(event) => onChange(event.target.value)}
        >
          <option value="">{loading ? 'Carregando…' : placeholder}</option>
          {options.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
        <ChevronDown size={18} className={styles.chevron} aria-hidden="true" />
      </div>
    </div>
  )
}
