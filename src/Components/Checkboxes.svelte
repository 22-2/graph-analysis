<script lang="ts">
  import AnalysisView from '../AnalysisView'
  import { VIEW_TYPE_GRAPH_ANALYSIS } from '../Constants'

  import type { GraphAnalysisSettings } from '../Interfaces'
  import type GraphAnalysisPlugin from 'src/main'

  let { plugin, settingName, options }: {
    plugin: GraphAnalysisPlugin
    settingName: keyof GraphAnalysisSettings
    options: string[]
  } = $props()

  // Use a local state that is initialized once and doesn't trigger reactivity warning
  // In Svelte 5, $state(plugin.settings[settingName]) can trigger a warning if done at top level.
  let selected = $state<string[]>([])
  
  $effect.pre(() => {
    // Safety check and cast
    const val = plugin.settings[settingName]
    if (Array.isArray(val)) {
      selected = val as string[]
    }
  })

  const toNone = $derived(selected.length !== 0)

  async function save() {
    const settings = plugin.settings as any
    if (settings[settingName] === undefined) {
      return console.log(settingName + ' not found in BC settings')
    }

    settings[settingName] = selected
    await plugin.saveSettings()

    const leaves = plugin.app.workspace.getLeavesOfType(VIEW_TYPE_GRAPH_ANALYSIS)
    for (const leaf of leaves) {
      const view = leaf.view as AnalysisView
      if (view) {
        // By setting the state, we trigger the view's setState method, forcing a reload.
        await leaf.setViewState({
          type: VIEW_TYPE_GRAPH_ANALYSIS,
          state: view.getState(),
        })
      }
    }
  }
</script>

<div>
  <button
    onclick={async () => {
      if (toNone) selected = []
      else selected = options

      await save()
    }}
  >
    Select {toNone ? 'None' : 'All'}
  </button>
</div>

<div class="grid">
  {#each options as option}
    <div>
      <label>
        <input
          type="checkbox"
          value={option}
          bind:group={selected}
          onchange={async () => save()}
        />
        {option}
      </label>
    </div>
  {/each}
</div>

<style>
  .grid {
    display: grid;
    grid-template-columns: 1fr 1fr 1fr;
    /* grid-gap: 10px; */
  }
</style>
