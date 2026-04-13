<script lang="ts">
  import { ICON } from 'src/Constants'
  import { isImg, presentPath } from 'src/Utility'
  import ExtensionIcon from './ExtensionIcon.svelte'
  import ImgThumbnail from './ImgThumbnail.svelte'
  import ObsidianIcon from './ObsidianIcon.svelte'

  interface Props {
    /** ノードのファイルパス */
    path: string
    /** サムネイル画像の Promise。null の場合は非表示 */
    img?: Promise<ArrayBuffer> | null
    /** リンクアイコンを表示するか */
    linked?: boolean
    /** 未解決スタイルを当てるか */
    resolved?: boolean
    /** 現在フォーカス中のノードパス（一致すると太字になる） */
    currNode?: string
  }

  let { path, img = null, linked = false, resolved = true, currNode }: Props = $props()
</script>

{#if linked}
  <span class={ICON}>
    <ObsidianIcon iconName="link"></ObsidianIcon>
  </span>
{/if}

<ExtensionIcon {path}></ExtensionIcon>

<span
  class="internal-link {resolved ? '' : 'is-unresolved'} {currNode === path ? 'currNode' : ''}"
>
  {presentPath(path)}
</span>

{#if img !== null && isImg(path)}
  <ImgThumbnail {img}></ImgThumbnail>
{/if}
