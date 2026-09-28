import {
  PluginSettingTab,
  type App,
  type Setting,
  type SettingDefinition,
  type SettingDefinitionItem,
} from 'obsidian'
import { ANALYSIS_TYPES, VIEW_TYPE_GRAPH_ANALYSIS } from 'src/Constants'
import type { Subtype } from 'src/Interfaces'
import type GraphAnalysisPlugin from 'src/main'
import { getAlgorithmDisplayName } from 'src/Utility'
import AnalysisView from './AnalysisView'

function addInlineValidationMessage(setting: Setting): {
  setMessage: (message: string) => void
  cleanup: () => void
} {
  const errorEl = setting.descEl.createSpan()
  errorEl.setAttr('role', 'alert')
  errorEl.style.color = 'var(--text-error)'
  errorEl.style.display = 'none'

  // Keep validation feedback next to its input so users can correct it before applying.
  return {
    setMessage: (message) => {
      errorEl.textContent = message
      errorEl.style.display = message ? 'block' : 'none'
    },
    cleanup: () => errorEl.remove(),
  }
}

export class SampleSettingTab extends PluginSettingTab {
  plugin: GraphAnalysisPlugin

  constructor(app: App, plugin: GraphAnalysisPlugin) {
    super(app, plugin)
    this.plugin = plugin
  }

  override getSettingDefinitions(): SettingDefinitionItem[] {
    const { settings } = this.plugin
    const defaultSubtypeOptions = Object.fromEntries(
      settings.algsToShow.map((subtype) => [
        subtype,
        getAlgorithmDisplayName(subtype, settings),
      ])
    )

    const algorithmSettings: SettingDefinition[] = ANALYSIS_TYPES.map((sub) => ({
      name: sub.subtype,
      desc: sub.shortDesc,
      render: (setting) => {
        const isEnabled = settings.algsToShow.includes(sub.subtype)
        let input: HTMLInputElement | undefined
        const saveOnBlur = async () => {
          const value = input?.value.trim() ?? ''
          if (value) settings.algorithmRenames[sub.subtype] = value
          else delete settings.algorithmRenames[sub.subtype]

          await this.plugin.saveSettings()
          this.update()
          await this.restartViews()
        }

        // Keep each algorithm toggle beside its custom name so both settings are easy to find.
        setting.addToggle((toggle) =>
          toggle.setValue(isEnabled).onChange(async (enabled) => {
            const selected = new Set(this.plugin.settings.algsToShow)
            if (enabled) selected.add(sub.subtype)
            else selected.delete(sub.subtype)

            this.plugin.settings.algsToShow = ANALYSIS_TYPES
              .map((item) => item.subtype)
              .filter((item) => selected.has(item))
            await this.plugin.saveSettings()
            this.update()
            await this.restartViews()
          })
        )

        // Rename fields save on blur so re-rendering the definitions does not interrupt typing.
        setting.addText((text) => {
          text
            .setPlaceholder('Custom name')
            .setValue(settings.algorithmRenames[sub.subtype] || '')
            .setDisabled(!isEnabled)
          input = text.inputEl
          input.addEventListener('blur', saveOnBlur)
        })

        return () => input?.removeEventListener('blur', saveOnBlur)
      },
    }))

    const exclusionRegexDescription = document.createDocumentFragment()
    exclusionRegexDescription.createEl('p', {
      text: 'Exclude files whose full path matches this regular expression. For example, Archive/ matches files in an Archive folder.',
    })
    exclusionRegexDescription.createEl('p', {
      text: 'Leave empty to include all notes. Click Apply to rebuild the graph.',
    })

    // Two navigable pages keep common choices separate from settings used less often.
    const definitions: SettingDefinitionItem[] = [
      {
        type: 'page',
        name: '⚙️ Basic Settings',
        items: [
          {
            type: 'group',
            heading: 'Startup and Results',
            items: [
              {
                name: 'Default Analysis Type',
                desc: 'Analysis shown when opening a new view.',
                control: {
                  type: 'dropdown',
                  key: 'defaultSubtypeType',
                  options: defaultSubtypeOptions,
                },
              },
              {
                name: 'Exclude Infinity',
                desc: 'Hide infinite scores from results. Applies to open views immediately.',
                control: { type: 'toggle', key: 'noInfinity' },
              },
              {
                name: 'Exclude Zero',
                desc: 'Hide zero scores from results. Applies to open views immediately.',
                control: { type: 'toggle', key: 'noZero' },
              },
              {
                name: 'Exclude Linked Notes',
                desc: 'Hide notes already linked to the current note. Applies to open views immediately.',
                control: { type: 'toggle', key: 'excludeLinked' },
              },
            ],
          },
          {
            type: 'group',
            heading: 'Algorithms',
            items: [
              {
                name: 'Select algorithms',
                desc: 'Choose which analyses appear in the view. Custom names are shown beside each algorithm.',
                render: (setting) => {
                  setting.addButton((button) =>
                    button
                      .setButtonText('Select all')
                      .onClick(() =>
                        void this.setAlgorithmsToShow(
                          ANALYSIS_TYPES.map((sub) => sub.subtype)
                        )
                      )
                  )
                  setting.addButton((button) =>
                    button
                      .setButtonText('Select none')
                      .onClick(() => void this.setAlgorithmsToShow([]))
                  )
                },
              },
              ...algorithmSettings,
            ],
          },
        ],
      },
      {
        type: 'page',
        name: '🔧 Advanced Settings',
        items: [
          {
            type: 'group',
            heading: 'Graph Contents',
            items: [
              {
                name: 'Include All File Extensions',
                desc: 'Include files with non-Markdown extensions. Changing this rebuilds the graph.',
                control: { type: 'toggle', key: 'allFileExtensions' },
              },
              {
                name: 'Show Thumbnails for Images',
                desc: 'Show image previews when non-Markdown files are included.',
                control: { type: 'toggle', key: 'showImgThumbnails' },
              },
              {
                name: 'Include tags (Co-Citations)',
                desc: 'Include tags as nodes in co-citation results.',
                control: { type: 'toggle', key: 'coTags' },
              },
              {
                name: 'Include Unresolved Links',
                desc: 'Include links that do not point to an existing note. Changing this rebuilds the graph.',
                control: { type: 'toggle', key: 'addUnresolved' },
              },
            ],
          },
          {
            type: 'group',
            heading: 'Exclusions',
            items: [
              {
                name: 'Exclusion Tags',
                desc: "Comma-separated tags to exclude. Include '#' (example: #private, #archive). Click Apply to rebuild the graph.",
                render: (setting) => {
                  let input: HTMLInputElement | undefined
                  const validation = addInlineValidationMessage(setting)
                  const apply = async () => {
                    const value = input?.value ?? ''
                    const tags = value
                      .split(',')
                      .map((tag) => tag.trim())
                      .filter(Boolean)
                    if (!tags.every((tag) => tag.startsWith('#'))) {
                      validation.setMessage("Every tag must start with '#'.")
                      return
                    }

                    settings.exclusionTags = tags
                    await this.plugin.saveSettings()
                    await this.refreshGraphAndRestartViews()
                    validation.setMessage('')
                  }

                  setting.addText((text) => {
                    text
                      .setPlaceholder('#private, #archive')
                      .setValue(settings.exclusionTags.join(', '))
                    input = text.inputEl
                  })
                  setting.addButton((button) =>
                    button.setButtonText('Apply').onClick(() => void apply())
                  )

                  return validation.cleanup
                },
              },
              {
                name: 'Exclusion Regex',
                desc: exclusionRegexDescription,
                render: (setting) => {
                  let input: HTMLInputElement | undefined
                  const validation = addInlineValidationMessage(setting)
                  const apply = async () => {
                    const value = input?.value ?? ''
                    try {
                      new RegExp(value)
                    } catch {
                      validation.setMessage('Enter a valid regular expression.')
                      return
                    }

                    settings.exclusionRegex = value
                    await this.plugin.saveSettings()
                    await this.refreshGraphAndRestartViews()
                    validation.setMessage('')
                  }

                  setting.addText((text) => {
                    text.setPlaceholder('Archive/').setValue(settings.exclusionRegex)
                    input = text.inputEl
                  })
                  setting.addButton((button) =>
                    button.setButtonText('Apply').onClick(() => void apply())
                  )

                  return validation.cleanup
                },
              },
            ],
          },
          {
            type: 'group',
            heading: 'Debugging',
            items: [
              {
                name: 'Debug Mode',
                desc: 'Show basic diagnostic logs while using Graph Analysis.',
                control: { type: 'toggle', key: 'debugMode' },
              },
              {
                name: 'Super Debug Mode',
                desc: 'Show detailed diagnostic logs.',
                control: { type: 'toggle', key: 'superDebugMode' },
              },
            ],
          },
        ],
      },
    ]

    return definitions
  }

