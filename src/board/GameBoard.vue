<script setup lang="ts">
import { TresCanvas } from '@tresjs/core'
import { DirectionalLight, PCFSoftShadowMap } from 'three'
import { computed, ref } from 'vue'
import { BOARD, squareById, type GameState, type PlayerId } from '../engine'
import BoardCenter from './BoardCenter.vue'
import BoardControls, { type HoveredSquare } from './BoardControls.vue'
import { HOVER_LIFT, TILE_HEIGHT } from './boardLayout'
import { SCENE_COLORS } from './boardTheme'
import { boardViewModel, HIGHLIGHT_STYLES, type Highlights } from './boardViewModel'
import BuildingStack from './BuildingStack.vue'
import DmzPotCounter from './DmzPotCounter.vue'
import { CAMERA_FOV } from './cameraFraming'
import { BOARD_SIDE, tiles } from './geometry/layout'
import { buildingSlots } from './geometry/slots'
import PlayerPawn from './PlayerPawn.vue'
import SquareTile from './SquareTile.vue'
import { usePawnAnimation } from './usePawnAnimation'

const props = defineProps<{
  state: GameState
  highlights?: Highlights
  followPawn?: boolean
}>()

const emit = defineEmits<{
  select: [index: number | null]
}>()

const SHADOW_MAP_SIZE = window.matchMedia('(pointer: coarse)').matches ? 1024 : 2048
const SHADOW_EXTENT = 70

const light = new DirectionalLight('#d9ecff', 1.6)
light.position.set(-35, 80, 45)
light.castShadow = true
light.shadow.mapSize.set(SHADOW_MAP_SIZE, SHADOW_MAP_SIZE)
light.shadow.camera.left = -SHADOW_EXTENT
light.shadow.camera.right = SHADOW_EXTENT
light.shadow.camera.top = SHADOW_EXTENT
light.shadow.camera.bottom = -SHADOW_EXTENT
light.shadow.bias = -0.0005

const DMZ_INDEX = squareById('dmz').index

const layouts = tiles()
const dmzTile = layouts.find((tile) => tile.index === DMZ_INDEX)
const hovered = ref<HoveredSquare | null>(null)
const controls = ref<InstanceType<typeof BoardControls> | null>(null)
const { animated, animateMove } = usePawnAnimation()

const view = computed(() => boardViewModel(props.state, props.highlights ?? {}))

function liftOf(index: number): number {
  const square = view.value.squares[index]
  if (!square) return 0
  return HIGHLIGHT_STYLES[square.highlight].lift + (hovered.value?.index === index ? HOVER_LIFT : 0)
}

const squares = computed(() =>
  layouts.map((tile) => ({
    tile,
    square: BOARD[tile.index] ?? BOARD[0],
    view: view.value.squares[tile.index],
  })),
)

const buildings = computed(() =>
  view.value.squares
    .filter((s) => s.level > 0 && s.ownerColor !== null)
    .map((s) => ({
      index: s.index,
      slots: buildingSlots(s.index, s.level),
      color: s.ownerColor ?? '#ffffff',
      lift: liftOf(s.index),
    })),
)

const pawns = computed(() =>
  view.value.pawns.map((pawn) => {
    const moving = animated.value?.playerId === pawn.playerId ? animated.value.position : null
    return {
      ...pawn,
      world: moving
        ? { x: moving.x, y: TILE_HEIGHT + moving.y, z: moving.z }
        : { x: pawn.position.x, y: TILE_HEIGHT + liftOf(pawn.square), z: pawn.position.z },
    }
  }),
)

const followTarget = computed(() => (props.followPawn && animated.value ? animated.value.position : null))
const hoveredName = computed(() => (hovered.value === null ? null : (BOARD[hovered.value.index]?.name ?? null)))

defineExpose({
  /** Hops the pawn of a player along the squares (the first one is the starting point); resolves on arrival. */
  animateMove: (playerId: PlayerId, squares: readonly number[], msPerSquare: number) =>
    animateMove(playerId, squares, msPerSquare),
  /** Brings the camera back to the whole board. */
  recenter: () => controls.value?.recenter(),
})
</script>

<template>
  <div class="game-board">
    <TresCanvas
      :dpr="[1, 2]"
      antialias
      shadows
      :shadow-map-type="PCFSoftShadowMap"
      :clear-color="SCENE_COLORS.background"
    >
      <TresPerspectiveCamera
        :fov="CAMERA_FOV"
        :near="0.5"
        :far="2000"
      />
      <TresHemisphereLight :args="['#bfe3ff', '#0a1424', 0.9]" />
      <primitive :object="light" />

      <TresMesh
        :rotation-x="-Math.PI / 2"
        :position-y="-0.02"
        receive-shadow
      >
        <TresPlaneGeometry :args="[BOARD_SIDE + 6, BOARD_SIDE + 6]" />
        <TresMeshStandardMaterial
          :color="SCENE_COLORS.table"
          :roughness="0.95"
        />
      </TresMesh>
      <TresGridHelper
        :args="[600, 120, SCENE_COLORS.grid, SCENE_COLORS.grid]"
        :position-y="-0.1"
      />

      <BoardCenter />

      <template
        v-for="entry in squares"
        :key="entry.tile.index"
      >
        <SquareTile
          v-if="entry.view && entry.square"
          :tile="entry.tile"
          :square="entry.square"
          :view="entry.view"
          :hovered="hovered?.index === entry.tile.index"
        />
      </template>

      <BuildingStack
        v-for="building in buildings"
        :key="`building-${building.index}`"
        :square-index="building.index"
        :slots="building.slots"
        :color="building.color"
        :lift="building.lift"
      />

      <DmzPotCounter
        v-if="props.state.settings.dmzJackpot && dmzTile"
        :amount="props.state.dmzPot"
        :position="dmzTile.center"
        :lift="liftOf(DMZ_INDEX)"
      />

      <PlayerPawn
        v-for="pawn in pawns"
        :key="pawn.playerId"
        :square-index="pawn.square"
        :position="pawn.world"
        :color="pawn.color"
        :quarantined="pawn.quarantined"
      />

      <BoardControls
        ref="controls"
        :follow="followTarget"
        @select="emit('select', $event)"
        @hover="hovered = $event"
      />
    </TresCanvas>

    <div
      v-if="hovered !== null && hoveredName !== null"
      class="square-tooltip"
      :style="{ left: `${hovered.x}px`, top: `${hovered.y}px` }"
    >
      {{ hoveredName }}
    </div>

    <button
      type="button"
      class="recenter"
      @click="controls?.recenter()"
    >
      Recentrer
    </button>
  </div>
</template>

<style scoped>
.game-board {
  position: relative;
  width: 100%;
  height: 100%;
  overflow: hidden;
  touch-action: none;
}

.square-tooltip {
  position: absolute;
  transform: translate(12px, -130%);
  padding: 4px 8px;
  border: 1px solid #19e3ff66;
  border-radius: 6px;
  background: rgba(4, 8, 16, 0.92);
  color: #e8f1ff;
  font: 600 13px/1.3 system-ui, sans-serif;
  pointer-events: none;
  white-space: nowrap;
}

.recenter {
  position: absolute;
  right: 16px;
  bottom: 16px;
  min-width: 44px;
  min-height: 44px;
  padding: 0 14px;
  border: 1px solid #19e3ff88;
  border-radius: 10px;
  background: rgba(4, 8, 16, 0.85);
  color: #e8f1ff;
  font: 600 14px/1 system-ui, sans-serif;
  cursor: pointer;
}
</style>
