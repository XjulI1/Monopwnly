export type RngHolder = { rngState: number }

function nextFloat(holder: RngHolder): number {
  let t = (holder.rngState = (holder.rngState + 0x6d2b79f5) | 0)
  t = Math.imul(t ^ (t >>> 15), t | 1)
  t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296
}

/** Draws an integer in [0, max) and advances the generator state stored in the holder. */
export function randomInt(holder: RngHolder, max: number): number {
  return Math.floor(nextFloat(holder) * max)
}

/** Rolls two six-sided dice. */
export function rollTwoDice(holder: RngHolder): [number, number] {
  return [randomInt(holder, 6) + 1, randomInt(holder, 6) + 1]
}

/** Returns a shuffled copy of the items (Fisher-Yates). */
export function shuffle<T>(holder: RngHolder, items: readonly T[]): T[] {
  const result = [...items]
  for (let i = result.length - 1; i > 0; i--) {
    const j = randomInt(holder, i + 1)
    const tmp = result[i] as T
    result[i] = result[j] as T
    result[j] = tmp
  }
  return result
}