  override getControlValue(key: string): unknown {
    return (this.plugin.settings as unknown as Record<string, unknown>)[key]
  }

  override async setControlValue(key: string, value: unknown): Promise<void> {
    // Declarative controls persist through this override so dependent graph and view effects stay intact.
    const settings = this.plugin.settings as unknown as Record<string, unknown>
    settings[key] = value
    await this.plugin.saveSettings()

    if (key === 'allFileExtensions' || key === 'addUnresolved') {
      await this.refreshGraphAndRestartViews()
    } else if (
      key === 'noInfinity' ||
      key === 'noZero' ||
      key === 'showImgThumbnails' ||
      key === 'coTags' ||
      key === 'excludeLinked'
    ) {
      await this.restartViews()
    }
  }

  private async setAlgorithmsToShow(subtypes: Subtype[]): Promise<void> {
    this.plugin.settings.algsToShow = subtypes
    await this.plugin.saveSettings()
    this.update()
    await this.restartViews()
  }

  private async restartViews(): Promise<void> {
    const leaves = this.plugin.app.workspace.getLeavesOfType(
      VIEW_TYPE_GRAPH_ANALYSIS
    )
    for (const leaf of leaves) {
      const view = leaf.view as AnalysisView
      if (!view) continue
      await leaf.setViewState({
        type: VIEW_TYPE_GRAPH_ANALYSIS,
        state: view.getState(),
      })
    }
  }

  private async refreshGraphAndRestartViews(): Promise<void> {
    await this.plugin.refreshGraph()
    await this.restartViews()
  }
}
