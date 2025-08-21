import type { GraphAnalysisSettings, SubtypeInfo } from 'src/Interfaces'

export const DEFAULT_SETTINGS: GraphAnalysisSettings = {
  noInfinity: true,
  noZero: true,
  allFileExtensions: true,
  showImgThumbnails: true,
  addUnresolved: true,
  coTags: true,
  excludeLinked: false,
  defaultSubtypeType: 'Co-Citations',
  debugMode: false,
  superDebugMode: false,
  exclusionRegex: '',
  exclusionTags: [],
  algsToShow: [
    'Adamic Adar',
    'Jaccard',
    'Otsuka-Chiai',
    'Co-Citations',
    'Label Propagation',
    'Betweenness Centrality',
  ],
}

export const DECIMALS = 4

export const VIEW_TYPE_GRAPH_ANALYSIS = 'graph-analysis-ex'

export const LINKED = 'GA-linked'
export const NOT_LINKED = 'GA-not-linked'

export const MEASURE = 'GA-measure'
export const NODE = 'GA-node'

export const ICON = 'GA-icon'

export const ANALYSIS_TYPES: SubtypeInfo[] = [
  {
    anl: 'Co-Citations',
    subtype: 'Co-Citations',
    desc: 'どのノートが最も頻繁に一緒に参照されているかを確認します。',
    global: false,
    nlp: false,
    shortDesc: '共に引用されるノートを発見します。',
  },
  {
    anl: 'Centrality',
    subtype: 'HITS',
    desc: 'Authority（権威）は多くのリンクを受け取り、Hub（ハブ）は多くのリンクを発信します。',
    global: true,
    nlp: false,
    shortDesc: '情報の「ハブ」と「権威」を特定します。',
  },
  {
    anl: 'Centrality',
    subtype: 'PageRank',
    desc: 'ノートの重要度を、リンクの数と質に基づいて評価します。多くの重要なノートからリンクされているノートは、より高いスコアを得ます。',
    global: true,
    nlp: false,
    shortDesc: 'リンク構造に基づいてノートの重要度をランク付けします。',
  },
  {
    anl: 'Centrality',
    subtype: 'Betweenness Centrality',
    desc: 'ノートが他のノート間の最短経路上にどれだけ位置しているかを測定します。この値が高いノートは、情報フローにおいて重要な役割を果たしている可能性があります。',
    global: true,
    nlp: false,
    shortDesc: 'ノートが情報の中継点としてどれだけ重要かを測定します。',
  },
  {
    anl: 'Link Prediction',
    subtype: 'Adamic Adar',
    desc: 'グラフの構造に基づき、このアルゴリズムは現在のノートにリンクされるべきノートを予測します。',
    global: false,
    nlp: false,
    shortDesc: '共通の隣人に基づき、リンクされるべきノートを予測します。',
  },
  {
    anl: 'Link Prediction',
    subtype: 'Common Neighbours',
    desc: '2つのノートが共通してリンクしている（共通の「隣人」である）ノートの数を直接数えます。この数が多いほど、両者が関連している可能性が高いと予測します。',
    global: false,
    nlp: false,
    shortDesc: '共通してリンクしているノートの数を数えます。',
  },

  {
    anl: 'Similarity',
    subtype: 'Jaccard',
    desc: "グラフの構造に基づいて、現在のノートに最も類似したノートを予測します。\n\n2つのノートが共有する隣接ノードの数を、両者が持つ隣接ノードの総数で割った比率を表示します。\n\n'🔗' は、このノートがグループ名にリンクされていることを意味します。",
    global: false,
    nlp: false,
    shortDesc: 'リンク構造に基づいて類似ノートを検索します。',
  },
  {
    anl: 'Similarity',
    subtype: 'Overlap',
    desc: 'Jaccardと似ていますが、分母が2つのノートのうち隣接ノードが少ない方の数になります。',
    global: false,
    nlp: false,
    shortDesc: 'Jaccardに似た類似度計算（分母が小さい方のノートの隣接数）。',
  },

  {
    anl: 'Community Detection',
    subtype: 'Label Propagation',
    desc: "各ノードに一意のラベル（自身の名前）を割り当てることから始めます。次に、各ノードの隣接ノードを見て、その中で最も一般的なラベルに自身のラベルを変更します。このプロセスを `iterations` 回繰り返します。最後に持っていたラベルでグループ化されたノードを表示します。\n\n'🔗' は、このノートがグループ名にリンクされていることを意味します。",
    global: true,
    nlp: false,
    shortDesc: 'ノートの自然なグループ（コミュニティ）を発見します。',
  },
  {
    anl: 'Community Detection',
    subtype: 'Louvain',
    desc: "現在のノートが含まれているルーヴァン・コミュニティを表示します。\n\n'🔗' は、このノートがグループ名にリンクされていることを意味します。",
    global: false,
    nlp: false,
    shortDesc: 'モジュラリティを最大化してコミュニティを検出します。',
  },
  {
    anl: 'Community Detection',
    subtype: 'Clustering Coefficient',
    desc: 'ノードの _隣接ノード_ 同士が互いに接続されている可能性を示します。',
    global: true,
    nlp: false,
    shortDesc: 'ノート周辺の接続の密さを測定します。',
  },
  // {
  //   anl: 'NLP',
  //   subtype: 'BoW',
  //   desc: 'ノートを単語に分割し、各単語の出現回数を数え、それを使ってノート間の類似性を比較します。',
  //   global: false,
  //   nlp: true,
  //   shortDesc: '単語の出現頻度で内容の類似性を比較します。',
  // },
  // {
  //   anl: 'NLP',
  //   subtype: 'Tversky',
  //   desc: '集合間の非対称な類似性を測定する指標です。AがBにどれだけ似ているか、という視点と、BがAにどれだけ似ているか、という視点で異なる値を出すことができます。',
  //   global: false,
  //   nlp: true,
  //   shortDesc: '非対称な類似性を測定します。',
  // },
  // {
  //   anl: 'NLP',
  //   subtype: 'Otsuka-Chiai',
  //   desc: '現在のノートと他のすべてのノートとの間の「大塚-チアイ」類似度を返します。',
  //   global: false,
  //   nlp: true,
  //   shortDesc: 'テキスト内容の類似度を計算します。',
  // },
  // {
  //   anl: 'NLP',
  //   subtype: 'Sentiment',
  //   desc: 'すべてのノートの感情を分析します。ポジティブなほど高いスコアになります。',
  //   global: true,
  //   nlp: true,
  //   shortDesc: 'テキストの感情（ポジティブ/ネガティブ）を分析します。',
  // },
]

