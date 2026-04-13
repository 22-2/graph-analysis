<script lang="ts">
  import type { SubtypeInfo } from 'src/Interfaces'
  import ObsidianIcon from 'src/Components/ObsidianIcon.svelte'

  let { currSubtypeInfo }: { currSubtypeInfo: SubtypeInfo } = $props()

  const { anl, desc } = currSubtypeInfo
</script>

<div aria-label={`Type: ${anl}\n\n${desc}`}>
  <ObsidianIcon iconName="help-circle" />
</div>
