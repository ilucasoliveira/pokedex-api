import { Heart } from 'lucide-react'

import { toggleFavorite, useJourney } from '../store/journey'
import styles from './FavoriteButton.module.css'

interface FavoriteButtonProps {
  id: number
  /** Nome já formatado, para o rótulo acessível. */
  name: string
  className?: string
}

export function FavoriteButton({ id, name, className }: FavoriteButtonProps) {
  const { favorites } = useJourney()
  const active = favorites.includes(id)

  return (
    <button
      type="button"
      className={[styles.button, active ? styles.active : '', className].filter(Boolean).join(' ')}
      aria-pressed={active}
      aria-label={active ? `Remover ${name} dos favoritos` : `Adicionar ${name} aos favoritos`}
      title={active ? 'Remover dos favoritos' : 'Adicionar aos favoritos'}
      onClick={(event) => {
        // Dentro do card, o clique não pode abrir o detalhe.
        event.stopPropagation()
        toggleFavorite(id)
      }}
    >
      <Heart size={20} aria-hidden="true" fill={active ? 'currentColor' : 'none'} />
    </button>
  )
}
