<script lang="ts">
  import type { App, TFile } from 'obsidian'
  import { MarkdownView, debounce } from 'obsidian'
  import { onDestroy, onMount, type Component, untrack } from 'svelte'
  import type AnalysisView from 'src/AnalysisView'
  import { ANALYSIS_TYPES } from 'src/Constants'
  import type {
    CoCitationComponentResult,
    GraphAnalysisSettings,
    HITSComponentResult,
    LabelPropagationComponentResult,
    LouvainComponentResult,
    ComponentResults,
    ResultMap,
    Subtype,
  } from 'src/Interfaces'
  import type GraphAnalysisPlugin from 'src/main'
  import { getImgBufferPromise, isImg, isLinked, roundNumber } from 'src/Utility'
  import CoCitations from './CoCitations.svelte'
  import HITS from './HITS.svelte'
  import LabelPropagation from './LabelPropagation.svelte'
  import Louvain from './Louvain.svelte'
  import ScrollSelector from './ScrollSelector.svelte'
  import SubtypeOptions from './SubtypeOptions.svelte'
  import TableComponent from './TableComponent.svelte'
  import InfiniteScroll from './InfiniteScroll.svelte'

  // ---------------------------------------------------------------------------
  // Props
  // ---------------------------------------------------------------------------

  interface Props {
    app: App
    plugin: GraphAnalysisPlugin
    settings: GraphAnalysisSettings
    view: AnalysisView
    currSubtype: Subtype
  }

  let { app, plugin, settings, view, currSubtype }: Props = $props()

  // ---------------------------------------------------------------------------
  // Constants
  // ---------------------------------------------------------------------------

  const BATCH_SIZE = 50

  const COMPONENT_MAP: Partial<Record<Subtype, Component<any>>> = {
    'Adamic Adar':           TableComponent,
    'Common Neighbours':     TableComponent,
    'Jaccard':               TableComponent,
    'Co-Citations':          CoCitations,
    'Label Propagation':     LabelPropagation,
    'Overlap':               TableComponent,
    'Clustering Coefficient':TableComponent,
    'PageRank':              TableComponent,
    'Betweenness Centrality':TableComponent,
    'BoW':                   TableComponent,
    'Otsuka-Chiai':          TableComponent,
    'Tversky':               TableComponent,
    'Sentiment':             TableComponent,
    'Louvain':               Louvain,
    'HITS':                  HITS,
  }

  // ---------------------------------------------------------------------------
  // State
  // ---------------------------------------------------------------------------

  // untrack で初期値を安全に取り出す
  const { noZero: initNoZero, excludeLinked: initExcludeLinked } = untrack(() => settings)
  const initCurrFile = untrack(() => app.workspace.getActiveFile()) ?? undefined

  let frozen        = $state(false)
  let ascOrder      = $state(false)
  let noZero        = $state(initNoZero)
  let excludeLinked = $state(initExcludeLinked)
  let sortBy        = $state(true)   // HITS: true=authority / false=hub
  let resolution    = $state(10)     // Louvain
  let its           = $state(20)     // Label Propagation
  let currFile      = $state<TFile | undefined>(initCurrFile)

  // 無限スクロール用
  let visibleData     = $state<AnyComponentResult[]>([])
  let page            = $state(0)
  let hasMore         = $state(false)
  let blockSwitch     = $state(false)
  let scrollContainer = $state<HTMLElement | undefined>(undefined)

  // ---------------------------------------------------------------------------
  // Derived
  // ---------------------------------------------------------------------------

  const currSubtypeInfo = $derived(ANALYSIS_TYPES.find((s) => s.subtype === currSubtype))
  const currNode       = $derived(currFile?.path)
  const resolvedLinks  = $derived(app.metadataCache.resolvedLinks)
  const noInfinity     = $derived(settings.noInfinity)

  const sortDirection  = $derived({ greater: ascOrder ? 1 : -1, lesser: ascOrder ? -1 : 1 })

  // ---------------------------------------------------------------------------
  // Helpers
  // ---------------------------------------------------------------------------

  /** ノードのサムネイル Promise を返す（設定で無効なら null） */
  function imgFor(to: string): Promise<any> | null {
    return settings.showImgThumbnails && isImg(to) ? getImgBufferPromise(app, to) : null
  }

  /** ノードが解決済みか判定 */
  function isResolved(to: string): boolean {
    return !to.endsWith('.md') || !!app.metadataCache.getFirstLinkpathDest(to, '')
  }

  function isNodeLinked(to: string): boolean {
    return isLinked(resolvedLinks, currNode ?? '', to, false)
  }

  // ---------------------------------------------------------------------------
  // Algorithm result builders
  // ---------------------------------------------------------------------------

  async function buildHITSResults(): Promise<HITSComponentResult[]> {
    let results = plugin.analysisCache.getHITS()
    if (!results) {
      results = await plugin.g.algs['HITS']!('')
      plugin.analysisCache.setHITS(results)
    }

    const { greater, lesser } = sortDirection
    const out: HITSComponentResult[] = []

    plugin.g.forEachNode((to: string) => {
      const authority = roundNumber(results!.authorities[to])
      const hub       = roundNumber(results!.hubs[to])
      if (authority === 0 && hub === 0) return
      if (excludeLinked && isNodeLinked(to)) return
      out.push({ authority, hub, to, resolved: isResolved(to), img: imgFor(to) })
    })

    return out.sort((a, b) =>
      sortBy
        ? (a.authority > b.authority ? greater : lesser)
        : (a.hub > b.hub ? greater : lesser)
    )
  }

  async function buildCoCitationResults(): Promise<CoCitationComponentResult[]> {
    const node = currNode ?? ''
    let results = plugin.analysisCache.getCoCitations(node)
    if (!results) {
      results = await plugin.g.algs['Co-Citations']!(node)
      plugin.analysisCache.setCoCitations(node, results)
    }

    const { greater, lesser } = sortDirection
    const out: CoCitationComponentResult[] = []

    for (const to in results) {
      if (excludeLinked && isNodeLinked(to)) continue
      const result = results[to]
      out.push({
        to,
        measure:     result.measure,
        resolved:    result.resolved,
        coCitations: result.coCitations.sort((a, b) => b.measure - a.measure),
        linked:      isNodeLinked(to),
        img:         imgFor(to),
      })
    }

    return out.sort((a, b) => (a.measure > b.measure ? greater : lesser))
  }

  async function buildLouvainResults(): Promise<LouvainComponentResult[]> {
    const node = currNode ?? ''
    let results = plugin.analysisCache.getLouvain(node, resolution)
    if (!results) {
      results = await plugin.g.algs['Louvain']!(node, { resolution })
      plugin.analysisCache.setLouvain(node, resolution, results)
    }

    return results
      .map((to: string): LouvainComponentResult => ({
        to,
        linked:   isNodeLinked(to),
        resolved: isResolved(to),
        img:      imgFor(to),
      }))
      .filter((n) => !(excludeLinked && n.linked))
  }

  async function buildLabelPropagationResults(): Promise<LabelPropagationComponentResult[]> {
    const { greater, lesser } = sortDirection
    let comms = plugin.analysisCache.getLabelPropagation(its)
    if (!comms) {
      comms = await plugin.g.algs['Label Propagation']!('', { iterations: its })
      plugin.analysisCache.setLabelPropagation(its, comms)
    }
    if (!comms) return []

    return Object.entries(comms)
      .filter(([, comm]) => comm.length > 1)
      .map(([label, comm]): LabelPropagationComponentResult => ({ label, comm }))
      .sort((a, b) => a.comm.length > b.comm.length ? greater : lesser)
  }

  async function buildTableResults(): Promise<ComponentResults[]> {
    const node = currNode ?? ''
    let results: ResultMap | undefined = plugin.analysisCache.getResultMap(currSubtype, node)
    if (!results) {
      results = await plugin.g.algs[currSubtype]!(node) as ResultMap
      plugin.analysisCache.setResultMap(currSubtype, node, results)
    }

    const { greater, lesser } = sortDirection
    const out: ComponentResults[] = []

    plugin.g.forEachNode((to: string) => {
      const { measure, extra } = results![to]
      if (noInfinity && measure === Infinity) return
      if (noZero    && measure === 0)        return
      if (excludeLinked && isNodeLinked(to)) return
      out.push({ measure, linked: isNodeLinked(to), to, resolved: isResolved(to), extra, img: imgFor(to) })
    })

    return out.sort((a, b) =>
      a.measure === b.measure
        ? (a.extra?.length > b.extra?.length ? greater : lesser)
        : (a.measure > b.measure ? greater : lesser)
    )
  }

  // ---------------------------------------------------------------------------
  // Core derived promise
  // ---------------------------------------------------------------------------

  type AnyComponentResult =
    | HITSComponentResult
    | CoCitationComponentResult
    | LouvainComponentResult
    | LabelPropagationComponentResult
    | ComponentResults

  const promiseSortedResults = $derived((async (): Promise<AnyComponentResult[] | null> => {
    if (!plugin.g || (!currNode && !currSubtypeInfo?.global)) return null

    switch (currSubtype) {
      case 'HITS':              return buildHITSResults()
      case 'Co-Citations':      return buildCoCitationResults()
      case 'Louvain':           return buildLouvainResults()
      case 'Label Propagation': return buildLabelPropagationResults()
      default:                  return buildTableResults()
    }
  })())

  // ---------------------------------------------------------------------------
  // Infinite scroll
  // ---------------------------------------------------------------------------

  /** ページをリセットして最初のバッチを表示する */
  function resetPagination() {
    blockSwitch = true
    visibleData = []
    page = 0
    setTimeout(() => { blockSwitch = false }, 100)
  }

  async function loadMore() {
    if (blockSwitch || !hasMore) return
    page++
    const sorted = await promiseSortedResults
    if (!sorted) return
    visibleData = [...visibleData, ...sorted.slice(BATCH_SIZE * page, BATCH_SIZE * (page + 1))]
    hasMore = sorted.length > visibleData.length
  }

  // ---------------------------------------------------------------------------
  // Effects
  // ---------------------------------------------------------------------------

  // 設定や対象ノードが変わったらページネーションをリセット
  $effect(() => {
    // 依存値を明示的に列挙（void ハック不要）
    currSubtypeInfo; noZero; ascOrder; currFile; excludeLinked; frozen; sortBy; resolution; its
    resetPagination()
  })

  // promiseSortedResults が解決したら最初のバッチをセット
  $effect(() => {
    promiseSortedResults.then((sorted) => {
      if (sorted) {
        visibleData = sorted.slice(0, BATCH_SIZE)
        hasMore     = sorted.length > BATCH_SIZE
      } else {
        visibleData = []
        hasMore     = false
      }
    })
  })

  // ---------------------------------------------------------------------------
  // Event handlers
  // ---------------------------------------------------------------------------

  const onMetadataChange = async () => {
    if (frozen) return
    await plugin.refreshGraph()
    await view.draw(currSubtype)
  }

  const onLeafChange = () => {
    const activeView = app.workspace.getActiveViewOfType(MarkdownView)
    if (!activeView || frozen || activeView.file?.path === currFile?.path) return
    currFile = activeView.file ?? undefined
  }

  const debouncedMetadataChange = debounce(onMetadataChange, 1000)

  onMount(() => {
    currFile = app.workspace.getActiveFile() ?? undefined
    app.workspace.on('active-leaf-change', onLeafChange)
    if (currSubtypeInfo && !currSubtypeInfo.global) {
      app.metadataCache.on('changed', debouncedMetadataChange)
    }
  })

  onDestroy(() => {
    app.workspace.off('active-leaf-change', onLeafChange)
    app.metadataCache.off('changed', debouncedMetadataChange)
  })

  // ---------------------------------------------------------------------------
  // Presentation props (derived)
  // ---------------------------------------------------------------------------

  const presentationProps = $derived({
    app,
    plugin,
    settings,
    view,
    currNode,
    visibleData,
    currSubtypeInfo,
    its,
    resolution,
  })
