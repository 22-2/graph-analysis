<script lang="ts">
  import type AnalysisView from 'src/AnalysisView'
  import { ANALYSIS_TYPES } from 'src/Constants'
  import type { Subtype } from 'src/Interfaces'
  import { getAlgorithmDisplayName } from 'src/Utility'

  let { currSubtype, view } = $props<{
    currSubtype: Subtype
    view: AnalysisView
  }>()

  // Svelte 5: Let the view handle the state change and redraw.
  function handleSelectionChange(event: Event) {
    const newSubtype = (event.target as HTMLSelectElement).value as Subtype
    view.draw(newSubtype)
  }
</script>

{#if view.plugin.settings.algsToShow.length > 1}
  <div class="selector-container">
    <select
      class="dropdown"
      value={currSubtype}
      onchange={handleSelectionChange}
    >
      {#each ANALYSIS_TYPES as sub}
        {#if view.plugin.settings.algsToShow.includes(sub.subtype)}
          <option value={sub.subtype} title={sub.shortDesc}>
            {#if sub.global}🌍 {/if}{#if sub.nlp}💬 {/if}{getAlgorithmDisplayName(
              sub.subtype,
              view.plugin.settings
            )}
          </option>
        {/if}
      {/each}
    </select>
  </div>
{/if}

<style>
  .selector-container {
    padding: 6px 10px 4px;
  }
  .dropdown {
    width: 100%;
    line-height: normal;
    padding: 0.4em 2em 0.4em 0.6em;
    background-color: var(--background-primary-alt);
    border: 1px solid var(--background-modifier-border);
    border-radius: var(--radius-m, 8px);
    box-shadow: none;
    color: var(--text-normal);
    font-weight: var(--font-semibold);
  }
  .dropdown:focus-visible {
    border-color: var(--interactive-accent);
  }
</style>
