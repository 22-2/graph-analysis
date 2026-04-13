<script lang="ts">
  import type { App } from 'obsidian'
  import { MarkdownView, debounce } from 'obsidian'
  import { onDestroy, onMount, type Component, untrack } from 'svelte'
  import type AnalysisView from 'src/AnalysisView'
  import { ANALYSIS_TYPES } from 'src/Constants'
  import type {
    CoCitationMap,
    Communities,
    GraphAnalysisSettings,
    HITSResult,
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

  interface Props {
    app: App
    plugin: GraphAnalysisPlugin
    settings: GraphAnalysisSettings
    view: AnalysisView
    currSubtype: Subtype
  }

  let { app, plugin, settings, view, currSubtype }: Props = $props()

  // $props の初期値をローカル変数に取り出してから $state に渡すっす
  const { noZero: initNoZero, excludeLinked: initExcludeLinked } = untrack(() => settings)
  const initCurrFile = untrack(() => app.workspace.getActiveFile()) ?? undefined

  const componentMap: Partial<Record<Subtype, Component<any>>> = {
    'Adamic Adar': TableComponent,
    'Common Neighbours': TableComponent,
    Jaccard: TableComponent,
    'Co-Citations': CoCitations,
    'Label Propagation': LabelPropagation,
    Overlap: TableComponent,
    'Clustering Coefficient': TableComponent,
    PageRank: TableComponent,
    'Betweenness Centrality': TableComponent,
    BoW: TableComponent,
    'Otsuka-Chiai': TableComponent,
    Tversky: TableComponent,
    Sentiment: TableComponent,
    Louvain: Louvain,
    HITS: HITS,
  }

  // --- State Management ---
  let currSubtypeInfo = $derived(
    ANALYSIS_TYPES.find((sub) => sub.subtype === currSubtype)
  )
  let frozen = $state(false)
  let ascOrder = $state(false)
  let noInfinity = $derived(settings.noInfinity)
  let noZero = $state(initNoZero)
  let excludeLinked = $state(initExcludeLinked)
  let sortBy = $state(true) // For HITS
  let resolution = $state(10) // For Louvain
  let its = $state(20) // For Label Propagation

  let currFile = $state<import('obsidian').TFile | undefined>(initCurrFile)
  const currNode = $derived(currFile?.path)
  const resolvedLinks = $derived(app.metadataCache.resolvedLinks)

  // --- Infinite Scroll State ---
  const BATCH_SIZE = 50
  let visibleData = $state<any[]>([])
  let page = $state(0)
  let hasMore = $state(false)
  let blockSwitch = $state(false) // Prevents race conditions on rapid state changes
  let scrollContainer = $state<HTMLElement | undefined>(undefined)

  // --- Data Fetching and Processing ---
  const promiseSortedResults = $derived((async () => {
    if (!plugin.g || (!currNode && !currSubtypeInfo?.global)) return null

    const greater = ascOrder ? 1 : -1
    const lesser = ascOrder ? -1 : 1

    switch (currSubtype) {
      case 'HITS': {
        let results = plugin.analysisCache.getHITS()
        if (!results) {
          results = await plugin.g.algs['HITS']!('')
          plugin.analysisCache.setHITS(results)
        }
        const componentResults: any[] = []
        plugin.g.forEachNode((to: string) => {
          const authority = roundNumber(results!.authorities[to])
          const hub = roundNumber(results!.hubs[to])
          const linked = isLinked(resolvedLinks, currNode ?? '', to, false)
          if (!(authority === 0 && hub === 0) && !(excludeLinked && linked)) {
            componentResults.push({
              authority,
              hub,
              to,
              resolved: !to.endsWith('.md') || !!app.metadataCache.getFirstLinkpathDest(to, ''),
              img: settings.showImgThumbnails && isImg(to) ? getImgBufferPromise(app, to) : null,
            })
          }
        })
        return componentResults.sort((a, b) => (sortBy ? (a.authority > b.authority ? greater : lesser) : a.hub > b.hub ? greater : lesser))
      }
      case 'Co-Citations': {
        const node = currNode ?? ''
        let results = plugin.analysisCache.getCoCitations(node)
        if (!results) {
          results = await plugin.g.algs['Co-Citations']!(node)
          plugin.analysisCache.setCoCitations(node, results)
        }
        const componentResults: any[] = []
        for (const to in results) {
          const result = results[to]
          const linked = isLinked(resolvedLinks, currNode ?? '', to, false)
          if (!(excludeLinked && linked)) {
            componentResults.push({
              to,
              measure: result.measure,
              resolved: result.resolved,
              coCitations: result.coCitations.sort((a, b) => b.measure - a.measure),
              linked,
              img: settings.showImgThumbnails && isImg(to) ? getImgBufferPromise(app, to) : null,
            })
          }
        }
        return componentResults.sort((a, b) => (a.measure > b.measure ? greater : lesser))
      }
      case 'Louvain': {
        const node = currNode ?? ''
        let results = plugin.analysisCache.getLouvain(node, resolution)
        if (!results) {
          results = await plugin.g.algs['Louvain']!(node, { resolution })
          plugin.analysisCache.setLouvain(node, resolution, results)
        }
        return results
          .map(to => ({
            to,
            linked: isLinked(resolvedLinks, currNode ?? '', to, false),
            resolved: !to.endsWith('.md') || !!app.metadataCache.getFirstLinkpathDest(to, ''),
            img: settings.showImgThumbnails && isImg(to) ? getImgBufferPromise(app, to) : null,
          }))
          .filter(node => !(excludeLinked && node.linked))
      }
      case 'Label Propagation': {
        let comms = plugin.analysisCache.getLabelPropagation(its)
        if (!comms) {
          comms = await plugin.g.algs['Label Propagation']!('', { iterations: its })
          plugin.analysisCache.setLabelPropagation(its, comms)
        }
        if (!comms) return []
        const componentResults: any[] = []
        Object.keys(comms).forEach((label) => {
          const comm = comms![label]
          if (comm.length > 1) {
            componentResults.push({ label, comm })
          }
        })
        return componentResults.sort((a, b) => (a.comm.length > b.comm.length ? greater : lesser))
      }
      default: { // For all TableComponent types
        const node = currNode ?? ''
        let results = plugin.analysisCache.getResultMap(currSubtype, node)
        if (!results) {
          results = await plugin.g.algs[currSubtype]!(node)
          plugin.analysisCache.setResultMap(currSubtype, node, results)
        }
        const componentResults: any[] = []
        plugin.g.forEachNode((to: string) => {
          const { measure, extra } = results![to]
          const linked = isLinked(resolvedLinks, currNode ?? '', to, false)
          if (
            !(noInfinity && measure === Infinity) &&
            !(noZero && measure === 0) &&
            !(excludeLinked && linked)
          ) {
            componentResults.push({
              measure,
              linked,
              to,
              resolved: !to.endsWith('.md') || !!app.metadataCache.getFirstLinkpathDest(to, ''),
              extra,
              img: settings.showImgThumbnails && isImg(to) ? getImgBufferPromise(app, to) : null,
            })
          }
        })
        return componentResults.sort((a, b) => (a.measure === b.measure ? (a.extra?.length > b.extra?.length ? greater : lesser) : a.measure > b.measure ? greater : lesser))
      }
    }
  })())

  // --- Effects and Lifecycle ---
  $effect(() => {
    // This effect runs whenever any of its dependencies change.
    // It resets the view when a setting or the current node changes.
    void (currSubtypeInfo || noZero || ascOrder || currFile || excludeLinked || frozen || sortBy || resolution || its)

    blockSwitch = true
    visibleData = []
    page = 0
    setTimeout(() => {
      blockSwitch = false
    }, 100)
  })

  $effect(() => {
    promiseSortedResults.then((sorted) => {
      if (sorted) {
        visibleData = sorted.slice(0, BATCH_SIZE)
        hasMore = sorted.length > visibleData.length
      } else {
        visibleData = []
        hasMore = false
      }
    })
  })

  async function loadMore() {
    if (blockSwitch || !hasMore) return
    page++
    const sortedResults = await promiseSortedResults
    if (sortedResults) {
      const newBatch = sortedResults.slice(BATCH_SIZE * page, BATCH_SIZE * (page + 1))
      visibleData = [...visibleData, ...newBatch]
      hasMore = sortedResults.length > visibleData.length
    }
  }

  const onMetadataChange = async () => {
    if (!frozen) {
      await plugin.refreshGraph()
      await view.draw(currSubtype)
    }
  }

  const onLeafChange = () => {
    const activeView = app.workspace.getActiveViewOfType(MarkdownView)
    if (!activeView || frozen || activeView.file?.path === currFile?.path) {
      return
    }
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

  const presentationProps = $derived({
    app,
    plugin,
    settings,
    view,
    currNode,
    visibleData,
    currSubtypeInfo,
    // Props specific to certain components
    its,
    resolution,
  })
</script>

<ScrollSelector {currSubtype} {view} />

<SubtypeOptions
  bind:currSubtypeInfo
  bind:noZero
  bind:ascOrder
  bind:currFile
  bind:frozen
  bind:excludeLinked
  bind:sortBy
  {app}
  {plugin}
  {view}
/>

<!-- Algorithm-specific options -->
{#if currSubtype === 'Louvain'}
  <div class="GA-alg-options">
    <label for="resolution">Resolution: </label>
    <input
      name="resolution"
      type="range"
      min="1"
      max="20"
      bind:value={resolution}
    />
  </div>
{/if}
{#if currSubtype === 'Label Propagation'}
  <div class="GA-alg-options">
    <label for="iterations">Iterations: </label>
    <input
      name="iterations"
      type="range"
      min="1"
      max="30"
      bind:value={its}
    />
  </div>
{/if}

<div class="scrollContainer" bind:this={scrollContainer}>
  {#await promiseSortedResults}
    <p class="GA-info-message">Loading analysis...</p>
  {:then sortedResults}
    {#if sortedResults && sortedResults.length > 0}
      {#if componentMap[currSubtype as Subtype]}
        {@const DynComponent = componentMap[currSubtype as Subtype]}
        <DynComponent {...presentationProps} />
      {/if}

      <InfiniteScroll
        {hasMore}
        scrollContainer={scrollContainer}
        onLoadMore={loadMore}
      />

      <div class="GA-footer">
        {visibleData.length} / {sortedResults.length}
      </div>
    {:else}
      <p class="GA-info-message">No results to display. Select a note to begin analysis.</p>
    {/if}
  {/await}
</div>

<style>
  .GA-alg-options {
    padding: 5px 10px;
  }
  .scrollContainer {
    height: calc(100% - 80px); /* Adjust based on header height */
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
