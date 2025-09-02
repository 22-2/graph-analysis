<script lang="ts">
  import { onMount, onDestroy } from 'svelte'

  let {
    hasMore,
    onLoadMore,
    scrollContainer,
    threshold = '100px',
  } = $props<{
    hasMore: boolean
    onLoadMore: () => Promise<void> | void
    scrollContainer?: HTMLElement | null
    threshold?: string
  }>()

  let element: HTMLDivElement

  let observer: IntersectionObserver

  onMount(() => {
    const options = {
      root: scrollContainer,
      rootMargin: threshold,
    }

    observer = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting && hasMore) {
          onLoadMore()
        }
      })
    }, options)

    observer.observe(element)
  })

  onDestroy(() => {
    if (observer) {
      observer.disconnect()
    }
  })
</script>

<div bind:this={element} />
