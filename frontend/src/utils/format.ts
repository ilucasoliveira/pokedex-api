import { locale, t, type MessageKey } from '../i18n'
import type { SortKey } from '../services/pokemonApi'
import type { EvolutionNode, PokemonStats } from '../services/types'
import { getLanguage } from '../store/preferences'

/** 25 → "#0025". Números maiores que 9999 continuam inteiros. */
export function formatNumber(id: number): string {
  return `#${String(id).padStart(4, '0')}`
}

export function formatCount(value: number): string {
  return new Intl.NumberFormat(locale()).format(value)
}

function oneDecimal(value: number): string {
  return new Intl.NumberFormat(locale(), { minimumFractionDigits: 1, maximumFractionDigits: 1 }).format(value)
}

/** Altura vem em decímetros, como na PokéAPI: 4 → "0,4 m" (ou "0.4 m"). */
export function formatHeight(decimetres: number): string {
  return `${oneDecimal(decimetres / 10)} m`
}

/** Peso vem em hectogramas, como na PokéAPI: 60 → "6,0 kg" (ou "6.0 kg"). */
export function formatWeight(hectograms: number): string {
  return `${oneDecimal(hectograms / 10)} kg`
}

/** Nomes da API vêm em minúsculas e com hífen: "lightning-rod" → "Lightning Rod". */
export function formatName(name: string): string {
  return name
    .split('-')
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ')
}

const ROMAN: [number, string][] = [
  [10, 'X'],
  [9, 'IX'],
  [5, 'V'],
  [4, 'IV'],
  [1, 'I'],
]

function toRoman(value: number): string {
  let rest = value
  let result = ''
  for (const [amount, numeral] of ROMAN) {
    while (rest >= amount) {
      result += numeral
      rest -= amount
    }
  }
  return result
}

/** 1 → "Geração I" / "Generation I". Gerações acima de 39 ficam em arábico. */
export function formatGeneration(generation: number): string {
  return t('generation.label', { number: generation < 40 ? toRoman(generation) : generation })
}

export const TYPE_LABELS_PT: Record<string, string> = {
  normal: 'Normal',
  fire: 'Fogo',
  water: 'Água',
  electric: 'Elétrico',
  grass: 'Planta',
  ice: 'Gelo',
  fighting: 'Lutador',
  poison: 'Veneno',
  ground: 'Terrestre',
  flying: 'Voador',
  psychic: 'Psíquico',
  bug: 'Inseto',
  rock: 'Pedra',
  ghost: 'Fantasma',
  dragon: 'Dragão',
  dark: 'Sombrio',
  steel: 'Aço',
  fairy: 'Fada',
}

/** Os 18 tipos do kit (as chaves da API). */
export const KNOWN_TYPES = Object.keys(TYPE_LABELS_PT)

/** Em português, o nome do kit; em inglês, o nome oficial. Desconhecidos mantêm o da API. */
export function formatType(type: string): string {
  if (getLanguage() === 'pt' && type in TYPE_LABELS_PT) return TYPE_LABELS_PT[type]
  return formatName(type)
}

export const STAT_KEYS: (keyof PokemonStats)[] = [
  'hp',
  'attack',
  'defense',
  'special_attack',
  'special_defense',
  'speed',
]

export function formatStat(key: keyof PokemonStats): string {
  return t(`stats.${key}` as MessageKey)
}

export type StatSortKey = keyof PokemonStats | 'total'

export function formatSort(sort: SortKey): string {
  return t(`sort.${sort}` as MessageKey)
}

/** Atributo usado pela ordenação, para o card mostrar o valor. Nome e número: null. */
export function sortedStat(sort: SortKey): StatSortKey | null {
  const key = sort.replace(/^-/, '')
  if (key === 'total') return 'total'
  return (STAT_KEYS as string[]).includes(key) ? (key as keyof PokemonStats) : null
}

export function statTotal(stats: PokemonStats): number {
  return Object.values(stats).reduce((sum, value) => sum + value, 0)
}

export function statValue(stats: PokemonStats | null, key: StatSortKey): number | null {
  if (!stats) return null
  return key === 'total' ? statTotal(stats) : stats[key]
}

