import type { SortKey } from '../services/pokemonApi'
import type { EvolutionNode, PokemonStats } from '../services/types'

const decimal = new Intl.NumberFormat('pt-BR', {
  minimumFractionDigits: 1,
  maximumFractionDigits: 1,
})
const integer = new Intl.NumberFormat('pt-BR')

/** 25 → "#0025". Números maiores que 9999 continuam inteiros. */
export function formatNumber(id: number): string {
  return `#${String(id).padStart(4, '0')}`
}

export function formatCount(value: number): string {
  return integer.format(value)
}

/** Altura vem em decímetros, como na PokéAPI: 4 → "0,4 m". */
export function formatHeight(decimetres: number): string {
  return `${decimal.format(decimetres / 10)} m`
}

/** Peso vem em hectogramas, como na PokéAPI: 60 → "6,0 kg". */
export function formatWeight(hectograms: number): string {
  return `${decimal.format(hectograms / 10)} kg`
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

/** 1 → "Geração I". Gerações acima de 39 (se existirem) ficam em arábico. */
export function formatGeneration(generation: number): string {
  return `Geração ${generation < 40 ? toRoman(generation) : generation}`
}

export const TYPE_LABELS: Record<string, string> = {
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

/** Tipo sem tradução conhecida mantém o nome original da API. */
export function formatType(type: string): string {
  return TYPE_LABELS[type] ?? formatName(type)
}

export const STAT_LABELS: Record<keyof PokemonStats, string> = {
  hp: 'HP',
  attack: 'Ataque',
  defense: 'Defesa',
  special_attack: 'Ataque especial',
  special_defense: 'Defesa especial',
  speed: 'Velocidade',
}

export type StatSortKey = keyof PokemonStats | 'total'

export const SORT_LABELS: Record<SortKey, string> = {
  number: 'Número (crescente)',
  '-number': 'Número (decrescente)',
  name: 'Nome (A–Z)',
  '-name': 'Nome (Z–A)',
  '-total': 'Maior total de atributos',
  '-hp': 'Maior HP',
  '-attack': 'Maior ataque',
  '-defense': 'Maior defesa',
  '-special_attack': 'Maior ataque especial',
  '-special_defense': 'Maior defesa especial',
  '-speed': 'Mais rápidos',
}

/** Atributo usado pela ordenação, para o card mostrar o valor. Nome e número: null. */
export function sortedStat(sort: SortKey): StatSortKey | null {
  const key = sort.replace(/^-/, '')
  if (key === 'total') return 'total'
  return key in STAT_LABELS ? (key as keyof PokemonStats) : null
}

export function statTotal(stats: PokemonStats): number {
  return Object.values(stats).reduce((sum, value) => sum + value, 0)
}

export function statValue(stats: PokemonStats | null, key: StatSortKey): number | null {
  if (!stats) return null
  return key === 'total' ? statTotal(stats) : stats[key]
}

export function statLabel(key: StatSortKey): string {
  return key === 'total' ? 'Total' : STAT_LABELS[key]
}

const TRIGGER_LABELS: Record<string, string> = {
  'level-up': 'Subir de nível',
  'use-item': 'Usar item',
  trade: 'Troca',
  shed: 'Espaço livre no time',
  spin: 'Girar',
  'tower-of-darkness': 'Torre da Escuridão',
  'tower-of-waters': 'Torre das Águas',
  'three-critical-hits': 'Três golpes críticos',
  'take-damage': 'Receber dano',
  'agile-style-move': 'Golpe em estilo ágil',
  'strong-style-move': 'Golpe em estilo forte',
  'recoil-damage': 'Dano de recuo',
  other: 'Condição especial',
}

const TIME_OF_DAY: Record<string, string> = {
  day: 'de dia',
  night: 'à noite',
  dusk: 'ao entardecer',
}

const RELATIVE_STATS: Record<number, string> = {
  1: 'Ataque maior que Defesa',
  0: 'Ataque igual à Defesa',
  [-1]: 'Ataque menor que Defesa',
}

function describeCondition(key: string, value: string | number | boolean): string {
  switch (key) {
    case 'min_level':
      return `nível ${value}`
    case 'item':
      return formatName(String(value))
    case 'held_item':
      return `segurando ${formatName(String(value))}`
    case 'min_happiness':
      return `amizade ${value}+`
    case 'min_affection':
      return `afeição ${value}+`
    case 'min_beauty':
      return `beleza ${value}+`
    case 'time_of_day':
      return TIME_OF_DAY[String(value)] ?? String(value)
    case 'known_move':
      return `conhecendo ${formatName(String(value))}`
    case 'known_move_type':
      return `com golpe do tipo ${formatType(String(value))}`
    case 'location':
      return `em ${formatName(String(value))}`
    case 'gender':
      return value === 1 ? 'fêmea' : 'macho'
    case 'trade_species':
      return `trocando por ${formatName(String(value))}`
    case 'party_species':
      return `com ${formatName(String(value))} no time`
    case 'party_type':
      return `com tipo ${formatType(String(value))} no time`
    case 'relative_physical_stats':
      return RELATIVE_STATS[Number(value)] ?? String(value)
    case 'needs_overworld_rain':
      return 'com chuva'
    case 'turn_upside_down':
      return 'com o console de cabeça para baixo'
    default:
      return value === true ? formatName(key) : `${formatName(key)}: ${value}`
  }
}

/**
 * Texto curto do que leva a esta etapa, a partir de trigger e conditions da API.
 * "use-item" + item vira "Usar Water Stone"; "level-up" + nível vira "Nível 16".
 */
export function formatEvolutionCondition(node: EvolutionNode): string | null {
  const { trigger, conditions } = node
  const entries = Object.entries(conditions)
  if (!trigger && entries.length === 0) return null

  const parts = entries.map(([key, value]) => describeCondition(key, value))
  const onlyLevel = trigger === 'level-up' && entries.length === 1 && 'min_level' in conditions
  const onlyItem = trigger === 'use-item' && entries.length === 1 && 'item' in conditions

  let text: string
  if (onlyLevel) {
    text = parts[0]
  } else if (onlyItem) {
    text = `usar ${parts[0]}`
  } else {
    const triggerLabel = trigger ? (TRIGGER_LABELS[trigger] ?? formatName(trigger)) : null
    text = [triggerLabel, ...parts].filter(Boolean).join(', ')
  }
  return text.charAt(0).toUpperCase() + text.slice(1)
}