export const IMG_EXTENSIONS = ['png', 'jpg', 'jpeg', 'svg', 'gif', 'webp']

export const iconSVG = `<path fill="currentColor" stroke="currentColor" d="M88.8,67.5c-3,0-5.7,1.2-7.7,3.1l-12.2-7c0.7-1.9,1.2-3.9,1.2-6.1C70,47.8,62.2,40,52.5,40c-1.3,0-2.6,0.2-3.8,0.5l-5-10.8
c2.3-2.1,3.8-5,3.8-8.4c0-6.2-5-11.3-11.3-11.3S25,15,25,21.3s5,11.3,11.3,11.3c0.1,0,0.3,0,0.4,0l5.2,11.2
c-4.2,3.2-6.9,8.2-6.9,13.8C35,67.2,42.8,75,52.5,75c4.8,0,9.2-1.9,12.3-5.1l12.8,7.3c-0.1,0.5-0.2,1-0.2,1.5
c0,6.2,5,11.3,11.3,11.3S100,85,100,78.7S95,67.5,88.8,67.5z M36.3,25c-2.1,0-3.8-1.7-3.8-3.8s1.7-3.8,3.8-3.8s3.8,1.7,3.8,3.8
S38.3,25,36.3,25z M52.5,67.5c-5.5,0-10-4.5-10-10s4.5-10,10-10s10,4.5,10,10S58,67.5,52.5,67.5z M88.8,82.5c-2.1,0-3.8-1.7-3.8-3.8
s1.7-3.8,3.8-3.8s3.8,1.7,3.8,3.8S90.8,82.5,88.8,82.5z M80.3,41.7l-3-4l-7.5,5.6l3,4L80.3,41.7z M90,40c5.5,0,10-4.5,10-10
s-4.5-10-10-10s-10,4.5-10,10S84.5,40,90,40z M23.8,60h7.5v-5h-7.5V60z M10,47.5c-5.5,0-10,4.5-10,10s4.5,10,10,10s10-4.5,10-10
S15.5,47.5,10,47.5z"/>`
