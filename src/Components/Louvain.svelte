<script lang="ts">
  import type { App } from 'obsidian'
  import type AnalysisView from 'src/AnalysisView'
  import { ICON, LINKED, NOT_LINKED } from 'src/Constants'
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
  import FaLink from 'svelte-icons/fa/FaLink.svelte'
  import ExtensionIcon from './ExtensionIcon.svelte'
  import ImgThumbnail from './ImgThumbnail.svelte'

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
  }>()
</script>

<div class="GA-Results">
  {#each visibleData as node (node.to)}
    {#if node.to !== currNode}
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
          oncontextmenu={(e) => openMenu(e, app, { nodePath: node.to })}
          onmouseover={(e) => hoverPreview(e, view, dropPath(node.to))}
        >
          {#if node.linked}
            <span class={ICON}>
              <FaLink />
            </span>
          {/if}

          <ExtensionIcon path={node.to} />

          <span class="internal-link {node.resolved ? '' : 'is-unresolved'}">
            {presentPath(node.to)}
          </span>
          {#if isImg(node.to)}
            <ImgThumbnail img={node.img} />
          {/if}
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
