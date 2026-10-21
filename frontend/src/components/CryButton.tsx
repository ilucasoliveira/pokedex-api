import { Volume2 } from 'lucide-react'
import { useRef, useState } from 'react'

import { t } from '../i18n'
import styles from './CryButton.module.css'

// Gritos do repositório público da PokéAPI, no mesmo padrão de URL que ela usa em
// "cries.latest". São arquivos OGG: sem suporte no navegador, o botão nem aparece.
const CRY_URL = 'https://raw.githubusercontent.com/PokeAPI/cries/main/cries/pokemon/latest'

function supportsOgg(): boolean {
  try {
    return typeof Audio !== 'undefined' && new Audio().canPlayType('audio/ogg; codecs=vorbis') !== ''
  } catch {
    return false
  }
}

interface CryButtonProps {
  id: number
  name: string
}

export function CryButton({ id, name }: CryButtonProps) {
  const audioRef = useRef<HTMLAudioElement | null>(null)
  const [status, setStatus] = useState<'idle' | 'playing' | 'error'>('idle')
  const [supported] = useState(supportsOgg)

  if (!supported) return null

  function play() {
    audioRef.current?.pause()
    const audio = new Audio(`${CRY_URL}/${id}.ogg`)
    audio.volume = 0.5
    audioRef.current = audio
    audio.addEventListener('ended', () => setStatus('idle'))
    audio.addEventListener('error', () => setStatus('error'))
    setStatus('playing')
    audio.play().catch(() => setStatus('error'))
  }

  return (
    <span className={styles.wrapper}>
      <button
        type="button"
        className={status === 'playing' ? `${styles.button} ${styles.playing}` : styles.button}
        onClick={play}
        aria-label={t('cry.label', { name })}
      >
        <Volume2 size={18} aria-hidden="true" />
        {t('cry.play')}
      </button>
      <span className={styles.error} role="status">
        {status === 'error' ? t('cry.unavailable') : ''}
      </span>
    </span>
  )
}
