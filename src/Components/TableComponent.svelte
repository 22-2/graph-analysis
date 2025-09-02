<script lang="ts">
  import type { App } from 'obsidian'
  import type AnalysisView from 'src/AnalysisView'
  import { ICON, LINKED, MEASURE, NOT_LINKED } from 'src/Constants'
  import type { GraphAnalysisSettings, SubtypeInfo } from 'src/Interfaces'
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
  import FaLink from 'svelte-icons/fa/FaLink.svelte'
  import ExtensionIcon from './ExtensionIcon.svelte'
  import ImgThumbnail from './ImgThumbnail.svelte'

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
  } = $props<{
    app: App
    view: AnalysisView
    currNode: string
    visibleData: ComponentResult[]
    currSubtypeInfo: SubtypeInfo
    // Unused props to match signature
    plugin: GraphAnalysisPlugin
    settings: GraphAnalysisSettings
  }>()
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
          <!-- svelte-ignore a11y-unknown-aria-attribute -->
          <tr class="{node.linked ? LINKED : NOT_LINKED} {classExt(node.to)}">
            <td
              aria-label={node.extra?.map(presentPath).join('\n')}
              aria-label-position="left"
              onmousedown={async (e) => {
                if (e.button === 0 || e.button === 1)
                  await openOrSwitch(app, node.to, e)
              }}
              oncontextmenu={(e) => openMenu(e, app, { nodePath: node.to })}
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
