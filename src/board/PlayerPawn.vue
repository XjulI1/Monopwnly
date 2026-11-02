<script setup lang="ts">
import { PAWN_RADIUS } from './geometry/slots'

const props = defineProps<{
  squareIndex: number
  position: { x: number; y: number; z: number }
  color: string
  quarantined: boolean
}>()
</script>

<template>
  <TresGroup
    :position="[props.position.x, props.position.y, props.position.z]"
    :user-data="{ squareIndex: props.squareIndex }"
  >
    <TresMesh
      :position-y="0.15"
      cast-shadow
    >
      <TresCylinderGeometry :args="[PAWN_RADIUS * 0.75, PAWN_RADIUS, 0.3, 8]" />
      <TresMeshStandardMaterial
        :color="props.color"
        :roughness="0.45"
        :metalness="0.3"
      />
    </TresMesh>
    <TresMesh
      :position-y="0.85"
      cast-shadow
    >
      <TresCylinderGeometry :args="[0.28, 0.5, 1.1, 6]" />
      <TresMeshStandardMaterial
        :color="props.color"
        :roughness="0.45"
        :metalness="0.3"
      />
    </TresMesh>
    <TresMesh
      :position-y="1.65"
      cast-shadow
    >
      <TresIcosahedronGeometry :args="[0.42, 0]" />
      <TresMeshStandardMaterial
        :color="props.color"
        :emissive="props.color"
        :emissive-intensity="props.quarantined ? 0.1 : 0.8"
        :roughness="0.3"
      />
    </TresMesh>
  </TresGroup>
</template>
