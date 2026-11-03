<script setup lang="ts">
import { computed } from 'vue'
import type { ButtonId } from '../../game/interaction'
import { useInjectedGameSession } from '../../game/useGameSession'
import ActionButton from './ActionButton.vue'

const { view, displayedState, send } = useInjectedGameSession()

const PRIMARY: readonly ButtonId[] = ['rollDice', 'endTurn', 'doneManaging']

const actorName = computed(() => displayedState.value.players.find((p) => p.id === view.value.actor)?.name ?? '')

function press(id: ButtonId) {
  send({ kind: 'button', id })
}
</script>

<template>
  <section
    class="flex flex-col gap-2"
    aria-label="Actions du tour"
  >
    <p
      v-if="view.quarantine && !view.managing"
      class="rounded-md border border-warning/50 bg-warning/10 px-3 py-2 text-sm text-warning"
      data-test="quarantine-info"
    >
      {{ actorName }} est en quarantaine — Tentative {{ view.quarantine.attempt }} sur {{ view.quarantine.maxAttempts }}
    </p>
    <p
      v-if="view.managing"
      class="text-sm text-muted"
    >
      Touchez un de vos systèmes en surbrillance pour construire, revendre, mettre en veille ou réactiver.
    </p>
    <div class="grid grid-cols-2 gap-2">
      <ActionButton
        v-for="button in view.buttons"
        :key="button.id"
        :class="{ 'col-span-2': button.id === 'manage' || view.buttons.length === 1 }"
        :button="button"
        :variant="PRIMARY.includes(button.id) ? 'primary' : 'ghost'"
        @press="press"
      />
    </div>
  </section>
</template>
