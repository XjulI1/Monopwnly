<script setup lang="ts">
import { useLoop } from '@tresjs/core'
import { CanvasTexture, SpriteMaterial, SRGBColorSpace } from 'three'
import { onBeforeUnmount, ref, watch } from 'vue'
import { TILE_HEIGHT } from './boardLayout'
import type { BoardPoint } from './geometry/layout'
import { drawPotCounter } from './labelTexture'
import { potAnimationFor, potCounterPose, type PotAnimation } from './potCounter'

const CANVAS_WIDTH = 256
const CANVAS_HEIGHT = 96
const WIDTH = 10
const HEIGHT = (WIDTH * CANVAS_HEIGHT) / CANVAS_WIDTH
const ALTITUDE = 4.5

const props = defineProps<{
  amount: number
  position: BoardPoint
  lift: number
}>()

const canvas = document.createElement('canvas')
canvas.width = CANVAS_WIDTH
canvas.height = CANVAS_HEIGHT
const texture = new CanvasTexture(canvas)
texture.colorSpace = SRGBColorSpace
const material = new SpriteMaterial({ map: texture, transparent: true, depthWrite: false })

const shown = ref(props.amount)
const scale = ref(1)
const rise = ref(0)
let animation: PotAnimation = 'none'
let elapsed = 0

function show(amount: number) {
  shown.value = amount
  drawPotCounter(canvas, amount)
  texture.needsUpdate = true
}

show(props.amount)

watch(
  () => props.amount,
  (next, previous) => {
    animation = potAnimationFor(previous, next)
    elapsed = 0
    if (animation !== 'collect') show(next)
  },
)

const { onBeforeRender } = useLoop()
onBeforeRender(({ delta }) => {
  if (animation === 'none') return
  elapsed += delta
  const pose = potCounterPose(animation, elapsed)
  scale.value = pose.scale
  rise.value = pose.rise
  material.opacity = pose.opacity
  if (!pose.done) return
  animation = 'none'
  if (shown.value !== props.amount) show(props.amount)
})

onBeforeUnmount(() => {
  texture.dispose()
  material.dispose()
})
</script>

<template>
  <TresSprite
    :material="material"
    :position="[props.position.x, TILE_HEIGHT + props.lift + ALTITUDE + rise, props.position.z]"
    :scale="[WIDTH * scale, HEIGHT * scale, 1]"
    :render-order="10"
  />
</template>
