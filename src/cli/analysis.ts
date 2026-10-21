import type { CliData } from 'obsidian'
import { ANALYSIS_TYPES } from 'src/Constants'
import type {
  AnalysisAlg,
  Communities,
  CoCitationMap,
  HITSResult,
  ResultMap,
  Subtype,
  SubtypeInfo,
} from 'src/Interfaces'
import type GraphAnalysisPlugin from 'src/main'
import { roundNumber } from 'src/Utility'
import type { CliApi } from './registry'

const DEFAULT_LIMIT = 20

/** コミュニティ系の結果から、1ノートだけのグループを省く（情報が無いため） */
const MIN_GROUP_SIZE = 2

/** アルゴリズム名を、CLIで打ちやすい形（小文字・ハイフン区切り）にする */
function toSlug(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
}

function resolveAlgorithm(name: string | undefined): SubtypeInfo {
  if (!name) {
    throw new Error('algorithm is required. See the "algorithms" API.')
  }
  const slug = toSlug(name)
  const info = ANALYSIS_TYPES.find(({ subtype }) => toSlug(subtype) === slug)
  if (!info) {
    const names = ANALYSIS_TYPES.map(({ subtype }) => toSlug(subtype))
    throw new Error(`Unknown algorithm: ${name}. Available: ${names.join(', ')}`)
  }
  return info
}

function parseNumber(
  value: string | undefined,
  name: string,
  fallback: number
): number {
  if (value === undefined) return fallback
  const parsed = Number(value)
  if (!Number.isFinite(parsed)) {
    throw new Error(`${name} must be a number: ${value}`)
  }
  return parsed
}

/** 対象ノートのパスを決める。ウィキリンクと同じ解決（file）か、正確なパス（path） */
function resolveTargetPath(
  plugin: GraphAnalysisPlugin,
  params: CliData
): string {
  const { vault, metadataCache } = plugin.app
  if (params.path !== undefined) {
    if (!vault.getFileByPath(params.path)) {
      throw new Error(`File not found: ${params.path}`)
    }
    return params.path
  }
  if (params.file !== undefined) {
    const file = metadataCache.getFirstLinkpathDest(params.file, '')
    if (!file) throw new Error(`File not found: ${params.file}`)
    return file.path
  }
  throw new Error('file or path is required for this algorithm')
}

/** アルゴリズムごとの固有オプション。既定値は MyGraph.algs の既定値に合わせる */
function parseOptions(subtype: Subtype, params: CliData): unknown {
  switch (subtype) {
    case 'Filename Groups':
      return {
        threshold: parseNumber(params.threshold, 'threshold', 0.8),
        markdownOnly: params['markdown-only'] === 'true',
      }
    case 'Label Propagation':
      return { iterations: parseNumber(params.iterations, 'iterations', 10) }
    case 'Louvain':
      return { resolution: parseNumber(params.resolution, 'resolution', 10) }
    default:
      return undefined
  }
}

function rankScores(scores: { [node: string]: number }, limit: number) {
  return Object.entries(scores)
    .filter(([, score]) => score > 0)
    .sort(([, a], [, b]) => b - a)
    .slice(0, limit)
    .map(([path, score]) => ({ path, score: roundNumber(score) }))
}

function formatCommunities(communities: Communities, limit: number) {
  const groups = Object.entries(communities)
    .filter(([, members]) => members.length >= MIN_GROUP_SIZE)
    .sort(([, a], [, b]) => b.length - a.length)
  return {
    total: groups.length,
    results: groups
      .slice(0, limit)
      .map(([label, members]) => ({ label, size: members.length, members })),
  }
}

/**
 * アルゴリズムの結果を、CLIで返すJSONに変える。
 * 共通の形は { total, results }。total は上限で切る前の件数。
 */
