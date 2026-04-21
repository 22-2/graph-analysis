import type { ReferenceCache } from 'obsidian'

export interface ResolvedLinks {
  [from: string]: {
    [to: string]: number
  }
}

export type SubtypeInfo = {
  subtype: Subtype
  global: boolean
  desc: string
  anl: Analyses
  nlp: boolean
  shortDesc: string
}

export type Analyses =
  | 'Centrality'
  | 'Link Prediction'
  | 'Similarity'
  | 'Co-Citations'
  | 'Community Detection'
  | 'NLP'

export type Subtype =
  | 'Random'
  | 'HITS'
  | 'Adamic Adar'
  | 'Common Neighbours'
  | 'Jaccard'
  | 'Co-Citations'
  | 'Label Propagation'
  | 'Louvain'
  | 'Overlap'
  | 'PageRank'
  | 'Betweenness Centrality'
  | 'Clustering Coefficient'
  | 'BoW'
  | 'Tversky'
  | 'Otsuka-Chiai'
  | 'Sentiment'

export interface Communities {
  [group: string]: string[]
}
export interface ResultMap {
  [to: string]: { measure: number; extra: string[] }
}

export type HITSResult = {
  converged?: boolean
  authorities: { [node: string]: number }
  hubs: { [node: string]: number }
}

export interface ComponentResults {
  measure: number
  linked: boolean
  to: string
  resolved: boolean
  extra: string[]
  img: Promise<ArrayBuffer> | null
}

export interface HITSComponentResult {
  authority: number
  hub: number
  to: string
  resolved: boolean
  img: Promise<ArrayBuffer> | null
}

export interface CoCitationComponentResult {
  to: string
  measure: number
  resolved: boolean
  coCitations: CoCitation[]
  linked: boolean
  img: Promise<ArrayBuffer> | null
}

export interface LouvainComponentResult {
  to: string
  linked: boolean
  resolved: boolean
  img: Promise<ArrayBuffer> | null
}

export interface LabelPropagationComponentResult {
  label: string
  comm: string[]
}

export interface CoCitation {
  sentence: string[]
  measure: number
  source: string
  line: number
}

export interface CoCitationRes {
  measure: number
  resolved: boolean
  coCitations: CoCitation[]
}

export interface CoCitationMap {
  [linkName: string]: CoCitationRes
}

export interface LineSentences {
  line: number
  linkSentence: number
  linkSentenceStart: number
  linkSentenceEnd: number
  sentences: [string]
  link: ReferenceCache
}

export type AnalysisCacheValue =
  | HITSResult
  | CoCitationMap
  | string[]
  | Communities
  | ResultMap

/** サブタイプごとのキャッシュ値の型マップ */
export interface AnalysisCacheMap {
  Random: ResultMap
  HITS: HITSResult
  'Co-Citations': CoCitationMap
  Louvain: string[]
  'Label Propagation': Communities
  'Adamic Adar': ResultMap
  'Common Neighbours': ResultMap
  Jaccard: ResultMap
  Overlap: ResultMap
  PageRank: ResultMap
  'Betweenness Centrality': ResultMap
  'Clustering Coefficient': ResultMap
  BoW: ResultMap
  Tversky: ResultMap
  'Otsuka-Chiai': ResultMap
  Sentiment: ResultMap
}

export type AnalysisAlg<T> = (a: string, options?: any) => Promise<T>

export interface GraphAnalysisSettings {
  noInfinity: boolean
  noZero: boolean
  allFileExtensions: boolean
  showImgThumbnails: boolean
  addUnresolved: boolean
  coTags: boolean
  excludeLinked: boolean
  defaultSubtypeType: Subtype
  debugMode: boolean
  superDebugMode: boolean
  exclusionRegex: string
  exclusionTags: string[]
  algsToShow: Subtype[]
  algorithmRenames: { [key: string]: string }
}

declare module 'obsidian' {
  interface App {
    plugins: {
      plugins: {
        metaedit: {
          api: {
            createYamlProperty(
              key: string,
              value: string,
              file: TFile
            ): Promise<void>
            update(key: string, value: string, file: TFile): Promise<void>
          }
        }
      }
    }
  }
  interface Editor {
    cm: {
      findWordAt: (pos: EditorPosition) => EditorSelection | null
      state: {
        wordAt: (offset: number) => { fromOffset: number; toOffset: number }
      }
      getDoc: () => Doc
      getScrollInfo: () => { top: number; left: number; clientHeight: number }
    }
  }

  interface Doc {
    markText: (
      from: EditorPosition,
      to: EditorPosition,
      options?: { className?: string }
    ) => TextMarker
    children: LeafChunk[]
  }

  interface LeafChunk {
    lines: Line[]
  }

  interface TextMarker {
    className: string
    doc: Doc
    id: number
    lines: Line[]
    type: string
    clear: () => void
  }

  interface Line {
    markedSpans: MarkedSpan[]
    text: string
    parent: LeafChunk
  }

  interface MarkedSpan {
    from: number
    to: number
    marker: TextMarker
  }

  interface WorkspaceItem {
    side: 'left' | 'right'
  }
}
