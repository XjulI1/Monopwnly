/** Position of a pointer, in CSS pixels, at a given time in milliseconds. */
export type PointerSample = {
  x: number
  y: number
  time: number
}

/** Beyond this many pixels between press and release, the gesture moves the camera. */
export const TAP_MAX_DISTANCE_PX = 6

/** Beyond this press duration, the gesture is not a tap. */
export const TAP_MAX_DURATION_MS = 500

/** Whether a press and its release form a tap rather than a drag or a long press. */
export function isTap(down: PointerSample, up: PointerSample): boolean {
  return (
    Math.hypot(up.x - down.x, up.y - down.y) <= TAP_MAX_DISTANCE_PX && up.time - down.time <= TAP_MAX_DURATION_MS
  )
}
