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

  let renderedSentence = sentence[0] + '==' + sentence[1] + '==' + sentence[2]
  if (sentence.length === 5) {
    renderedSentence =
      renderedSentence + '==' + sentence[3] + '==' + sentence[4]
  }
  renderedSentence = renderedSentence.trim()

  let el: HTMLElement
  onMount(async () => {
    // 第4引数に null の代わりに component を渡す
    MarkdownRenderer.renderMarkdown(renderedSentence, el, sourcePath, component)
    for (let markedEl of el.getElementsByTagName('mark')) {
      markedEl.classList.add('CC-mark')
    }
    for (let markedEl: HTMLElement of el.getElementsByTagName('ol')) {
      markedEl.classList.add('CC-edit')
    }
    for (let markedEl: HTMLElement of el.getElementsByTagName('hr')) {
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
/>

<style>
  .CC-sentence {
    padding-left: 40px;
    color: var(--text-muted);
  }
</style>
