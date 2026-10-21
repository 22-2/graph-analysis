import type { Communities, SimilarityEdge } from 'src/Interfaces'
import type MyGraph from 'src/MyGraph'

export function intersection(nodes1: string[], nodes2: string[]) {
  return nodes1?.filter((node1) => nodes2.includes(node1)) ?? []
}

// export function eccentricity(g: MyGraph, a: string) {
//   const paths = graphlib.alg.dijkstra(g, a)
//   const pathsArr: [string, graphlib.Path][] = Object.entries(paths)
//   const sortedPaths = pathsArr.sort((p, q) =>
//     p[1].distance > q[1].distance ? 1 : -1
//   )
//   return sortedPaths
// }

export function clusteringCoefficient(g: MyGraph, u: string) {
  const triangles = findTrianglesForNode(g, u)
  const deg = (g.neighbors(u) as string[]).length
  if (deg === 0 || deg === 1) return { coeff: 0, triangles }

  const coeff = (2 * triangles.length) / (deg * (deg - 1))
  return { coeff, triangles }
}

/**
 * Find all triangles that node u is part of
 * @param  {MyGraph} g
 * @param  {string} u
 * @returns {[string, string][]}
 */
function findTrianglesForNode(g: MyGraph, u: string): [string, string][] {
  const triangles: [string, string][] = []
  ;(g.neighbors(u) as string[]).forEach((v) => {
    ;(g.neighbors(v) as string[]).forEach((w) => {
      if (g.hasEdge(u, v) && g.hasEdge(u, w) && g.hasEdge(v, w)) {
        triangles.push([v, w])
      }
    })
  })
  return triangles
}

export function gatherCommunities(labeledNodes: {
  [node: string]: string | number
}) {
  const communities: Communities = {}
  Object.entries(labeledNodes).forEach(
    (labeledNode: [string, string | number]) => {
      const [node, label] = labeledNode
      if (communities[label] === undefined) {
        communities[label] = [node]
      } else {
        communities[label].push(node)
      }
    }
  )
  return communities
}

/**
 * 閾値以上の辺で結ばれたノードを同じグループにする（単連結法）。
 * 閾値を上げるとグループが細かく分かれ、下げるとつながって大きくなる。
 */
export function groupBySimilarity(
  nodes: string[],
  edges: SimilarityEdge[],
  threshold: number
): Communities {
  const parent = new Map(nodes.map((node) => [node, node]))

  const findRoot = (node: string): string => {
    let current = node
    while (parent.get(current) !== current) {
      // 経路を半分に縮めて、次の検索を速くするっす
      const grandparent = parent.get(parent.get(current)!)!
      parent.set(current, grandparent)
      current = grandparent
    }
    return current
  }

  for (const { a, b, score } of edges) {
    if (score < threshold) continue
    parent.set(findRoot(a), findRoot(b))
  }

  const rootOf = Object.fromEntries(nodes.map((node) => [node, findRoot(node)]))
  return gatherCommunities(rootOf)
}
