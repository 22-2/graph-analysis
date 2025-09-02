<script lang="ts">
  import type { App } from 'obsidian'
  import type AnalysisView from 'src/AnalysisView'
  import { ANALYSIS_TYPES, MEASURE } from 'src/Constants'
  import type {
    GraphAnalysisSettings,
    HITSResult,
    Subtype,
  } from 'src/Interfaces'
  import type GraphAnalysisPlugin from 'src/main'
  import {
    classExt,
    dropPath,
    getImgBufferPromise, hoverPreview, isImg, isInVault, isLinked, openMenu,
    openOrSwitch,
    presentPath,
    roundNumber
  } from 'src/Utility'
  import { onDestroy, onMount } from 'svelte'
  import ExtensionIcon from './ExtensionIcon.svelte'
  import ImgThumbnail from './ImgThumbnail.svelte'
  import InfiniteScroll from './InfiniteScroll.svelte'
  import SubtypeOptions from './SubtypeOptions.svelte'

  let { app, plugin, settings, view, currSubtype } = $props<{
    app: App
    plugin: GraphAnalysisPlugin
    settings: GraphAnalysisSettings
    view: AnalysisView
    currSubtype: Subtype
  }>()

  let currSubtypeInfo = $derived(
    ANALYSIS_TYPES.find((sub) => sub.subtype === currSubtype)
  )

  let sortBy = $state(true)
  let ascOrder = $state(false)
  let noZero = $state(settings.noZero)
  let excludeLinked = $state(settings.excludeLinked)
  let currFile = $state(app.workspace.getActiveFile())

  interface ComponentResults {
    authority: number
    hub: number
    to: string
    resolved: boolean
    img: Promise<ArrayBuffer> | null
  }

  const currNode = $derived(currFile?.path)
  let size = 50
  let current_component: HTMLElement
  let visibleData = $state<ComponentResults[]>([])
  let page = $state(0)
  let blockSwitch = $state(false)
  let { resolvedLinks } = app.metadataCache
  let hasMore = $state(false);

  const onLeafChange = () => {
    blockSwitch = true
    setTimeout(() => {
      blockSwitch = false
      currFile = app.workspace.getActiveFile()
    }, 100)
  }

  onMount(() => {
    currFile = app.workspace.getActiveFile()
    app.workspace.on('active-leaf-change', onLeafChange)
  })

  onDestroy(() => {
    app.workspace.off('active-leaf-change', onLeafChange)
  })

  const promiseSortedResults = $derived(
    !plugin.g
      ? null
      : plugin.g.algs['HITS']('').then((results: HITSResult) => {
          console.log('hits')
          const componentResults: ComponentResults[] = []

          plugin.g.forEachNode((to) => {
            const authority = roundNumber(results.authorities[to])
            const hub = roundNumber(results.hubs[to])
            const linked = isLinked(resolvedLinks, currNode, to, false)
            if (!(authority === 0 && hub === 0) && !(excludeLinked && linked)) {
              const resolved = !to.endsWith('.md') || isInVault(app, to)

              const img =
                plugin.settings.showImgThumbnails && isImg(to)
                  ? getImgBufferPromise(app, to)
                  : null

              componentResults.push({
                authority,
                hub,
                to,
                resolved,
                img,
              })
            }
          })
          const greater = ascOrder ? 1 : -1
          const lesser = ascOrder ? -1 : 1
          componentResults.sort((a, b) => {
            return sortBy
              ? a.authority > b.authority
                ? greater
                : lesser
              : a.hub > b.hub
              ? greater
              : lesser
          })
          return componentResults
        })
  )

  $effect(async () => {
    const sorted = await promiseSortedResults
    if (sorted) {
      visibleData = sorted.slice(0, size)
      page = 0
      hasMore = sorted.length > visibleData.length; // hasMoreを更新
      setTimeout(() => {
        blockSwitch = false
      }, 100)
    } else {
      visibleData = []
      hasMore = false; // hasMoreを更新
    }
  })

  async function loadMore() {
    if (!blockSwitch) {
      page++
      const sortedResults = await promiseSortedResults
      if (sortedResults) {
        const newBatch = sortedResults.slice(size * page, size * (page + 1) - 1)
        visibleData = [...visibleData, ...newBatch]
        hasMore = sortedResults.length > visibleData.length; // hasMoreを更新
      }
    }
  }
</script>

<SubtypeOptions
  bind:currSubtypeInfo
  bind:noZero
  bind:ascOrder
  bind:sortBy
  bind:currFile
  bind:excludeLinked
  {app}
  {plugin}
  {view}
  bind:blockSwitch
  bind:visibleData
  bind:page
/>

<table class="GA-table markdown-preview-view" bind:this={current_component}>
  <thead>
    <tr>
      <th scope="col">Note</th>
      <th scope="col">Authority</th>
      <th scope="col">Hub</th>
    </tr>
  </thead>
  {#if promiseSortedResults}
    {#await promiseSortedResults then sortedResults}
      {#key sortedResults}
        {#each visibleData as node}
          {#if node !== undefined}
            <!-- svelte-ignore a11y-unknown-aria-attribute -->
            <tr class="{classExt(node.to)}">
              <td
                onmousedown={async (e) => {
                  if (e.button === 0 || e.button === 1)
                    await openOrSwitch(app, node.to, e)
                }}
                oncontextmenu={(e) =>
                  openMenu(e, app, { nodePath: node.to })}
                onmouseover={(e) => hoverPreview(e, view, dropPath(node.to))}
              >
                <ExtensionIcon path={node.to} />

                <span
                  class="internal-link
                  {node.resolved ? '' : 'is-unresolved'}
                    {currNode === node.to ? 'currNode' : ''}"
                >
                  {presentPath(node.to)}
                </span>
                {#if isImg(node.to)}
                  <ImgThumbnail img={node.img} />
                {/if}
              </td>
              <td class={MEASURE}>{node.authority}</td>
              <td class={MEASURE}>{node.hub}</td>
            </tr>
          {/if}
        {/each}

        <InfiniteScroll
          hasMore={sortedResults.length > visibleData.length}
          elementScroll={current_component.parentNode}
          onloadMore={loadMore}
        />
      {/key}
    {/await}
  {/if}
</table>
{#if promiseSortedResults}
  {#await promiseSortedResults then sortedResults}
    <div style="margin-top: 0.5em;">
      {visibleData.length} / {sortedResults.length}
    </div>
  {/await}
{/if}

<style>
  table.GA-table {
    border-collapse: collapse;
  }
  table.GA-table,
  table.GA-table tr,
  table.GA-table td {
    border: 1px solid var(--background-modifier-border);
  }

  table.GA-table td {
    padding: 2px;
    /* font-size: var(--font-size-secondary); */
  }

  .is-unresolved {
    color: var(--text-muted);
  }

  .GA-node {
    overflow: hidden;
  }

  .currNode {
    font-weight: bold;
  }
</style>
