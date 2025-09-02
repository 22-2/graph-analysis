<script lang="ts">
  import debounce from 'lodash.debounce'
  import type { App } from 'obsidian'
  import { MarkdownView } from 'obsidian'
  import { onDestroy, onMount } from 'svelte'
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

  let { app, plugin, settings, view, currSubtype } = $props<{
    app: App
    plugin: GraphAnalysisPlugin
    settings: GraphAnalysisSettings
    view: AnalysisView
    currSubtype: Subtype
  }>()

  const componentMap = {
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
  let noInfinity = $state(settings.noInfinity)
  let noZero = $state(settings.noZero)
  let excludeLinked = $state(settings.excludeLinked)
  let sortBy = $state(true) // For HITS
  let resolution = $state(10) // For Louvain
  let its = $state(20) // For Label Propagation

  let currFile = $state(app.workspace.getActiveFile())
  const currNode = $derived(currFile?.path)
  let { resolvedLinks } = app.metadataCache

  // --- Infinite Scroll State ---
  const BATCH_SIZE = 50
  let visibleData = $state<any[]>([])
  let page = $state(0)
  let hasMore = $state(false)
  let blockSwitch = $state(false) // Prevents race conditions on rapid state changes
  let scrollContainer: HTMLElement

  // --- Data Fetching and Processing ---
  const promiseSortedResults = $derived((async () => {
    if (!plugin.g || (!currNode && !currSubtypeInfo?.global)) return null

    const greater = ascOrder ? 1 : -1
    const lesser = ascOrder ? -1 : 1

    switch (currSubtype) {
      case 'HITS': {
        const results: HITSResult = await plugin.g.algs['HITS']('')
        const componentResults: any[] = []
        plugin.g.forEachNode((to) => {
          const authority = roundNumber(results.authorities[to])
          const hub = roundNumber(results.hubs[to])
          const linked = isLinked(resolvedLinks, currNode, to, false)
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
        const results: CoCitationMap = await plugin.g.algs['Co-Citations'](currNode)
        const componentResults: any[] = []
        for (const to in results) {
          const result = results[to]
          const linked = isLinked(resolvedLinks, currNode, to, false)
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
        const results: string[] = await plugin.g.algs['Louvain'](currNode, { resolution })
        return results.map(to => ({
          to,
          linked: isLinked(resolvedLinks, currNode, to, false),
          resolved: !to.endsWith('.md') || !!app.metadataCache.getFirstLinkpathDest(to, ''),
          img: settings.showImgThumbnails && isImg(to) ? getImgBufferPromise(app, to) : null,
        }))
      }
      case 'Label Propagation': {
        const comms: Communities = await plugin.g.algs[currSubtype]('', { iterations: its })
        const componentResults: any[] = []
        Object.keys(comms).forEach((label) => {
          let comm = comms[label]
          if (comm.length > 1) {
            componentResults.push({ label, comm })
          }
        })
        return componentResults.sort((a, b) => (a.comm.length > b.comm.length ? greater : lesser))
      }
      default: { // For all TableComponent types
        const results: ResultMap = await plugin.g.algs[currSubtype](currNode)
        const componentResults: any[] = []
        plugin.g.forEachNode((to) => {
          const { measure, extra } = results[to]
          const linked = isLinked(resolvedLinks, currNode, to, false)
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
    const _ = currSubtypeInfo || noZero || ascOrder || currFile || excludeLinked || frozen || sortBy || resolution || its

    blockSwitch = true
    visibleData = []
    page = 0
    setTimeout(() => {
      blockSwitch = false
    }, 100)
  })

  $effect(async () => {
    const sorted = await promiseSortedResults
    if (sorted) {
      visibleData = sorted.slice(0, BATCH_SIZE)
      hasMore = sorted.length > visibleData.length
    } else {
      visibleData = []
      hasMore = false
    }
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
    currFile = activeView.file
  }

  const debouncedMetadataChange = debounce(onMetadataChange, 1000)

  onMount(() => {
    currFile = app.workspace.getActiveFile()
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
      {#if componentMap[currSubtype]}
        <svelte:component this={componentMap[currSubtype]} {...presentationProps} />
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
