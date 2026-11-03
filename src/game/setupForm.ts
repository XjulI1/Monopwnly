import { PLAYER_COLORS } from '../board/boardTheme'
import {
  createGame,
  DEFAULT_SETTINGS,
  MAX_PLAYERS,
  MIN_PLAYERS,
  type AiLevel,
  type CreateGameResult,
  type GameSettings,
  type PlayerSetup,
} from '../engine'

/** Whether a player of the form is played by a person or by the computer. */
export type PlayerKind = 'human' | 'ai'

/** A player row of the creation form. */
export type PlayerDraft = { id: number; name: string; color: string; kind: PlayerKind }

/** Source of randomness of the form, returning a number in [0, 1). */
export type RandomSource = () => number

/** Players and settings a game was created with, kept to replay with the same parameters. */
export type GameConfig = { players: PlayerSetup[]; settings: GameSettings }

/** Longest player name accepted. */
export const MAX_NAME_LENGTH = 20

/** French name of each player color. */
export const PLAYER_COLOR_NAMES: Record<(typeof PLAYER_COLORS)[number], string> = {
  '#ff8a1c': 'Orange',
  '#39ff6a': 'Vert',
  '#2f5bff': 'Bleu',
  '#ff38f0': 'Rose',
  '#f2f4f8': 'Blanc',
  '#9a9aff': 'Lavande',
}

/** Invented hacker pseudonyms given to the AI players. */
export const AI_NAMES: readonly string[] = [
  'Nullbyte',
  'Kernel Panic',
  'Bitflip',
  'Sudo Sam',
  'Glitchette',
  'Rootine',
  'Packet Loss',
  'Hexagone',
  'Crypt0nite',
  'Overflow',
  'Démon Nocturne',
  'Script Kiddo',
  'Backslash',
  'Cipher Nyx',
  'Pare-feu',
  'Mme Malware',
  'Ping Fantôme',
  'Octet Noir',
  'Zéro Jour',
  'Captcha',
]

/** French name of each AI level. */
export const AI_LEVEL_NAMES: Record<AiLevel, string> = { easy: 'Facile', normal: 'Normal', hard: 'Difficile' }

/** AI level selected when the form opens. */
export const DEFAULT_AI_LEVEL: AiLevel = 'normal'

const DEFAULT_PLAYER_COUNT = 3

export { MAX_PLAYERS, MIN_PLAYERS }

function normalized(name: string): string {
  return name.trim().toLocaleLowerCase('fr')
}

function humanName(drafts: readonly PlayerDraft[], position: number): string {
  const taken = new Set(drafts.map((draft) => normalized(draft.name)))
  if (!taken.has(`joueur ${position}`)) return `Joueur ${position}`
  let n = 1
  while (taken.has(`joueur ${n}`)) n++
  return `Joueur ${n}`
}

function pseudonym(drafts: readonly PlayerDraft[], random: RandomSource): string {
  const taken = new Set(drafts.map((draft) => normalized(draft.name)))
  const free = AI_NAMES.filter((name) => !taken.has(normalized(name)))
  return free[Math.floor(random() * free.length)] ?? humanName(drafts, drafts.length + 1)
}

function freeColor(drafts: readonly PlayerDraft[]): string {
  return PLAYER_COLORS.find((color) => !drafts.some((draft) => draft.color === color)) ?? PLAYER_COLORS[0]
}

function nextId(drafts: readonly PlayerDraft[]): number {
  return Math.max(0, ...drafts.map((draft) => draft.id)) + 1
}

/** Adds an AI player with a free pseudonym and a free color, up to the maximum. */
export function addDraft(drafts: readonly PlayerDraft[], random: RandomSource = Math.random): PlayerDraft[] {
  if (drafts.length >= MAX_PLAYERS) return [...drafts]
  return [...drafts, { id: nextId(drafts), name: pseudonym(drafts, random), color: freeColor(drafts), kind: 'ai' }]
}

/** The players offered when the form opens: a human first, then AIs. */
export function defaultDrafts(random: RandomSource = Math.random): PlayerDraft[] {
  let drafts: PlayerDraft[] = [{ id: 1, name: 'Joueur 1', color: freeColor([]), kind: 'human' }]
  while (drafts.length < DEFAULT_PLAYER_COUNT) drafts = addDraft(drafts, random)
  return drafts
}

/** Makes a player human, with a numbered name, or AI, with a free pseudonym. */
export function setKind(drafts: readonly PlayerDraft[], id: number, kind: PlayerKind, random: RandomSource = Math.random): PlayerDraft[] {
  const position = drafts.findIndex((draft) => draft.id === id)
  const draft = drafts[position]
  if (!draft || draft.kind === kind) return [...drafts]
  const others = drafts.filter((other) => other.id !== id)
  const name = kind === 'human' ? humanName(others, position + 1) : pseudonym(others, random)
  return drafts.map((other) => (other.id === id ? { ...other, kind, name } : other))
}

/** Removes a player, down to the minimum. */
export function removeDraft(drafts: readonly PlayerDraft[], id: number): PlayerDraft[] {
  if (drafts.length <= MIN_PLAYERS) return [...drafts]
  return drafts.filter((draft) => draft.id !== id)
}

/** Gives a color to a player; the player who had it takes the previous color of the first one. */
export function chooseColor(drafts: readonly PlayerDraft[], id: number, color: string): PlayerDraft[] {
  const chooser = drafts.find((draft) => draft.id === id)
  if (!chooser) return [...drafts]
  return drafts.map((draft) => {
    if (draft.id === id) return { ...draft, color }
    if (draft.color === color) return { ...draft, color: chooser.color }
    return draft
  })
}

/** Renames a player. */
export function renameDraft(drafts: readonly PlayerDraft[], id: number, name: string): PlayerDraft[] {
  return drafts.map((draft) => (draft.id === id ? { ...draft, name } : draft))
}

/** Error of each player name, by draft identifier; null when the name is valid. */
export function nameErrors(drafts: readonly PlayerDraft[]): Record<number, string | null> {
  const counts = new Map<string, number>()
  for (const draft of drafts) counts.set(normalized(draft.name), (counts.get(normalized(draft.name)) ?? 0) + 1)
  return Object.fromEntries(
    drafts.map((draft) => {
      const name = draft.name.trim()
      if (name === '') return [draft.id, 'Nom obligatoire']
      if (name.length > MAX_NAME_LENGTH) return [draft.id, `${MAX_NAME_LENGTH} caractères au plus`]
      if ((counts.get(normalized(name)) ?? 0) > 1) return [draft.id, 'Nom déjà utilisé']
      return [draft.id, null]
    }),
  )
}

/** Turns the form into the configuration given to the engine; every AI plays at the common level. */
export function toConfig(drafts: readonly PlayerDraft[], auctions: boolean, aiLevel: AiLevel = DEFAULT_AI_LEVEL): GameConfig {
  return {
    players: drafts.map((draft, i) => ({
      id: `p${i + 1}`,
      name: draft.name.trim(),
      color: draft.color,
      controller: draft.kind === 'ai' ? { kind: 'ai', level: aiLevel } : { kind: 'human' },
    })),
    settings: { ...DEFAULT_SETTINGS, auctions },
  }
}

function randomSeed(): number {
  return crypto.getRandomValues(new Uint32Array(1))[0] ?? Date.now()
}

/** Creates a game from a configuration with a fresh random seed. */
export function startGame(config: GameConfig): CreateGameResult {
  return createGame({ players: config.players, settings: config.settings, seed: randomSeed() })
}
