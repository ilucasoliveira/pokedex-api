// Tabela de efetividade dos tipos (Geração VI em diante): quanto um golpe do tipo
// atacante causa num Pokémon de cada tipo. Só os valores diferentes de 1.
const CHART: Record<string, Record<string, number>> = {
  normal: { rock: 0.5, ghost: 0, steel: 0.5 },
  fire: { fire: 0.5, water: 0.5, grass: 2, ice: 2, bug: 2, rock: 0.5, dragon: 0.5, steel: 2 },
  water: { fire: 2, water: 0.5, grass: 0.5, ground: 2, rock: 2, dragon: 0.5 },
  electric: { water: 2, electric: 0.5, grass: 0.5, ground: 0, flying: 2, dragon: 0.5 },
  grass: {
    fire: 0.5,
    water: 2,
    grass: 0.5,
    poison: 0.5,
    ground: 2,
    flying: 0.5,
    bug: 0.5,
    rock: 2,
    dragon: 0.5,
    steel: 0.5,
  },
  ice: { fire: 0.5, water: 0.5, grass: 2, ice: 0.5, ground: 2, flying: 2, dragon: 2, steel: 0.5 },
  fighting: {
    normal: 2,
    ice: 2,
    poison: 0.5,
    flying: 0.5,
    psychic: 0.5,
    bug: 0.5,
    rock: 2,
    ghost: 0,
    dark: 2,
    steel: 2,
    fairy: 0.5,
  },
  poison: { grass: 2, poison: 0.5, ground: 0.5, rock: 0.5, ghost: 0.5, steel: 0, fairy: 2 },
  ground: { fire: 2, electric: 2, grass: 0.5, poison: 2, flying: 0, bug: 0.5, rock: 2, steel: 2 },
  flying: { electric: 0.5, grass: 2, fighting: 2, bug: 2, rock: 0.5, steel: 0.5 },
  psychic: { fighting: 2, poison: 2, psychic: 0.5, dark: 0, steel: 0.5 },
  bug: {
    fire: 0.5,
    grass: 2,
    fighting: 0.5,
    poison: 0.5,
    flying: 0.5,
    psychic: 2,
    ghost: 0.5,
    dark: 2,
    steel: 0.5,
    fairy: 0.5,
  },
  rock: { fire: 2, ice: 2, fighting: 0.5, ground: 0.5, flying: 2, bug: 2, steel: 0.5 },
  ghost: { normal: 0, psychic: 2, ghost: 2, dark: 0.5 },
  dragon: { dragon: 2, steel: 0.5, fairy: 0 },
  dark: { fighting: 0.5, psychic: 2, ghost: 2, dark: 0.5, fairy: 0.5 },
  steel: { fire: 0.5, water: 0.5, electric: 0.5, ice: 2, rock: 2, steel: 0.5, fairy: 2 },
  fairy: { fire: 0.5, fighting: 2, poison: 0.5, dragon: 2, dark: 2, steel: 0.5 },
}

export const ATTACK_TYPES = Object.keys(CHART)

export interface Matchup {
  type: string
  multiplier: number
}

export interface DefenseMatchups {
  weak: Matchup[]
  resistant: Matchup[]
  immune: Matchup[]
}

/**
 * Quanto cada tipo de golpe causa num Pokémon com estes tipos (multiplica os
 * dois tipos). Tipos fora da tabela (ex.: "stellar") são ignorados.
 */
export function defenseMatchups(defenderTypes: string[]): DefenseMatchups {
  const known = defenderTypes.filter((type) => type in CHART)
  const result: DefenseMatchups = { weak: [], resistant: [], immune: [] }
  if (known.length === 0) return result

  for (const attacker of ATTACK_TYPES) {
    const multiplier = known.reduce((total, defender) => total * (CHART[attacker][defender] ?? 1), 1)
    if (multiplier === 0) result.immune.push({ type: attacker, multiplier })
    else if (multiplier > 1) result.weak.push({ type: attacker, multiplier })
    else if (multiplier < 1) result.resistant.push({ type: attacker, multiplier })
  }

  // Os mais extremos primeiro (×4 antes de ×2, ×¼ antes de ×½).
  result.weak.sort((a, b) => b.multiplier - a.multiplier)
  result.resistant.sort((a, b) => a.multiplier - b.multiplier)
  return result
}

export function formatMultiplier(multiplier: number): string {
  if (multiplier === 0.25) return '×¼'
  if (multiplier === 0.5) return '×½'
  return `×${multiplier}`
}
