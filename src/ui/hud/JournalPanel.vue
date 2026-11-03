<script setup lang="ts">
import { computed, nextTick, onMounted, ref, useTemplateRef, watch } from 'vue'
import type { JournalEntry } from '../../game/history/journal'
import { JOURNAL_PAGE, journalGroups } from '../../game/history/journalView'
import { useInjectedGameSession } from '../../game/useGameSession'

const STICKY_DISTANCE_PX = 12
const LOAD_DISTANCE_PX = 24
const NEUTRAL_COLOR = 'var(--color-line)'

const { journal, journalShown, displayedState } = useInjectedGameSession()
const scroller = useTemplateRef<HTMLElement>('scroller')
const open = ref(true)
const atBottom = ref(true)
const unseen = ref(false)
const pageCount = ref(1)
const unfolded = ref<ReadonlySet<number>>(new Set())

const visible = computed(() => journal.value.slice(0, journalShown.value))
const hiddenCount = computed(() => Math.max(0, visible.value.length - pageCount.value * JOURNAL_PAGE))
const groups = computed(() => journalGroups(visible.value, hiddenCount.value))
const colors = computed(() => new Map(displayedState.value.players.map((p) => [p.id, p.color])))
const tail = computed(() => {
  const last = visible.value.at(-1)
  return last ? `${visible.value.length}:${last.id}:${last.text}:${last.details.length}` : ''
})

function colorOf(actor: string | null): string {
  return (actor && colors.value.get(actor)) || NEUTRAL_COLOR
}

function toggle(entry: JournalEntry) {
  const next = new Set(unfolded.value)
  if (next.has(entry.id)) next.delete(entry.id)
  else next.add(entry.id)
  unfolded.value = next
}

async function loadOlder() {
  const element = scroller.value
  if (!element || hiddenCount.value === 0) return
  const fromEnd = element.scrollHeight - element.scrollTop
  pageCount.value += 1
  await nextTick()
  element.scrollTop = element.scrollHeight - fromEnd
}

function onScroll() {
  const element = scroller.value
  if (!element) return
  atBottom.value = element.scrollHeight - element.scrollTop - element.clientHeight <= STICKY_DISTANCE_PX
  if (atBottom.value) unseen.value = false
  if (element.scrollTop <= LOAD_DISTANCE_PX) void loadOlder()
}

function scrollToEnd() {
  const element = scroller.value
  if (element) element.scrollTop = element.scrollHeight
  atBottom.value = true
  unseen.value = false
}

async function toggleOpen() {
  open.value = !open.value
  if (!open.value) return
  await nextTick()
  scrollToEnd()
}

watch(tail, async () => {
  if (!atBottom.value) {
    unseen.value = true
    return
  }
  await nextTick()
  scrollToEnd()
})

onMounted(scrollToEnd)
</script>

<template>
  <section
    class="relative flex flex-col"
    :class="{ 'min-h-26 flex-1 basis-0': open }"
    aria-labelledby="journal-title"
    data-keep-presenting
  >
    <h2 id="journal-title">
      <button
        type="button"
        class="flex min-h-9 w-full items-center justify-between px-1 text-xs font-semibold uppercase tracking-wider text-muted hover:text-ink"
        :aria-expanded="open"
        aria-controls="journal-log"
        data-test="journal-toggle"
        @click="toggleOpen"
      >
        Journal
        <svg
          viewBox="0 0 24 24"
          class="h-4 w-4 transition-transform"
          :class="open ? '' : '-rotate-90'"
          fill="none"
          stroke="currentColor"
          stroke-width="2.2"
          stroke-linecap="round"
          stroke-linejoin="round"
          aria-hidden="true"
        >
          <path d="M6 9l6 6 6-6" />
        </svg>
      </button>
    </h2>
    <div
      v-show="open"
      id="journal-log"
      ref="scroller"
      class="min-h-0 flex-1 overflow-y-auto overscroll-contain"
      role="log"
      tabindex="0"
      aria-label="Journal de la partie"
      data-test="journal"
      @scroll.passive="onScroll"
    >
      <div class="flex min-h-full flex-col justify-end">
        <button
          v-if="hiddenCount > 0"
          type="button"
          class="mx-auto my-1 text-[11px] text-muted underline hover:text-ink"
          data-test="journal-older"
          @click="loadOlder"
        >
          Afficher les actions précédentes
        </button>
        <section
          v-for="group in groups"
          :key="group.key"
          :aria-label="group.heading?.text"
          data-test="journal-turn"
        >
          <p
            v-if="group.heading"
            class="sticky top-0 bg-panel px-1 pt-1 text-[10px] font-semibold uppercase tracking-wider"
            :style="{ color: colorOf(group.heading.actor) }"
          >
            {{ group.heading.text }}
          </p>
          <ol class="flex flex-col gap-0.5 text-xs">
            <li
              v-for="entry in group.entries"
              :key="entry.id"
              class="border-l-2 pl-1.5 leading-snug"
              :class="entry.id === visible.at(-1)?.id ? 'text-ink' : 'text-muted'"
              :style="{ borderColor: colorOf(entry.actor) }"
              data-test="journal-entry"
            >
              <button
                v-if="entry.details.length > 0"
                type="button"
                class="flex w-full items-start gap-1 text-left hover:text-ink"
                :aria-expanded="unfolded.has(entry.id)"
                data-test="journal-unfold"
                @click="toggle(entry)"
              >
                <svg
                  viewBox="0 0 24 24"
                  class="mt-0.5 h-3 w-3 shrink-0 transition-transform"
                  :class="unfolded.has(entry.id) ? 'rotate-90' : ''"
                  fill="none"
                  stroke="currentColor"
                  stroke-width="2.5"
                  stroke-linecap="round"
                  stroke-linejoin="round"
                  aria-hidden="true"
                >
                  <path d="M9 6l6 6-6 6" />
                </svg>
                <span>{{ entry.text }}</span>
              </button>
              <span v-else>{{ entry.text }}</span>
              <ul
                v-if="unfolded.has(entry.id)"
                class="mt-0.5 flex flex-col gap-0.5 pl-4 text-[11px] text-muted"
                data-test="journal-details"
              >
                <li
                  v-for="(detail, index) in entry.details"
                  :key="index"
                  class="flex items-baseline gap-1.5"
                >
                  <span
                    class="h-1.5 w-1.5 shrink-0 translate-y-[-1px] rounded-full"
                    :style="{ background: colorOf(detail.actor) }"
                  />
                  {{ detail.text }}
                </li>
              </ul>
            </li>
          </ol>
        </section>
      </div>
    </div>
    <button
      v-if="open && !atBottom"
      type="button"
      class="absolute bottom-1 right-2 flex h-11 items-center justify-center gap-1.5 rounded-full border border-neon/60 bg-void/90 text-neon shadow-neon"
      :class="unseen ? 'px-3 text-xs font-semibold' : 'w-11'"
      :aria-label="unseen ? undefined : 'Revenir aux dernières actions'"
      title="Revenir aux dernières actions"
      data-test="journal-to-end"
      @click="scrollToEnd"
    >
      <span v-if="unseen">Nouvelles actions</span>
      <svg
        viewBox="0 0 24 24"
        class="h-5 w-5"
        fill="none"
        stroke="currentColor"
        stroke-width="2.2"
        stroke-linecap="round"
        stroke-linejoin="round"
        aria-hidden="true"
      >
        <path d="M12 5v14M6 13l6 6 6-6" />
      </svg>
    </button>
  </section>
</template>
