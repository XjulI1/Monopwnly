import { MOUSE, TOUCH, Vector3, type PerspectiveCamera } from 'three'
import { MapControls } from 'three/examples/jsm/controls/MapControls.js'
import {
  cameraPosition,
  centeredTarget,
  clampTarget,
  fitDistance,
  maxZoomDistance,
  shouldFollow,
} from './cameraFraming'

const FOLLOW_EASING = 0.08

/** Camera controls of the board: pan and zoom only, bounded to the board. */
export type BoardCamera = {
  controls: MapControls
  recenter: () => void
  updateBounds: () => void
  follow: (point: { x: number; y: number; z: number }) => void
  dispose: () => void
}

function aspectOf(element: HTMLElement): number {
  return element.clientHeight === 0 ? 16 / 9 : element.clientWidth / element.clientHeight
}

/** Sets up map-style controls on `camera`: no rotation, zoom towards the cursor, target kept on the board. */
export function useBoardCamera(camera: PerspectiveCamera, element: HTMLElement): BoardCamera {
  const controls = new MapControls(camera, element)
  controls.enableRotate = false
  controls.screenSpacePanning = false
  controls.zoomToCursor = true
  controls.enableDamping = true
  controls.dampingFactor = 0.12
  controls.mouseButtons = { LEFT: MOUSE.PAN, MIDDLE: MOUSE.DOLLY, RIGHT: MOUSE.PAN }
  controls.touches = { ONE: TOUCH.PAN, TWO: TOUCH.DOLLY_PAN }

  const updateBounds = () => {
    const aspect = aspectOf(element)
    controls.minDistance = maxZoomDistance(aspect)
    controls.maxDistance = fitDistance(aspect)
  }

  const shift = (dx: number, dz: number) => {
    controls.target.x += dx
    controls.target.z += dz
    camera.position.x += dx
    camera.position.z += dz
  }

  const keepTargetOnBoard = () => {
    const clamped = clampTarget({ x: controls.target.x, z: controls.target.z })
    const dx = clamped.x - controls.target.x
    const dz = clamped.z - controls.target.z
    if (dx !== 0 || dz !== 0) shift(dx, dz)
  }

  const recenter = () => {
    updateBounds()
    const target = centeredTarget(controls.maxDistance)
    const position = cameraPosition(target, controls.maxDistance)
    controls.target.set(target.x, 0, target.z)
    camera.position.set(position.x, position.y, position.z)
    controls.update()
  }

  const follow = (point: { x: number; y: number; z: number }) => {
    const projected = new Vector3(point.x, point.y, point.z).project(camera)
    const distance = camera.position.distanceTo(controls.target)
    if (!shouldFollow({ x: projected.x, y: projected.y }, distance, aspectOf(element))) return
    shift((point.x - controls.target.x) * FOLLOW_EASING, (point.z - controls.target.z) * FOLLOW_EASING)
    keepTargetOnBoard()
  }

  controls.addEventListener('change', keepTargetOnBoard)
  recenter()

  return {
    controls,
    recenter,
    updateBounds,
    follow,
    dispose: () => {
      controls.removeEventListener('change', keepTargetOnBoard)
      controls.dispose()
    },
  }
}
