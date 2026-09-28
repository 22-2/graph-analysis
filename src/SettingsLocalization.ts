import { getLanguage } from 'obsidian'
import type { SettingsLanguage, Subtype } from 'src/Interfaces'

const settingsText = {
  en: {
    language: 'Settings language',
    languageDescription:
      "Choose English, Japanese, or follow Obsidian's language. Other Obsidian languages use English.",
    followObsidian: 'Follow Obsidian',
    english: 'English',
    japanese: '日本語',
    basicPage: 'Basic Settings',
    advancedPage: 'Advanced Settings',
    languageGroup: 'Language',
    startupResultsGroup: 'Startup and Results',
    algorithmsGroup: 'Algorithms',
    graphContentsGroup: 'Graph Contents',
    exclusionsGroup: 'Exclusions',
    debuggingGroup: 'Debugging',
    defaultAnalysisType: 'Default Analysis Type',
    defaultAnalysisTypeDescription: 'Analysis shown when opening a new view.',
    excludeInfinity: 'Exclude Infinity',
    excludeInfinityDescription:
      'Hide infinite scores from results. Applies to open views immediately.',
    excludeZero: 'Exclude Zero',
    excludeZeroDescription:
      'Hide zero scores from results. Applies to open views immediately.',
    excludeLinked: 'Exclude Linked Notes',
    excludeLinkedDescription:
      'Hide notes already linked to the current note. Applies to open views immediately.',
    selectAlgorithms: 'Select algorithms',
    selectAlgorithmsDescription:
      'Choose which analyses appear in the view. Enter a custom name beside an algorithm.',
    selectAll: 'Select all',
    selectNone: 'Select none',
    customNamePlaceholder: 'Custom name',
    includeAllExtensions: 'Include All File Extensions',
    includeAllExtensionsDescription:
      'Include files with non-Markdown extensions. Changing this rebuilds the graph.',
    showThumbnails: 'Show Thumbnails for Images',
    showThumbnailsDescription:
      'Show image previews when non-Markdown files are included.',
    includeTags: 'Include tags (Co-Citations)',
    includeTagsDescription: 'Include tags as nodes in co-citation results.',
    includeUnresolved: 'Include Unresolved Links',
    includeUnresolvedDescription:
      'Include links that do not point to an existing note. Changing this rebuilds the graph.',
    exclusionTags: 'Exclusion Tags',
    exclusionTagsDescription:
      "Comma-separated tags to exclude. Include '#' (example: #private, #archive). Click Apply to rebuild the graph.",
    invalidTags: "Every tag must start with '#'.",
    exclusionRegex: 'Exclusion Regex',
    exclusionRegexDescription:
      'Exclude files whose full path matches this regular expression. For example, Archive/ matches files in an Archive folder.',
    exclusionRegexApplyDescription:
      'Leave empty to include all notes. Click Apply to rebuild the graph.',
    regexPlaceholder: 'Archive/',
    invalidRegex: 'Enter a valid regular expression.',
    apply: 'Apply',
    debugMode: 'Debug Mode',
    debugModeDescription:
      'Show basic diagnostic logs while using Graph Analysis.',
    superDebugMode: 'Super Debug Mode',
    superDebugModeDescription: 'Show detailed diagnostic logs.',
    algorithmNames: {
      Random: 'Random',
      'Co-Citations': 'Co-Citations',
      HITS: 'HITS',
      PageRank: 'PageRank',
      'Betweenness Centrality': 'Betweenness Centrality',
      'Adamic Adar': 'Adamic Adar',
      'Common Neighbours': 'Common Neighbours',
      Jaccard: 'Jaccard',
      Overlap: 'Overlap',
      'Filename Similarity': 'Filename Similarity',
      'Label Propagation': 'Label Propagation',
      Louvain: 'Louvain',
      'Clustering Coefficient': 'Clustering Coefficient',
      BoW: 'BoW',
      Tversky: 'Tversky',
      'Otsuka-Chiai': 'Otsuka-Chiai',
      Sentiment: 'Sentiment',
    } satisfies Record<Subtype, string>,
    algorithmDescriptions: {
      Random: 'Choose notes at random.',
      'Co-Citations': 'Find notes that are frequently referenced together.',
      HITS: 'Identify information hubs and authorities.',
      PageRank: 'Rank notes by their position in the link structure.',
      'Betweenness Centrality':
        'Measure how often a note bridges shortest paths between other notes.',
      'Adamic Adar':
        'Suggest notes based on shared, less common neighbors.',
      'Common Neighbours': 'Count notes that both notes link to.',
      Jaccard: 'Find similar notes using their linked neighbors.',
      Overlap: 'Compare shared neighbors against the smaller neighbor set.',
      'Filename Similarity': 'Find notes with similar filenames.',
      'Label Propagation': 'Find natural groups of connected notes.',
      Louvain: 'Detect communities by maximizing modularity.',
      'Clustering Coefficient':
        "Measure how densely a note's neighbors are linked.",
      BoW: 'Compare note contents by word frequency.',
      Tversky: 'Measure asymmetric similarity between note contents.',
      'Otsuka-Chiai': 'Compare note contents using Otsuka-Chiai similarity.',
      Sentiment: 'Analyze positive or negative sentiment in note contents.',
    } satisfies Record<Subtype, string>,
  },
  ja: {
    language: '設定画面の言語',
    languageDescription:
      '英語・日本語、または Obsidian 本体の表示言語に合わせるか選択します。本体がそれ以外の言語の場合は英語になります。',
    followObsidian: 'Obsidian 本体に合わせる',
    english: 'English',
    japanese: '日本語',
    basicPage: '基本設定',
    advancedPage: '詳細設定',
    languageGroup: '言語',
    startupResultsGroup: '起動時と表示結果',
    algorithmsGroup: '分析アルゴリズム',
    graphContentsGroup: 'グラフに含めるもの',
    exclusionsGroup: '除外設定',
    debuggingGroup: 'デバッグ',
    defaultAnalysisType: '起動時の分析タイプ',
    defaultAnalysisTypeDescription: '新しいビューを開いたときに表示する分析です。',
    excludeInfinity: '無限大の値を除外',
    excludeInfinityDescription: '無限大のスコアを結果から隠します。開いているビューにもすぐ反映されます。',
    excludeZero: 'ゼロの値を除外',
    excludeZeroDescription: 'ゼロのスコアを結果から隠します。開いているビューにもすぐ反映されます。',
    excludeLinked: 'リンク済みノートを除外',
    excludeLinkedDescription: '現在のノートからリンク済みのノートを隠します。開いているビューにもすぐ反映されます。',
    selectAlgorithms: '分析の選択',
    selectAlgorithmsDescription:
      'ビューに表示する分析を選びます。各分析の横にカスタム名を入力できます。',
    selectAll: 'すべて選択',
    selectNone: 'すべて解除',
    customNamePlaceholder: 'カスタム名',
    includeAllExtensions: 'Markdown 以外のファイルも含める',
    includeAllExtensionsDescription:
      'Markdown 以外の拡張子を持つファイルも分析に含めます。変更するとグラフを再構築します。',
    showThumbnails: '画像のサムネイルを表示',
    showThumbnailsDescription: 'Markdown 以外のファイルを含める場合に画像のプレビューを表示します。',
    includeTags: 'タグを含める（共引用）',
    includeTagsDescription: '共引用の結果にタグもノードとして含めます。',
    includeUnresolved: '未解決リンクを含める',
    includeUnresolvedDescription:
      'まだ存在しないノートへのリンクも含めます。変更するとグラフを再構築します。',
    exclusionTags: '除外するタグ',
    exclusionTagsDescription:
      "除外するタグをカンマ区切りで入力します。各タグに '#' を付けてください（例: #private, #archive）。適用するとグラフを再構築します。",
    invalidTags: "各タグは '#' から始めてください。",
    exclusionRegex: '除外する正規表現',
    exclusionRegexDescription:
      'ファイルのフルパスに一致するファイルを除外します。例: Archive/ は Archive フォルダ内のファイルに一致します。',
    exclusionRegexApplyDescription:
      '空欄ならすべてのノートを含めます。適用するとグラフを再構築します。',
    regexPlaceholder: 'Archive/',
    invalidRegex: '有効な正規表現を入力してください。',
    apply: '適用',
    debugMode: 'デバッグモード',
    debugModeDescription: 'Graph Analysis の基本的な診断ログを表示します。',
    superDebugMode: '詳細デバッグモード',
    superDebugModeDescription: '詳しい診断ログを表示します。',
    algorithmNames: {
      Random: 'ランダム',
      'Co-Citations': '共引用',
      HITS: 'HITS（ハブ・権威）',
      PageRank: 'PageRank',
      'Betweenness Centrality': '媒介中心性',
      'Adamic Adar': 'Adamic Adar',
      'Common Neighbours': '共通近傍',
      Jaccard: 'Jaccard',
      Overlap: 'Overlap',
      'Filename Similarity': 'ファイル名の類似度',
      'Label Propagation': 'ラベル伝播',
      Louvain: 'Louvain',
      'Clustering Coefficient': 'クラスタ係数',
      BoW: 'BoW',
      Tversky: 'Tversky',
      'Otsuka-Chiai': '大塚・チアイ',
      Sentiment: '感情分析',
    } satisfies Record<Subtype, string>,
    algorithmDescriptions: {
      Random: 'ノートをランダムに選びます。',
      'Co-Citations': '一緒に参照されることの多いノートを見つけます。',
      HITS: '情報のハブと権威となるノートを特定します。',
      PageRank: 'リンク構造における位置からノートを順位付けします。',
      'Betweenness Centrality': 'ノートが他のノートをつなぐ中継点としてどれだけ重要かを測ります。',
      'Adamic Adar': '珍しい共通の近傍ノートをもとに候補を提案します。',
      'Common Neighbours': '2つのノートが共通してリンクするノートの数を数えます。',
      Jaccard: 'リンク先の近さをもとに似たノートを見つけます。',
      Overlap: '共通するリンク先を、リンク先が少ない方の数で比較します。',
      'Filename Similarity': 'ファイル名が似ているノートを見つけます。',
      'Label Propagation': 'つながりの自然なグループを見つけます。',
      Louvain: 'モジュラリティを最大化してコミュニティを検出します。',
      'Clustering Coefficient': 'ノートの近傍同士がどれだけ密につながるかを測ります。',
      BoW: '単語の出現頻度でノートの内容を比較します。',
      Tversky: 'ノート間の非対称な類似度を測ります。',
      'Otsuka-Chiai': '大塚・チアイ類似度でノートの内容を比較します。',
      Sentiment: 'ノートの文章に含まれるポジティブ・ネガティブな感情を分析します。',
    } satisfies Record<Subtype, string>,
  },
} as const

export function getSettingsLanguage(language: SettingsLanguage): 'en' | 'ja' {
  // Use Obsidian's locale in system mode; this plugin currently translates English and Japanese.
  const locale = language === 'system' ? getLanguage() : language
  return locale.toLowerCase().startsWith('ja') ? 'ja' : 'en'
}

export function getSettingsText(language: 'en' | 'ja') {
  return settingsText[language]
}
