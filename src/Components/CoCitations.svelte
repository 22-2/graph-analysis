<script lang="ts">
  import type { App } from 'obsidian'
  import { MarkdownView } from 'obsidian'
  import { hoverPreview } from 'obsidian-community-lib'
  import type AnalysisView from 'src/AnalysisView'
  import { isLinked } from "src/Utility"
  import { ANALYSIS_TYPES, ICON, MEASURE, NODE } from 'src/Constants'
  import type {
    CoCitation,
    CoCitationMap,
    GraphAnalysisSettings,
    Subtype,
  } from 'src/Interfaces'
  import type GraphAnalysisPlugin from 'src/main'
  import {
    classExt,
    dropPath,
    getImgBufferPromise,
    isImg,
    openMenu,
    openOrSwitch,
    presentPath,
  } from 'src/Utility'
  import { onDestroy, onMount } from 'svelte'
  import FaLink from 'svelte-icons/fa/FaLink.svelte'
  import InfiniteScroll from './InfiniteScroll.svelte'
  import ExtensionIcon from './ExtensionIcon.svelte'
  import ImgThumbnail from './ImgThumbnail.svelte'
  import SubtypeOptions from './SubtypeOptions.svelte'
  import debounce from 'lodash.debounce'
  import RenderedMarkdown from './RenderedMarkdown.svelte'

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
  let excludeLinked = $state(settings.excludeLinked)
  let currFile = $state(app.workspace.getActiveFile())

  interface ComponentResult {
    to: string
    measure: number
    resolved: boolean
    coCitations: CoCitation[]
    linked: boolean
    img: Promise<ArrayBuffer> | null
  }

  const currNode = $derived(currFile?.path)
  let size = 50
  let current_component: HTMLElement
  let visibleData = $state<ComponentResult[]>([])
  let page = $state(0)
  let blockSwitch = $state(false)
  let hasMore = $state(false);

  let { resolvedLinks } = app.metadataCache

  const promiseSortedResults = $derived(
    !plugin.g || !currNode
      ? null
      : plugin.g.algs['Co-Citations'](currNode).then((results: CoCitationMap) => {
          const componentResults: ComponentResult[] = []
          const greater = ascOrder ? 1 : -1
          const lesser = ascOrder ? -1 : 1

          for (const to in results) {
            const result = results[to]
            const linked = isLinked(resolvedLinks, currNode, to, false)
            if (!(excludeLinked && linked)) {
              componentResults.push({
                to,
                measure: result.measure,
                resolved: result.resolved,
                coCitations: result.coCitations.sort(
                  (a, b) => b.measure - a.measure
                ),
                linked,
                img:
                  plugin.settings.showImgThumbnails && isImg(to)
                    ? getImgBufferPromise(app, to)
                    : null,
              })
            }
          }
          componentResults.sort((a, b) =>
            a.measure > b.measure ? greater : lesser
          )
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
    console.count('cocitations change')
  }

  const onLeafChange = () => {
    const view = app.workspace.getActiveViewOfType(MarkdownView)
    if (!view) return
    const pathEq = view.file?.path === currFile?.path
    if (pathEq) return

    if (!frozen) {
      setTimeout(() => (currFile = app.workspace.getActiveFile()), 100)
    }
    console.count('cocitations leaf change')
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

<div class="GA-CCs" bind:this={current_component}>
  {#if promiseSortedResults}
    {#await promiseSortedResults then sortedResults}
      {#key sortedResults}
        {#each visibleData as node}
          {#if node.to !== currNode && node !== undefined && node.measure > 0}
            <div class="GA-CC">
              <details class="tree-item-self">
                <summary
                  class="tree-item-inner"
                  oncontextmenu={(e) => openMenu(e, app, { nodePath: node.to })}
                >
                  <span class="top-row">
                    <!-- svelte-ignore a11y-mouse-events-have-key-events -->
                    <!-- svelte-ignore a11y-no-static-element-interactions -->
                    <span
                      onmousedown={async (e) => {
                        if (e.button === 0 || e.button === 1)
                          await openOrSwitch(app, node.to, e)
                      }}
                      onmouseover={(e) =>
                        hoverPreview(e, view, dropPath(node.to))}
                    >
                      {#if node.linked}
                        <span class={ICON}><FaLink /></span>
                      {/if}
                      <ExtensionIcon path={node.to} />
                      <span
                        class="internal-link {node.resolved
                          ? ''
                          : 'is-unresolved'}"
                      >
                        {presentPath(node.to)}
                      </span>
                      {#if isImg(node.to)}
                        <ImgThumbnail img={node.img} />
                      {/if}
                    </span>
                    <span class={MEASURE}>{node.measure.toFixed(2)}</span>
                  </span>
                </summary>
                <div class="GA-details">
                  {#each node.coCitations as citation}
                    <div class="CC-item">
                      From:
                      <!-- svelte-ignore a11y-mouse-events-have-key-events -->
                      <!-- svelte-ignore a11y-no-static-element-interactions -->
                      <span
                        class="internal-link"
                        onmousedown={async (e) => {
                          if (e.button === 0 || e.button === 1)
                            await openOrSwitch(app, citation.source, e)
                        }}
                        onmouseover={(e) =>
                          hoverPreview(e, view, dropPath(citation.source))}
                      >
                        {presentPath(citation.source)}
                      </span>
                      ({citation.measure.toFixed(2)})
                    </div>
                    <RenderedMarkdown
                      {app}
                      sentence={citation.sentence}
                      sourcePath={citation.source}
                      line={citation.line}
                      component={view}
                    />
                  {/each}
                </div>
              </details>
            </div>
          {/if}
        {/each}

        <InfiniteScroll
          hasMore={sortedResults.length > visibleData.length}
          elementScroll={current_component.parentNode}
          onloadMore={loadMore}
        />
        {visibleData.length} / {sortedResults.length}
      {/key}
    {/await}
  {/if}
</div>

<style>
  .GA-CCs {
    display: flex;
    flex-direction: column;
    padding-left: 10px;
  }
  .is-unresolved {
    color: var(--text-muted);
  }
  .GA-details {
    padding-left: 20px;
  }
  .GA-node,
  .CC-sentence {
    font-size: var(--font-size-secondary);
    border: 1px solid transparent;
    border-radius: 5px;
  }
  .CC-item {
    padding-left: 30px;
    font-weight: 600;
  }
  .top-row span + span {
    float: right;
  }
  span.GA-measure {
    background-color: var(--background-secondary-alt);
    padding: 2px 4px;
    border-radius: 3px;
    font-size: 12px;
    line-height: 12px;
  }
  span.GA-measure:hover {
    background-color: var(--interactive-accent);
  }
</style>
