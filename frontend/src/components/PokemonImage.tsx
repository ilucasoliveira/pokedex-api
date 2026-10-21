import { ImageOff } from 'lucide-react'
import { useState } from 'react'

import styles from './PokemonImage.module.css'

interface PokemonImageProps {
  /** URLs em ordem de preferência; as nulas são ignoradas. */
  sources: (string | null)[]
  /** Quais das URLs são sprites de pixel art (ganham image-rendering: pixelated). */
  pixelated?: (string | null)[]
  alt: string
  size: number
  loading?: 'lazy' | 'eager'
}

export function PokemonImage({ sources, pixelated = [], alt, size, loading = 'lazy' }: PokemonImageProps) {
  // Se uma imagem falhar ao carregar, tenta a próxima da lista. Guarda as URLs
  // (e não a posição) para o componente poder ser reaproveitado com outro pokémon.
  const [failed, setFailed] = useState<string[]>([])
  const src = sources.find((candidate) => candidate && !failed.includes(candidate)) ?? null

  if (!src) {
    return (
      <div className={styles.placeholder} style={{ width: size, height: size }} role="img" aria-label={`${alt}: imagem indisponível`}>
        <ImageOff size={28} aria-hidden="true" />
        <span>Imagem indisponível</span>
      </div>
    )
  }

  return (
    <img
      key={src}
      src={src}
      alt={alt}
      width={size}
      height={size}
      loading={loading}
      decoding="async"
      className={pixelated.includes(src) ? `${styles.image} ${styles.pixelated}` : styles.image}
      onError={() => setFailed((urls) => [...urls, src])}
    />
  )
}
