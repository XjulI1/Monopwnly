<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref } from 'vue'

const props = defineProps<{
  dice: [number, number]
  rollMs: number
}>()

const LANDING_SHARE = 0.75
const FULL_TURN = 360

const FACE_ROTATIONS: Record<number, { x: number; y: number }> = {
  1: { x: 0, y: 0 },
  2: { x: 0, y: -90 },
  3: { x: -90, y: 0 },
  4: { x: 90, y: 0 },
  5: { x: 0, y: 90 },
  6: { x: 0, y: 180 },
}

const PIPS: Record<number, number[]> = {
  1: [4],
  2: [0, 8],
  3: [0, 4, 8],
  4: [0, 2, 6, 8],
  5: [0, 2, 4, 6, 8],
  6: [0, 2, 3, 5, 6, 8],
}

const FACES = [1, 2, 3, 4, 5, 6] as const

const landed = ref(false)
const rolling = ref(false)
let timer: ReturnType<typeof setTimeout> | null = null
let frame = 0

const travelMs = computed(() => Math.round(props.rollMs * LANDING_SHARE))
const total = computed(() => props.dice[0] + props.dice[1])
const isDouble = computed(() => props.dice[0] === props.dice[1])

function spins(value: number, index: number): string {
  const face = FACE_ROTATIONS[value] ?? { x: 0, y: 0 }
  if (!rolling.value) return `rotateX(${index * 40 + 20}deg) rotateY(${index * 70 + 30}deg)`
  const turnsX = 2 + index
  const turnsY = 3 - index
  return `rotateX(${face.x + turnsX * FULL_TURN}deg) rotateY(${face.y + turnsY * FULL_TURN}deg)`
}

onMounted(() => {
  frame = requestAnimationFrame(() => {
    frame = requestAnimationFrame(() => {
      rolling.value = true
    })
  })
  timer = setTimeout(() => {
    landed.value = true
  }, travelMs.value)
})

onBeforeUnmount(() => {
  cancelAnimationFrame(frame)
  if (timer) clearTimeout(timer)
})
</script>

<template>
  <div
    class="pointer-events-none flex flex-col items-center gap-2"
    role="status"
    :aria-label="`Lancer : ${dice[0]} et ${dice[1]}`"
    data-test="dice-tray"
  >
    <div class="flex gap-6">
      <div
        v-for="(value, index) in dice"
        :key="index"
        class="scene"
      >
        <div
          class="die"
          :style="{ transform: spins(value, index), transitionDuration: `${travelMs}ms` }"
        >
          <div
            v-for="face in FACES"
            :key="face"
            class="face"
            :class="`face-${face}`"
          >
            <span
              v-for="cell in 9"
              :key="cell"
              class="pip-cell"
            >
              <span
                v-if="PIPS[face]?.includes(cell - 1)"
                class="pip"
              />
            </span>
          </div>
        </div>
      </div>
    </div>
    <div
      class="flex h-8 items-center gap-2 text-lg font-bold transition-opacity duration-200"
      :class="landed ? 'opacity-100' : 'opacity-0'"
    >
      <span class="rounded-md bg-void/80 px-2 tabular-nums">{{ dice[0] }} + {{ dice[1] }} = {{ total }}</span>
      <span
        v-if="isDouble"
        class="neon-title rounded-md bg-void/80 px-2"
      >Double !</span>
    </div>
  </div>
</template>

<style scoped>
.scene {
  width: 64px;
  height: 64px;
  perspective: 480px;
}

.die {
  position: relative;
  width: 100%;
  height: 100%;
  transform-style: preserve-3d;
  transition-property: transform;
  transition-timing-function: cubic-bezier(0.15, 0.7, 0.25, 1);
}

.face {
  position: absolute;
  inset: 0;
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  grid-template-rows: repeat(3, 1fr);
  padding: 9px;
  border: 1px solid #19e3ff;
  border-radius: 12px;
  background: linear-gradient(145deg, #142033, #0a101c);
  box-shadow:
    inset 0 0 12px #19e3ff33,
    0 0 14px #19e3ff44;
  backface-visibility: hidden;
}

.pip-cell {
  display: flex;
  align-items: center;
  justify-content: center;
}

.pip {
  width: 10px;
  height: 10px;
  border-radius: 50%;
  background: #e8f1ff;
  box-shadow: 0 0 6px #19e3ff;
}

.face-1 {
  transform: rotateY(0deg) translateZ(32px);
}

.face-2 {
  transform: rotateY(90deg) translateZ(32px);
}

.face-3 {
  transform: rotateX(90deg) translateZ(32px);
}

.face-4 {
  transform: rotateX(-90deg) translateZ(32px);
}

.face-5 {
  transform: rotateY(-90deg) translateZ(32px);
}

.face-6 {
  transform: rotateY(180deg) translateZ(32px);
}
</style>