</script>

<!-- ========================================================================= -->
<!-- Template                                                                    -->
<!-- ========================================================================= -->

<ScrollSelector {currSubtype} {view} />

<SubtypeOptions
  {currSubtypeInfo}
  bind:noZero
  bind:ascOrder
  bind:currFile
  bind:frozen
  bind:excludeLinked
  bind:sortBy
  {app}
  {plugin}
  {view}
></SubtypeOptions>

{#if currSubtype === 'Louvain'}
  <div class="GA-alg-options">
    <label for="resolution">Resolution:</label>
    <input id="resolution" type="range" min="1" max="20" bind:value={resolution} />
  </div>
{/if}

{#if currSubtype === 'Label Propagation'}
  <div class="GA-alg-options">
    <label for="iterations">Iterations:</label>
    <input id="iterations" type="range" min="1" max="30" bind:value={its} />
  </div>
{/if}

<div class="scrollContainer" bind:this={scrollContainer}>
  {#await promiseSortedResults}
    <p class="GA-info-message">Loading analysis...</p>
  {:then sortedResults}
    {#if sortedResults && sortedResults.length > 0}
      {#if COMPONENT_MAP[currSubtype]}
        {@const DynComponent = COMPONENT_MAP[currSubtype]}
        <DynComponent {...presentationProps} />
      {/if}

      <InfiniteScroll {hasMore} {scrollContainer} onLoadMore={loadMore} />

      <div class="GA-footer">
        {visibleData.length} / {sortedResults.length}
      </div>
    {:else}
      <p class="GA-info-message">No results to display. Select a note to begin analysis.</p>
    {/if}
  {/await}
</div>

<!-- ========================================================================= -->
<!-- Styles                                                                      -->
<!-- ========================================================================= -->

<style>
  .GA-alg-options {
    padding: 5px 10px;
  }

  .scrollContainer {
    height: calc(100% - 80px);
    overflow-y: auto;
    padding: 0 10px;
  }

  .GA-info-message {
    text-align: center;
    color: var(--text-muted);
    padding-top: 2em;
  }

  .GA-footer {
    margin-top: 0.5em;
    padding-bottom: 0.5em;
    text-align: center;
    color: var(--text-muted);
  }
</style>
