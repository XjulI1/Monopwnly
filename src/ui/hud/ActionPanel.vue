<script setup lang="ts">
import { useInjectedGameSession } from '../../game/useGameSession'
import AuctionPanel from './AuctionPanel.vue'
import BuyPanel from './BuyPanel.vue'
import DebtPanel from './DebtPanel.vue'
import TurnActions from './TurnActions.vue'

const { view } = useInjectedGameSession()
</script>

<template>
  <div class="border-t border-line p-3">
    <TurnActions v-if="view.panel === 'turn'" />
    <BuyPanel v-else-if="view.panel === 'buy'" />
    <AuctionPanel v-else-if="view.panel === 'auction'" />
    <DebtPanel v-else-if="view.panel === 'debt'" />
    <p
      v-else
      class="text-sm text-muted"
    >
      La partie est terminée.
    </p>
  </div>
</template>
