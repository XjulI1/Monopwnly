<script setup lang="ts">
import { MeshStandardMaterial, PlaneGeometry } from 'three'
import { onBeforeUnmount } from 'vue'
import { BOARD_SIDE, CORNER_SIZE } from './geometry/layout'
import { centerTexture } from './labelTexture'

const side = BOARD_SIDE - 2 * CORNER_SIZE - 0.4
const geometry = new PlaneGeometry(side, side)
const texture = centerTexture(side)
const material = new MeshStandardMaterial({
  map: texture,
  emissiveMap: texture,
  emissive: '#ffffff',
  emissiveIntensity: 0.6,
  roughness: 0.95,
})

onBeforeUnmount(() => {
  geometry.dispose()
  texture.dispose()
  material.dispose()
})
</script>

<template>
  <TresMesh
    :geometry="geometry"
    :material="material"
    :rotation-x="-Math.PI / 2"
    :position-y="0.3"
    receive-shadow
  />
</template>
