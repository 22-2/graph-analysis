<script lang="ts">
  import type { App, TFile } from 'obsidian'
  import type AnalysisView from 'src/AnalysisView'
  import type { SubtypeInfo } from 'src/Interfaces'
  import type GraphAnalysisPlugin from 'src/main'
  import ObsidianIcon from 'src/Components/ObsidianIcon.svelte'
  import InfoIcon from './InfoIcon.svelte'

  type SubtypeOptionsProps = {
    currSubtypeInfo?: SubtypeInfo
    noZero?: boolean
    sortBy?: boolean
    ascOrder?: boolean
    currFile?: TFile
    frozen?: boolean
    excludeLinked?: boolean
    disableExcludeLinked?: boolean
    plugin: GraphAnalysisPlugin
    app: App
    view: AnalysisView
  }

  let {
    currSubtypeInfo,
    noZero = $bindable(undefined),
    sortBy = $bindable(undefined),
    ascOrder = $bindable(undefined),
    currFile = $bindable(undefined),
    frozen = $bindable(undefined),
    excludeLinked = $bindable(undefined),
    disableExcludeLinked = false,
    plugin,
    app,
    view,
  }: SubtypeOptionsProps = $props()
</script>

<div class="GA-Subtype-Options">
  <div class="GA-toolbar" role="toolbar">
    {#if currSubtypeInfo}
      <span class="GA-Option-span">
        <span class="icon">
          <InfoIcon {currSubtypeInfo}></InfoIcon>
        </span>
      </span>
      <span class="GA-divider" aria-hidden="true"></span>
    {/if}

    {#if excludeLinked !== undefined && !disableExcludeLinked}
      <button
        type="button"
        class="clickable-icon GA-Option-span"
        class:is-active={excludeLinked}
        aria-pressed={excludeLinked}
        aria-label={excludeLinked ? 'Show Linked Notes' : 'Exclude Linked Notes'}
        onclick={() => {
          excludeLinked = !excludeLinked
        }}
      >
        <ObsidianIcon iconName={excludeLinked ? 'unlink' : 'link'}></ObsidianIcon>
      </button>
    {/if}
    {#if noZero !== undefined}
      <button
        type="button"
        class="clickable-icon GA-Option-span"
        class:is-active={noZero}
        aria-pressed={noZero}
        aria-label={noZero ? 'Show Zeros' : 'Hide Zeros'}
        onclick={() => {
          noZero = !noZero
        }}
      >
        <ObsidianIcon iconName={noZero ? 'circle-slash' : 'circle'}></ObsidianIcon>
      </button>
    {/if}
    {#if ascOrder !== undefined}
      <button
        type="button"
        class="clickable-icon GA-Option-span"
        aria-label={ascOrder ? 'Descending' : 'Ascending'}
        onclick={() => {
          ascOrder = !ascOrder
        }}
      >
        <ObsidianIcon iconName={ascOrder ? 'trending-up' : 'trending-down'}></ObsidianIcon>
      </button>
    {/if}
    {#if frozen !== undefined}
      <button
        type="button"
        class="clickable-icon GA-Option-span"
        class:is-active={frozen}
        aria-pressed={frozen}
        aria-label={frozen ? `Frozen on: ${currFile?.basename}` : 'Unfrozen'}
        onclick={() => {
          frozen = !frozen
          if (!frozen) {
            setTimeout(() => (currFile = app.workspace.getActiveFile() ?? undefined), 100)
          }
        }}
      >
        <ObsidianIcon iconName={frozen ? 'snowflake' : 'flame'}></ObsidianIcon>
      </button>
    {/if}
    {#if sortBy !== undefined}
      <button
        type="button"
        class="clickable-icon GA-Option-span"
        aria-label="Sort By: {sortBy ? 'Authority' : 'Hub'}"
        onclick={() => {
          sortBy = !sortBy
        }}
      >
        <ObsidianIcon iconName={sortBy ? 'log-in' : 'log-out'}></ObsidianIcon>
      </button>
    {/if}
  </div>

  <button
    type="button"
    class="clickable-icon GA-Option-span GA-refresh"
    aria-label="Refresh Index"
    onclick={async () => {
      // Refresh Index はユーザー操作による再抽選意図があるため、キャッシュを使わず再計算するっす
      await plugin.refreshGraphAndViews(true)
    }}
  >
    <ObsidianIcon iconName="refresh-cw"></ObsidianIcon>
  </button>
</div>

<style>
  .GA-Subtype-Options {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 8px;
    padding: 4px 10px 6px;
  }

  /* アイコン群を1枚の面にまとめる */
  .GA-toolbar {
    display: inline-flex;
    align-items: center;
    gap: 2px;
    padding: 2px;
    background-color: var(--background-primary-alt);
    border: 1px solid var(--background-modifier-border);
    border-radius: var(--radius-m, 8px);
  }

  .GA-divider {
    align-self: stretch;
    width: 1px;
    margin: 4px 3px;
    background-color: var(--background-modifier-border);
  }

  .icon {
    color: var(--text-muted);
    display: inline-flex;
    align-items: center;
    justify-content: center;
    width: 16px;
    height: 16px;
  }

  .GA-Option-span {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    min-width: 28px;
    height: 28px;
    padding: 0;
    border-radius: var(--radius-s, 6px);
    color: var(--text-muted);
  }

  button.GA-Option-span {
    cursor: pointer;
  }
  button.GA-Option-span:hover {
    color: var(--text-normal);
    background-color: var(--background-modifier-hover);
  }

  /* ON になっているトグルは、アクセント色の淡い面で示す */
  button.GA-Option-span.is-active {
    color: var(--interactive-accent);
    background-color: color-mix(in srgb, var(--interactive-accent) 16%, transparent);
  }

  /* グローバル CSS の位置ずれ補正を、ツールバー内では打ち消す */
  :global(.GA-Subtype-Options .GA-icon) {
    width: 16px;
    height: 16px;
    padding-top: 0 !important;
  }

  button.GA-Option-span:focus-visible {
    outline: 2px solid var(--interactive-accent);
    outline-offset: -2px;
  }

  .GA-refresh {
    flex: none;
  }
</style>
