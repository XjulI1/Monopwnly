import { MathUtils, PerspectiveCamera, Vector3 } from 'three'
import { BOARD_SIDE, SQUARE_WIDTH, type BoardPoint } from './geometry/layout'

/** Vertical field of view of the board camera, in degrees. */
export const CAMERA_FOV = 45

/** Fixed tilt of the board camera above the horizon, in degrees. */
export const CAMERA_TILT_DEG = 55

/** Share of the half-width and half-height of the viewport the whole board fills once framed. */
export const FRAME_FILL = 0.92

/** Share of the viewport width taken by an ordinary square at the maximal zoom. */
const SQUARE_SHARE_AT_MAX_ZOOM = 1 / 5

/** The pawn is followed once it leaves this central share of the viewport, in normalized coordinates. */
const FOLLOW_CENTRAL_SHARE = 1 / 3

const FIT_SEARCH_STEPS = 40
const MIN_ZOOM_TOLERANCE = 0.98

/** Camera position looking at `target` from `distance`, with the fixed tilt, from the Boot side. */
export function cameraPosition(target: BoardPoint, distance: number): { x: number; y: number; z: number } {
  const tilt = MathUtils.degToRad(CAMERA_TILT_DEG)
  return { x: target.x, y: distance * Math.sin(tilt), z: target.z + distance * Math.cos(tilt) }
}

function boardCorners(): Vector3[] {
  const half = BOARD_SIDE / 2
  return [
    new Vector3(-half, 0, -half),
    new Vector3(half, 0, -half),
    new Vector3(-half, 0, half),
    new Vector3(half, 0, half),
  ]
}

/** Camera target that puts the near and the far edges of the board at the same distance from the screen edges. */
export function centeredTarget(distance: number): BoardPoint {
  const cosTilt = Math.cos(MathUtils.degToRad(CAMERA_TILT_DEG))
  const half = BOARD_SIDE / 2
  return { x: 0, z: (Math.sqrt(distance ** 2 + 4 * (cosTilt * half) ** 2) - distance) / (2 * cosTilt) }
}

function boardFits(aspect: number, distance: number, corners: Vector3[]): boolean {
  const camera = new PerspectiveCamera(CAMERA_FOV, aspect, 0.1, 10_000)
  const target = centeredTarget(distance)
  const position = cameraPosition(target, distance)
  camera.position.set(position.x, position.y, position.z)
  camera.lookAt(target.x, 0, target.z)
  camera.updateMatrixWorld()
  return corners.every((corner) => {
    const projected = corner.clone().project(camera)
    return Math.abs(projected.x) <= FRAME_FILL && Math.abs(projected.y) <= FRAME_FILL
  })
}

/** Smallest camera distance that keeps the whole board in view, centred, for a viewport aspect ratio (minimal zoom). */
export function fitDistance(aspect: number): number {
  const corners = boardCorners()
  let near = 1
  let far = 2_000
  for (let step = 0; step < FIT_SEARCH_STEPS; step++) {
    const middle = (near + far) / 2
    if (boardFits(aspect, middle, corners)) far = middle
    else near = middle
  }
  return far
}

/** Closest camera distance allowed: an ordinary square then takes about a fifth of the viewport width (maximal zoom). */
export function maxZoomDistance(aspect: number): number {
  const visibleWidth = SQUARE_WIDTH / SQUARE_SHARE_AT_MAX_ZOOM
  const visibleHeight = visibleWidth / aspect
  return visibleHeight / (2 * Math.tan(MathUtils.degToRad(CAMERA_FOV / 2)))
}

/** Keeps the camera target inside the board square. */
export function clampTarget(target: BoardPoint): BoardPoint {
  const half = BOARD_SIDE / 2
  return { x: MathUtils.clamp(target.x, -half, half), z: MathUtils.clamp(target.z, -half, half) }
}

/** Clamps a camera distance between the maximal and the minimal zoom. */
export function clampDistance(distance: number, aspect: number): number {
  return MathUtils.clamp(distance, maxZoomDistance(aspect), fitDistance(aspect))
}

/** Whether the camera should move to follow a pawn at normalized screen coordinates (-1 to 1). */
export function shouldFollow(pawnOnScreen: { x: number; y: number }, distance: number, aspect: number): boolean {
  if (distance >= fitDistance(aspect) * MIN_ZOOM_TOLERANCE) return false
  return Math.abs(pawnOnScreen.x) > FOLLOW_CENTRAL_SHARE || Math.abs(pawnOnScreen.y) > FOLLOW_CENTRAL_SHARE
}
