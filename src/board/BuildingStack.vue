<script setup lang="ts">
import { TILE_HEIGHT } from './boardLayout'
import type { BuildingSlot } from './geometry/slots'

const props = defineProps<{
  squareIndex: number
  slots: BuildingSlot[]
  color: string
  lift: number
}>()
</script>

<template>
  <TresGroup :user-data="{ squareIndex: props.squareIndex }">
    <template
      v-for="(slot, i) in props.slots"
      :key="i"
    >
      <TresGroup
        v-if="slot.kind === 'backdoor'"
        :position="[slot.position.x, TILE_HEIGHT + props.lift, slot.position.z]"
      >
        <TresMesh
          :position-y="0.45"
          cast-shadow
        >
          <TresBoxGeometry :args="[1.1, 0.9, 1.1]" />
          <TresMeshStandardMaterial
            :color="props.color"
            :roughness="0.5"
            :metalness="0.3"
          />
        </TresMesh>
        <TresMesh :position-y="0.93">
          <TresBoxGeometry :args="[0.7, 0.06, 0.7]" />
          <TresMeshStandardMaterial
            :color="props.color"
            :emissive="props.color"
            :emissive-intensity="1.2"
          />
        </TresMesh>
      </TresGroup>
      <TresGroup
        v-else
        :position="[slot.position.x, TILE_HEIGHT + props.lift, slot.position.z]"
      >
        <TresMesh
          :position-y="1.3"
          cast-shadow
        >
          <TresCylinderGeometry :args="[0.75, 1, 2.6, 6]" />
          <TresMeshStandardMaterial
            :color="props.color"
            :roughness="0.4"
            :metalness="0.5"
          />
        </TresMesh>
        <TresMesh :position-y="2.75">
          <TresOctahedronGeometry :args="[0.55]" />
          <TresMeshStandardMaterial
            :color="props.color"
            :emissive="props.color"
            :emissive-intensity="1.6"
          />
        </TresMesh>
      </TresGroup>
    </template>
  </TresGroup>
</template>
