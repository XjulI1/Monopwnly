import type { Action, AiLevel, PlayerId } from '../engine'
import type { PlayerView } from './playerView'

/** What an AI needs to take a decision. */
export type DecisionRequest = { view: PlayerView; playerId: PlayerId; level: AiLevel; managementLeft: number }

/** Message sent to the AI worker. */
export type WorkerRequest = DecisionRequest & { id: number }

/** Message sent back by the AI worker. */
export type WorkerResponse = { id: number; action: Action } | { id: number; error: string }
