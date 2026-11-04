/** How the counter of the DMZ pot moves after its amount changed: a pulse when it grows, a rise and fade when a player collects it. */
export type PotAnimation = 'none' | 'grow' | 'collect'

/** Pose of the counter at one moment of its animation. */
export type PotCounterPose = { scale: number; rise: number; opacity: number; done: boolean }

/** Length of each animation, in seconds. */
export const POT_ANIMATION_SECONDS: Record<Exclude<PotAnimation, 'none'>, number> = { grow: 0.6, collect: 1 }

const GROW_PULSE = 0.3
const COLLECT_RISE = 3
const REST: PotCounterPose = { scale: 1, rise: 0, opacity: 1, done: true }

/** The animation to play when the pot goes from one amount to another. */
export function potAnimationFor(previous: number, next: number): PotAnimation {
  if (next > previous) return 'grow'
  if (next === 0 && previous > 0) return 'collect'
  return 'none'
}

/** Pose of the counter `elapsed` seconds after the start of an animation. */
export function potCounterPose(animation: PotAnimation, elapsed: number): PotCounterPose {
  if (animation === 'none') return REST
  const progress = Math.min(1, Math.max(0, elapsed / POT_ANIMATION_SECONDS[animation]))
  if (progress >= 1) return REST
  if (animation === 'grow') return { scale: 1 + GROW_PULSE * Math.sin(progress * Math.PI), rise: 0, opacity: 1, done: false }
  return { scale: 1 + GROW_PULSE * progress, rise: COLLECT_RISE * progress, opacity: 1 - progress, done: false }
}
