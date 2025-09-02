<script lang="ts">
  import debounce from 'lodash.debounce'
  import type { App } from 'obsidian'
  import { MarkdownView } from 'obsidian'
  import type AnalysisView from 'src/AnalysisView'
  import { ANALYSIS_TYPES, ICON, LINKED, MEASURE, NOT_LINKED } from 'src/Constants'
  import type {
    GraphAnalysisSettings,
    ResultMap,
    Subtype,
  } from 'src/Interfaces'
  import type GraphAnalysisPlugin from 'src/main'
  import {
    classExt,
    dropPath,
    getImgBufferPromise, hoverPreview, isImg, isInVault, isLinked, openMenu,
    openOrSwitch,
    presentPath
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
  let frozen = $state(false)
  let ascOrder = $state(false)
  let noInfinity = $state(settings.noInfinity)
  let noZero = $state(settings.noZero)
  let excludeLinked = $state(settings.excludeLinked)
  let currFile = $state(app.workspace.getActiveFile())

  interface ComponentResults {
    measure: number
    linked: boolean
    to: string
    resolved: boolean
    extra: string[]
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

  const promiseSortedResults = $derived(
    !plugin.g || !currNode
      ? null
      : plugin.g.algs[currSubtype](currNode).then((results: ResultMap) => {
          const greater = ascOrder ? 1 : -1
          const lesser = ascOrder ? -1 : 1
          const componentResults: ComponentResults[] = []

          plugin.g.forEachNode((to) => {
            const { measure, extra } = (results as ResultMap)[to]
            const linked = isLinked(resolvedLinks, currNode, to, false)
            if (
              !(noInfinity && measure === Infinity) &&
              !(noZero && measure === 0) &&
              !(excludeLinked && linked)
            ) {
              const resolved = !to.endsWith('.md') || isInVault(app, to)
              const img =
                plugin.settings.showImgThumbnails && isImg(to)
                  ? getImgBufferPromise(app, to)
                  : null
              componentResults.push({
                measure,
                linked,
                to,
                resolved,
                extra,
                img,
              })
            }
          })
          componentResults.sort((a, b) => {
            return a.measure === b.measure
              ? a.extra?.length > b.extra?.length
                ? greater
                : lesser
              : a.measure > b.measure
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

  const onMetadataChange = async () => {
    if (!current_component.checkVisibility()) {
      return
    }
    if (!frozen) {
      setTimeout(() => (currFile = app.workspace.getActiveFile()), 100)
      await plugin.refreshGraph()
      await view.draw(currSubtypeInfo!.subtype)
    }
    console.count('table change')
  }

  const onLeafChange = () => {
    const view = app.workspace.getActiveViewOfType(MarkdownView)

    if (!view) {
      return
    }

    const pathEq = view.file?.path === currFile?.path
    if (pathEq) {
      return
    }

    if (!frozen) {
      setTimeout(() => (currFile = app.workspace.getActiveFile()), 100)
    }
    console.count('table component leaf change')
  }

  const debouncedMetadataChange = debounce(onMetadataChange, 1000)

  onMount(() => {
    currFile = app.workspace.getActiveFile()
    app.workspace.on('active-leaf-change', onLeafChange)
    app.metadataCache.on('changed', debouncedMetadataChange)
  })

  onDestroy(() => {
    app.workspace.off('active-leaf-change', onLeafChange)
    app.metadataCache.off('changed', debouncedMetadataChange)
    // Clear state
    visibleData = []
    currFile = null
  })
</script>

<SubtypeOptions
  bind:currSubtypeInfo
  bind:noZero
  bind:ascOrder
  bind:currFile
  bind:frozen
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
      <th scope="col">Value</th>
    </tr>
  </thead>
  {#if promiseSortedResults}
    {#await promiseSortedResults then sortedResults}
      {#key sortedResults}
        {#each visibleData as node}
          {#if (currSubtypeInfo.global || node.to !== currNode) && node !== undefined}
            <!-- svelte-ignore a11y-unknown-aria-attribute -->
            <tr
              class="{node.linked ? LINKED : NOT_LINKED}
            {classExt(node.to)}"
            >
              <td
                aria-label={node.extra.map(presentPath).join('\n')}
                aria-label-position="left"
                onmousedown={async (e) => {
                  if (e.button === 0 || e.button === 1)
                    await openOrSwitch(app, node.to, e)
                }}
                oncontextmenu={(e) =>
                  openMenu(e, app, { nodePath: node.to })}
                onmouseover={(e) => hoverPreview(e, view, dropPath(node.to))}
              >
                {#if node.linked}
                  <span class={ICON}>
                    <FaLink />
                  </span>
                {/if}

                <ExtensionIcon path={node.to} />

                <span
                  class="internal-link {node.resolved ? '' : 'is-unresolved'}"
                >
                  {presentPath(node.to)}
                </span>
                {#if isImg(node.to)}
                  <ImgThumbnail img={node.img} />
                {/if}
              </td>
              <td class={MEASURE}>{node.measure}</td>
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
</style>
