import type { CliData, CliFlags } from 'obsidian'
import type GraphAnalysisPlugin from 'src/main'
import { analysisCliApis } from './analysis'

/**
 * Obsidian CLI から呼び出せる API の定義。
 * `obsidian graph-analysis-ex:<action> ...` として登録され、run の戻り値を JSON で出力する。
 */
export interface CliApi {
  action: string
  description: string
  flags: CliFlags
  run: (plugin: GraphAnalysisPlugin, params: CliData) => Promise<unknown>
}

/** API を追加するときは、定義をこの配列に加える */
const CLI_APIS: readonly CliApi[] = [...analysisCliApis]

/**
 * CLI_APIS を Obsidian CLI に登録する。
 * プラグインID単体のコマンドでは、API の一覧を JSON で返す。
 */
export function registerCliApis(plugin: GraphAnalysisPlugin): void {
  const pluginId = plugin.manifest.id

  plugin.registerCliHandler(
    pluginId,
    'List Graph Analysis CLI APIs as JSON',
    null,
    async () =>
      toJson(
        CLI_APIS.map(({ action, description, flags }) => ({
          command: `${pluginId}:${action}`,
          description,
          flags,
        }))
      )
  )

  for (const api of CLI_APIS) {
    plugin.registerCliHandler(
      `${pluginId}:${api.action}`,
      api.description,
      api.flags,
      async (params) => {
        // 例外をそのまま投げると呼び出し側で原因が分かりにくいため、JSON のエラーとして返す
        try {
          return toJson(await api.run(plugin, params))
        } catch (error) {
          console.error(`[graph-analysis] CLI ${api.action}`, error)
          return toJson({
            error: error instanceof Error ? error.message : String(error),
          })
        }
      }
    )
  }
}

function toJson(value: unknown): string {
  return JSON.stringify(value, null, 2)
}
