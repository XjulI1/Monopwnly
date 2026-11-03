<script setup lang="ts">
import { computed } from 'vue'
import { formatPwn } from '../../game/format'
import type { ButtonId } from '../../game/interaction'
import { useInjectedGameSession } from '../../game/useGameSession'
import ActionButton from './ActionButton.vue'
import ConfirmDialog from './ConfirmDialog.vue'

const { view, displayedState, send } = useInjectedGameSession()

const debt = computed(() => view.value.debt)
const nameOf = (id: string) => (id === 'bank' ? 'la banque' : (displayedState.value.players.find((p) => p.id === id)?.name ?? ''))
const debtor = computed(() => (debt.value ? nameOf(debt.value.debtor) : ''))
const creditor = computed(() => (debt.value ? nameOf(debt.value.payment.to) : ''))
const payButtons = computed(() => view.value.buttons.filter((b) => b.id === 'payDebt' || b.id === 'declareBankruptcy'))

function press(id: ButtonId) {
  send({ kind: 'button', id })
}
</script>

<template>
  <section
    v-if="debt"
    class="flex flex-col gap-3"
    aria-label="Règlement de dette"
  >
    <header>
      <p class="text-xs font-semibold uppercase tracking-wider text-loss">
        Règlement de dette
      </p>
      <h3 class="text-lg font-bold leading-tight">
        {{ debtor }} doit {{ formatPwn(debt.payment.amount) }} à {{ creditor }}
      </h3>
      <p
        v-if="debt.remaining.length > 0"
        class="text-sm text-muted"
        data-test="debt-remaining"
      >
        Puis {{ debt.remaining.length }} {{ debt.remaining.length > 1 ? 'paiements restants' : 'paiement restant' }} :
        {{ debt.remaining.map((p) => `${formatPwn(p.amount)} à ${nameOf(p.to)}`).join(', ') }}
      </p>
    </header>

    <dl class="grid grid-cols-[1fr_auto] gap-x-3 gap-y-1 text-sm">
      <dt class="text-muted">
        Argent
      </dt>
      <dd
        class="text-right tabular-nums"
        data-test="debt-cash"
      >
        {{ formatPwn(debt.cash) }}
      </dd>
      <dt class="text-muted">
        Encore réunissable
      </dt>
      <dd
        class="text-right tabular-nums"
        data-test="debt-raisable"
      >
        {{ formatPwn(debt.raisable) }}
      </dd>
    </dl>

    <p
      v-if="debt.unavoidable"
      class="rounded-md border border-loss/60 bg-loss/10 px-3 py-2 text-sm text-loss"
      data-test="debt-unavoidable"
    >
      Même en revendant tout et en mettant tout en veille, la somme ne suffit pas : la faillite est inévitable.
    </p>
    <p
      v-else-if="!debt.covered"
      class="text-sm text-muted"
    >
      Touchez un de vos systèmes en surbrillance pour revendre une construction ou le mettre en veille.
    </p>

    <div class="grid grid-cols-2 gap-2">
      <ActionButton
        v-for="button in payButtons"
        :key="button.id"
        :button="button"
        :variant="button.id === 'payDebt' ? 'primary' : 'danger'"
        @press="press"
      />
    </div>

    <ConfirmDialog
      v-if="debt.confirming"
      title="Déclarer faillite ?"
      :message="`${debtor}, vous quittez la partie. Vos biens iront à ${creditor}.`"
      confirm-label="Confirmer la faillite"
      danger
      @confirm="press('confirmBankruptcy')"
      @cancel="press('cancelBankruptcy')"
    />
  </section>
</template>
