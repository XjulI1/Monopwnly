<script setup lang="ts">
import { computed } from 'vue'
import { FAMILY_COLORS } from '../../board/boardTheme'
import { BOARD, type Player, type Square } from '../../engine'
import { formatPwn, formatPwnDelta } from '../../game/format'
import { spotlightPlayer } from '../../game/spotlight'
import { useInjectedGameSession } from '../../game/useGameSession'

const NODE_COLOR = '#c9d4e5'
const SERVICE_COLOR = '#7d8aa3'

const { displayedState, badges, send, view } = useInjectedGameSession()

type Chip = { index: number; name: string; color: string; mortgaged: boolean; level: number; title: string }

function colorOf(square: Square): string {
  if (square.kind === 'system') return FAMILY_COLORS[square.family]
  return square.kind === 'node' ? NODE_COLOR : SERVICE_COLOR
}

function levelText(level: number): string {
  if (level === 5) return 'rootkit'
  return level === 1 ? '1 backdoor' : `${level} backdoors`
}

function chipsOf(player: Player): Chip[] {
  const ownership = displayedState.value.ownership
  return BOARD.flatMap((square) => {
    const own = ownership[square.id]
    if (!own || own.owner !== player.id) return []
    const details = [square.name, own.level > 0 ? levelText(own.level) : null, own.mortgaged ? 'en veille' : null]
    return [
      {
        index: square.index,
        name: square.name,
        color: colorOf(square),
        mortgaged: own.mortgaged,
        level: own.level,
        title: details.filter((d) => d !== null).join(' · '),
      },
    ]
  })
}

const rows = computed(() => {
  const state = displayedState.value
  const currentId = spotlightPlayer(state)?.id
  return state.players.map((player) => ({
    player,
    current: player.id === currentId,
    expected: player.id === view.value.actor && player.id !== currentId,
    chips: chipsOf(player),
    badges: badges.value.filter((b) => b.playerId === player.id),
  }))
})
</script>

<template>
  <ul
    class="flex flex-col gap-2 p-3"
    aria-label="Joueurs"
  >
    <li
      v-for="row in rows"
      :key="row.player.id"
      class="relative rounded-lg border p-2 transition-colors"
      :class="row.current ? 'border-neon/70 bg-neon/5 shadow-neon' : 'border-line bg-panel-raised/60'"
      :data-test="`player-${row.player.id}`"
      :aria-current="row.current ? 'true' : undefined"
    >
      <div class="flex items-center gap-2">
        <span
          class="h-3 w-3 shrink-0 rounded-full"
          :class="{ 'opacity-40': row.player.bankrupt }"
          :style="{ background: row.player.color, boxShadow: row.player.bankrupt ? 'none' : `0 0 8px ${row.player.color}` }"
        />
        <span
          class="min-w-0 truncate font-semibold"
          :class="{ 'text-muted line-through': row.player.bankrupt }"
          data-test="player-name"
        >{{ row.player.name }}</span>
        <span
          class="relative ml-auto shrink-0 tabular-nums text-sm"
          :class="row.player.bankrupt ? 'text-muted line-through' : 'text-ink'"
          data-test="cash"
        >
          {{ formatPwn(row.player.cash) }}
          <span
            v-for="badge in row.badges"
            :key="badge.id"
            class="cash-badge absolute right-0 -top-4 whitespace-nowrap font-bold"
            :class="badge.amount >= 0 ? 'text-gain' : 'text-loss'"
          >{{ formatPwnDelta(badge.amount) }}</span>
        </span>
      </div>
      <div
        v-if="row.player.quarantine || row.player.keys.length > 0 || row.expected"
        class="mt-1 flex items-center gap-2 pl-5"
      >
        <span
          v-if="row.player.quarantine"
          class="shrink-0 rounded border border-warning/60 px-1 text-[11px] font-semibold uppercase tracking-wide text-warning"
          data-test="quarantine-marker"
          title="En quarantaine"
        >Quarantaine</span>
        <span
          v-if="row.player.keys.length > 0"
          class="flex shrink-0 items-center gap-0.5 text-xs text-patch"
          :title="`${row.player.keys.length} Clé${row.player.keys.length > 1 ? 's' : ''} de déchiffrement`"
          data-test="keys"
        >
          <svg
            viewBox="0 0 24 24"
            class="h-3.5 w-3.5"
            fill="none"
            stroke="currentColor"
            stroke-width="2.2"
            aria-hidden="true"
          >
            <circle
              cx="8"
              cy="12"
              r="4"
            />
            <path d="M12 12h9M18 12v3M21 12v2" />
          </svg>
          ×{{ row.player.keys.length }}
        </span>
        <span
          v-if="row.expected"
          class="shrink-0 text-[11px] text-neon"
        >doit jouer</span>
      </div>
      <div
        v-if="row.chips.length > 0"
        class="mt-1.5 flex flex-wrap gap-0.5"
      >
        <button
          v-for="chip in row.chips"
          :key="chip.index"
          type="button"
          class="flex h-11 w-11 items-center justify-center rounded-md hover:bg-ink/10"
          :title="chip.title"
          :aria-label="chip.title"
          data-test="chip"
          @click="send({ kind: 'square', index: chip.index })"
        >
          <span
            class="flex h-7 w-7 items-center justify-center rounded-sm text-[10px] font-bold text-void"
            :class="chip.mortgaged ? 'border border-dashed border-ink/60 opacity-35' : ''"
            :style="{ background: chip.color }"
          >{{ chip.level === 5 ? 'R' : chip.level > 0 ? chip.level : '' }}</span>
        </button>
      </div>
    </li>
  </ul>
</template>

<style scoped>
.cash-badge {
  animation: cash-badge 1.4s ease-out forwards;
}

@keyframes cash-badge {
  0% {
    opacity: 0;
    transform: translateY(6px);
  }

  15% {
    opacity: 1;
    transform: translateY(0);
  }

  80% {
    opacity: 1;
  }

  100% {
    opacity: 0;
    transform: translateY(-10px);
  }
}

@media (prefers-reduced-motion: reduce) {
  .cash-badge {
    animation: none;
  }
}
</style>
