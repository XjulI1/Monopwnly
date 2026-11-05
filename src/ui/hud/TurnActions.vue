<script setup lang="ts">
import { computed } from 'vue'
import type { ButtonId } from '../../game/interaction'
import { useInjectedGameSession } from '../../game/useGameSession'
import ActionButton from './ActionButton.vue'
import ConfirmDialog from './ConfirmDialog.vue'

const { view, displayedState, send } = useInjectedGameSession()

const PRIMARY: readonly ButtonId[] = ['rollDice', 'endTurn', 'doneManaging']
const GIVING_UP: readonly ButtonId[] = ['declareBankruptcy', 'confirmBankruptcy', 'cancelBankruptcy']

const actorName = computed(() => displayedState.value.players.find((p) => p.id === view.value.actor)?.name ?? '')
const turnButtons = computed(() => view.value.buttons.filter((b) => !GIVING_UP.includes(b.id)))
const giveUpButton = computed(() => view.value.buttons.find((b) => b.id === 'declareBankruptcy') ?? null)
const giveUpMessage = computed(
  () =>
    `${actorName.value}, vous vous déclarez en faillite et quittez la partie : vos constructions sont revendues et vos systèmes retournent à la banque.`,
)

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
    <div
      class="grid grid-cols-2 gap-2"
      data-test="turn-actions"
    >
      <ActionButton
        v-for="(button, index) in turnButtons"
        :key="button.id"
        :class="{ 'col-span-2': index === 0 && turnButtons.length % 2 === 1 }"
        :button="button"
        :variant="PRIMARY.includes(button.id) ? 'primary' : 'ghost'"
        @press="press"
      />
    </div>
    <div
      v-if="giveUpButton"
      class="mt-2 border-t border-line pt-3"
      data-test="give-up"
    >
      <ActionButton
        :button="giveUpButton"
        variant="danger"
        @press="press"
      />
    </div>

    <ConfirmDialog
      v-if="view.confirmingResignation"
      title="Abandonner la partie ?"
      :message="giveUpMessage"
      confirm-label="Confirmer l’abandon"
      danger
      @confirm="press('confirmBankruptcy')"
      @cancel="press('cancelBankruptcy')"
    />
  </section>
</template>
