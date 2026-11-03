/** A line of the activity feed, with the round of the game it belongs to. */
export type FeedLine = { id: number; text: string; round: number }

/** Rounds kept in the feed before the current one. */
export const FEED_ROUNDS_KEPT = 8

/** Appends the lines of a round and forgets the lines older than the kept rounds. */
export function appendToFeed(feed: readonly FeedLine[], lines: readonly { id: number; text: string }[], round: number): FeedLine[] {
  const oldest = round - FEED_ROUNDS_KEPT
  return [...feed.filter((line) => line.round >= oldest), ...lines.map((line) => ({ ...line, round }))]
}

/** Lines of the feed grouped by round, oldest first. */
export function feedByRound(feed: readonly FeedLine[]): { round: number; lines: FeedLine[] }[] {
  const groups: { round: number; lines: FeedLine[] }[] = []
  for (const line of feed) {
    const last = groups.at(-1)
    if (last?.round === line.round) last.lines.push(line)
    else groups.push({ round: line.round, lines: [line] })
  }
  return groups
}
