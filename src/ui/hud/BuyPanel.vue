<script setup lang="ts">
import { computed } from 'vue'
import { squareById } from '../../engine'
import { formatPwn } from '../../game/format'
import type { ButtonId } from '../../game/interaction'
import { useInjectedGameSession } from '../../game/useGameSession'
import ActionButton from './ActionButton.vue'
import PropertyDetails from './PropertyDetails.vue'

const { view, displayedState, send } = useInjectedGameSession()

const buy = computed(() => view.value.buy)
const actor = computed(() => displayedState.value.players.find((p) => p.id === view.value.actor) ?? null)

function press(id: ButtonId) {
  send({ kind: 'button', id })
}
</script>

<template>
  <section
    v-if="buy"
    class="flex flex-col gap-3"
    aria-label="Décision d’achat"
  >
    <PropertyDetails
      :square-id="buy.squareId"
      compact
    />
    <button
      type="button"
      class="btn btn-ghost min-h-11 self-start px-3 text-sm"
      data-test="open-sheet"
      @click="send({ kind: 'square', index: squareById(buy.squareId).index })"
    >
      Voir la fiche complète
    </button>
    <p class="text-sm">
      Argent de {{ actor?.name }} : <span class="tabular-nums font-semibold">{{ formatPwn(buy.cash) }}</span>
    </p>
    <div class="grid grid-cols-2 gap-2">
      <ActionButton
        v-for="button in view.buttons"
        :key="button.id"
        :button="button"
        :variant="button.id === 'buy' ? 'primary' : 'ghost'"
        show-reason
        @press="press"
      />
    </div>
  </section>
</template>
