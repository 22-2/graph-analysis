<script lang="ts">
  import type { App } from 'obsidian'
  import type AnalysisView from 'src/AnalysisView'
  import { MEASURE } from 'src/Constants'
  import type { CoCitation, GraphAnalysisSettings } from 'src/Interfaces'
  import type GraphAnalysisPlugin from 'src/main'
  import {
    dropPath,
    hoverPreview,
    openMenu,
    openOrSwitch,
    presentPath,
  } from 'src/Utility'
  import NodeLabel from './NodeLabel.svelte'
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
  }: {
    app: App
    view: AnalysisView
    visibleData: ComponentResult[]
    // Unused props to match signature
    plugin: GraphAnalysisPlugin
    settings: GraphAnalysisSettings
    currNode?: string
    its?: number
    resolution?: number
  } = $props()
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
              <span
                onmousedown={async (e) => {
                  if (e.button === 0 || e.button === 1)
                    await openOrSwitch(app, node.to, e)
                }}
                onmouseover={(e) => hoverPreview(e, view, dropPath(node.to))}
              >
                <NodeLabel
                  path={node.to}
                  img={node.img}
                  linked={node.linked}
                  resolved={node.resolved}
                ></NodeLabel>
              </span>
              <span class={MEASURE}>{node.measure.toFixed(2)}</span>
            </span>
          </summary>
          <div class="GA-details">
            {#each node.coCitations as citation (citation.source + citation.line)}
              <div class="citation-group">
                <div class="CC-item">
                  From:
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
                ></RenderedMarkdown>
              </div>
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
  .GA-CC details {
    display: block;
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
  .citation-group {
    margin-bottom: 0.5em;
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
