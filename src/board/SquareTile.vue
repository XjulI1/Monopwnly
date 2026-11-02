<script setup lang="ts">
import { useLoop } from '@tresjs/core'
import { BoxGeometry, Color, MeshStandardMaterial, PlaneGeometry } from 'three'
import { computed, onBeforeUnmount } from 'vue'
import type { Square } from '../engine'
import { DIMMED_BRIGHTNESS, FRAME_THICKNESS, HOVER_LIFT, TILE_HEIGHT, frameSegments } from './boardLayout'
import { SCENE_COLORS } from './boardTheme'
import { HIGHLIGHT_STYLES, type SquareView } from './boardViewModel'
import type { TileLayout } from './geometry/layout'
import { squareLabelTexture } from './labelTexture'

const EASING_PER_SECOND = 10
const GAP = 0.12

const props = defineProps<{
  tile: TileLayout
  square: Square
  view: SquareView
  hovered: boolean
}>()

const along = props.tile.along - GAP
const across = props.tile.across - GAP
const body = new BoxGeometry(along, TILE_HEIGHT, across)
const top = new PlaneGeometry(along, across)
const texture = squareLabelTexture(props.square, along, across)
const bodyMaterial = new MeshStandardMaterial({ color: SCENE_COLORS.tile, roughness: 0.7, metalness: 0.2 })
const labelMaterial = new MeshStandardMaterial({
  map: texture,
  emissiveMap: texture,
  emissive: new Color('#ffffff'),
  emissiveIntensity: 0.45,
  roughness: 0.9,
})
const glowMaterial = new MeshStandardMaterial({ color: '#ffffff', emissive: new Color('#ffffff'), emissiveIntensity: 0 })

const style = computed(() => HIGHLIGHT_STYLES[props.view.highlight])
const lift = computed(() => style.value.lift + (props.hovered ? HOVER_LIFT : 0))
const ownerFrame = computed(() =>
  props.view.ownerColor === null ? [] : frameSegments(along, across, props.view.mortgaged),
)
const glowFrame = computed(() => (style.value.glow > 0 ? frameSegments(along + 0.7, across + 0.7, false) : []))
const brightness = computed(() => (props.view.dimmed || props.view.mortgaged ? DIMMED_BRIGHTNESS : 1))

const { onBeforeRender } = useLoop()
onBeforeRender(({ delta }) => {
  const blend = 1 - Math.exp(-EASING_PER_SECOND * delta)
  const target = brightness.value
  const current = labelMaterial.color.r
  const next = current + (target - current) * blend
  labelMaterial.color.setScalar(next)
  labelMaterial.emissiveIntensity = 0.45 * next
  glowMaterial.emissiveIntensity += (style.value.glow - glowMaterial.emissiveIntensity) * blend
})

onBeforeUnmount(() => {
  body.dispose()
  top.dispose()
  texture.dispose()
  bodyMaterial.dispose()
  labelMaterial.dispose()
  glowMaterial.dispose()
})
</script>

<template>
  <TresGroup
    :position="[props.tile.center.x, lift, props.tile.center.z]"
    :rotation-y="props.tile.rotation"
    :user-data="{ squareIndex: props.tile.index }"
  >
    <TresMesh
      :geometry="body"
      :material="bodyMaterial"
      :position-y="TILE_HEIGHT / 2"
      cast-shadow
      receive-shadow
    />
    <TresMesh
      :geometry="top"
      :material="labelMaterial"
      :position-y="TILE_HEIGHT + 0.01"
      :rotation-x="-Math.PI / 2"
      receive-shadow
    />
    <TresMesh
      v-for="(segment, i) in ownerFrame"
      :key="`owner-${i}`"
      :position="[segment.x, TILE_HEIGHT + 0.08, segment.z]"
    >
      <TresBoxGeometry :args="[segment.width, 0.12, segment.depth]" />
      <TresMeshStandardMaterial
        :color="props.view.ownerColor ?? '#ffffff'"
        :emissive="props.view.ownerColor ?? '#ffffff'"
        :emissive-intensity="props.view.mortgaged ? 0.5 : 1.4"
      />
    </TresMesh>
    <TresMesh
      v-for="(segment, i) in glowFrame"
      :key="`glow-${i}`"
      :material="glowMaterial"
      :position="[segment.x, 0.05, segment.z]"
    >
      <TresBoxGeometry :args="[segment.width, FRAME_THICKNESS, segment.depth]" />
    </TresMesh>
  </TresGroup>
</template>
