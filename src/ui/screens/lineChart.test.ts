import { describe, expect, it } from 'vitest'
import { chartLayout, type ChartSeries } from './lineChart'

const NBSP = ' '
const THIN_NBSP = ' '

function series(id: string, values: [number, number][]): ChartSeries {
  return { id, name: `Joueur ${id}`, color: id, points: values.map(([turn, value]) => ({ turn, value })) }
}

const SIZE = { width: 400, height: 200, left: 50, right: 10, top: 10, bottom: 20 }

describe('chartLayout', () => {
  it('starts the value axis at zero and ends it at the first round tick above the highest value', () => {
    const layout = chartLayout([series('a', [[1, 1500], [2, 2340]])], SIZE)
    expect(layout.yTicks.map((tick) => tick.value)).toEqual([0, 500, 1000, 1500, 2000, 2500])
    expect(layout.yTicks.at(-1)?.label).toBe(`2${THIN_NBSP}500${NBSP}Ᵽ`)
  })

  it('rounds the ticks to multiples of 100, 500 or 1 000 Ᵽ depending on the scale', () => {
    const step = (max: number) => {
      const ticks = chartLayout([series('a', [[1, max]])], SIZE).yTicks
      return (ticks[1]?.value ?? 0) - (ticks[0]?.value ?? 0)
    }
    expect(step(380)).toBe(100)
    expect(step(2340)).toBe(500)
    expect(step(4600)).toBe(1000)
    expect(step(23_000)).toBe(5000)
    expect(chartLayout([series('a', [[1, 0]])], SIZE).yTicks.map((tick) => tick.value)).toEqual([0, 100])
  })

  it('spreads the rounds over the width and the values over the height', () => {
    const layout = chartLayout([series('a', [[1, 0], [3, 1000], [5, 2000]])], SIZE)
    expect(layout.lines[0]?.points).toEqual([
      [50, 180],
      [220, 95],
      [390, 10],
    ])
    expect(layout.lines[0]?.path).toBe('M50 180 L220 95 L390 10')
    expect(layout.yTicks.find((tick) => tick.value === 1000)?.y).toBe(95)
  })

  it('labels a few round numbers of rounds, the first one included', () => {
    const turns = Array.from({ length: 40 }, (_, i): [number, number] => [i + 1, 1500])
    expect(chartLayout([series('a', turns)], SIZE).xTicks.map((tick) => tick.turn)).toEqual([1, 10, 20, 30, 40])
    expect(chartLayout([series('a', [[1, 1], [2, 1], [3, 1]])], SIZE).xTicks.map((tick) => tick.turn)).toEqual([1, 2, 3])
  })

  it('stops the line of a bankrupt player at the bankruptcy', () => {
    const layout = chartLayout(
      [
        series('a', [[1, 1500], [2, 1600], [3, 1700]]),
        series('b', [[1, 1500], [2, 300]]),
      ],
      SIZE,
    )
    expect(layout.lines[1]?.points).toHaveLength(2)
    expect(layout.lines[1]?.end).toEqual(layout.lines[1]?.points.at(-1))
    expect(layout.lines[1]?.points.at(-1)?.[0]).toBe(220)
  })

  it('keeps the order of the series in the legend', () => {
    const layout = chartLayout([series('c', [[1, 1]]), series('a', [[1, 1]]), series('b', [[1, 1]])], SIZE)
    expect(layout.legend).toEqual([
      { id: 'c', name: 'Joueur c', color: 'c' },
      { id: 'a', name: 'Joueur a', color: 'a' },
      { id: 'b', name: 'Joueur b', color: 'b' },
    ])
  })

  it('puts a single round at the start of the axis', () => {
    expect(chartLayout([series('a', [[1, 1500]])], SIZE).lines[0]?.points).toEqual([[50, 10]])
  })
})
