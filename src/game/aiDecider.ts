import type { Action } from '../engine'
import { chooseAction } from '../ai'
import type { DecisionRequest, WorkerRequest, WorkerResponse } from '../ai/workerProtocol'

/** Takes the decisions of the AI players for a game session. */
export type AiDecider = {
  decide: (request: DecisionRequest) => Promise<Action>
  dispose: () => void
}

/** Decides on the main thread; used where no worker is available. */
export function localDecider(): AiDecider {
  return {
    decide: (request) => Promise.resolve(chooseAction(request.view, request.playerId, request.level, request.managementLeft)),
    dispose: () => undefined,
  }
}

/** Decides in a Web Worker so that the animations never freeze. */
export function workerDecider(): AiDecider {
  const worker = new Worker(new URL('../ai/worker.ts', import.meta.url), { type: 'module' })
  const pending = new Map<number, { resolve: (action: Action) => void; reject: (error: Error) => void }>()
  let nextId = 1
  worker.onmessage = (event: MessageEvent<WorkerResponse>) => {
    const response = event.data
    const waiting = pending.get(response.id)
    if (!waiting) return
    pending.delete(response.id)
    if ('action' in response) waiting.resolve(response.action)
    else waiting.reject(new Error(response.error))
  }
  return {
    decide: (request) =>
      new Promise((resolve, reject) => {
        const id = nextId++
        pending.set(id, { resolve, reject })
        const message: WorkerRequest = { ...request, id }
        worker.postMessage(message)
      }),
    dispose: () => {
      worker.terminate()
      for (const waiting of pending.values()) waiting.reject(new Error('AI worker stopped'))
      pending.clear()
    },
  }
}
