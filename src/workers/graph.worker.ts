// グラフ全体を使う重い計算を、本体スレッドの外で実行するっす
import Graph from 'graphology'
import louvain from 'graphology-communities-louvain'
import betweenness from 'graphology-metrics/centrality/betweenness'
import hits from 'graphology-metrics/centrality/hits'
import pageRank from 'graphology-metrics/centrality/pagerank'
import { expose } from 'comlink'
import { filenameGroups, labelPropagation } from 'src/workers/algorithms'

// Graph#export() の結果は構造化複製できる素のオブジェクトなので、そのまま渡すっす
type SerializedGraph = ReturnType<Graph['export']>

const api = {
  pageRank: (graph: SerializedGraph) => pageRank(Graph.from(graph)),
  betweenness: (graph: SerializedGraph) => betweenness(Graph.from(graph)),
  hits: (graph: SerializedGraph, options: { maxIterations: number }) =>
    hits(Graph.from(graph), options),
  louvain: (graph: SerializedGraph, options: { resolution: number }) =>
    louvain(Graph.from(graph), options),
  labelPropagation: (graph: SerializedGraph, iterations: number) =>
    labelPropagation(Graph.from(graph), iterations),
  filenameGroups: (
    graph: SerializedGraph,
    threshold: number,
    markdownOnly: boolean
  ) => filenameGroups(Graph.from(graph), threshold, markdownOnly),
}

export type GraphWorkerApi = typeof api

expose(api)
