<script lang="ts">
  import type { App } from 'obsidian'
  import type AnalysisView from 'src/AnalysisView'
  import { MEASURE } from 'src/Constants'
  import type { GraphAnalysisSettings } from 'src/Interfaces'
  import type GraphAnalysisPlugin from 'src/main'
  import {
    classExt,
    dropPath,
    hoverPreview,
    isImg,
    openMenu,
    openOrSwitch,
    presentPath,
  } from 'src/Utility'
  import ExtensionIcon from './ExtensionIcon.svelte'
  import ImgThumbnail from './ImgThumbnail.svelte'

  type ComponentResult = {
    authority: number
    hub: number
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
    currSubtypeInfo: any
  }>()
</script>

<div>
  <table class="GA-table markdown-preview-view">
    <thead>
      <tr>
        <th scope="col">Note</th>
        <th scope="col">Authority</th>
        <th scope="col">Hub</th>
      </tr>
    </thead>
    <tbody>
      {#each visibleData as node (node.to)}
        <!-- svelte-ignore a11y-unknown-aria-attribute -->
        <tr class="{classExt(node.to)}">
          <td
            onmousedown={async (e) => {
              if (e.button === 0 || e.button === 1)
                await openOrSwitch(app, node.to, e)
            }}
            oncontextmenu={(e) => openMenu(e, app, { nodePath: node.to })}
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
      {/each}
    </tbody>
  </table>
</div>

<style>
  table.GA-table {
    width: 100%;
    border-collapse: collapse;
  }
  table.GA-table,
  table.GA-table tr,
  table.GA-table td {
    border: 1px solid var(--background-modifier-border);
  }

  table.GA-table td {
    padding: 2px;
  }

  .is-unresolved {
    color: var(--text-muted);
  }

  .currNode {
    font-weight: bold;
  }
</style>
