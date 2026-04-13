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
    plugin: GraphAnalysisPlugin
    app: App
    view: AnalysisView
  }

  let {
    currSubtypeInfo = $bindable(),
    noZero = $bindable(undefined),
    sortBy = $bindable(undefined),
    ascOrder = $bindable(undefined),
    currFile = $bindable(undefined),
    frozen = $bindable(undefined),
    excludeLinked = $bindable(undefined),
    plugin,
    app,
    view,
  }: SubtypeOptionsProps = $props()
</script>

<span class="GA-Subtype-Options">
  {#if currSubtypeInfo}
    <span class="GA-Option-span">
      <span class="icon">
        <InfoIcon {currSubtypeInfo} />
      </span>
    </span>
  {/if}

  {#if excludeLinked !== undefined}
    <!-- svelte-ignore a11y-click-events-have-key-events -->
    <span
      class="GA-Option-span"
      aria-label={excludeLinked ? 'Show Linked Notes' : 'Exclude Linked Notes'}
      onclick={() => {
        excludeLinked = !excludeLinked
      }}
    >
      <span class="icon">
        {#if excludeLinked}
          <ObsidianIcon iconName="unlink" />
        {:else}
          <ObsidianIcon iconName="link" />
        {/if}
      </span>
    </span>
  {/if}
  {#if noZero !== undefined}
    <span
      class="GA-Option-span"
      aria-label={noZero ? 'Show Zeros' : 'Hide Zeros'}
      onclick={() => {
        noZero = !noZero
      }}
    >
      <span class="icon">
        {#if noZero}
          <ObsidianIcon iconName="circle-slash" />
        {:else}
          <ObsidianIcon iconName="circle" />
        {/if}
      </span>
    </span>
  {/if}
  {#if ascOrder !== undefined}
    <span
      class="GA-Option-span"
      aria-label={ascOrder ? 'Descending' : 'Ascending'}
      onclick={() => {
        ascOrder = !ascOrder
      }}
    >
      <span class="icon">
        {#if ascOrder}
          <ObsidianIcon iconName="trending-up" />
        {:else}
          <ObsidianIcon iconName="trending-down" />
        {/if}
      </span>
    </span>
  {/if}
  {#if frozen !== undefined}
    <!-- svelte-ignore a11y-click-events-have-key-events -->
    <span
      class="GA-Option-span"
      aria-label={frozen ? `Frozen on: ${currFile?.basename}` : 'Unfrozen'}
      onclick={() => {
        frozen = !frozen
        if (!frozen) {
          setTimeout(() => (currFile = app.workspace.getActiveFile()), 100)
        }
      }}
    >
      <span class="icon">
        {#if frozen}
          <ObsidianIcon iconName="snowflake" />
        {:else}
          <ObsidianIcon iconName="flame" />
        {/if}
      </span>
    </span>
  {/if}
  {#if sortBy !== undefined}
    <!-- svelte-ignore a11y-click-events-have-key-events -->
    <span
      class="GA-Option-span"
      aria-label="Sort By: {sortBy ? 'Authority' : 'Hub'}"
      onclick={() => {
        sortBy = !sortBy
      }}
    >
      <span class="icon">
        {#if sortBy}
          <ObsidianIcon iconName="log-in" />
        {:else}
          <ObsidianIcon iconName="log-out" />
        {/if}
      </span>
    </span>
  {/if}
  <!-- svelte-ignore a11y-click-events-have-key-events -->
  <span
    class="GA-Option-span"
    aria-label="Refresh Index"
    onclick={async () => {
      await plugin.refreshGraphAndViews()
    }}
  >
    <span class="icon">
      <ObsidianIcon iconName="refresh-cw" />
    </span>
  </span>
</span>

<style>
  .GA-Subtype-Options {
    margin-left: 10px;
    display: flex;
    align-items: center;
    gap: 4px;
    padding: 5px 10px;
  }
  .icon {
    color: var(--text-normal);
    display: inline-flex;
    align-items: center;
    justify-content: center;
    width: 16px;
    height: 16px;
    cursor: pointer;
  }

  .GA-Option-span {
    padding: 2px;
    border-radius: 4px;
  }
  .GA-Option-span:hover {
    background-color: var(--background-modifier-hover);
  }
</style>
