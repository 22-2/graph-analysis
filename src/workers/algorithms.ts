// Obsidian の API に依存しない純粋な計算だけを置く（ワーカーから読み込むため）っす
import type Graph from 'graphology'
import { full_process, ratio } from 'fuzzball'
import { gatherCommunities, groupBySimilarity } from 'src/GeneralGraphFn'
import type { Communities, SimilarityEdge } from 'src/Interfaces'

export function getCounts(arr: any[]) {
  const counts: { [item: string]: number } = {}
  for (const num of arr) {
    counts[num] = counts[num] ? counts[num] + 1 : 1
  }
  return counts
}

export function getMaxKey(obj: Record<string, number>) {
  // Using random resolving of equality
  return Object.keys(obj).reduce((a, b) =>
    obj[a] === obj[b] ? (Math.random() < 0.5 ? a : b) : obj[a] > obj[b] ? a : b
  )
}

export function labelPropagation(graph: Graph, iterations: number): Communities {
  let labeledNodes: { [node: string]: string } = {}
  graph.forEachNode((node) => {
    labeledNodes[node] = node
  })

  for (let i = 0; i < iterations; i++) {
    const newLabeledNodes: { [node: string]: string } = {}
    graph.forEachNode((node) => {
      const neighbours = graph.neighbors(node)
      if (neighbours.length) {
        const neighbourLabels = neighbours.map(
          (neighbour) => labeledNodes[neighbour]
        )
        newLabeledNodes[node] = getMaxKey(getCounts(neighbourLabels))
      } else {
        // 隣人がいない場合は自分のラベルを維持するっす
        newLabeledNodes[node] = labeledNodes[node]
      }
    })
    labeledNodes = newLabeledNodes
  }

  return gatherCommunities(labeledNodes)
}

/** Filename Groups は、ノートの名前だけで決まる類似度の辺を閾値に依らず一度だけ計算して使い回すっす */
let filenameSimilarityCache: { key: string; edges: SimilarityEdge[] } | undefined

/** これ未満の類似度の辺は、どの閾値でも使われないため保持しない */
const FILENAME_EDGE_MIN_SCORE = 0.5

function getFilenameSimilarityEdges(nodes: string[]): SimilarityEdge[] {
  const key = [...nodes].sort().join('\n')
  if (filenameSimilarityCache?.key !== key) {
    filenameSimilarityCache = { key, edges: computeFilenameSimilarityEdges(nodes) }
  }
  return filenameSimilarityCache.edges
}

function computeFilenameSimilarityEdges(nodes: string[]): SimilarityEdge[] {
  const names = nodes.map(normalizeNoteName)
  // ratio は前処理後の文字列の長さで点数が決まるため、同じ前処理をかけた長さで候補を絞る
  const lengths = names.map(
    (name) =>
      Array.from(
        full_process(name.normalize(), { astral: true, collapseWhitespace: true })
      ).length
  )
  // 長さの昇順に並べると、後ろへ進むほど閾値に届かない組になるので打ち切れる
  const order = nodes.map((_, i) => i).sort((x, y) => lengths[x] - lengths[y])
  const edges: SimilarityEdge[] = []

  for (let p = 0; p < order.length; p++) {
    const i = order[p]
    for (let q = p + 1; q < order.length; q++) {
      const j = order[q]
      // 点数の上限は 2 * 短い方 / 長さの和 なので、ratio と同じ丸めで閾値未満になったら打ち切る
      if (
        Math.round((200 * lengths[i]) / (lengths[i] + lengths[j])) <
        FILENAME_EDGE_MIN_SCORE * 100
      ) {
        break
      }

      const score = ratio(names[i], names[j], { astral: true }) / 100
      if (score >= FILENAME_EDGE_MIN_SCORE) {
        const [a, b] = i < j ? [i, j] : [j, i]
        edges.push({ a: nodes[a], b: nodes[b], score })
      }
    }
  }

  return edges
}

/**
 * Compare note titles independently of folders and Markdown extensions so the
 * score reflects the name users see in Obsidian.
 */
export function normalizeNoteName(path: string): string {
  const basename = path.split(/[\\/]/).pop() ?? ''
  return basename
    .replace(/\.md$/i, '')
    .normalize('NFKC')
    .toLowerCase()
    .replace(/[\s_-]+/g, ' ')
    .trim()
}

function isMarkdownNode(node: string): boolean {
  return node.endsWith('.md')
}

export function filenameGroups(
  graph: Graph,
  threshold: number,
  markdownOnly: boolean
): Communities {
  // 除外したノートは、グループの中身だけでなく結ぶ辺からも外す
  const nodes = graph.nodes().filter((node) => !markdownOnly || isMarkdownNode(node))
  const included = new Set(nodes)
  const edges = getFilenameSimilarityEdges(graph.nodes()).filter(
    ({ a, b }) => included.has(a) && included.has(b)
  )
  return groupBySimilarity(nodes, edges, threshold)
}
