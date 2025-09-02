<script lang="ts">
  let { img } = $props<{ img: Promise<ArrayBuffer> }>()

  function _arrayBufferToBase64(buffer: ArrayBuffer) {
    var binary = ''
    var bytes = new Uint8Array(buffer)
    var len = bytes.byteLength
    for (var i = 0; i < len; i++) {
      binary += String.fromCharCode(bytes[i])
    }
    return window.btoa(binary)
  }
</script>

{#await img then src}
  <div class="GA-img">
    <!-- svelte-ignore a11y-missing-attribute -->
    <img src={'data:image/jpg;base64, ' + _arrayBufferToBase64(src)} />
  </div>
{/await}

<style>
  .GA-img img {
    max-width: 25%;
    max-height: 25%;
  }
  .GA-img img:hover {
    max-width: 100%;
    max-height: 100%;
  }
</style>