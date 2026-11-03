<script setup lang="ts">
import { ANIMATION_SPEEDS, SPEED_LABELS } from '../../game/animationSpeed'
import { useInjectedGameSession } from '../../game/useGameSession'

const { speed, setSpeed } = useInjectedGameSession()
</script>

<template>
  <div
    class="flex flex-col gap-1"
    data-keep-presenting
  >
    <span
      id="speed-label"
      class="text-xs font-semibold uppercase tracking-wider text-muted"
    >Vitesse des animations</span>
    <div
      class="grid grid-cols-3 gap-1 rounded-lg border border-line bg-void p-1"
      role="radiogroup"
      aria-labelledby="speed-label"
    >
      <button
        v-for="option in ANIMATION_SPEEDS"
        :key="option"
        type="button"
        role="radio"
        class="min-h-11 rounded-md px-2 text-xs font-semibold whitespace-nowrap transition-colors"
        :class="speed === option ? 'bg-neon text-void' : 'text-muted hover:text-ink'"
        :aria-checked="speed === option"
        :data-speed="option"
        @click="setSpeed(option)"
      >
        {{ SPEED_LABELS[option] }}
      </button>
    </div>
  </div>
</template>
