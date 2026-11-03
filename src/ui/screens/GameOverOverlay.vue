<script setup lang="ts">
import { computed, ref } from 'vue'
import { formatPwn } from '../../game/format'
import { bankruptcyLine, ranking } from '../../game/history/summary'
import { useInjectedGameSession } from '../../game/useGameSession'
import StatisticsTab from './StatisticsTab.vue'

type Tab = 'result' | 'statistics'

const emit = defineEmits<{
  replay: []
  home: []
}>()

const TABS: { id: Tab; label: string }[] = [
  { id: 'result', label: 'Résultat' },
  { id: 'statistics', label: 'Statistiques' },
]

const { displayedState, statistics } = useInjectedGameSession()
const tab = ref<Tab>('result')

const winner = computed(() => displayedState.value.players.find((p) => p.id === displayedState.value.winner) ?? null)
const standings = computed(() =>
  ranking(displayedState.value, statistics.value).flatMap((id) => {
    const player = displayedState.value.players.find((p) => p.id === id)
    if (!player) return []
    const line = id === winner.value?.id ? 'Vainqueur' : bankruptcyLine(displayedState.value, statistics.value.players[id]?.bankruptcy ?? null)
    return [{ player, line: line ?? 'En jeu' }]
  }),
)
</script>

<template>
  <div
    v-if="winner"
    class="absolute inset-0 z-40 flex items-center justify-center bg-void/70 p-4 backdrop-blur-[2px]"
    data-test="game-over"
  >
    <div
      class="panel-card flex max-h-full w-full flex-col"
      :class="tab === 'statistics' ? 'max-w-5xl' : 'max-w-lg'"
      :style="{ borderColor: winner.color, boxShadow: `0 0 0 1px ${winner.color}, 0 0 60px ${winner.color}44` }"
      role="dialog"
      aria-labelledby="game-over-title"
    >
      <header class="flex flex-col items-center gap-2 px-6 pt-5 text-center">
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
      </header>

      <div
        class="mt-3 flex justify-center gap-1 border-b border-line px-6"
        role="tablist"
        aria-label="Fin de partie"
      >
        <button
          v-for="item in TABS"
          :id="`end-tab-${item.id}`"
          :key="item.id"
          type="button"
          role="tab"
          class="min-h-11 border-b-2 px-4 text-sm font-semibold"
          :class="tab === item.id ? 'border-neon text-ink' : 'border-transparent text-muted hover:text-ink'"
          :aria-selected="tab === item.id"
          aria-controls="end-tab-panel"
          :data-test="`${item.id}-tab`"
          @click="tab = item.id"
        >
          {{ item.label }}
        </button>
      </div>

      <div
        id="end-tab-panel"
        class="min-h-0 flex-1 overflow-y-auto px-6 py-4"
        role="tabpanel"
        :aria-labelledby="`end-tab-${tab}`"
      >
        <ol
          v-if="tab === 'result'"
          class="flex flex-col gap-2"
          data-test="standings"
        >
          <li
            v-for="({ player, line }, index) in standings"
            :key="player.id"
            class="flex items-baseline gap-3"
          >
            <span class="w-4 shrink-0 text-right text-muted">{{ index + 1 }}</span>
            <span
              class="font-semibold"
              :style="{ color: player.color }"
            >{{ player.name }}</span>
            <span class="text-sm text-muted">{{ line }}</span>
          </li>
        </ol>
        <StatisticsTab v-else />
      </div>

      <footer class="flex flex-wrap justify-center gap-2 border-t border-line px-6 py-4">
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
      </footer>
    </div>
  </div>
</template>
