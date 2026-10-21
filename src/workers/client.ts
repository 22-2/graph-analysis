import { wrap, type Remote } from 'comlink'
import workerSource from 'inline-graph-worker'
import type { GraphWorkerApi } from 'src/workers/graph.worker'

let worker: Worker | undefined
let workerUrl: string | undefined
let api: Remote<GraphWorkerApi> | undefined

/** グラフ計算用のワーカーを、初回利用時に作って使い回すっす */
export function graphWorker(): Remote<GraphWorkerApi> {
  if (!api) {
    workerUrl = URL.createObjectURL(
      new Blob([workerSource], { type: 'text/javascript' })
    )
    worker = new Worker(workerUrl)
    api = wrap<GraphWorkerApi>(worker)
  }
  return api
}

export function terminateGraphWorker() {
  worker?.terminate()
  if (workerUrl) URL.revokeObjectURL(workerUrl)
  worker = undefined
  workerUrl = undefined
  api = undefined
}
