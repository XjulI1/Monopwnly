import { PerspectiveCamera, Vector3 } from 'three'
import { describe, expect, it } from 'vitest'
import {
  CAMERA_FOV,
  CAMERA_TILT_DEG,
  cameraPosition,
  clampDistance,
  clampTarget,
  fitDistance,
  maxZoomDistance,
  shouldFollow,
} from './cameraFraming'
import { tiles } from './geometry/layout'

function project(aspect: number, distance: number, point: Vector3): Vector3 {
  const camera = new PerspectiveCamera(CAMERA_FOV, aspect, 0.1, 10_000)
  const position = cameraPosition({ x: 0, z: 0 }, distance)
  camera.position.set(position.x, position.y, position.z)
  camera.lookAt(0, 0, 0)
  camera.updateMatrixWorld()
  return point.clone().project(camera)
}

describe('camera framing', () => {
  it('tilts between 45° and 60°, on the Boot side', () => {
    expect(CAMERA_TILT_DEG).toBeGreaterThanOrEqual(45)
    expect(CAMERA_TILT_DEG).toBeLessThanOrEqual(60)
    const position = cameraPosition({ x: 0, z: 0 }, 10)
    expect((Math.atan2(position.y, position.z) * 180) / Math.PI).toBeCloseTo(CAMERA_TILT_DEG)
    expect(position.z).toBeGreaterThan(0)
  })

  for (const [width, height] of [
    [1920, 1080],
    [1024, 768],
  ] as const) {
    it(`fits every square in ${width} × ${height}`, () => {
      const aspect = width / height
      const distance = fitDistance(aspect)
      for (const tile of tiles()) {
        for (const dx of [-1, 1]) {
          for (const dz of [-1, 1]) {
            const corner = new Vector3(tile.center.x + (dx * tile.width) / 2, 0, tile.center.z + (dz * tile.depth) / 2)
            const p = project(aspect, distance, corner)
            expect(Math.abs(p.x)).toBeLessThanOrEqual(1.0001)
            expect(Math.abs(p.y)).toBeLessThanOrEqual(1.0001)
          }
        }
      }
    })
  }

  it('keeps the target inside the board', () => {
    expect(clampTarget({ x: 300, z: -300 })).toEqual({ x: 50, z: -50 })
    expect(clampTarget({ x: 10, z: 20 })).toEqual({ x: 10, z: 20 })
  })

  it('bounds the zoom between a square at a fifth of the width and the whole board', () => {
    const aspect = 16 / 9
    expect(maxZoomDistance(aspect)).toBeLessThan(fitDistance(aspect))
    expect(clampDistance(1, aspect)).toBeCloseTo(maxZoomDistance(aspect))
    expect(clampDistance(10_000, aspect)).toBeCloseTo(fitDistance(aspect))
  })

  it('follows a pawn only outside the central third and never at minimal zoom', () => {
    const aspect = 4 / 3
    const zoomed = maxZoomDistance(aspect) * 1.5
    expect(shouldFollow({ x: 0.1, y: -0.2 }, zoomed, aspect)).toBe(false)
    expect(shouldFollow({ x: 0.6, y: 0 }, zoomed, aspect)).toBe(true)
    expect(shouldFollow({ x: 0.9, y: 0.9 }, fitDistance(aspect), aspect)).toBe(false)
  })
})
