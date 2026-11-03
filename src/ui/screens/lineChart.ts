import { formatPwn } from '../../game/format'

/** The value of a series at one round. */
export type ChartPoint = { turn: number; value: number }

/** One line of the chart: a player and their value round after round. */
export type ChartSeries = { id: string; name: string; color: string; points: ChartPoint[] }

/** Size of the drawing and margins around the plot, in units of the SVG view box. */
export type ChartSize = { width: number; height: number; left: number; right: number; top: number; bottom: number }

/** A line placed on the drawing, with its last point to mark where it ends. */
export type ChartLine = { id: string; name: string; color: string; points: [number, number][]; path: string; end: [number, number] | null }

/** Everything the chart draws: axes, ticks, lines and legend. */
export type ChartLayout = {
  size: ChartSize
  yTicks: { value: number; label: string; y: number }[]
  xTicks: { turn: number; x: number }[]
  lines: ChartLine[]
  legend: { id: string; name: string; color: string }[]
}

/** Size of the charts of the statistics tab. */
export const CHART_SIZE: ChartSize = { width: 480, height: 220, left: 64, right: 12, top: 12, bottom: 24 }

const VALUE_STEPS = [100, 200, 500, 1000, 2000, 5000, 10_000, 20_000, 50_000, 100_000]
const MAX_VALUE_INTERVALS = 5
const TURN_STEPS = [1, 2, 5, 10, 20, 50, 100]
const MAX_TURN_TICKS = 8

function rounded(value: number): number {
  return Math.round(value * 10) / 10
}

function valueStep(max: number): number {
  return VALUE_STEPS.find((step) => Math.ceil(max / step) <= MAX_VALUE_INTERVALS) ?? (VALUE_STEPS.at(-1) as number)
}

function turnTicks(first: number, last: number): number[] {
  const ticksOf = (step: number) =>
    Array.from({ length: last - first + 1 }, (_, i) => first + i).filter((turn) => turn === first || turn % step === 0)
  const fitting = TURN_STEPS.map(ticksOf).find((ticks) => ticks.length <= MAX_TURN_TICKS)
  return fitting ?? ticksOf(TURN_STEPS.at(-1) as number)
}

/** Places the series on a chart starting at zero, with round ticks of PwnCoins and of rounds. */
export function chartLayout(series: readonly ChartSeries[], size: ChartSize = CHART_SIZE): ChartLayout {
  const points = series.flatMap((line) => line.points)
  const turns = points.map((point) => point.turn)
  const first = turns.length > 0 ? Math.min(...turns) : 1
  const last = turns.length > 0 ? Math.max(...turns) : 1
  const step = valueStep(Math.max(0, ...points.map((point) => point.value)))
  const top = Math.max(step, Math.ceil(Math.max(0, ...points.map((point) => point.value)) / step) * step)
  const plotWidth = size.width - size.left - size.right
  const plotHeight = size.height - size.top - size.bottom
  const x = (turn: number) => rounded(size.left + ((turn - first) / Math.max(1, last - first)) * plotWidth)
  const y = (value: number) => rounded(size.top + plotHeight * (1 - value / top))

  return {
    size,
    yTicks: Array.from({ length: top / step + 1 }, (_, i) => ({ value: i * step, label: formatPwn(i * step), y: y(i * step) })),
    xTicks: turnTicks(first, last).map((turn) => ({ turn, x: x(turn) })),
    lines: series.map((line) => {
      const placed = line.points.map((point): [number, number] => [x(point.turn), y(point.value)])
      return {
        id: line.id,
        name: line.name,
        color: line.color,
        points: placed,
        path: placed.map(([px, py], i) => `${i === 0 ? 'M' : 'L'}${px} ${py}`).join(' '),
        end: placed.at(-1) ?? null,
      }
    }),
    legend: series.map(({ id, name, color }) => ({ id, name, color })),
  }
}
