<script setup lang="ts">
import type { ButtonId } from '../../game/interaction'
import { useInjectedGameSession } from '../../game/useGameSession'
import ActionButton from './ActionButton.vue'
import PropertyDetails from './PropertyDetails.vue'

const { view, send } = useInjectedGameSession()

function press(id: ButtonId) {
  send({ kind: 'button', id })
}
</script>

<template>
  <aside
    v-if="view.sheet"
    class="panel-card w-72 overflow-y-auto p-3 shadow-neon"
    aria-label="Fiche de la case"
    data-test="property-sheet"
  >
    <div class="flex justify-end">
      <button
        type="button"
        class="btn btn-ghost -mr-1 -mt-1 px-0"
        aria-label="Fermer la fiche"
        title="Fermer"
        @click="press('closeSheet')"
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
          <path d="M6 6l12 12M18 6L6 18" />
        </svg>
      </button>
    </div>
    <PropertyDetails :square-id="view.sheet.squareId" />
    <div
      v-if="view.sheet.buttons.length > 0"
      class="mt-3 flex flex-col gap-2 border-t border-line pt-3"
    >
      <ActionButton
        v-for="button in view.sheet.buttons"
        :key="button.id"
        :button="button"
        show-reason
        @press="press"
      />
    </div>
  </aside>
</template>
