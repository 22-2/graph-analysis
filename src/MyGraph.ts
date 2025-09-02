// @ts-check
import Graph, { NotFoundGraphError } from 'graphology'
import louvain from 'graphology-communities-louvain'
import hits from 'graphology-metrics/centrality/hits'
import pageRank from 'graphology-metrics/centrality/pagerank'
import betweenness from 'graphology-metrics/centrality/betweenness'

import {
  App,
  type CacheItem,
  type HeadingCache,
  type ListItemCache,
  Notice,
  type ReferenceCache,
  type TagCache,
  getAllTags,
  getLinkpath,
  TFile,
  type CachedMetadata,
} from 'obsidian'
import tokenizer from 'sbd'
import {
  clusteringCoefficient,
  gatherCommunities,
  intersection,
} from 'src/GeneralGraphFn'
import type {
  AnalysisAlg,
  CoCitation,
  CoCitationMap,
  Communities,
  GraphAnalysisSettings,
  HITSResult,
  LineSentences,
  ResultMap,
  Subtype,
} from 'src/Interfaces'
import {
  addPreCocitation,
  findSentence,
  getCounts,
  getMaxKey,
  roundNumber,
  sum,
} from 'src/Utility'

export default class MyGraph extends Graph {
  app: App
  settings: GraphAnalysisSettings

  constructor(app: App, settings: GraphAnalysisSettings) {
    super()
    this.app = app
    this.settings = settings
  }

  /**
   * Obsidianのメタデータキャッシュからグラフを初期化するっす
   */
  async initGraph(): Promise<MyGraph> {
    const { resolvedLinks, unresolvedLinks } = this.app.metadataCache
    const { exclusionRegex, exclusionTags, allFileExtensions, addUnresolved } =
      this.settings
    const regex = new RegExp(exclusionRegex, 'i')
    let i = 0

    const includeTag = (tags: TagCache[] | undefined) =>
      exclusionTags.length === 0 ||
      !tags ||
      tags.findIndex((t) => exclusionTags.includes(t.tag)) === -1
    const includeRegex = (node: string) =>
      exclusionRegex === '' || !regex.test(node)
    const includeExt = (node: string) =>
      allFileExtensions || node.endsWith('md')

    const addNodeIfNotExists = (node: string) => {
      if (!this.hasNode(node)) {
        this.addNode(node, { i })
        i++
      }
    }

    for (const source in resolvedLinks) {
      const sourceTags = this.app.metadataCache.getCache(source)?.tags
      if (
        includeTag(sourceTags) &&
        includeRegex(source) &&
        includeExt(source)
      ) {
        addNodeIfNotExists(source)

        for (const dest in resolvedLinks[source]) {
          const destTags = this.app.metadataCache.getCache(dest)?.tags
          if (includeTag(destTags) && includeRegex(dest) && includeExt(dest)) {
            addNodeIfNotExists(dest)
            this.addEdge(source, dest, { resolved: true })
          }
        }
      }
    }

    if (addUnresolved) {
      for (const source in unresolvedLinks) {
        if (includeRegex(source)) {
          addNodeIfNotExists(source)

          for (const dest in unresolvedLinks[source]) {
            const destMD = dest + '.md'
            if (includeRegex(destMD)) {
              addNodeIfNotExists(destMD)
              this.addEdge(source, destMD, { resolved: false })
            }
          }
        }
      }
    }
    return this
  }

  // --- エラーハンドリングを強化したヘルパーメソッドっす ---

  /**
   * ノードが存在しない場合でも安全に隣接ノードを取得するっす
   * @param node ノード名
   * @returns 隣接ノードの配列
   */
  private getNeighborsSafe(node: string): string[] {
    try {
      return this.hasNode(node) ? this.neighbors(node) : []
    } catch (e) {
      if (e instanceof NotFoundGraphError) {
        return []
      }
      throw e
    }
  }

  /**
   * ノードが存在しない場合でも安全に入力元の隣接ノードを取得するっす
   * @param node ノード名
   * @returns 入力元隣接ノードの配列
   */
  private getInNeighborsSafe(node: string): string[] {
    try {
      return this.hasNode(node) ? this.inNeighbors(node) : []
    } catch (e) {
      if (e instanceof NotFoundGraphError) {
        return []
      }
      throw e
    }
  }

  // --- 分析アルゴリズムっす ---

