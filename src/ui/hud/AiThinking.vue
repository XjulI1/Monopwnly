<script setup lang="ts">
import { computed } from 'vue'
import { useInjectedGameSession } from '../../game/useGameSession'

const { view, displayedState } = useInjectedGameSession()

const player = computed(() => displayedState.value.players.find((p) => p.id === view.value.thinking) ?? null)
const activity = computed(() => {
  const offer = view.value.offer
  const fromHuman = offer !== null && displayedState.value.players.find((p) => p.id === offer.from)?.controller.kind === 'human'
  if (!fromHuman) return 'réfléchit…'
  return view.value.original ? 'étudie votre contre-proposition…' : 'étudie votre offre…'
})
</script>

<template>
  <p
    v-if="player"
    class="flex min-h-11 items-center gap-2 text-sm"
    role="status"
    data-test="ai-thinking"
  >
    <span
      class="thinking-dot h-2.5 w-2.5 shrink-0 rounded-full"
      :style="{ background: player.color, boxShadow: `0 0 8px ${player.color}` }"
    />
    <span><span
      class="font-semibold"
      :style="{ color: player.color }"
    >{{ player.name }}</span> {{ activity }}</span>
  </p>
</template>

<style scoped>
.thinking-dot {
  animation: thinking 1.2s ease-in-out infinite;
}

@keyframes thinking {
  50% {
    opacity: 0.3;
  }
}

@media (prefers-reduced-motion: reduce) {
  .thinking-dot {
    animation: none;
  }
}
</style>
