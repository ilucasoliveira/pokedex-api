import { useSyncExternalStore } from 'react'

// A "jornada" do visitante: favoritos, Pokémon já vistos (descobertos) e os
// últimos visitados. Fica só neste navegador (localStorage), sem conta nem
// servidor. Se o armazenamento estiver bloqueado, tudo funciona só na sessão.

const STORAGE_KEY = 'rota151:jornada:v1'
const MAX_RECENT = 12

export interface JourneyState {
  /** Números da Pokédex, do mais recente para o mais antigo. */
  favorites: number[]
  /** Número → geração (para o progresso por geração). */
  discovered: Record<string, number | null>
  /** Últimos Pokémon vistos, do mais recente para o mais antigo. */
  recent: number[]
}

const EMPTY: JourneyState = { favorites: [], discovered: {}, recent: [] }

function isNumberList(value: unknown): value is number[] {
  return Array.isArray(value) && value.every((item) => Number.isInteger(item) && item > 0)
}

function load(): JourneyState {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY)
    if (!raw) return EMPTY
    const data: unknown = JSON.parse(raw)
    if (!data || typeof data !== 'object') return EMPTY
    const { favorites, discovered, recent } = data as Partial<JourneyState>
    return {
      favorites: isNumberList(favorites) ? favorites : [],
      discovered: discovered && typeof discovered === 'object' ? discovered : {},
      recent: isNumberList(recent) ? recent.slice(0, MAX_RECENT) : [],
    }
  } catch {
    return EMPTY
  }
}

let state: JourneyState = typeof window === 'undefined' ? EMPTY : load()
const listeners = new Set<() => void>()

function notify() {
  listeners.forEach((listener) => listener())
}

function update(next: JourneyState) {
  state = next
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(next))
  } catch {
    // Modo privado ou armazenamento cheio: segue só em memória.
  }
  notify()
}

// Outra aba mudou a jornada: acompanha.
if (typeof window !== 'undefined') {
  window.addEventListener('storage', (event) => {
    if (event.key === STORAGE_KEY) {
      state = load()
      notify()
    }
  })
}

function subscribe(listener: () => void) {
  listeners.add(listener)
  return () => listeners.delete(listener)
}

export function useJourney(): JourneyState {
  return useSyncExternalStore(subscribe, () => state, () => EMPTY)
}

export function toggleFavorite(id: number) {
  const favorites = state.favorites.includes(id)
    ? state.favorites.filter((favorite) => favorite !== id)
    : [id, ...state.favorites]
  update({ ...state, favorites })
}

/** Registra que o visitante abriu a ficha deste Pokémon. */
export function markDiscovered(id: number, generation: number | null) {
  const recent = [id, ...state.recent.filter((item) => item !== id)].slice(0, MAX_RECENT)
  const alreadyKnown = String(id) in state.discovered
  if (alreadyKnown && state.recent[0] === id) return
  update({
    ...state,
    discovered: alreadyKnown ? state.discovered : { ...state.discovered, [id]: generation },
    recent,
  })
}

/** Apaga favoritos, descobertos e vistos recentemente. */
export function resetJourney() {
  update(EMPTY)
}

export function discoveredCount(journey: JourneyState, generation?: number): number {
  const entries = Object.values(journey.discovered)
  return generation === undefined
    ? entries.length
    : entries.filter((item) => item === generation).length
}

/** Sorteia um número de 1 a total, de preferência um que ainda não foi descoberto. */
export function pickUndiscovered(total: number, discovered: Record<string, unknown>): number {
  const all = Array.from({ length: total }, (_, index) => index + 1)
  const remaining = all.filter((id) => !(String(id) in discovered))
  const pool = remaining.length > 0 ? remaining : all
  return pool[Math.floor(Math.random() * pool.length)]
}
