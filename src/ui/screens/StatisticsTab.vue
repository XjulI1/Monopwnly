<script setup lang="ts">
import { computed } from 'vue'
import { netWorth, type Player } from '../../engine'
import { formatPwn } from '../../game/format'
import type { PlayerStatistics } from '../../game/history/statistics'
import { bankruptcyLine, ranking, topSquares, wealthSeries } from '../../game/history/summary'
import { useInjectedGameSession } from '../../game/useGameSession'
import LineChart from './LineChart.vue'

type Row = { label: string; value: (counters: PlayerStatistics, player: Player) => string }

const { displayedState, statistics } = useInjectedGameSession()

const order = computed(() => ranking(displayedState.value, statistics.value))
const columns = computed(() =>
  order.value.flatMap((id) => {
    const player = displayedState.value.players.find((p) => p.id === id)
    const counters = statistics.value.players[id]
    return player && counters ? [{ player, counters }] : []
  }),
)
const netWorthLines = computed(() => wealthSeries(displayedState.value, statistics.value, order.value, 'netWorth'))
const cashLines = computed(() => wealthSeries(displayedState.value, statistics.value, order.value, 'cash'))
const squares = computed(() => topSquares(statistics.value))

function result(counters: PlayerStatistics, player: Player): string {
  if (player.id === displayedState.value.winner) return 'Vainqueur'
  return bankruptcyLine(displayedState.value, counters.bankruptcy) ?? 'En jeu'
}

const ROWS: Row[] = [
  { label: 'Résultat', value: result },
  { label: 'Patrimoine final', value: (_, player) => (player.bankrupt ? '—' : formatPwn(netWorth(displayedState.value, player.id))) },
  { label: 'Loyers perçus', value: (c) => formatPwn(c.rentCollected) },
  { label: 'Loyers payés', value: (c) => formatPwn(c.rentPaid) },
  { label: 'Taxes et amendes', value: (c) => formatPwn(c.taxesPaid) },
  { label: 'Salaires de Boot', value: (c) => formatPwn(c.salaries) },
  { label: 'Systèmes achetés', value: (c) => `${c.purchases} (${formatPwn(c.purchaseSpending)})` },
  { label: 'Enchères remportées', value: (c) => String(c.auctionsWon) },
  { label: 'Backdoors installées', value: (c) => String(c.backdoorsBuilt) },
  { label: 'Rootkits installés', value: (c) => String(c.rootkitsBuilt) },
  { label: 'Cartes piochées', value: (c) => String(c.cardsDrawn) },
  { label: 'Passages en quarantaine', value: (c) => String(c.quarantines) },
  { label: 'Doubles', value: (c) => String(c.doubles) },
]
</script>

<template>
  <div
    class="flex flex-col gap-5"
    data-test="statistics"
  >
    <div class="grid grid-cols-2 gap-5">
      <LineChart
        title="Patrimoine par tour"
        :series="netWorthLines"
      />
      <LineChart
        title="Argent liquide par tour"
        :series="cashLines"
      />
    </div>

    <div class="grid grid-cols-[minmax(0,1fr)_15rem] gap-5">
      <table
        class="w-full table-fixed border-collapse text-xs"
        data-test="statistics-table"
      >
        <caption class="sr-only">
          Récapitulatif par joueur
        </caption>
        <thead>
          <tr>
            <th
              scope="col"
              class="w-40"
            />
            <th
              v-for="{ player } in columns"
              :key="player.id"
              scope="col"
              class="px-1 pb-1.5 text-left font-semibold break-words"
              :style="{ color: player.color }"
            >
              {{ player.name }}
            </th>
          </tr>
        </thead>
        <tbody>
          <tr
            v-for="row in ROWS"
            :key="row.label"
            class="border-t border-line/70"
          >
            <th
              scope="row"
              class="py-1 pr-2 text-left font-normal text-muted"
            >
              {{ row.label }}
            </th>
            <td
              v-for="{ player, counters } in columns"
              :key="player.id"
              class="px-1 py-1 align-top tabular-nums break-words"
            >
              {{ row.value(counters, player) }}
            </td>
          </tr>
        </tbody>
      </table>

      <section aria-labelledby="top-squares-title">
        <h3
          id="top-squares-title"
          class="mb-2 text-xs font-semibold uppercase tracking-wider text-muted"
        >
          Cases les plus rentables
        </h3>
        <ol
          v-if="squares.length > 0"
          class="flex flex-col gap-1.5 text-sm"
          data-test="top-squares"
        >
          <li
            v-for="(square, index) in squares"
            :key="square.squareId"
            class="flex items-baseline gap-2"
          >
            <span class="w-4 shrink-0 text-right text-muted">{{ index + 1 }}</span>
            <span class="min-w-0 flex-1">
              <span class="block truncate">{{ square.name }}</span>
              <span class="block text-[11px] text-muted">{{ square.family }}</span>
            </span>
            <span class="tabular-nums">{{ formatPwn(square.total) }}</span>
          </li>
        </ol>
        <p
          v-else
          class="text-sm text-muted"
        >
          Aucun loyer n’a été perçu.
        </p>
      </section>
    </div>
  </div>
</template>
