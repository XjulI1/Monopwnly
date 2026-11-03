import { computed, inject, ref, shallowRef, type ComputedRef, type InjectionKey, type Ref, type ShallowRef } from 'vue'
import { isManagement, playerView } from '../ai'
import { MANAGEMENT_LIMIT } from '../ai/constants'
import {
  applyAction,
  expectedActor,
  QUARANTINE_INDEX,
  type Action,
  type GameState,
  type PaymentReason,
  type PlayerController,
  type PlayerId,
} from '../engine'
import type { AiDecider } from './aiDecider'
import {
  durationsFor,
  loadAnimationSpeed,
  saveAnimationSpeed,
  type AnimationDurations,
  type AnimationSpeed,
} from './animationSpeed'
import { IDLE, reduceInteraction, viewOf, type Interaction, type InteractionInput, type InteractionView } from './interaction'
import { applyStep, presentationSteps, type PresentationStep } from './presentation'

/** What the session needs from the 3D board. */
export type BoardHandle = {
  animateMove: (playerId: PlayerId, squares: readonly number[], msPerSquare: number) => Promise<void>
}

/** A short-lived change of cash shown next to a player. */
export type CashBadge = { id: number; playerId: PlayerId; amount: number }


/** A line of the activity feed. */
export type FeedLine = { id: number; text: string }

/** A notification of the HUD. */
export type Toast = { id: number; message: string }

/** Dice shown above the board. */
export type DiceShown = { id: number; dice: [number, number]; rollMs: number }

/** One game in progress: engine truth, displayed state catching up through the animations, and the user inputs. */
export type GameSession = {
  engineState: ShallowRef<GameState>
  displayedState: ShallowRef<GameState>
  isPresenting: Ref<boolean>
  currentStep: ShallowRef<PresentationStep | null>
  dice: ShallowRef<DiceShown | null>
  badges: ShallowRef<CashBadge[]>
  feed: ShallowRef<FeedLine[]>
  toast: ShallowRef<Toast | null>
  speed: Ref<AnimationSpeed>
  interaction: ShallowRef<Interaction>
  view: ComputedRef<InteractionView>
  dispatch: (action: Action) => boolean
  send: (input: InteractionInput) => void
  skip: () => void
  dismissCard: () => void
  dismissToast: () => void
  setSpeed: (speed: AnimationSpeed) => void
  attachBoard: (board: BoardHandle | null) => void
  dispose: () => void
}

export type GameSessionOptions = {
  speed?: AnimationSpeed
  board?: BoardHandle | null
  ai?: AiDecider | null
}

/** Key under which the game screen provides its session. */
export const GAME_SESSION: InjectionKey<GameSession> = Symbol('gameSession')

const FEED_SIZE = 40
const QUARANTINE_HOP_FACTOR = 3
const SALARY_PAUSE_FACTOR = 0.5
const BADGE_MIN_MS = 1200
const PRESENTING_REASON = 'Animation en cours.'

const EMPHASIZED_PAYMENTS: ReadonlySet<PaymentReason> = new Set(['rent', 'tax', 'card', 'quarantineFine', 'bankruptcy'])

function divergences(projected: GameState, actual: GameState): string[] {
  const found: string[] = []
  for (const player of actual.players) {
    const shown = projected.players.find((p) => p.id === player.id)
    if (shown?.cash !== player.cash) found.push(`cash of ${player.id}`)
    if (shown?.position !== player.position) found.push(`position of ${player.id}`)
  }
  if (JSON.stringify(projected.ownership) !== JSON.stringify(actual.ownership)) found.push('ownership')
  return found
}

