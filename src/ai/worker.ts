import { chooseAction } from './index'
import type { WorkerRequest, WorkerResponse } from './workerProtocol'

type WorkerScope = {
  onmessage: ((event: MessageEvent<WorkerRequest>) => void) | null
  postMessage: (message: WorkerResponse) => void
}

const scope = globalThis as unknown as WorkerScope

scope.onmessage = (event) => {
  const { id, view, playerId, level, managementLeft } = event.data
  try {
    scope.postMessage({ id, action: chooseAction(view, playerId, level, managementLeft) })
  } catch (error) {
    scope.postMessage({ id, error: error instanceof Error ? error.message : String(error) })
  }
}
