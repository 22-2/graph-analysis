<script lang="ts">
  import { onMount } from 'svelte'
  // Component をインポート
  import { App, MarkdownRenderer, Component } from 'obsidian'
  import { jumpToSelection, openOrSwitch } from 'src/Utility'

  let { sentence, sourcePath, app, line, component } = $props<{
    sentence: string[]
    sourcePath: string
    app: App
    line: number
    component: Component
  }>()

  const renderedSentence = $derived.by(() => {
    let res = sentence[0] + '==' + sentence[1] + '==' + sentence[2]
    if (sentence.length === 5) {
      res = res + '==' + sentence[3] + '==' + sentence[4]
    }
    return res.trim()
  })

  let el: HTMLElement
  onMount(async () => {
    // 第4引数に null の代わりに component を渡す
    MarkdownRenderer.renderMarkdown(renderedSentence, el, sourcePath, component)
    for (const markedEl of Array.from(el.getElementsByTagName('mark'))) {
      markedEl.classList.add('CC-mark')
    }
    for (const markedEl of Array.from(el.getElementsByTagName('ol'))) {
      markedEl.classList.add('CC-edit')
    }
    for (const markedEl of Array.from(el.getElementsByTagName('hr'))) {
      markedEl.classList.add('CC-hr')
    }
  })
</script>

<div
  class="CC-sentence"
  bind:this={el}
  onmousedown={async (e) => {
    if (e.button === 0 || e.button === 1) {
      await openOrSwitch(app, sourcePath, e)
      jumpToSelection(app, line, sentence.join(''))
    }
  }}
></div>

<style>
  .CC-sentence {
    padding-left: 0;
    color: var(--text-muted);
  }
</style>