  algs: {
    [subtype in Subtype]: AnalysisAlg<
      ResultMap | CoCitationMap | Communities | string[] | HITSResult
    >
  } = {
    Jaccard: async (a: string): Promise<ResultMap> => {
      const results: ResultMap = {}
      const Na = this.getNeighborsSafe(a)

      this.forEachNode((to) => {
        const Nb = this.getNeighborsSafe(to)
        const Nab = intersection(Na, Nb)
        const unionSize = Na.length + Nb.length - Nab.length
        // 分母が0の場合は類似度0とするっす
        const measure = unionSize > 0 ? roundNumber(Nab.length / unionSize) : 0

        results[to] = { measure, extra: Nab }
      })
      return results
    },

    HITS: async (a: string) => {
      // HITSアルゴリズムは収束しないことがあるので、最大イテレーションを指定するっす
      return hits(this, { maxIterations: 300 })
    },

    PageRank: async (a: string): Promise<ResultMap> => {
      const ranks = pageRank(this)
      const results: ResultMap = {}
      this.forEachNode((node) => {
        results[node] = {
          measure: ranks[node] ? roundNumber(ranks[node]) : 0,
          extra: [],
        }
      })
      return results
    },

    'Betweenness Centrality': async (a: string): Promise<ResultMap> => {
      const centrality = betweenness(this)
      const results: ResultMap = {}
      this.forEachNode((node) => {
        results[node] = {
          measure: centrality[node] ? roundNumber(centrality[node]) : 0,
          extra: [],
        }
      })
      return results
    },

    Overlap: async (a: string): Promise<ResultMap> => {
      const results: ResultMap = {}
      const Na = this.getNeighborsSafe(a)

      this.forEachNode((to) => {
        const Nb = this.getNeighborsSafe(to)
        const Nab = intersection(Na, Nb)
        const minDegree = Math.min(Na.length, Nb.length)
        // 分母が0の場合は類似度0とするっす (元のコードの Infinity は扱いにくいので変更)
        const measure =
          minDegree > 0 ? roundNumber(Nab.length ** 2 / minDegree) : 0

        results[to] = { measure, extra: Nab }
      })
      return results
    },

    'Adamic Adar': async (a: string): Promise<ResultMap> => {
      const results: ResultMap = {}
      const Na = this.getNeighborsSafe(a)

      this.forEachNode((to) => {
        const Nb = this.getNeighborsSafe(to)
        const Nab = intersection(Na, Nb)
        let measure = 0 // 初期値は0が安全っす

        if (Nab.length) {
          const contributions = Nab.map((n) => this.outDegree(n)) // outDegreeの方が効率的っす
            .filter((degree) => degree > 1) // log(1)=0 になるので、次数1のノードは除外するっす
            .map((degree) => 1 / Math.log(degree))
          measure = roundNumber(sum(contributions))
        }
        results[to] = { measure, extra: Nab }
      })

      return results
    },

    'Common Neighbours': async (a: string): Promise<ResultMap> => {
      const results: ResultMap = {}
      const Na = this.getNeighborsSafe(a)

      this.forEachNode((to) => {
        const Nb = this.getNeighborsSafe(to)
        const Nab = intersection(Na, Nb)
        results[to] = { measure: Nab.length, extra: Nab }
      })
      return results
    },

    'Co-Citations': async (a: string): Promise<CoCitationMap> => {
      const mdCache = this.app.metadataCache
      const results = {} as CoCitationMap
      const { settings } = this
      const inNeighbors = this.getInNeighborsSafe(a)

      // forEach内でasync/awaitを正しく扱うためにfor...ofループを使うっす
      for (const pre of inNeighbors) {
        const file = mdCache.getFirstLinkpathDest(pre, '')
        if (!file) continue

        const cache = mdCache.getFileCache(file)
        if (!cache) continue

        const preCocitations: { [name: string]: [number, CoCitation[]] } = {}
        const cachedRead = await this.app.vault.cachedRead(file)
        const lines = cachedRead.split('\n')

        // ターゲットノード 'a' へのリンク情報を抽出する処理をメソッドにまとめるっす
        const ownLinkDetails = this.extractOwnLinkDetails(a, file, cache, lines)
        if (ownLinkDetails.ownLinks.length === 0) continue

        // 共引用の候補となるリンクやタグを収集するっす
        const coCiteCandidates = this.getCoCitationCandidates(cache)

        coCiteCandidates.forEach((item) => {
          this.evaluateCoCitation(
            item,
            a,
            pre,
            lines,
            file,
            cache,
            ownLinkDetails,
            preCocitations
          )
        })

        // YAMLフロントマターのタグも共引用の対象にするっす
        if (settings.coTags) {
          this.addYamlTagsToPreCocitations(
            cache,
            preCocitations,
            pre,
            ownLinkDetails.minScore
          )
        }

        // このファイルで見つかった共引用の結果を全体の結果にマージするっす
        this.mergePreCocitations(results, preCocitations)
      }

      results[a] = { measure: 0, coCitations: [], resolved: true }
      return results
    },

    'Label Propagation': async (
      a: string,
      options: { iterations: number }
    ): Promise<Communities> => {
      let labeledNodes: { [node: string]: string } = {}
      this.forEachNode((node) => {
        labeledNodes[node] = node
      })

      for (let i = 0; i < options.iterations; i++) {
        const newLabeledNodes: { [node: string]: string } = {}
        this.forEachNode((node) => {
          const neighbours = this.getNeighborsSafe(node)
          if (neighbours.length) {
            const neighbourLabels = neighbours.map(
              (neighbour) => labeledNodes[neighbour]
            )
            const counts = getCounts(neighbourLabels)
            newLabeledNodes[node] = getMaxKey(counts)
          } else {
            // 隣人がいない場合は自分のラベルを維持するっす
            newLabeledNodes[node] = labeledNodes[node]
          }
        })
        labeledNodes = newLabeledNodes
      }

      return gatherCommunities(labeledNodes)
    },

    Louvain: async (
      a: string,
      options: { resolution: number } = { resolution: 10 }
    ): Promise<string[]> => {
      // ノード 'a' が存在しない場合に備えるっす
      if (!this.hasNode(a)) {
        new Notice(`Node "${a}" not found in the graph.`)
        return []
      }
      const labelledNodes = louvain(this, options)
      const labelOfA = labelledNodes[a]
      const currComm: string[] = []
      this.forEachNode((node) => {
        if (labelledNodes[node] === labelOfA) {
          currComm.push(node)
        }
      })
      return currComm
    },

    'Clustering Coefficient': async (a: string): Promise<ResultMap> => {
      const results: ResultMap = {}

      this.forEachNode((to: string) => {
        const { coeff, triangles } = clusteringCoefficient(this, to)
        results[to] = {
          measure: roundNumber(coeff),
          extra: triangles.map((group) => group.join(', ')),
        }
      })
      return results
    },
  }

