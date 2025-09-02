<script lang="ts">
  import type { App, TFile } from 'obsidian'
  import type AnalysisView from 'src/AnalysisView'
  import type { SubtypeInfo } from 'src/Interfaces'
  import type GraphAnalysisPlugin from 'src/main'
  import FaCreativeCommonsZero from 'svelte-icons/fa/FaCreativeCommonsZero.svelte'
  import FaFire from 'svelte-icons/fa/FaFire.svelte'
  import FaLink from 'svelte-icons/fa/FaLink.svelte'
  import FaRegSnowflake from 'svelte-icons/fa/FaRegSnowflake.svelte'
  import FaUnlink from 'svelte-icons/fa/FaUnlink.svelte'
  import GoSignIn from 'svelte-icons/go/GoSignIn.svelte'
  import GoSignOut from 'svelte-icons/go/GoSignOut.svelte'
  import IoIosTrendingDown from 'svelte-icons/io/IoIosTrendingDown.svelte'
  import IoIosTrendingUp from 'svelte-icons/io/IoIosTrendingUp.svelte'
  import IoMdRefresh from 'svelte-icons/io/IoMdRefresh.svelte'
  import MdExposureZero from 'svelte-icons/md/MdExposureZero.svelte'
  import InfoIcon from './InfoIcon.svelte'

  type SubtypeOptionsProps = {
    currSubtypeInfo?: SubtypeInfo
    noZero?: boolean
    sortBy?: boolean
    ascOrder?: boolean
    currFile?: TFile
    frozen?: boolean
    excludeLinked?: boolean
    plugin: GraphAnalysisPlugin
    app: App
    view: AnalysisView
    blockSwitch: boolean
    visibleData: any[]
    page: number
  }

  let {
    currSubtypeInfo = $bindable(),
    noZero = $bindable(undefined),
    sortBy = $bindable(undefined),
    ascOrder = $bindable(undefined),
    currFile = $bindable(undefined),
    frozen = $bindable(undefined),
    excludeLinked = $bindable(undefined),
    plugin,
    app,
    view,
    blockSwitch = $bindable(),
    visibleData = $bindable(),
    page = $bindable(),
  } = $props<SubtypeOptionsProps>()

  function resetState() {
    blockSwitch = true
    visibleData = []
    page = 0
  }
</script>

<span class="GA-Subtype-Options">
  <InfoIcon {currSubtypeInfo} />

  {#if excludeLinked !== undefined}
    <!-- svelte-ignore a11y-click-events-have-key-events -->
    <span
      class="GA-Option-span"
      aria-label={excludeLinked ? 'Show Linked Notes' : 'Exclude Linked Notes'}
      onclick={() => {
        excludeLinked = !excludeLinked
        if (!frozen) {
          resetState()
        }
      }}
    >
      <span class="icon">
        {#if excludeLinked}
          <FaUnlink />
        {:else}
          <FaLink />
        {/if}
      </span>
    </span>
  {/if}
  {#if noZero !== undefined}
    <span
      class="GA-Option-span"
      aria-label={noZero ? 'Show Zeros' : 'Hide Zeros'}
      onclick={() => {
        noZero = !noZero
        if (!frozen) {
          resetState()
        }
      }}
    >
      <span class="icon">
        {#if noZero}
          <MdExposureZero />
        {:else}
          <FaCreativeCommonsZero />
        {/if}
      </span>
    </span>
  {/if}
  {#if ascOrder !== undefined}
    <span
      class="GA-Option-span"
      aria-label={ascOrder ? 'Ascending' : 'Descending'}
      onclick={() => {
        ascOrder = !ascOrder
        if (!frozen) {
          resetState()
        }
      }}
    >
      <span class="icon">
        {#if ascOrder}
          <IoIosTrendingUp />
        {:else}
          <IoIosTrendingDown />
        {/if}
      </span>
    </span>
  {/if}
  {#if frozen !== undefined}
    <!-- svelte-ignore a11y-click-events-have-key-events -->
    <span
      class="GA-Option-span"
      aria-label={frozen ? `Frozen on: ${currFile.basename}` : 'Unfrozen'}
      onclick={() => {
        frozen = !frozen
        if (!frozen && !currSubtypeInfo.global) {
          resetState()
          setTimeout(() => (currFile = app.workspace.getActiveFile()), 100)
        } else if (!frozen && currSubtypeInfo.global) {
          blockSwitch = true
          setTimeout(() => {
            blockSwitch = false
            currFile = app.workspace.getActiveFile()
          }, 100)
        }
      }}
    >
      <span class="icon">
        {#if frozen}
          <FaRegSnowflake />
        {:else}
          <FaFire />
        {/if}
      </span>
    </span>
  {/if}
  {#if sortBy !== undefined}
    <!-- svelte-ignore a11y-click-events-have-key-events -->
    <span
      class="GA-Option-span"
      aria-label="Sort By: {sortBy ? 'Authority' : 'Hub'}"
      onclick={() => {
        sortBy = !sortBy
        if (!frozen) {
          resetState()
        }
      }}
    >
      <span class="icon">
        {#if sortBy}
          <GoSignIn />
        {:else}
          <GoSignOut />
        {/if}
      </span>
    </span>
  {/if}
  <!-- svelte-ignore a11y-click-events-have-key-events -->
  <span
    class="GA-Option-span"
    aria-label="Refresh Index"
    onclick={async () => {
      await plugin.refreshGraph()
      await view.draw(currSubtypeInfo.subtype)
    }}
  >
    <span class="icon">
      <IoMdRefresh />
    </span>
  </span>
</span>

<style>
  .GA-Subtype-Options {
    margin-left: 10px;
  }
  .icon {
    color: var(--text-normal);
    display: inline-block;
    padding-top: 5px !important;
    width: 20px;
    height: 20px;
  }

  .GA-Option-span {
    padding: 2px;
  }
</style>
