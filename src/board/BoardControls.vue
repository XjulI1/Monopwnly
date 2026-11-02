<script setup lang="ts">
import { useLoop, useTres } from '@tresjs/core'
import { PerspectiveCamera, Plane, Raycaster, Vector2, Vector3, type Object3D } from 'three'
import { onBeforeUnmount, watch } from 'vue'
import { TILE_HEIGHT } from './boardLayout'
import { squareAtPoint } from './geometry/layout'
import { isTap, type PointerSample } from './tapDetector'
import { useBoardCamera, type BoardCamera } from './useBoardCamera'

export type HoveredSquare = { index: number; x: number; y: number }

const props = defineProps<{
  follow: { x: number; y: number; z: number } | null
}>()

const emit = defineEmits<{
  select: [index: number | null]
  hover: [hovered: HoveredSquare | null]
}>()

const { camera, renderer, scene } = useTres()
const { onBeforeRender } = useLoop()
const element = renderer.domElement
const raycaster = new Raycaster()
const tilePlane = new Plane(new Vector3(0, 1, 0), -TILE_HEIGHT)
const pressed = new Map<number, PointerSample>()
let gestureHadSeveralPointers = false
let boardCamera: BoardCamera | null = null

function squareIndexOf(object: Object3D | null): number | null {
  let current = object
  while (current) {
    const index = current.userData.squareIndex
    if (typeof index === 'number') return index
    current = current.parent
  }
  return null
}

function squareAt(event: PointerEvent): number | null {
  const active = camera.value
  if (!active) return null
  const rect = element.getBoundingClientRect()
  const ndc = new Vector2(
    ((event.clientX - rect.left) / rect.width) * 2 - 1,
    -((event.clientY - rect.top) / rect.height) * 2 + 1,
  )
  raycaster.setFromCamera(ndc, active)
  for (const hit of raycaster.intersectObjects(scene.value.children, true)) {
    const index = squareIndexOf(hit.object)
    if (index !== null) return index
  }
  const point = raycaster.ray.intersectPlane(tilePlane, new Vector3())
  return point === null ? null : squareAtPoint({ x: point.x, z: point.z })
}

function sample(event: PointerEvent): PointerSample {
  return { x: event.clientX, y: event.clientY, time: event.timeStamp }
}

function onPointerDown(event: PointerEvent) {
  pressed.set(event.pointerId, sample(event))
  if (pressed.size > 1) gestureHadSeveralPointers = true
  if (event.pointerType !== 'mouse') emit('hover', null)
}

function onPointerUp(event: PointerEvent) {
  const down = pressed.get(event.pointerId)
  pressed.delete(event.pointerId)
  const singlePointerTap = !gestureHadSeveralPointers && down !== undefined && isTap(down, sample(event))
  if (pressed.size === 0) gestureHadSeveralPointers = false
  if (singlePointerTap) emit('select', squareAt(event))
}

function onPointerCancel(event: PointerEvent) {
  pressed.delete(event.pointerId)
}

function onPointerMove(event: PointerEvent) {
  if (event.pointerType !== 'mouse' || pressed.size > 0) return
  const index = squareAt(event)
  const rect = element.getBoundingClientRect()
  emit('hover', index === null ? null : { index, x: event.clientX - rect.left, y: event.clientY - rect.top })
}

function onPointerLeave() {
  emit('hover', null)
}

const resizeObserver = new ResizeObserver(() => boardCamera?.updateBounds())

watch(
  camera,
  (active) => {
    if (boardCamera === null && active instanceof PerspectiveCamera) boardCamera = useBoardCamera(active, element)
  },
  { immediate: true },
)

element.addEventListener('pointerdown', onPointerDown)
element.addEventListener('pointerup', onPointerUp)
element.addEventListener('pointercancel', onPointerCancel)
element.addEventListener('pointermove', onPointerMove)
element.addEventListener('pointerleave', onPointerLeave)
resizeObserver.observe(element)

onBeforeRender(() => {
  if (props.follow) boardCamera?.follow(props.follow)
  boardCamera?.controls.update()
})

onBeforeUnmount(() => {
  element.removeEventListener('pointerdown', onPointerDown)
  element.removeEventListener('pointerup', onPointerUp)
  element.removeEventListener('pointercancel', onPointerCancel)
  element.removeEventListener('pointermove', onPointerMove)
  element.removeEventListener('pointerleave', onPointerLeave)
  resizeObserver.disconnect()
  boardCamera?.dispose()
})

defineExpose({
  recenter: () => boardCamera?.recenter(),
})
</script>

<template>
  <TresGroup />
</template>
