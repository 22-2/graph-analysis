<script lang="ts">
  import type { App } from 'obsidian'
  import type AnalysisView from 'src/AnalysisView'
  import { ICON, MEASURE, NODE } from 'src/Constants'
  import type { GraphAnalysisSettings } from 'src/Interfaces'
  import type GraphAnalysisPlugin from 'src/main'
  import {
    classExt,
    classLinked,
    classResolved,
    getImgBufferPromise,
    hoverPreview,
    isImg,
    isLinked,
    openMenu,
    openOrSwitch,
    presentPath,
  } from 'src/Utility'
  import FaLink from 'svelte-icons/fa/FaLink.svelte'
  import ExtensionIcon from './ExtensionIcon.svelte'
  import ImgThumbnail from './ImgThumbnail.svelte'

  type ComponentResult = {
    label: string
    comm: string[]
  }

  let {
    app,
    plugin,
    view,
    currNode,
    visibleData,
  } = $props<{
    app: App
    plugin: GraphAnalysisPlugin
    settings: GraphAnalysisSettings
    view: AnalysisView
    currNode: string
    visibleData: ComponentResult[]
  }>()

  let { resolvedLinks } = app.metadataCache
</script>

<div class="GA-CCs">
  {#each visibleData as comm (comm.label)}
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
              {presentPath(comm.label)}
            </span>
            <span class={MEASURE}>{comm.comm.length}</span>
          </span>
        </summary>
        <div class="GA-details">
          {#each comm.comm as member (member)}
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
                class="internal-link {currNode === member ? 'currNode' : ''}"
                >{presentPath(member)}</span
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
</div>

<style>
  .GA-CCs {
    display: flex;
    flex-direction: column;
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
