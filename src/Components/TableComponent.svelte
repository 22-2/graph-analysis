<script lang="ts">
  import type { App } from 'obsidian'
  import type AnalysisView from 'src/AnalysisView'
  import { LINKED, MEASURE, NOT_LINKED } from 'src/Constants'
  import type { GraphAnalysisSettings, SubtypeInfo } from 'src/Interfaces'
  import type GraphAnalysisPlugin from 'src/main'
  import {
    classExt,
    dropPath,
    hoverPreview,
    openMenu,
    openOrSwitch,
    presentPath,
  } from 'src/Utility'
  import NodeLabel from './NodeLabel.svelte'

  type ComponentResult = {
    measure: number
    linked: boolean
    to: string
    resolved: boolean
    extra: string[]
    img: Promise<ArrayBuffer> | null
  }

  let {
    app,
    view,
    currNode,
    visibleData,
    currSubtypeInfo,
  }: {
    app: App
    view: AnalysisView
    currNode: string
    visibleData: ComponentResult[]
    currSubtypeInfo: SubtypeInfo
    // Unused props to match signature
    plugin: GraphAnalysisPlugin
    settings: GraphAnalysisSettings
    its?: number
    resolution?: number
  } = $props()
</script>

<div>
  <table class="GA-table markdown-preview-view">
    <thead>
      <tr>
        <th scope="col">Note</th>
        <th scope="col">Value</th>
      </tr>
    </thead>
    <tbody>
      {#each visibleData as node (node.to)}
        {#if currSubtypeInfo.global || node.to !== currNode}
          <tr class="{node.linked ? LINKED : NOT_LINKED} {classExt(node.to)}">
            <td
              aria-label={node.extra?.map(presentPath).join('\n')}
              onclick={async (e) => {
                await openOrSwitch(app, node.to, e)
              }}
              onmousedown={async (e) => {
                if (e.button === 1) {
                  e.preventDefault();
                  await openOrSwitch(app, node.to, e)
                }
              }}
              onauxclick={async (e) => {
                if (e.button === 2) {
                  await openOrSwitch(app, node.to, e)
                }
              }}
              oncontextmenu={(e) => openMenu(e, app, { nodePath: node.to })}
              onmouseover={(e) => hoverPreview(e, view, dropPath(node.to))}
            >
              <NodeLabel
                path={node.to}
                img={node.img}
                linked={node.linked}
                resolved={node.resolved}
              />
            </td>
            <td class={MEASURE}>{node.measure}</td>
          </tr>
        {/if}
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
</style>
