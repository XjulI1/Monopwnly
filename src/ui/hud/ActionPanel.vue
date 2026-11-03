<script setup lang="ts">
import { useInjectedGameSession } from '../../game/useGameSession'
import AiThinking from './AiThinking.vue'
import AuctionPanel from './AuctionPanel.vue'
import BuyPanel from './BuyPanel.vue'
import DebtPanel from './DebtPanel.vue'
import TurnActions from './TurnActions.vue'

const { view } = useInjectedGameSession()
</script>

<template>
  <div class="border-t border-line p-3">
    <AuctionPanel v-if="view.panel === 'auction'" />
    <AiThinking v-else-if="view.thinking" />
    <TurnActions v-else-if="view.panel === 'turn'" />
    <BuyPanel v-else-if="view.panel === 'buy'" />
    <DebtPanel v-else-if="view.panel === 'debt'" />
    <p
      v-else
      class="text-sm text-muted"
    >
      La partie est terminée.
    </p>
  </div>
</template>
