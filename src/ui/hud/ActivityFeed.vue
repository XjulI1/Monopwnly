<script setup lang="ts">
import { computed, nextTick, onMounted, ref, useTemplateRef, watch } from 'vue'
import { feedByRound } from '../../game/feed'
import { useInjectedGameSession } from '../../game/useGameSession'

const STICKY_DISTANCE_PX = 12

const { feed } = useInjectedGameSession()
const scroller = useTemplateRef<HTMLElement>('scroller')
const atBottom = ref(true)

const groups = computed(() => feedByRound(feed.value))
const lastId = computed(() => feed.value.at(-1)?.id ?? null)

function onScroll() {
  const element = scroller.value
  if (!element) return
  atBottom.value = element.scrollHeight - element.scrollTop - element.clientHeight <= STICKY_DISTANCE_PX
}

function scrollToEnd() {
  const element = scroller.value
  if (element) element.scrollTop = element.scrollHeight
  atBottom.value = true
}

watch(lastId, async () => {
  if (!atBottom.value) return
  await nextTick()
  scrollToEnd()
})

onMounted(scrollToEnd)
</script>

<template>
  <div
    class="relative"
    data-keep-presenting
  >
    <div
      ref="scroller"
      class="h-24 overflow-y-auto overscroll-contain"
      role="log"
      tabindex="0"
      aria-label="Journal des actions"
      data-test="activity-feed"
      @scroll.passive="onScroll"
    >
      <div class="flex min-h-full flex-col justify-end">
        <section
          v-for="group in groups"
          :key="group.round"
          :aria-label="`Tour ${group.round}`"
          data-test="feed-round"
        >
          <p class="sticky top-0 bg-panel px-1 pt-1 text-[10px] font-semibold uppercase tracking-wider text-muted/70">
            Tour {{ group.round }}
          </p>
          <ol class="flex flex-col gap-0.5 text-xs">
            <li
              v-for="line in group.lines"
              :key="line.id"
              class="px-1 leading-snug"
              :class="line.id === lastId ? 'text-ink' : 'text-muted'"
            >
              {{ line.text }}
            </li>
          </ol>
        </section>
      </div>
    </div>
    <button
      v-if="!atBottom"
      type="button"
      class="absolute bottom-1 right-2 flex h-11 w-11 items-center justify-center rounded-full border border-neon/60 bg-void/90 text-neon shadow-neon"
      aria-label="Revenir aux dernières actions"
      title="Revenir aux dernières actions"
      data-test="feed-to-end"
      @click="scrollToEnd"
    >
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
  </div>
</template>
