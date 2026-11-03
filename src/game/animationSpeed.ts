/** Animation speed chosen by the user. */
export type AnimationSpeed = 'normal' | 'fast' | 'instant'

/** Durations in milliseconds of each kind of animation. */
export type AnimationDurations = {
  diceRoll: number
  perSquare: number
  payment: number
  bankruptcy: number
}

/** Speeds in the order they are offered. */
export const ANIMATION_SPEEDS: readonly AnimationSpeed[] = ['normal', 'fast', 'instant']

/** French label of each speed. */
export const SPEED_LABELS: Record<AnimationSpeed, string> = {
  normal: 'Normale',
  fast: 'Rapide',
  instant: 'Instantanée',
}

const DURATIONS: Record<AnimationSpeed, AnimationDurations> = {
  normal: { diceRoll: 1000, perSquare: 200, payment: 650, bankruptcy: 1450 },
  fast: { diceRoll: 550, perSquare: 110, payment: 350, bankruptcy: 850 },
  instant: { diceRoll: 0, perSquare: 0, payment: 0, bankruptcy: 0 },
}

const STORAGE_KEY = 'monopwnly.animationSpeed'
const DEFAULT_SPEED: AnimationSpeed = 'normal'

/** Durations of every animation at the given speed. */
export function durationsFor(speed: AnimationSpeed): AnimationDurations {
  return DURATIONS[speed]
}

function isSpeed(value: unknown): value is AnimationSpeed {
  return typeof value === 'string' && (ANIMATION_SPEEDS as readonly string[]).includes(value)
}

function storedSpeed(): AnimationSpeed | null {
  try {
    const value = globalThis.localStorage?.getItem(STORAGE_KEY)
    return isSpeed(value) ? value : null
  } catch {
    return null
  }
}

function prefersReducedMotion(): boolean {
  try {
    return globalThis.matchMedia?.('(prefers-reduced-motion: reduce)').matches ?? false
  } catch {
    return false
  }
}

/** Speed remembered on this device, else instant when the system asks for reduced motion, else normal. */
export function loadAnimationSpeed(): AnimationSpeed {
  return storedSpeed() ?? (prefersReducedMotion() ? 'instant' : DEFAULT_SPEED)
}

/** Remembers the speed on this device; returns false when the storage is unavailable. */
export function saveAnimationSpeed(speed: AnimationSpeed): boolean {
  try {
    globalThis.localStorage?.setItem(STORAGE_KEY, speed)
    return true
  } catch {
    return false
  }
}
