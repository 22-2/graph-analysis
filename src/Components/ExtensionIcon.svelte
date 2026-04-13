<script lang="ts">
  import { isImg } from 'src/Utility'
  import ObsidianIcon from 'src/Components/ObsidianIcon.svelte'
  import { ICON } from 'src/Constants'

  let { path } = $props<{ path: string }>()
</script>

{#if !path.endsWith('.md')}
  <span class={ICON}>
    {#if isImg(path)}
      <ObsidianIcon iconName="image" />
    {:else if path.endsWith('.html')}
      <ObsidianIcon iconName="code" />
    {:else if path.endsWith('.xls') || path.endsWith('.xlsx')}
      <ObsidianIcon iconName="table" />
    {:else if path.endsWith('.csv')}
      <ObsidianIcon iconName="table" />
    {:else if path.endsWith('.pdf')}
      <ObsidianIcon iconName="file-text" />
    {:else if path.endsWith('.txt')}
      <ObsidianIcon iconName="document" />
    {:else if path.endsWith('.mp3') || path.endsWith('opus')}
      <ObsidianIcon iconName="audio-file" />
    {:else if path.endsWith('.mp4') || path.endsWith('.webm')}
      <ObsidianIcon iconName="video-file" />
    {:else if path.endsWith('.docx') || path.endsWith('.doc')}
      <ObsidianIcon iconName="document" />
    {:else if path.endsWith('.ppt') || path.endsWith('.pptx')}
      <ObsidianIcon iconName="presentation" />
    {:else if path.endsWith('.js') || path.endsWith('.ts') || path.endsWith('.c') || path.endsWith('.py')}
      <ObsidianIcon iconName="code" />
    {:else}
      <ObsidianIcon iconName="document" />
    {/if}
  </span>
{/if}