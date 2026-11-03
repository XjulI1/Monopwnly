<script setup lang="ts">
import { computed } from 'vue'
import { FAMILY_COLORS } from '../../board/boardTheme'
import type { SquareId } from '../../engine'
import { formatPwn } from '../../game/format'
import { squareSheet } from '../../game/squareSheet'
import { useInjectedGameSession } from '../../game/useGameSession'

const props = withDefaults(defineProps<{ squareId: SquareId; compact?: boolean }>(), { compact: false })

const { displayedState } = useInjectedGameSession()

const sheet = computed(() => squareSheet(displayedState.value, props.squareId))
const bandColor = computed(() => (sheet.value.kind === 'system' ? FAMILY_COLORS[sheet.value.family] : '#8fa3bf'))
const owner = computed(() => {
  const s = sheet.value
  if (s.kind === 'other' || !s.owner) return null
  return displayedState.value.players.find((p) => p.id === s.owner) ?? null
})
const rows = computed(() => {
  const s = sheet.value
  if (s.kind === 'system' || s.kind === 'node') return s.rents.map((r) => ({ ...r, text: formatPwn(r.amount) }))
  if (s.kind === 'service') return s.multipliers.map((r) => ({ ...r, text: `${r.amount} × les dés` }))
  return []
})
const rentSummary = computed(() => {
  const s = sheet.value
  if (s.kind === 'service') return s.multipliers.map((r) => `${r.amount} ×`).join(' ou ') + ' les dés'
  if (s.kind === 'other') return null
  const first = s.rents[0]
  const last = s.rents.at(-1)
  return first && last ? `de ${formatPwn(first.amount)} à ${formatPwn(last.amount)}` : null
})
const kindLabel = computed(() => {
  const s = sheet.value
  if (s.kind === 'system') return s.familyName
  if (s.kind === 'node') return 'Nœud'
  if (s.kind === 'service') return 'Service'
  return null
})
</script>

<template>
  <div data-test="property-details">
    <div
      class="h-2 rounded-t-md"
      :style="{ background: bandColor, boxShadow: `0 0 12px ${bandColor}88` }"
    />
    <div class="pt-2">
      <p
        v-if="kindLabel"
        class="text-xs font-semibold uppercase tracking-wider"
        :style="{ color: bandColor }"
      >
        {{ kindLabel }}
      </p>
      <h3
        class="text-lg font-bold leading-tight"
        data-test="sheet-name"
      >
        {{ sheet.name }}
      </h3>

      <p
        v-if="sheet.kind === 'other'"
        class="mt-2 text-sm text-muted"
      >
        {{ sheet.effect }}
      </p>

      <template v-else>
        <p class="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-sm">
          <span>Prix <span class="tabular-nums">{{ formatPwn(sheet.price) }}</span></span>
          <span
            v-if="owner"
            class="flex items-center gap-1"
          >
            <span
              class="h-2.5 w-2.5 rounded-full"
              :style="{ background: owner.color }"
            />
            {{ owner.name }}
          </span>
          <span
            v-else
            class="text-muted"
          >Libre</span>
          <span
            v-if="sheet.mortgaged"
            class="rounded border border-muted/50 px-1 text-xs text-muted"
          >En veille</span>
        </p>

        <p
          v-if="compact"
          class="mt-1 text-sm text-muted"
          data-test="rent-summary"
        >
          Loyer {{ rentSummary }}
        </p>
        <table
          v-else
          class="mt-2 w-full text-sm"
        >
          <tbody>
            <tr
              v-for="row in rows"
              :key="row.label"
              :class="row.current ? 'bg-neon/15 font-semibold text-ink' : 'text-muted'"
              :data-current="row.current || undefined"
            >
              <td class="rounded-l px-2 py-0.5">
                {{ row.label }}
              </td>
              <td class="rounded-r px-2 py-0.5 text-right tabular-nums">
                {{ row.text }}
              </td>
            </tr>
          </tbody>
        </table>

        <dl
          v-if="!compact"
          class="mt-2 grid grid-cols-[1fr_auto] gap-x-3 gap-y-0.5 text-xs text-muted"
        >
          <template v-if="sheet.kind === 'system'">
            <dt>Backdoor (ou rootkit)</dt>
            <dd class="text-right tabular-nums">
              {{ formatPwn(sheet.backdoorCost) }}
            </dd>
          </template>
          <dt>Mise en veille</dt>
          <dd class="text-right tabular-nums">
            {{ formatPwn(sheet.mortgageValue) }}
          </dd>
          <dt>Réactivation</dt>
          <dd class="text-right tabular-nums">
            {{ formatPwn(sheet.unmortgageCost) }}
          </dd>
        </dl>
      </template>
    </div>
  </div>
</template>
