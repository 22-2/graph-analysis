<script lang="ts">
  import type { App } from 'obsidian'
  import type AnalysisView from 'src/AnalysisView'
  import { LINKED, NOT_LINKED } from 'src/Constants'
  import type { GraphAnalysisSettings } from 'src/Interfaces'
  import type GraphAnalysisPlugin from 'src/main'
  import {
    classExt,
    dropPath,
    hoverPreview,
    openMenu,
    openOrSwitch,
  } from 'src/Utility'
  import NodeLabel from './NodeLabel.svelte'

  type ComponentResult = {
    linked: boolean
    to: string
    resolved: boolean
    img: Promise<ArrayBuffer> | null
  }

  let {
    app,
    view,
    currNode,
    visibleData,
  } = $props<{
    app: App
    view: AnalysisView
    currNode: string
    visibleData: ComponentResult[]
    // Unused props to match signature
    plugin: GraphAnalysisPlugin
    settings: GraphAnalysisSettings
    its?: number
    resolution?: number
  }>()
</script>

<div class="GA-Results">
  {#each visibleData as node (node.to)}
    {#if node.to !== currNode}
      <!-- svelte-ignore a11y_click_events_have_key_events -->
      <!-- svelte-ignore a11y_no_static_element_interactions -->
      <div
        class="
                {node.linked ? LINKED : NOT_LINKED}
              {classExt(node.to)}"
        onmousedown={async (e) => {
          if (e.button === 0 || e.button === 1)
            await openOrSwitch(app, node.to, e)
        }}
      >
        <!-- svelte-ignore a11y_mouse_events_have_key_events -->
        <!-- svelte-ignore a11y_no_static_element_interactions -->
        <span
          oncontextmenu={(e) => openMenu(e, app, { nodePath: node.to })}
          onmouseover={(e) => hoverPreview(e, view, dropPath(node.to))}
        >
          <NodeLabel
            path={node.to}
            img={node.img}
            linked={node.linked}
            resolved={node.resolved}
          />
        </span>
      </div>
    {/if}
  {/each}
</div>

<style>
  .GA-Results > div {
    padding: 2px 5px;
    border-radius: 4px;
  }
  .GA-Results > div:hover {
    background-color: var(--background-secondary-alt);
  }
  .is-unresolved {
    color: var(--text-muted);
  }
</style>