/** Creates the session of a game: dispatch goes to the engine at once, the display follows the presentation of its events. */
export function useGameSession(initial: GameState, options: GameSessionOptions = {}): GameSession {
  const engineState = shallowRef(initial)
  const displayedState = shallowRef(initial)
  const isPresenting = ref(false)
  const currentStep = shallowRef<PresentationStep | null>(null)
  const dice = shallowRef<DiceShown | null>(null)
  const badges = shallowRef<CashBadge[]>([])
  const feed = shallowRef<FeedLine[]>([])
  const toast = shallowRef<Toast | null>(null)
  const speed = ref<AnimationSpeed>(options.speed ?? loadAnimationSpeed())
  const interaction = shallowRef<Interaction>(IDLE)

  let board = options.board ?? null
  let nextId = 1
  let pendingWaits: (() => void)[] = []
  let cardWait: (() => void) | null = null
  let fastForward = false
  let disposed = false
  let aiRun = 0
  let managementInARow = 0
  let aiPause: ReturnType<typeof setTimeout> | null = null
  const badgeTimers = new Set<ReturnType<typeof setTimeout>>()

  function controllerOf(playerId: PlayerId): PlayerController | undefined {
    return engineState.value.players.find((p) => p.id === playerId)?.controller
  }

  const view = computed<InteractionView>(() => {
    const current = viewOf(displayedState.value, interaction.value)
    if (!isPresenting.value) return current
    const freeze = (b: InteractionView['buttons'][number]) => ({ ...b, enabled: false, reason: PRESENTING_REASON })
    return {
      ...current,
      buttons: current.buttons.map(freeze),
      sheet: current.sheet ? { ...current.sheet, buttons: current.sheet.buttons.map(freeze) } : null,
    }
  })

  function wait(ms: number): Promise<void> {
    if (ms <= 0) return Promise.resolve()
    return new Promise((resolve) => {
      const done = () => {
        clearTimeout(timer)
        pendingWaits = pendingWaits.filter((w) => w !== done)
        resolve()
      }
      const timer = setTimeout(done, ms)
      pendingWaits.push(done)
    })
  }

  function addLines(lines: readonly string[]) {
    if (lines.length === 0) return
    const added = lines.map((text) => ({ id: nextId++, text }))
    feed.value = [...feed.value, ...added].slice(-FEED_SIZE)
  }

  function showBadge(playerId: PlayerId | 'bank', amount: number, durations: AnimationDurations) {
    if (playerId === 'bank' || durations.payment <= 0) return
    const badge = { id: nextId++, playerId, amount }
    badges.value = [...badges.value, badge]
    const timer = setTimeout(() => {
      badgeTimers.delete(timer)
      badges.value = badges.value.filter((b) => b.id !== badge.id)
    }, Math.max(BADGE_MIN_MS, durations.payment * 2))
    badgeTimers.add(timer)
  }

  async function play(step: PresentationStep, durations: AnimationDurations): Promise<void> {
    switch (step.kind) {
      case 'dice':
        dice.value = { id: nextId++, dice: step.dice, rollMs: durations.diceRoll }
        return wait(durations.diceRoll)
      case 'move':
        return board?.animateMove(step.playerId, step.squares, durations.perSquare)
      case 'quarantine':
        return board?.animateMove(step.playerId, [step.from, QUARANTINE_INDEX], durations.perSquare * QUARANTINE_HOP_FACTOR)
      case 'salary':
        showBadge(step.playerId, step.amount, durations)
        return wait(durations.payment * SALARY_PAUSE_FACTOR)
      case 'payment':
        showBadge(step.from, -step.amount, durations)
        showBadge(step.to, step.amount, durations)
        return wait(EMPHASIZED_PAYMENTS.has(step.reason) ? durations.payment : 0)
      case 'card':
        return new Promise((resolve) => {
          const done = () => {
            cardWait = null
            resolve()
          }
          cardWait = done
          if (controllerOf(step.playerId)?.kind === 'ai') void wait(durations.aiCard).then(() => cardWait === done && done())
        })
      case 'bankrupt':
        return wait(durations.bankruptcy)
      default:
        return
    }
  }

  function finish() {
    displayedState.value = engineState.value
    currentStep.value = null
    dice.value = null
    isPresenting.value = false
    void playAi()
  }

  async function present(steps: PresentationStep[]): Promise<void> {
    const durations = durationsFor(speed.value)
    fastForward = speed.value === 'instant'
    isPresenting.value = true
    let projected = displayedState.value
    for (const step of steps) {
      currentStep.value = step
      const isCard = step.kind === 'card'
      const awaitsHuman = isCard && controllerOf(step.playerId)?.kind !== 'ai'
      if (isCard) addLines(step.lines)
      if (awaitsHuman || !fastForward) await play(step, durations)
      if (disposed) return
      if (!isCard) addLines(step.lines)
      projected = applyStep(projected, step)
      displayedState.value = projected
    }
    if (import.meta.env.DEV) {
      const found = divergences(projected, engineState.value)
      if (found.length > 0) console.warn(`Presentation diverged from the engine: ${found.join(', ')}`)
    }
    finish()
  }

  function dispatch(action: Action): boolean {
    if (isPresenting.value) return false
    const before = engineState.value
    const result = applyAction(before, action)
    if (!result.ok) {
      toast.value = { id: nextId++, message: result.error.message }
      return false
    }
    engineState.value = result.state
    managementInARow = isManagement(action) ? managementInARow + 1 : 0
    void present(presentationSteps(before, result.events))
    return true
  }

  function pauseBeforeAi(ms: number): Promise<void> {
    return new Promise((resolve) => {
      if (ms <= 0) return resolve()
      aiPause = setTimeout(() => {
        aiPause = null
        resolve()
      }, ms)
    })
  }

  async function playAi(): Promise<void> {
    const decider = options.ai
    if (!decider || disposed || isPresenting.value) return
    const state = engineState.value
    const actor = expectedActor(state)
    const controller = actor ? controllerOf(actor) : undefined
    if (!actor || controller?.kind !== 'ai') return
    const run = ++aiRun
    const request = { view: playerView(state), playerId: actor, level: controller.level, managementLeft: MANAGEMENT_LIMIT - managementInARow }
    let action: Action
    try {
      ;[action] = await Promise.all([decider.decide(request), pauseBeforeAi(durationsFor(speed.value).aiPause)])
    } catch {
      return
    }
    if (disposed || run !== aiRun || engineState.value !== state || isPresenting.value) return
    dispatch(action)
  }

  function send(input: InteractionInput) {
    if (isPresenting.value) return
    const result = reduceInteraction(engineState.value, interaction.value, input)
    interaction.value = result.interaction
    if (result.action) dispatch(result.action)
  }

  function skip() {
    if (!isPresenting.value) return
    fastForward = true
    dice.value = null
    const step = currentStep.value
    if (step && (step.kind === 'move' || step.kind === 'quarantine')) void board?.animateMove(step.playerId, [], 0)
    for (const done of [...pendingWaits]) done()
    cardWait?.()
  }

  void playAi()

  return {
    engineState,
    displayedState,
    isPresenting,
    currentStep,
    dice,
    badges,
    feed,
    toast,
    speed,
    interaction,
    view,
    dispatch,
    send,
    skip,
    dismissCard: () => cardWait?.(),
    dismissToast: () => {
      toast.value = null
    },
    setSpeed: (next) => {
      speed.value = next
      saveAnimationSpeed(next)
    },
    attachBoard: (handle) => {
      board = handle
    },
    dispose: () => {
      disposed = true
      aiRun++
      if (aiPause) clearTimeout(aiPause)
      aiPause = null
      for (const timer of badgeTimers) clearTimeout(timer)
      badgeTimers.clear()
      for (const done of [...pendingWaits]) done()
      cardWait?.()
    },
  }
}

/** The session provided by the game screen. */
export function useInjectedGameSession(): GameSession {
  const session = inject(GAME_SESSION)
  if (!session) throw new Error('No game session provided')
  return session
}
