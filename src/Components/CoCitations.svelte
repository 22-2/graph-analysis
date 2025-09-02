<script lang="ts">
  import type { App } from 'obsidian'
  import type AnalysisView from 'src/AnalysisView'
  import { ICON, MEASURE } from 'src/Constants'
  import type {
    CoCitation,
    GraphAnalysisSettings,
  } from 'src/Interfaces'
  import type GraphAnalysisPlugin from 'src/main'
  import {
    dropPath,
    hoverPreview,
    isImg,
    openMenu,
    openOrSwitch,
    presentPath,
  } from 'src/Utility'
  import FaLink from 'svelte-icons/fa/FaLink.svelte'
  import ExtensionIcon from './ExtensionIcon.svelte'
  import ImgThumbnail from './ImgThumbnail.svelte'
  import RenderedMarkdown from './RenderedMarkdown.svelte'

  type ComponentResult = {
    to: string
    measure: number
    resolved: boolean
    coCitations: CoCitation[]
    linked: boolean
    img: Promise<ArrayBuffer> | null
  }

  let {
    app,
    view,
    visibleData,
  } = $props<{
    app: App
    view: AnalysisView
    visibleData: ComponentResult[]
    // Unused props to match signature
    plugin: GraphAnalysisPlugin
    settings: GraphAnalysisSettings
    currNode: string
  }>()
</script>

<div class="GA-CCs">
  {#each visibleData as node (node.to)}
    {#if node.measure > 0}
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
                onmouseover={(e) => hoverPreview(e, view, dropPath(node.to))}
              >
                {#if node.linked}
                  <span class={ICON}><FaLink /></span>
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
              <span class={MEASURE}>{node.measure.toFixed(2)}</span>
            </span>
          </summary>
          <div class="GA-details">
            {#each node.coCitations as citation (citation.source + citation.line)}
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
