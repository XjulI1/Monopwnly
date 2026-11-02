import { shallowRef, type ShallowRef } from 'vue'
import type { PlayerId } from '../engine'
import { HOP_HEIGHT } from './boardLayout'
import { movePath } from './geometry/path'

/** World position of a pawn being animated. */
export type AnimatedPawn = { playerId: PlayerId; position: { x: number; y: number; z: number } }

export type PawnAnimation = {
  animated: ShallowRef<AnimatedPawn | null>
  animateMove: (playerId: PlayerId, squares: readonly number[], msPerSquare: number) => Promise<void>
}

function smoothstep(t: number): number {
  return t * t * (3 - 2 * t)
}

/** Hops a pawn from square to square along a list of squares; the first square of the list is the starting point. */
export function usePawnAnimation(): PawnAnimation {
  const animated = shallowRef<AnimatedPawn | null>(null)
  let cancel: (() => void) | null = null

  function animateMove(playerId: PlayerId, squares: readonly number[], msPerSquare: number): Promise<void> {
    cancel?.()
    const waypoints = movePath(squares)
    if (msPerSquare <= 0 || waypoints.length < 2) {
      animated.value = null
      return Promise.resolve()
    }
    const segments = waypoints.length - 1
    const duration = segments * msPerSquare
    return new Promise((resolve) => {
      const start = performance.now()
      let frame = 0
      const finish = () => {
        cancelAnimationFrame(frame)
        cancel = null
        animated.value = null
        resolve()
      }
      cancel = finish
      const step = (now: number) => {
        const elapsed = Math.min(duration, now - start)
        const segment = Math.min(segments - 1, Math.floor(elapsed / msPerSquare))
        const t = smoothstep(Math.min(1, (elapsed - segment * msPerSquare) / msPerSquare))
        const from = waypoints[segment]
        const to = waypoints[segment + 1]
        if (from && to) {
          animated.value = {
            playerId,
            position: {
              x: from.x + (to.x - from.x) * t,
              y: Math.sin(t * Math.PI) * HOP_HEIGHT,
              z: from.z + (to.z - from.z) * t,
            },
          }
        }
        if (elapsed >= duration) finish()
        else frame = requestAnimationFrame(step)
      }
      frame = requestAnimationFrame(step)
    })
  }

  return { animated, animateMove }
}
