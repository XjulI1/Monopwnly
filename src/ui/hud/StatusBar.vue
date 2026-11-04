<script setup lang="ts">
import { computed } from 'vue'
import { formatPwn, phaseName } from '../../game/format'
import { activeHouseRules } from '../../game/gameOptions'
import { spotlightPlayer } from '../../game/spotlight'
import { useInjectedGameSession } from '../../game/useGameSession'

const emit = defineEmits<{
  quit: []
}>()

const { displayedState } = useInjectedGameSession()

const current = computed(() => spotlightPlayer(displayedState.value))
const ruleBadges = computed(() => activeHouseRules(displayedState.value.settings))
const turnCounter = computed(() => {
  const { turnNumber, settings } = displayedState.value
  return settings.turnLimit === null ? `Tour ${turnNumber}` : `Tour ${turnNumber} / ${settings.turnLimit}`
})
const lastRoll = computed(() => {
  const roll = displayedState.value.lastRoll
  return roll ? `${roll[0]} + ${roll[1]} = ${roll[0] + roll[1]}` : null
})
</script>

<template>
  <header class="flex items-start justify-between gap-2 border-b border-line px-4 py-3">
    <div class="min-w-0">
      <p
        class="flex items-center gap-2 font-semibold"
        data-test="status"
      >
        <span
          v-if="current"
          class="h-3 w-3 shrink-0 rounded-full"
          :style="{ background: current.color, boxShadow: `0 0 8px ${current.color}` }"
        />
        <span class="min-w-0 break-words">
          <span :style="{ color: current?.color }">{{ current?.name }}</span>
          — {{ phaseName(displayedState.phase.kind) }}
        </span>
      </p>
      <p class="mt-0.5 text-xs text-muted">
        <span data-test="turn-counter">{{ turnCounter }}</span>
        <template v-if="displayedState.settings.dmzJackpot">
          · Cagnotte : <span
            class="tabular-nums text-ink"
            data-test="pot"
          >{{ formatPwn(displayedState.dmzPot) }}</span>
        </template>
        <template v-if="lastRoll">
          · Dernier lancer : <span
            class="tabular-nums text-ink"
            data-test="last-roll"
          >{{ lastRoll }}</span>
        </template>
      </p>
      <ul
        v-if="ruleBadges.length > 0"
        class="mt-1 flex flex-wrap gap-1"
        aria-label="Options de règles"
      >
        <li
          v-for="badge in ruleBadges"
          :key="badge.rule"
          class="cursor-help rounded-full border border-neon/50 px-2 text-[11px] font-semibold text-neon"
          :title="badge.help"
          data-test="rule-badge"
        >
          {{ badge.badge }}
        </li>
      </ul>
    </div>
    <button
      type="button"
      class="btn btn-ghost shrink-0 px-0"
      aria-label="Quitter la partie"
      title="Quitter la partie"
      data-test="quit"
      @click="emit('quit')"
    >
      <svg
        viewBox="0 0 24 24"
        class="h-5 w-5"
        fill="none"
        stroke="currentColor"
        stroke-width="2"
        stroke-linecap="round"
        aria-hidden="true"
      >
        <path d="M12 3v8" />
        <path d="M6.3 6.3a8 8 0 1 0 11.4 0" />
      </svg>
    </button>
  </header>
</template>