function formatResult(
  subtype: Subtype,
  raw: unknown,
  target: string,
  limit: number,
  keep: (path: string) => boolean
) {
  switch (subtype) {
    case 'HITS': {
      const { authorities, hubs } = raw as HITSResult
      return {
        authorities: rankScores(authorities, limit),
        hubs: rankScores(hubs, limit),
      }
    }
    case 'Label Propagation':
    case 'Filename Groups':
      return formatCommunities(raw as Communities, limit)
    case 'Louvain': {
      const members = (raw as string[]).filter(
        (path) => path !== target && keep(path)
      )
      return { total: members.length, results: members.slice(0, limit) }
    }
    case 'Co-Citations': {
      const entries = Object.entries(raw as CoCitationMap)
        .filter(([path, { measure }]) => measure > 0 && keep(path))
        .sort(([, a], [, b]) => b.measure - a.measure)
      return {
        total: entries.length,
        results: entries.slice(0, limit).map(([path, value]) => ({
          path,
          measure: roundNumber(value.measure),
          resolved: value.resolved,
          coCitations: value.coCitations,
        })),
      }
    }
    default: {
      const entries = Object.entries(raw as ResultMap)
        .filter(([path, { measure }]) => measure > 0 && keep(path))
        .sort(([, a], [, b]) => b.measure - a.measure)
      return {
        total: entries.length,
        results: entries
          .slice(0, limit)
          .map(([path, { measure, extra }]) => ({ path, measure, extra })),
      }
    }
  }
}

export const analysisCliApis: readonly CliApi[] = [
  {
    action: 'algorithms',
    description:
      'List the available analysis algorithms. "global" ones analyse the whole vault; the others need file or path.',
    flags: {},
    run: async () =>
      ANALYSIS_TYPES.map(({ subtype, anl, global, shortDesc }) => ({
        algorithm: toSlug(subtype),
        name: subtype,
        category: anl,
        global,
        description: shortDesc,
      })),
  },
  {
    action: 'analyze',
    description:
      'Run a graph analysis and return the ranked results as JSON (e.g. algorithm=adamic-adar file=Note).',
    flags: {
      algorithm: {
        value: '<name>',
        description: 'Algorithm name, e.g. adamic-adar (see the "algorithms" API)',
        required: true,
      },
      file: {
        value: '<name>',
        description: 'Target note, resolved like a wikilink (not needed for global algorithms)',
      },
      path: {
        value: '<path>',
        description: 'Target note as an exact vault-relative path',
      },
      limit: {
        value: '<number>',
        description: `Maximum number of results (default ${DEFAULT_LIMIT})`,
      },
      unlinked: {
        description: 'Exclude notes that are already linked with the target',
      },
      threshold: {
        value: '<0-1>',
        description: 'filename-groups: similarity threshold (default 0.8)',
      },
      'markdown-only': {
        description: 'filename-groups: only compare Markdown notes',
      },
      iterations: {
        value: '<number>',
        description: 'label-propagation: iteration count (default 10)',
      },
      resolution: {
        value: '<number>',
        description: 'louvain: resolution (default 10)',
      },
    },
    run: async (plugin, params) => {
      const info = resolveAlgorithm(params.algorithm)
      const limit = parseNumber(params.limit, 'limit', DEFAULT_LIMIT)
      const options = parseOptions(info.subtype, params)
      const target = info.global ? '' : resolveTargetPath(plugin, params)

      // ビューが開かれていないとグラフが古いままなので、毎回作り直す
      await plugin.refreshGraph()
      const { g } = plugin
      const alg = g.algs[info.subtype] as AnalysisAlg<unknown> | undefined
      if (!alg) throw new Error(`Not supported: ${info.subtype}`)

      const unlinked = params.unlinked === 'true' && target !== ''
      const keep = (path: string) =>
        path !== target &&
        !(unlinked && g.hasNode(target) && g.areNeighbors(target, path))

      const raw = await alg(target, options)
      return {
        algorithm: toSlug(info.subtype),
        ...(target && { target }),
        ...formatResult(info.subtype, raw, target, limit, keep),
      }
    },
  },
]
