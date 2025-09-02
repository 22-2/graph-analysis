<script lang="ts">
  import type { App } from 'obsidian'
  import { MarkdownView } from 'obsidian'
  import { hoverPreview } from 'obsidian-community-lib'
  import { isLinked, isInVault } from "src/Utility"
  import type AnalysisView from 'src/AnalysisView'
  import { ANALYSIS_TYPES, ICON, LINKED, NOT_LINKED } from 'src/Constants'
  import type { GraphAnalysisSettings, Subtype } from 'src/Interfaces'
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
  let currFile = $state(app.workspace.getActiveFile())

  let resolution = $state(10)
  interface ComponentResults {
    linked: boolean
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
  let hasMore = $state(false);

  let { resolvedLinks } = app.metadataCache

  const promiseSortedResults = $derived(
    !plugin.g || !currNode
      ? null
      : plugin.g.algs['Louvain'](currNode, { resolution }).then(
          (results: string[]) => {
            const componentResults: ComponentResults[] = []
            results.forEach((to) => {
              const resolved = !to.endsWith('.md') || isInVault(app, to)
              const linked = isLinked(resolvedLinks, currNode, to, false)
              const img =
                plugin.settings.showImgThumbnails && isImg(to)
                  ? getImgBufferPromise(app, to)
                  : null
              componentResults.push({
                linked,
                to,
                resolved,
                img,
              })
            })
            return componentResults
          }
        )
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
    console.count('louvain change')
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
    console.count('louvain leaf change')
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
  bind:currFile
  bind:frozen
  {app}
  {plugin}
  {view}
  bind:blockSwitch
  bind:visibleData
  bind:page
/>

<label for="resolution">Resolution: </label>
<input
  name="resolution"
  type="range"
  min="1"
  max="20"
  bind:value={resolution}
/>

<div class="GA-Results" bind:this={current_component}>
  {#if promiseSortedResults}
    {#await promiseSortedResults then sortedResults}
      {#key sortedResults}
        {#each visibleData as node}
          {#if node.to !== currNode && node !== undefined}
            <!-- svelte-ignore a11y-click-events-have-key-events -->
            <!-- svelte-ignore a11y-no-static-element-interactions -->
            <div
              class="
                {node.linked ? LINKED : NOT_LINKED}
              {classExt(node.to)}"
              onmousedown={async (e) => {
                if (e.button === 0 || e.button === 1)
                  await openOrSwitch(app, node.to, e)
              }}
            >
              <!-- svelte-ignore a11y-mouse-events-have-key-events -->
              <!-- svelte-ignore a11y-no-static-element-interactions -->
              <span
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
              </span>
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
  .GA-Results > div {
    padding: 0px 5px;
  }
  .is-unresolved {
    color: var(--text-muted);
  }

  .GA-node {
    overflow: hidden;
  }
</style>