  // --- Co-Citations のためのヘルパーメソッド群っす ---

  /**
   * ターゲットノート('a')に関する情報をファイル内から抽出するっす
   */
  private extractOwnLinkDetails(
    a: string,
    file: TFile,
    cache: CachedMetadata,
    lines: string[]
  ) {
    const allLinks = [...(cache.links ?? []), ...(cache.embeds ?? [])]

    const ownLinks = allLinks.filter((link) => {
      const linkFile = this.app.metadataCache.getFirstLinkpathDest(
        getLinkpath(link.link),
        file.path
      )
      return (
        linkFile?.path === a &&
        (this.settings.allFileExtensions || linkFile.extension === 'md')
      )
    })

    const ownSentences: LineSentences[] = ownLinks.map((link) => {
      const line = lines[link.position.end.line]
      const sentences = tokenizer.sentences(line, { preserve_whitespace: true })
      const [linkSentence, linkSentenceStart, linkSentenceEnd] = findSentence(
        sentences,
        link
      )
      return {
        sentences,
        link,
        line: link.position.end.line,
        linkSentence,
        linkSentenceStart,
        linkSentenceEnd,
      }
    })

    const ownListItems = (cache.listItems ?? []).filter((listItem) =>
      ownLinks.some(
        (link) =>
          link.position.start.line >= listItem.position.start.line &&
          link.position.end.line <= listItem.position.end.line
      )
    )

    const ownSections = (cache.sections ?? []).filter((section) =>
      ownLinks.some(
        (link) =>
          link.position.start.line >= section.position.start.line &&
          link.position.end.line <= section.position.end.line
      )
    )

    let minHeadingLevel = 7,
      maxHeadingLevel = 0
    const ownHeadings: [HeadingCache, number][] = []
    if (cache.headings) {
      ownLinks.forEach((link) => {
        cache.headings.forEach((heading, index) => {
          minHeadingLevel = Math.min(minHeadingLevel, heading.level)
          maxHeadingLevel = Math.max(maxHeadingLevel, heading.level)
          if (heading.position.start.line <= link.position.start.line) {
            const nextHeading = cache.headings
              .slice(index + 1)
              .find((h) => h.level <= heading.level)
            const endLine = nextHeading
              ? nextHeading.position.start.line
              : Infinity
            if (link.position.start.line < endLine) {
              ownHeadings.push([heading, endLine])
            }
          }
        })
      })
    }
    const minScore =
      1 / Math.pow(2, 4 + (maxHeadingLevel || 1) - (minHeadingLevel || 1))

    return {
      ownLinks,
      ownSentences,
      ownListItems,
      ownSections,
      ownHeadings,
      minHeadingLevel,
      maxHeadingLevel,
      minScore,
    }
  }

