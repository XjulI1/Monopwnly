<script setup lang="ts">
import { computed } from 'vue'
import { chartLayout, type ChartSeries } from './lineChart'

const props = defineProps<{ title: string; series: ChartSeries[] }>()

const layout = computed(() => chartLayout(props.series))
const size = computed(() => layout.value.size)
</script>

<template>
  <figure
    class="flex min-w-0 flex-col gap-2"
    data-test="line-chart"
  >
    <figcaption class="text-xs font-semibold uppercase tracking-wider text-muted">
      {{ title }}
    </figcaption>
    <svg
      :viewBox="`0 0 ${size.width} ${size.height}`"
      class="h-auto w-full"
      role="img"
      :aria-label="title"
    >
      <g
        class="fill-muted"
        font-size="10"
      >
        <template
          v-for="tick in layout.yTicks"
          :key="tick.value"
        >
          <line
            :x1="size.left"
            :x2="size.width - size.right"
            :y1="tick.y"
            :y2="tick.y"
            stroke="var(--color-line)"
            stroke-width="1"
          />
          <text
            :x="size.left - 6"
            :y="tick.y + 3"
            text-anchor="end"
          >{{ tick.label }}</text>
        </template>
        <text
          v-for="tick in layout.xTicks"
          :key="tick.turn"
          :x="tick.x"
          :y="size.height - 6"
          text-anchor="middle"
        >{{ tick.turn }}</text>
      </g>
      <g fill="none">
        <path
          v-for="line in layout.lines"
          :key="line.id"
          :d="line.path"
          :stroke="line.color"
          stroke-width="2"
          stroke-linejoin="round"
          stroke-linecap="round"
          data-test="chart-line"
        />
      </g>
      <template
        v-for="line in layout.lines"
        :key="`end-${line.id}`"
      >
        <circle
          v-if="line.end"
          :cx="line.end[0]"
          :cy="line.end[1]"
          r="3"
          :fill="line.color"
        />
      </template>
    </svg>
    <ul
      class="flex flex-wrap gap-x-4 gap-y-1 text-xs"
      aria-label="Légende"
      data-test="chart-legend"
    >
      <li
        v-for="item in layout.legend"
        :key="item.id"
        class="flex items-center gap-1.5"
      >
        <span
          class="h-0.5 w-4 rounded-full"
          :style="{ background: item.color }"
        />
        {{ item.name }}
      </li>
    </ul>
  </figure>
</template>
