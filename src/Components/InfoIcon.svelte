<script lang="ts">
  import type { SubtypeInfo } from 'src/Interfaces'
  import ObsidianIcon from 'src/Components/ObsidianIcon.svelte'

  let { currSubtypeInfo }: { currSubtypeInfo: SubtypeInfo } = $props()

  const anl = $derived(currSubtypeInfo.anl)
  const desc = $derived(currSubtypeInfo.desc)
</script>

<div aria-label={`Type: ${anl}\n\n${desc}`}>
  <ObsidianIcon iconName="help-circle"></ObsidianIcon>
</div>
