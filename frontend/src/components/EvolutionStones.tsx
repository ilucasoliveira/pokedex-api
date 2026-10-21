import { useState, type MouseEvent, type PointerEvent, type RefObject } from 'react'
import { createPortal } from 'react-dom'

import { t } from '../i18n'
import { formatName } from '../utils/format'
import { stoneSprite, type StoneEvolution } from '../utils/stoneEvolution'
import styles from './EvolutionStones.module.css'

// Abaixo disto (em px) o gesto conta como clique, não como arraste.
const DRAG_THRESHOLD = 6

interface Drag {
  evolution: StoneEvolution
  startX: number
  startY: number
  x: number
  y: number
  moved: boolean
  /** A pedra está sobre o Pokémon (pode soltar). */
  over: boolean
}

interface EvolutionStonesProps {
  evolutions: StoneEvolution[]
  /** Nome já formatado do Pokémon da ficha. */
  name: string
  /** Área da arte: soltar a pedra dentro dela evolui o Pokémon. */
  dropZoneRef: RefObject<HTMLElement | null>
  onDragStateChange: (state: { dragging: boolean; over: boolean }) => void
  onEvolve: (evolution: StoneEvolution) => void
}

function isOver(zone: HTMLElement | null, x: number, y: number): boolean {
  if (!zone) return false
  const rect = zone.getBoundingClientRect()
  return x >= rect.left && x <= rect.right && y >= rect.top && y <= rect.bottom
}

function genderNote(evolution: StoneEvolution): string | null {
  const gender = evolution.target.conditions.gender
  if (gender === 1) return t('stone.onlyFemale')
  if (gender === 2) return t('stone.onlyMale')
  return null
}

/**
 * Easter egg: a pedra de evolução flutua no canto inferior direito da tela, sem
 * explicação. Arrastar e soltar sobre o Pokémon evolui; clicar (ou Enter/Espaço
 * no teclado) também, para quem não consegue arrastar. Usa Pointer Events, que
 * funcionam igual com mouse, caneta e toque. Fica num portal no <body>: assim é
 * fixa na tela e não herda os estilos da arte (que forçavam a pedra a 240 px).
 */
export function EvolutionStones({ evolutions, name, dropZoneRef, onDragStateChange, onEvolve }: EvolutionStonesProps) {
  const [drag, setDrag] = useState<Drag | null>(null)

  function handlePointerDown(event: PointerEvent<HTMLButtonElement>, evolution: StoneEvolution) {
    if (event.button !== 0) return
    event.preventDefault()
    // Continua recebendo os eventos mesmo quando o ponteiro sai do botão. Se o
    // ponteiro já não estiver ativo, o navegador lança erro: o arraste segue sem captura.
    try {
      event.currentTarget.setPointerCapture?.(event.pointerId)
    } catch {
      // Sem captura, os eventos ainda chegam enquanto o ponteiro está sobre a página.
    }
    setDrag({
      evolution,
      startX: event.clientX,
      startY: event.clientY,
      x: event.clientX,
      y: event.clientY,
      moved: false,
      over: false,
    })
  }

  function handlePointerMove(event: PointerEvent<HTMLButtonElement>) {
    if (!drag) return
    const moved =
      drag.moved || Math.hypot(event.clientX - drag.startX, event.clientY - drag.startY) > DRAG_THRESHOLD
    const over = moved && isOver(dropZoneRef.current, event.clientX, event.clientY)
    setDrag({ ...drag, x: event.clientX, y: event.clientY, moved, over })
    if (moved) onDragStateChange({ dragging: true, over })
  }

  function handlePointerUp(event: PointerEvent<HTMLButtonElement>) {
    if (!drag) return
    const { evolution, moved } = drag
    const over = isOver(dropZoneRef.current, event.clientX, event.clientY)
    setDrag(null)
    onDragStateChange({ dragging: false, over: false })
    // Soltou sobre o Pokémon, ou só clicou: evolui. Soltou fora: a pedra volta.
    if (!moved || over) onEvolve(evolution)
  }

  function handlePointerCancel() {
    setDrag(null)
    onDragStateChange({ dragging: false, over: false })
  }

  // O teclado dispara "click" sem ponteiro (detail === 0); mouse e toque já
  // foram tratados no pointerup.
  function handleClick(event: MouseEvent<HTMLButtonElement>, evolution: StoneEvolution) {
    if (event.detail === 0) onEvolve(evolution)
  }

  return createPortal(
    <>
      <ul className={styles.dock}>
        {evolutions.map((evolution) => {
          const stoneName = formatName(evolution.stone)
          const targetName = formatName(evolution.target.name)
          const note = genderNote(evolution)
          const dragging = drag?.evolution === evolution && drag.moved
          return (
            <li key={evolution.stone} className={styles.item}>
              <button
                type="button"
                className={dragging ? `${styles.stone} ${styles.lifted}` : styles.stone}
                aria-label={t('stone.use', { stone: stoneName, name, target: targetName }) + (note ? ` (${note})` : '')}
                // O leitor de tela recebe a descrição completa; ao passar o mouse, só o nome
                // da pedra (o resultado da evolução é surpresa).
                title={stoneName}
                onPointerDown={(event) => handlePointerDown(event, evolution)}
                onPointerMove={handlePointerMove}
                onPointerUp={handlePointerUp}
                onPointerCancel={handlePointerCancel}
                onClick={(event) => handleClick(event, evolution)}
              >
                <img src={stoneSprite(evolution.stone)} alt="" width={30} height={30} draggable={false} />
              </button>
            </li>
          )
        })}
      </ul>

      {/* A pedra "na mão" segue o ponteiro enquanto é arrastada. */}
      {drag?.moved && (
        <img
          className={drag.over ? `${styles.ghost} ${styles.ghostOver}` : styles.ghost}
          src={stoneSprite(drag.evolution.stone)}
          alt=""
          aria-hidden="true"
          style={{ left: drag.x, top: drag.y }}
        />
      )}
    </>,
    document.body,
  )
}
