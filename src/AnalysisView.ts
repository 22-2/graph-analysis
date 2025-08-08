import { ItemView, ViewStateResult, WorkspaceLeaf } from 'obsidian'
import { VIEW_TYPE_GRAPH_ANALYSIS } from 'src/Constants'
import type { Subtype } from 'src/Interfaces'
import type GraphAnalysisPlugin from 'src/main'
import AnalysisComponent from './Components/AnalysisComponent.svelte'

export default class AnalysisView extends ItemView {
  plugin: GraphAnalysisPlugin
  currSubtype: Subtype
  component: AnalysisComponent

  constructor(
    leaf: WorkspaceLeaf,
    plugin: GraphAnalysisPlugin,
    currSubtype: Subtype | null
  ) {
    super(leaf)
    this.plugin = plugin
    this.currSubtype = currSubtype
  }

  async onload(): Promise<void> {
    super.onload()
  }

  getViewType(): string {
    return VIEW_TYPE_GRAPH_ANALYSIS
  }

  getDisplayText(): string {
    return 'Graph Analysis'
  }

  icon = 'GA-ICON'

  async onOpen(): Promise<void> {
    await this.draw(this.currSubtype ?? this.plugin.settings.defaultSubtypeType)
  }

  onClose(): Promise<void> {
    this.component?.$destroy()
    return Promise.resolve()
  }

  getState(): any {
    const state = super.getState()
    state.currSubtype = this.currSubtype
    return state
  }

  async setState(state: any, result: ViewStateResult): Promise<void> {
    this.currSubtype =
      state.currSubtype ?? this.plugin.settings.defaultSubtypeType
    await this.draw(this.currSubtype)
    return super.setState(state, result)
  }

  async draw(currSubtype: Subtype): Promise<void> {
    this.currSubtype = currSubtype

    const { app, contentEl } = this
    const { settings } = this.plugin

    contentEl.empty()
    contentEl.addClass('GA-View')

    this.component?.$destroy()

    this.component = new AnalysisComponent({
      target: contentEl,
      props: {
        app,
        plugin: this.plugin,
        settings,
        view: this,
        currSubtype,
      },
    })
  }
}
