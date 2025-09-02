<script lang="ts">
  import type { SubtypeInfo } from 'src/Interfaces'
  import FaRegQuestionCircle from 'svelte-icons/fa/FaRegQuestionCircle.svelte'

  let { currSubtypeInfo } = $props<{ currSubtypeInfo: SubtypeInfo }>()

  const { anl, desc } = currSubtypeInfo
</script>

<div aria-label={`Type: ${anl}\n\n${desc}`}>
  <FaRegQuestionCircle />
</div>