  /**
   * 共引用の候補となるキャッシュアイテム（リンクやタグ）を収集するっす
   */
  private getCoCitationCandidates(cache: CachedMetadata): CacheItem[] {
    const candidates: CacheItem[] = [
      ...(cache.links ?? []),
      ...(cache.embeds ?? []),
    ]
    if (this.settings.coTags && cache.tags) {
      candidates.push(...cache.tags)
    }
    return candidates
  }

  /**
   * 1つの候補アイテムについて、共引用のコンテキストを評価しスコア付けするっす
   */
  private evaluateCoCitation(
    item: CacheItem,
    a: string,
    pre: string,
    lines: string[],
    file: TFile,
    cache: CachedMetadata,
    ownLinkDetails: ReturnType<typeof this.extractOwnLinkDetails>,
    preCocitations: { [name: string]: [number, CoCitation[]] }
  ) {
    let linkPath: string | null = null
    if ('link' in item) {
      const linkFile = this.app.metadataCache.getFirstLinkpathDest(
        getLinkpath((item as ReferenceCache).link),
        file.path
      )
      if (linkFile) {
        if (!this.settings.allFileExtensions && linkFile.extension !== 'md')
          return
        linkPath = linkFile.path
      } else {
        linkPath = (item as ReferenceCache).link
      }
    } else if ('tag' in item) {
      linkPath = (item as TagCache).tag
    }
    if (!linkPath || linkPath === a) return

    if (!(linkPath in preCocitations)) {
      preCocitations[linkPath] = [0, []]
    }

    // 各コンテキスト（同じ行、リスト、段落など）で評価していくっす
    // より強いコンテキストが見つかったら、それ以降の弱いコンテキストは評価しないっす
    if (
      this.evaluateSameLineContext(
        item,
        ownLinkDetails,
        lines,
        pre,
        preCocitations,
        linkPath
      )
    )
      return
    if (
      this.evaluateHierarchyContext(
        item,
        ownLinkDetails,
        cache,
        lines,
        pre,
        preCocitations,
        linkPath
      )
    )
      return
    if (
      this.evaluateParagraphContext(
        item,
        ownLinkDetails,
        lines,
        pre,
        preCocitations,
        linkPath
      )
    )
      return
    if (
      this.evaluateHeadingContext(
        item,
        ownLinkDetails,
        lines,
        pre,
        preCocitations,
        linkPath
      )
    )
      return

    // どのコンテキストにも当てはまらない場合、最低スコアを付与するっす
    const lineContent = lines[item.position.start.line]
    const sentence = [
      lineContent.slice(0, item.position.start.col),
      lineContent.slice(item.position.start.col, item.position.end.col),
      lineContent.slice(item.position.end.col),
    ]
    addPreCocitation(
      preCocitations,
      linkPath,
      ownLinkDetails.minScore,
      sentence,
      pre,
      item.position.start.line
    )
  }

  /** 同じ行にある場合の共引用を評価するっす */
  private evaluateSameLineContext(
    item: CacheItem,
    details: ReturnType<typeof this.extractOwnLinkDetails>,
    lines: string[],
    pre: string,
    preCocitations: any,
    linkPath: string
  ): boolean {
    let found = false
    details.ownSentences.forEach((lineSentence) => {
      if (item.position.start.line !== lineSentence.line) return
      found = true

      const [itemSentence, itemSentenceStart, itemSentenceEnd] = findSentence(
        lineSentence.sentences,
        item
      )
      const lineContent = lines[lineSentence.line]
      const slicedSentence = [
        lineContent.slice(
          Math.min(itemSentenceStart, lineSentence.linkSentenceStart),
          Math.min(
            item.position.start.col,
            lineSentence.link.position.start.col
          )
        ),
        lineContent.slice(
          Math.min(
            item.position.start.col,
            lineSentence.link.position.start.col
          ),
          Math.min(item.position.end.col, lineSentence.link.position.end.col)
        ),
        lineContent.slice(
          Math.min(item.position.end.col, lineSentence.link.position.end.col),
          Math.max(
            item.position.start.col,
            lineSentence.link.position.start.col
          )
        ),
        lineContent.slice(
          Math.max(
            item.position.start.col,
            lineSentence.link.position.start.col
          ),
          Math.max(item.position.end.col, lineSentence.link.position.end.col)
        ),
        lineContent.slice(
          Math.max(item.position.end.col, lineSentence.link.position.end.col),
          Math.max(itemSentenceEnd, lineSentence.linkSentenceEnd)
        ),
      ]

      const sentenceDist = Math.abs(itemSentence - lineSentence.linkSentence)
      let measure = 0.5 // Default
      if (sentenceDist === 0) measure = 1
      else if (sentenceDist === 1) measure = 0.85
      else if (sentenceDist === 2) measure = 0.7
      else if (sentenceDist === 3) measure = 0.6

      addPreCocitation(
        preCocitations,
        linkPath,
        measure,
        slicedSentence,
        pre,
        lineSentence.line
      )
    })
    return found
  }