export function statLabel(key: StatSortKey): string {
  return key === 'total' ? t('stats.total') : formatStat(key)
}

// Chaves de evolution_details que não são condição para evoluir (a forma que
// sai da evolução, como "floette-red"). A API já as descarta nos imports novos;
// aqui também, para os dados antigos.
const IGNORED_CONDITIONS = new Set(['evolved_pokemon_form', 'required_pokemon_form', 'base_form'])

const TIME_OF_DAY: Record<string, MessageKey> = {
  day: 'condition.day',
  night: 'condition.night',
  dusk: 'condition.dusk',
}

const RELATIVE_STATS: Record<number, MessageKey> = {
  1: 'condition.attackHigher',
  0: 'condition.attackEqual',
  [-1]: 'condition.attackLower',
}

function describeCondition(key: string, value: string | number | boolean): string {
  const name = formatName(String(value))
  switch (key) {
    case 'min_level':
      return t('condition.level', { value: String(value) })
    case 'item':
      return name
    case 'held_item':
      return t('condition.heldItem', { value: name })
    case 'min_happiness':
      return t('condition.happiness', { value: String(value) })
    case 'min_affection':
      return t('condition.affection', { value: String(value) })
    case 'min_beauty':
      return t('condition.beauty', { value: String(value) })
    case 'time_of_day':
      return TIME_OF_DAY[String(value)] ? t(TIME_OF_DAY[String(value)]) : String(value)
    case 'known_move':
      return t('condition.knownMove', { value: name })
    case 'known_move_type':
      return t('condition.knownMoveType', { value: formatType(String(value)) })
    case 'location':
      return t('condition.location', { value: name })
    case 'gender':
      return t(value === 1 ? 'condition.female' : 'condition.male')
    case 'trade_species':
      return t('condition.tradeSpecies', { value: name })
    case 'party_species':
      return t('condition.partySpecies', { value: name })
    case 'party_type':
      return t('condition.partyType', { value: formatType(String(value)) })
    case 'relative_physical_stats':
      return RELATIVE_STATS[Number(value)] ? t(RELATIVE_STATS[Number(value)]) : String(value)
    case 'needs_overworld_rain':
      return t('condition.rain')
    case 'turn_upside_down':
      return t('condition.upsideDown')
    case 'min_steps':
      return t('condition.steps', { value: formatCount(Number(value)) })
    case 'used_move':
      return t('condition.usedMove', { value: name })
    case 'min_move_count':
      return t('condition.moveCount', { value: String(value) })
    case 'min_damage_taken':
      return t('condition.damageTaken', { value: String(value) })
    case 'needs_multiplayer':
      return t('condition.multiplayer')
    default:
      return value === true ? formatName(key) : `${formatName(key)}: ${formatName(String(value))}`
  }
}

function formatTrigger(trigger: string): string {
  const key = `trigger.${trigger}` as MessageKey
  const text = t(key)
  // t() devolve a própria chave quando não há tradução: aí vale o nome da API.
  return text === key ? formatName(trigger) : text
}

/**
 * Texto curto do que leva a esta etapa, a partir de trigger e conditions da API.
 * "level-up" + nível vira "Nível 16"; "use-item" + item vira "Usar Water Stone".
 */
export function formatEvolutionCondition(node: EvolutionNode): string | null {
  const entries = Object.entries(node.conditions).filter(([key]) => !IGNORED_CONDITIONS.has(key))
  const { trigger } = node
  if (!trigger && entries.length === 0) return null

  const keys = entries.map(([key]) => key)
  const parts = entries.map(([key, value]) => describeCondition(key, value))

  let text: string
  if (trigger === 'level-up' && keys.length === 1 && keys[0] === 'min_level') {
    text = parts[0]
  } else if (trigger === 'use-item' && keys.length === 1 && keys[0] === 'item') {
    text = t('condition.useItem', { value: parts[0] })
  } else {
    text = [trigger ? formatTrigger(trigger) : null, ...parts].filter(Boolean).join(', ')
  }
  return text.charAt(0).toUpperCase() + text.slice(1)
}
