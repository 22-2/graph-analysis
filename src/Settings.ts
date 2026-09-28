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
import AnalysisView from './AnalysisView'
import { getSettingsLanguage, getSettingsText } from './SettingsLocalization'

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
    const language = getSettingsLanguage(settings.settingsLanguage ?? 'system')
    const text = getSettingsText(language)
    const getAlgorithmName = (subtype: Subtype) => {
      const algorithmName = text.algorithmNames[subtype]
      const customName = settings.algorithmRenames[subtype]?.trim()
      return customName ? `${customName} (${algorithmName})` : algorithmName
    }
    const defaultSubtypeOptions = Object.fromEntries(
      settings.algsToShow.map((subtype) => [
        subtype,
        getAlgorithmName(subtype),
      ])
    )

    const algorithmSettings: SettingDefinition[] = ANALYSIS_TYPES.map((sub) => ({
      name: text.algorithmNames[sub.subtype],
      desc: text.algorithmDescriptions[sub.subtype] ?? sub.shortDesc,
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
        setting.addText((inputText) => {
          inputText
            .setPlaceholder(text.customNamePlaceholder)
            .setValue(settings.algorithmRenames[sub.subtype] || '')
            .setDisabled(!isEnabled)
          input = inputText.inputEl
          input.addEventListener('blur', saveOnBlur)
        })

        return () => input?.removeEventListener('blur', saveOnBlur)
      },
    }))

    const exclusionRegexDescription = document.createDocumentFragment()
    exclusionRegexDescription.createEl('p', {
      text: text.exclusionRegexDescription,
    })
    exclusionRegexDescription.createEl('p', {
      text: text.exclusionRegexApplyDescription,
    })

    // Two navigable pages keep common choices separate from settings used less often.
    const definitions: SettingDefinitionItem[] = [
      {
        type: 'page',
        name: text.basicPage,
        items: [
          {
            type: 'group',
            heading: text.languageGroup,
            items: [
              {
                name: text.language,
                desc: text.languageDescription,
                control: {
                  type: 'dropdown',
                  key: 'settingsLanguage',
                  options: {
                    system: text.followObsidian,
                    en: text.english,
                    ja: text.japanese,
                  },
                },
              },
            ],
          },
          {
            type: 'group',
            heading: text.startupResultsGroup,
            items: [
              {
                name: text.defaultAnalysisType,
                desc: text.defaultAnalysisTypeDescription,
                control: {
                  type: 'dropdown',
                  key: 'defaultSubtypeType',
                  options: defaultSubtypeOptions,
                },
              },
              {
                name: text.excludeInfinity,
                desc: text.excludeInfinityDescription,
                control: { type: 'toggle', key: 'noInfinity' },
              },
              {
                name: text.excludeZero,
                desc: text.excludeZeroDescription,
                control: { type: 'toggle', key: 'noZero' },
              },
              {
                name: text.excludeLinked,
                desc: text.excludeLinkedDescription,
                control: { type: 'toggle', key: 'excludeLinked' },
              },
            ],
          },
          {
            type: 'group',
            heading: text.algorithmsGroup,
            items: [
              {
                name: text.selectAlgorithms,
                desc: text.selectAlgorithmsDescription,
                render: (setting) => {
                  setting.addButton((button) =>
                    button
                      .setButtonText(text.selectAll)
                      .onClick(() =>
                        void this.setAlgorithmsToShow(
                          ANALYSIS_TYPES.map((sub) => sub.subtype)
                        )
                      )
                  )
                  setting.addButton((button) =>
                    button
                      .setButtonText(text.selectNone)
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
        name: text.advancedPage,
        items: [
          {
            type: 'group',
            heading: text.graphContentsGroup,
            items: [
              {
                name: text.includeAllExtensions,
                desc: text.includeAllExtensionsDescription,
                control: { type: 'toggle', key: 'allFileExtensions' },
              },
              {
                name: text.showThumbnails,
                desc: text.showThumbnailsDescription,
                control: { type: 'toggle', key: 'showImgThumbnails' },
              },
              {
                name: text.includeTags,
                desc: text.includeTagsDescription,
                control: { type: 'toggle', key: 'coTags' },
              },
              {
                name: text.includeUnresolved,
                desc: text.includeUnresolvedDescription,
                control: { type: 'toggle', key: 'addUnresolved' },
              },
            ],
          },
          {
            type: 'group',
            heading: text.exclusionsGroup,
            items: [
              {
                name: text.exclusionTags,
                desc: text.exclusionTagsDescription,
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
                      validation.setMessage(text.invalidTags)
                      return
                    }

                    settings.exclusionTags = tags
                    await this.plugin.saveSettings()
                    await this.refreshGraphAndRestartViews()
                    validation.setMessage('')
                  }

                  setting.addText((inputText) => {
                    inputText
                      .setPlaceholder('#private, #archive')
                      .setValue(settings.exclusionTags.join(', '))
                    input = inputText.inputEl
                  })
                  setting.addButton((button) =>
                    button.setButtonText(text.apply).onClick(() => void apply())
                  )

                  return validation.cleanup
                },
              },
              {
                name: text.exclusionRegex,
                desc: exclusionRegexDescription,
                render: (setting) => {
                  let input: HTMLInputElement | undefined
                  const validation = addInlineValidationMessage(setting)
                  const apply = async () => {
                    const value = input?.value ?? ''
                    try {
                      new RegExp(value)
                    } catch {
                      validation.setMessage(text.invalidRegex)
                      return
                    }

                    settings.exclusionRegex = value
                    await this.plugin.saveSettings()
                    await this.refreshGraphAndRestartViews()
                    validation.setMessage('')
                  }

                  setting.addText((inputText) => {
                    inputText
                      .setPlaceholder(text.regexPlaceholder)
                      .setValue(settings.exclusionRegex)
                    input = inputText.inputEl
                  })
                  setting.addButton((button) =>
                    button.setButtonText(text.apply).onClick(() => void apply())
                  )

                  return validation.cleanup
                },
              },
            ],
          },
          {
            type: 'group',
            heading: text.debuggingGroup,
            items: [
              {
                name: text.debugMode,
                desc: text.debugModeDescription,
                control: { type: 'toggle', key: 'debugMode' },
              },
              {
                name: text.superDebugMode,
                desc: text.superDebugModeDescription,
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

    if (key === 'settingsLanguage') {
      // Rebuild all setting labels immediately after the user changes the display language.
      this.update()
    } else if (key === 'allFileExtensions' || key === 'addUnresolved') {
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
