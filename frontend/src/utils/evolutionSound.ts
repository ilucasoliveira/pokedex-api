// Trilha da evolução, sintetizada na hora com a Web Audio API (ondas quadradas e
// triangulares, como nos consoles de 8 bits). É uma composição original: a música
// de evolução dos jogos é protegida por direitos autorais e não é usada aqui.

type Wave = 'square' | 'triangle'

let context: AudioContext | null = null
const playing = new Set<OscillatorNode>()
let lastFanfare = 0

function audio(): AudioContext | null {
  try {
    const AudioCtx =
      window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext
    if (!AudioCtx) return null
    context ??= new AudioCtx()
    // O navegador só libera som depois de um gesto do usuário (o arraste da pedra).
    if (context.state === 'suspended') void context.resume()
    return context
  } catch {
    return null
  }
}

/** Nota MIDI → frequência (69 = Lá 440 Hz). */
function frequency(midi: number): number {
  return 440 * 2 ** ((midi - 69) / 12)
}

function tone(ctx: AudioContext, midi: number, start: number, duration: number, wave: Wave, volume: number) {
  const oscillator = ctx.createOscillator()
  const gain = ctx.createGain()
  oscillator.type = wave
  oscillator.frequency.setValueAtTime(frequency(midi), start)
  // Ataque curto e queda suave, para não estalar.
  gain.gain.setValueAtTime(0, start)
  gain.gain.linearRampToValueAtTime(volume, start + 0.01)
  gain.gain.exponentialRampToValueAtTime(0.0001, start + duration)
  oscillator.connect(gain).connect(ctx.destination)
  oscillator.start(start)
  oscillator.stop(start + duration + 0.02)
  playing.add(oscillator)
  oscillator.onended = () => playing.delete(oscillator)
}

/**
 * Suspense enquanto o Pokémon brilha: arpejos de Lá menor, Fá e Sol que aceleram
 * e sobem de tom, terminando num glissando agudo no instante do clarão.
 */
export function playEvolvingTheme(durationMs: number) {
  const ctx = audio()
  if (!ctx) return
  const start = ctx.currentTime + 0.03
  const end = start + durationMs / 1000 - 0.35
  const chords = [
    [57, 60, 64], // Lá menor
    [53, 57, 60], // Fá
    [55, 59, 62], // Sol
    [57, 60, 64], // Lá menor
  ]

  let time = start
  let step = 0.15
  let index = 0
  let transpose = 0
  while (time < end) {
    const chord = chords[Math.floor(index / 6) % chords.length]
    tone(ctx, chord[index % 3] + 12 + transpose, time, step * 0.9, 'square', 0.035)
    if (index % 3 === 0) tone(ctx, chord[0] - 12 + transpose, time, step * 3, 'triangle', 0.09)
    time += step
    index += 1
    step = Math.max(0.065, step * 0.965)
    if (index % 12 === 0) transpose += 2
  }

  // Glissando final: sobe uma oitava até o clarão.
  const oscillator = ctx.createOscillator()
  const gain = ctx.createGain()
  oscillator.type = 'square'
  oscillator.frequency.setValueAtTime(frequency(76 + transpose), end)
  oscillator.frequency.exponentialRampToValueAtTime(frequency(88 + transpose), end + 0.3)
  gain.gain.setValueAtTime(0.04, end)
  gain.gain.exponentialRampToValueAtTime(0.0001, end + 0.34)
  oscillator.connect(gain).connect(ctx.destination)
  oscillator.start(end)
  oscillator.stop(end + 0.36)
  playing.add(oscillator)
  oscillator.onended = () => playing.delete(oscillator)
}

/** Fanfarra curta de vitória quando o Pokémon evoluído aparece. */
export function playEvolvedFanfare() {
  // O modo estrito do React monta os efeitos duas vezes em desenvolvimento.
  if (performance.now() - lastFanfare < 800) return
  const ctx = audio()
  if (!ctx) return
  lastFanfare = performance.now()
  const start = ctx.currentTime + 0.05
  const melody: [number, number, number][] = [
    // [nota, início, duração] em segundos: Dó-Mi-Sol subindo e um Dó agudo sustentado.
    [72, 0, 0.11],
    [76, 0.11, 0.11],
    [79, 0.22, 0.11],
    [84, 0.33, 0.22],
    [79, 0.55, 0.11],
    [84, 0.66, 0.6],
  ]
  for (const [note, offset, duration] of melody) tone(ctx, note, start + offset, duration, 'square', 0.04)
  // Acorde e baixo segurando o final.
  for (const note of [76, 79]) tone(ctx, note, start + 0.66, 0.6, 'square', 0.022)
  tone(ctx, 48, start, 0.33, 'triangle', 0.1)
  tone(ctx, 55, start + 0.33, 0.33, 'triangle', 0.1)
  tone(ctx, 48, start + 0.66, 0.6, 'triangle', 0.1)
}

/** Corta o que estiver tocando (ex.: o usuário saiu da página no meio da evolução). */
export function stopEvolutionSound() {
  for (const oscillator of playing) {
    try {
      oscillator.stop()
    } catch {
      // Já tinha parado.
    }
  }
  playing.clear()
}
