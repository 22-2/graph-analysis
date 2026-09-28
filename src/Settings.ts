import {
  Notice,
  PluginSettingTab,
  type App,
  type ExtraButtonComponent,
  type SettingDefinitionItem,
} from 'obsidian'
import { ANALYSIS_TYPES, VIEW_TYPE_GRAPH_ANALYSIS } from 'src/Constants'
import type { Subtype } from 'src/Interfaces'
import type GraphAnalysisPlugin from 'src/main'
import { getAlgorithmDisplayName } from 'src/Utility'
import AnalysisView from './AnalysisView'

const ALGORITHM_VISIBILITY_KEY = 'algorithmVisible:'

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

    const renameSettings: SettingDefinitionItem[] = ANALYSIS_TYPES.map((sub) => ({
      name: sub.subtype,
      visible: () => settings.algsToShow.includes(sub.subtype),
      render: (setting) => {
        let input: HTMLInputElement | undefined
        const saveOnBlur = async () => {
          const value = input?.value.trim() ?? ''
          if (value) settings.algorithmRenames[sub.subtype] = value
          else delete settings.algorithmRenames[sub.subtype]

          await this.plugin.saveSettings()
          this.update()
          await this.restartViews()
        }

        // Rename fields save on blur so re-rendering the definitions does not interrupt typing.
        setting.addText((text) => {
          text
            .setPlaceholder('Enter custom name...')
            .setValue(settings.algorithmRenames[sub.subtype] || '')
          input = text.inputEl
          input.addEventListener('blur', saveOnBlur)
        })

        return () => input?.removeEventListener('blur', saveOnBlur)
      },
    }))

    const exclusionRegexDescription = document.createDocumentFragment()
    exclusionRegexDescription.createEl('p', {
      text: "Regex to exclude values from analysis. If a file name matches this regex, it won't be added to the graph.",
    })
    const regexDefaults = exclusionRegexDescription.createEl('p')
    regexDefaults.appendText('Default is ')
    regexDefaults.createEl('code', { text: '(?:)' })
    regexDefaults.appendText(' or ')
    regexDefaults.createEl('code', { text: "''" })
    regexDefaults.appendText(
      ' (empty string). Either option will allow all notes through the filter (regular Graph Analysis behaviour).'
    )
    exclusionRegexDescription.createEl('p', {
      text: 'Remember that the regex is tested against each full file path, not just the basename. You may need to include "folders/" and ".md" in the expression.',
    })

    const definitions: SettingDefinitionItem[] = [
      {
        type: 'group',
        heading: 'Analysis Defaults',
        items: [
          {
            name: 'Default Analysis Type',
            desc: 'Which analysis type to show on startup.',
            control: {
              type: 'dropdown',
              key: 'defaultSubtypeType',
              options: defaultSubtypeOptions,
            },
          },
          {
            name: 'Exclude Infinity',
            desc: 'Whether to exclude Infinite values by default.',
            control: { type: 'toggle', key: 'noInfinity' },
          },
          {
            name: 'Exclude Zero',
            desc: 'Whether to exclude zero values by default.',
            control: { type: 'toggle', key: 'noZero' },
          },
        ],
      },
      {
        type: 'group',
        heading: 'Algorithms to Show',
        extraButtons: [
          (button: ExtraButtonComponent) =>
            button
              .setIcon('check')
              .setTooltip('Select All')
              .onClick(() => void this.setAlgorithmsToShow(ANALYSIS_TYPES.map((sub) => sub.subtype))),
          (button: ExtraButtonComponent) =>
            button
              .setIcon('x')
              .setTooltip('Select None')
              .onClick(() => void this.setAlgorithmsToShow([])),
        ],
        items: ANALYSIS_TYPES.map((sub) => ({
          name: sub.subtype,
          desc: sub.shortDesc,
          control: {
            type: 'toggle',
            key: `${ALGORITHM_VISIBILITY_KEY}${sub.subtype}`,
          },
        })),
      },
      {
        type: 'group',
        heading: 'Algorithm Renaming',
        items: [
          {
            name: 'Custom algorithm names',
            desc: 'Names appear as "Custom Name (Original Name)". Restart Obsidian to update command palette names.',
          },
          ...renameSettings,
        ],
      },
      {
        type: 'group',
        heading: 'Graph Options',
        items: [
          {
            name: 'Include All File Extensions',
            desc: 'Whether to include files with non-Markdown extensions in the analyses.',
            control: { type: 'toggle', key: 'allFileExtensions' },
          },
          {
            name: 'Show Thumbnails for Images',
            desc: 'Whether to show small thumbnails for images when all file extensions are included.',
            control: { type: 'toggle', key: 'showImgThumbnails' },
          },
          {
            name: 'Include tags (Co-Citations)',
            desc: 'Whether to also show tags that are co-cited in the co-citations analysis.',
            control: { type: 'toggle', key: 'coTags' },
          },
          {
            name: 'Exclude Linked Notes',
            desc: 'Whether to exclude notes already linked to the current note from results by default.',
            control: { type: 'toggle', key: 'excludeLinked' },
          },
          {
            name: 'Include Unresolved Links',
            desc: 'Whether to include links that have not yet been created.',
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
            desc: "A comma-separated list of tags to exclude from the graph. Include the '#' in each tag.",
            render: (setting) => {
              let input: HTMLInputElement | undefined
              const saveOnBlur = async () => {
                const value = input?.value ?? ''
                const tags = value.split(',').map((tag) => tag.trim())
                if (value !== '' && !tags.every((tag) => tag.startsWith('#'))) {
                  new Notice("Every tag must start with '#'")
                  return
                }

                settings.exclusionTags = value === '' ? [] : tags
                await this.plugin.saveSettings()
                await this.refreshGraphAndRestartViews()
              }

              // This text field changes the graph, so apply its parsed value only after blur.
              setting.addText((text) => {
                text.setValue(settings.exclusionTags.join(', '))
                input = text.inputEl
                input.addEventListener('blur', saveOnBlur)
              })

              return () => input?.removeEventListener('blur', saveOnBlur)
            },
          },
          {
            name: 'Exclusion Regex',
            desc: exclusionRegexDescription,
            render: (setting) => {
              let input: HTMLInputElement | undefined
              const saveOnBlur = async () => {
                const value = input?.value ?? ''
                try {
                  new RegExp(value)
                  settings.exclusionRegex = value
                  await this.plugin.saveSettings()
                  await this.refreshGraphAndRestartViews()
                } catch {
                  new Notice(
                    `${value} is not a valid regular expression. Make sure you have closed all brackets and escaped special characters where necessary.`
                  )
                }
              }

              // Keep invalid patterns out of saved settings and the graph rebuild path.
              setting.addText((text) => {
                text.setValue(settings.exclusionRegex)
                input = text.inputEl
                input.addEventListener('blur', saveOnBlur)
              })

              return () => input?.removeEventListener('blur', saveOnBlur)
            },
          },
        ],
      },
      {
        type: 'group',
        heading: 'Debugging Options',
        items: [
          {
            name: 'Debug Mode',
            desc: 'Enable a few console logs while using the graph analysis view.',
            control: { type: 'toggle', key: 'debugMode' },
          },
          {
            name: 'Super Debug Mode',
            desc: 'Enable extensive console logging.',
            control: { type: 'toggle', key: 'superDebugMode' },
          },
        ],
      },
    ]

    return definitions
  }

  override getControlValue(key: string): unknown {
    const { settings } = this.plugin
    if (key.startsWith(ALGORITHM_VISIBILITY_KEY)) {
      const subtype = key.slice(ALGORITHM_VISIBILITY_KEY.length) as Subtype
      return settings.algsToShow.includes(subtype)
    }

    return (settings as unknown as Record<string, unknown>)[key]
  }

  override async setControlValue(key: string, value: unknown): Promise<void> {
    if (key.startsWith(ALGORITHM_VISIBILITY_KEY)) {
      const subtype = key.slice(ALGORITHM_VISIBILITY_KEY.length) as Subtype
      const selected = new Set(this.plugin.settings.algsToShow)
      if (value === true) selected.add(subtype)
      else selected.delete(subtype)

      this.plugin.settings.algsToShow = ANALYSIS_TYPES
        .map((item) => item.subtype)
        .filter((item) => selected.has(item))
      await this.plugin.saveSettings()
      this.update()
      await this.restartViews()
      return
    }

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
