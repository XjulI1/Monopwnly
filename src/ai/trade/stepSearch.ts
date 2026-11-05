/** The smallest number of steps, from 0 to `most`, that `accepts`, provided that `accepts` never turns false as the steps grow; null when even `most` steps are refused. */
export function smallestAcceptedStep(accepts: (steps: number) => boolean, most: number): number | null {
  let high = Math.max(0, most)
  if (!accepts(high)) return null
  let low = 0
  while (low < high) {
    const middle = Math.floor((low + high) / 2)
    if (accepts(middle)) high = middle
    else low = middle + 1
  }
  return low
}
