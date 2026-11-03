<script setup lang="ts">
import { computed } from 'vue'
import { formatPwn } from '../../game/format'
import { useInjectedGameSession } from '../../game/useGameSession'

const emit = defineEmits<{
  replay: []
  home: []
}>()

const { displayedState } = useInjectedGameSession()

const winner = computed(() => displayedState.value.players.find((p) => p.id === displayedState.value.winner) ?? null)
</script>

<template>
  <div
    v-if="winner"
    class="absolute inset-0 z-40 flex items-center justify-center bg-void/60 p-6 backdrop-blur-[2px]"
    data-test="game-over"
  >
    <div
      class="panel-card flex w-full max-w-md flex-col items-center gap-4 p-8 text-center"
      :style="{ borderColor: winner.color, boxShadow: `0 0 0 1px ${winner.color}, 0 0 60px ${winner.color}44` }"
      role="dialog"
      aria-labelledby="game-over-title"
    >
      <p class="text-xs font-semibold uppercase tracking-[0.3em] text-muted">
        Fin de partie
      </p>
      <h2
        id="game-over-title"
        class="text-3xl font-bold"
        :style="{ color: winner.color, textShadow: `0 0 24px ${winner.color}88` }"
      >
        {{ winner.name }} remporte la partie
      </h2>
      <p class="text-muted">
        Argent final : <span class="tabular-nums text-ink">{{ formatPwn(winner.cash) }}</span>
      </p>
      <div class="mt-2 flex w-full flex-col gap-2">
        <button
          type="button"
          class="btn btn-primary"
          data-test="replay"
          @click="emit('replay')"
        >
          Rejouer avec les mêmes paramètres
        </button>
        <button
          type="button"
          class="btn btn-ghost"
          data-test="home"
          @click="emit('home')"
        >
          Retour à l’accueil
        </button>
      </div>
    </div>
  </div>
</template>
