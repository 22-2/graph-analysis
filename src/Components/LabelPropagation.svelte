<script lang="ts">
  import type { App } from 'obsidian'
  import type AnalysisView from 'src/AnalysisView'
  import { ANALYSIS_TYPES, ICON, MEASURE, NODE } from 'src/Constants'
  import type {
    Communities,
    GraphAnalysisSettings,
    Subtype,
  } from 'src/Interfaces'
  import type GraphAnalysisPlugin from 'src/main'
  import {
    classExt,
    classLinked,
    classResolved,
    getImgBufferPromise, hoverPreview, isImg, isLinked, openMenu,
    openOrSwitch,
    presentPath
  } from 'src/Utility'
  import { onDestroy, onMount } from 'svelte'
  import FaLink from 'svelte-icons/fa/FaLink.svelte'
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

  interface ComponentResults {
    label: string
    comm: string[]
  }

  let { resolvedLinks } = app.metadataCache

  let currSubtypeInfo = $derived(
    ANALYSIS_TYPES.find((sub) => sub.subtype === currSubtype)
  )
  let ascOrder = $state(false)
  let size = 50
  let current_component: HTMLElement
  let visibleData = $state<ComponentResults[]>([])
  let page = $state(0)
  let blockSwitch = $state(false)
  let hasMore = $state(false);

  let currFile = $state(app.workspace.getActiveFile())
  const currNode = $derived(currFile?.path)

  const onLeafChange = () => {
    blockSwitch = true
    setTimeout(() => {
      blockSwitch = false
      currFile = app.workspace.getActiveFile()
    }, 100)
  }

  let its = $state(20)
  const iterationsArr = Array(50)
    .fill(0)
    .map((i, j) => j + 1)

  const promiseSortedResults = $derived(
    !plugin.g
      ? null
      : plugin.g.algs[currSubtype]('', { iterations: its }).then(
          (comms: Communities) => {
            const greater = ascOrder ? 1 : -1
            const lesser = ascOrder ? -1 : 1

            const componentResults: ComponentResults[] = []
            Object.keys(comms).forEach((label) => {
              let comm = comms[label]
              if (comm.length > 1) {
                componentResults.push({
                  label,
                  comm,
                })
              }
            })
            componentResults.sort((a, b) =>
              a.comm.length > b.comm.length ? greater : lesser
            )
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

  onMount(() => {
    currFile = app.workspace.getActiveFile()
    app.workspace.on('active-leaf-change', onLeafChange)
  })

  onDestroy(() => {
    app.workspace.off('active-leaf-change', onLeafChange)
  })
</script>

<div class="GA-CCs" bind:this={current_component}>
  <div>
    <span>
      <SubtypeOptions
        bind:currSubtypeInfo
        bind:ascOrder
        bind:blockSwitch
        bind:visibleData
        bind:page
        {plugin}
        {view}
        {app}
      />

      <label for="iterations">Iterations: </label>
      <input
        name="iterations"
        type="range"
        min="1"
        max="30"
        bind:value={its}
      />
    </span>
  </div>
  {#if promiseSortedResults}
    {#await promiseSortedResults then sortedResults}
      {#key sortedResults}
        {#each visibleData as comm}
          <div class="GA-CC">
            <details class="tree-item-self">
              <summary
                class="tree-item-inner"
                oncontextmenu={(e) =>
                  openMenu(e, app, { toCopy: comm.comm.join('\n') })}
              >
                <span
                  class="top-row
                  {comm.comm.includes(currNode) ? 'currComm' : ''}"
                >
                  <span>
                    <!-- Unecessary span? -->
                    {presentPath(comm.label)}
                  </span>
                  <span class={MEASURE}>{comm.comm.length}</span>
                </span>
              </summary>
              <div class="GA-details ">
                {#each comm.comm as member}
                  <div
                    class="
                    {NODE}
                    {classLinked(resolvedLinks, comm.label, member)}
                    {classResolved(app, member)}
                    {classExt(member)}
                      "
                    onmousedown={async (e) => {
                      if (e.button === 0 || e.button === 1)
                        await openOrSwitch(app, member, e)
                    }}
                    onmouseover={(e) => hoverPreview(e, view, member)}
                  >
                    {#if isLinked(resolvedLinks, comm.label, member, false)}
                      <span class={ICON}>
                        <FaLink />
                      </span>
                    {/if}
                    <ExtensionIcon path={member} />
                    <span
                      class="internal-link {currNode === member
                        ? 'currNode'
                        : ''}">{presentPath(member)}</span
                    >
                    {#if plugin.settings.showImgThumbnails && isImg(member)}
                      <ImgThumbnail img={getImgBufferPromise(app, member)} />
                    {/if}
                  </div>
                {/each}
              </div>
            </details>
          </div>
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
  /* .GA-CC {
        border: 1px solid var(--background-modifier-border);
        border-radius: 3px;
        padding: 5px;
      } */

  .GA-details {
    padding-left: 20px;
  }
  .GA-node,
  .CC-sentence {
    font-size: var(--font-size-secondary);
    border: 1px solid transparent;
    border-radius: 5px;
  }

  .CC-sentence:hover {
    background-color: var(--background-secondary-alt);
  }

  .CC-item {
    padding-left: 30px;
    font-weight: 600;
  }

  .CC-sentence {
    padding-left: 40px;
    color: var(--text-muted);
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

  .currComm {
    color: var(--text-accent);
  }

  .currNode {
    font-weight: bold;
  }
</style>
