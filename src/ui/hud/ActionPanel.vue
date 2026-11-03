<script setup lang="ts">
import { computed } from 'vue'
import { useInjectedGameSession } from '../../game/useGameSession'
import AiThinking from './AiThinking.vue'
import AuctionPanel from './AuctionPanel.vue'
import BuyPanel from './BuyPanel.vue'
import DebtPanel from './DebtPanel.vue'
import TurnActions from './TurnActions.vue'

const { view, displayedState } = useInjectedGameSession()

const recipient = computed(() => displayedState.value.players.find((p) => p.id === view.value.offer?.to) ?? null)
</script>

<template>
  <div class="border-t border-line p-3">
    <AuctionPanel v-if="view.panel === 'auction'" />
    <AiThinking v-else-if="view.thinking" />
    <TurnActions v-else-if="view.panel === 'turn'" />
    <BuyPanel v-else-if="view.panel === 'buy'" />
    <DebtPanel v-else-if="view.panel === 'debt'" />
    <p
      v-else-if="view.panel === 'trade'"
      class="flex min-h-11 items-center text-sm text-muted"
      role="status"
      data-test="trade-waiting"
    >
      <span>Offre d’échange en attente de la réponse de <span
        class="font-semibold"
        :style="{ color: recipient?.color }"
      >{{ recipient?.name }}</span></span>
    </p>
    <p
      v-else
      class="text-sm text-muted"
    >
      La partie est terminée.
    </p>
  </div>
</template>
