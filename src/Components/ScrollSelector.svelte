<script lang="ts">
  import type AnalysisView from 'src/AnalysisView'
  import { ANALYSIS_TYPES } from 'src/Constants'
  import type { Subtype } from 'src/Interfaces'

  export let currSubtype: Subtype
  export let view: AnalysisView

  // `bind:value` updates `currSubtype` on change.
  // We also need to update the view's internal state.
  function handleSelectionChange() {
    view.currSubtype = currSubtype
  }
</script>

{#if view.plugin.settings.algsToShow.length > 1}
  <div class="selector-container">
    <select class="dropdown" bind:value={currSubtype} on:change={handleSelectionChange}>
      {#each ANALYSIS_TYPES as sub}
        {#if view.plugin.settings.algsToShow.includes(sub.subtype)}
          <option value={sub.subtype}>
            {#if sub.global}🌍 {/if}{#if sub.nlp}💬 {/if}{sub.subtype}
          </option>
        {/if}
      {/each}
    </select>
  </div>
{/if}

<style>
  .selector-container {
    padding: 5px 10px;
  }
  .dropdown {
    width: 100%;
    line-height: normal;
    padding: 0.4em;
    padding-right: 2em;
    background-color: var(--background-primary-alt);
    border: 1px solid var(--background-modifier-border);
    border-radius: 5px;
    color: var(--text-normal);
  }
</style>