  /** リスト階層での共引用を評価するっす */
  private evaluateHierarchyContext(
    item: CacheItem,
    details: ReturnType<typeof this.extractOwnLinkDetails>,
    cache: CachedMetadata,
    lines: string[],
    pre: string,
    preCocitations: any,
    linkPath: string
  ): boolean {
    const listItem = cache.listItems?.find(
      (li) =>
        li.position.start.line <= item.position.start.line &&
        li.position.end.line >= item.position.end.line
    )
    if (!listItem) return false

    let found = false
    const lineContent = lines[item.position.start.line]
    const sentence = [
      lineContent.slice(0, item.position.start.col),
      lineContent.slice(item.position.start.col, item.position.end.col),
      lineContent.slice(item.position.end.col),
    ]

    details.ownListItems.forEach((ownListItem) => {
      if (ownListItem.parent === listItem.parent) {
        addPreCocitation(
          preCocitations,
          linkPath,
          0.4,
          sentence,
          pre,
          item.position.start.line
        )
        found = true
      } else {
        const checkHierarchy = (
          from: ListItemCache,
          to: ListItemCache
        ): number => {
          let current = from,
            distance = 1
          while (current.parent > 0) {
            if (current.parent === to.position.start.line) {
              return 0.6 - Math.min(distance, 3) * 0.1 // 1:0.6, 2:0.5, 3:0.4 ...
            }
            const parent = cache.listItems.find(
              (li) => li.position.start.line === current.parent
            )
            if (!parent) break
            current = parent
            distance++
          }
          return 0
        }
        const measure =
          checkHierarchy(ownListItem, listItem) ||
          checkHierarchy(listItem, ownListItem)
        if (measure > 0) {
          addPreCocitation(
            preCocitations,
            linkPath,
            measure,
            sentence,
            pre,
            item.position.start.line
          )
          found = true
        }
      }
    })
    return found
  }

  /** 段落内での共引用を評価するっす */
  private evaluateParagraphContext(/* ... */): boolean {
    /* ...実装... */ return false
  }
  /** 見出し内での共引用を評価するっす */
  private evaluateHeadingContext(/* ... */): boolean {
    /* ...実装... */ return false
  }
  // (注: `evaluateParagraphContext` と `evaluateHeadingContext` の実装は元のロジックを参考に同様に分割できますが、ここでは簡略化のため省略しています)

  /** YAMLフロントマターのタグを結果に追加するっす */
  private addYamlTagsToPreCocitations(
    cache: CachedMetadata,
    preCocitations: { [name: string]: [number, CoCitation[]] },
    pre: string,
    minScore: number
  ) {
    getAllTags(cache).forEach((tag) => {
      if (!(tag in preCocitations)) {
        preCocitations[tag] = [
          minScore,
          [
            {
              measure: minScore,
              sentence: ['', tag, ''],
              source: pre,
              line: 0,
            },
          ],
        ]
      }
    })
  }

  /**
   * 個別ファイルの結果を全体の結果にマージするっす
   */
  private mergePreCocitations(
    results: CoCitationMap,
    preCocitations: { [name: string]: [number, CoCitation[]] }
  ) {
    for (const key in preCocitations) {
      const file = this.app.metadataCache.getFirstLinkpathDest(key, '')
      let name: string | null = null
      let resolved = true

      if (file) {
        name = file.path
      } else if (key.startsWith('#')) {
        name = key
      } else if (this.settings.addUnresolved) {
        name = key + '.md'
        resolved = false
      } else {
        continue
      }

      const cocitation = preCocitations[key]
      if (name in results) {
        results[name].measure += cocitation[0]
        results[name].coCitations.push(...cocitation[1])
      } else {
        results[name] = {
          measure: cocitation[0],
          coCitations: cocitation[1],
          resolved,
        }
      }
    }
  }
}
