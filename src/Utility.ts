import {
  App,
  CacheItem,
  Constructor,
  EditorRange,
  ItemView,
  MarkdownView,
  Menu,
  Notice,
  TFile,
  WorkspaceLeaf
} from 'obsidian'
import {
  copy,
  createNewMDNote,
} from 'obsidian-community-lib'
import type AnalysisView from 'src/AnalysisView'
import { DECIMALS, IMG_EXTENSIONS, LINKED, NOT_LINKED } from 'src/Constants'
import type {
  ComponentResults,
  GraphAnalysisSettings,
  ResolvedLinks,
  ResultMap,
  Subtype
} from 'src/Interfaces'
import { CoCitation } from 'src/Interfaces'
import type GraphAnalysisPlugin from 'src/main'

export const sum = (arr: number[]) => {
  if (arr.length === 0) {
    return 0
  }
  return arr.reduce((a, b) => a + b)
}

export function debug<T>(settings: GraphAnalysisSettings, log: T): void {
  if (settings.debugMode) {
    console.log(log)
  }
}

export function superDebug<T>(settings: GraphAnalysisSettings, log: T): void {
  if (settings.superDebugMode) {
    console.log(log)
  }
}

export function roundNumber(num: number, dec: number = DECIMALS): number {
  return Math.round(num * Math.pow(10, dec)) / Math.pow(10, dec)
}

export const dropPath = (path: string) => {
  return path.split('/').last()
}

export const dropExt = (path: string) =>
  path.split('.').length === 1 ? path : path.split('.').slice(0, -1).join('.')
export const getExt = (path: string) => path.split('.').last()

export const classExt = (path: string) => `GA-${getExt(path)}`
export const classResolved = (app: App, node: string) =>
  node.endsWith('.md') && !isInVault(app, dropExt(node)) ? 'is-unresolved' : ''
export const classLinked = (
  resolvedLinks: ResolvedLinks,
  from: string,
  to: string,
  directed = false
) => (isLinked(resolvedLinks, from, to, directed) ? LINKED : NOT_LINKED)

export const presentPath = (path: string) => dropExt(dropPath(path))

export const nxnArray = (n: number): undefined[][] =>
  [...Array(n)].map((e) => Array(n))

export function hoverPreview(
  event: MouseEvent,
  view: AnalysisView,
  to: string
): void {
  const targetEl = event.target as HTMLElement

  view.app.workspace.trigger('hover-link', {
    event,
    source: view.getViewType(),
    hoverParent: view,
    targetEl,
    linktext: to,
  })
}

export function looserIsLinked(
  app: App,
  from: string,
  to: string,
  directed: boolean = true
) {
  const { resolvedLinks, unresolvedLinks } = app.metadataCache
  const fromTo =
    resolvedLinks[from]?.hasOwnProperty(to) ||
    unresolvedLinks[from]?.hasOwnProperty(dropExt(to))
  if (!fromTo && !directed) {
    return (
      resolvedLinks[to]?.hasOwnProperty(from) ||
      unresolvedLinks[to]?.hasOwnProperty(dropExt(from))
    )
  } else return fromTo
}

export function isUnresolved(app: App, from: string, to: string) {
  return app.metadataCache.unresolvedLinks[from]?.hasOwnProperty(to)
}

/**
 * Adds or updates the given yaml `key` to `value` in the given TFile
 * @param  {string} key
 * @param  {string} value
 * @param  {TFile} file
 * @param  {App} app
 */
export const createOrUpdateYaml = async (
  key: string,
  value: string,
  file: TFile,
  app: App
) => {
  // @ts-ignore
  const api = app.plugins.plugins.metaedit?.api

  if (!api) {
    new Notice('Metaedit must be enabled for this function to work')
    return
  }
  let valueStr = value.toString()
  const frontmatter = app.metadataCache.getFileCache(file)?.frontmatter
  if (!frontmatter || frontmatter[key] === undefined) {
    await api.createYamlProperty(key, `['${valueStr}']`, file)
  } else if ([...[frontmatter[key]]].flat(3).some((val) => val == valueStr)) {
    return
  } else {
    const oldValueFlat: string[] = [...[frontmatter[key]]].flat(4)
    const newValue = [...oldValueFlat, valueStr].map((val) => `'${val}'`)
    await api.update(key, `[${newValue.join(', ')}]`, file)
  }
}

export function openMenu(
  event: MouseEvent,
  app: App,
  options: { toCopy?: string; nodePath?: string } = {}
) {
  const { toCopy, nodePath } = options
  const menu = new Menu(app)

  if (toCopy) {
    menu.addItem((item) =>
      item
        .setTitle('Copy community')
        .setIcon('graph')
        .onClick(async () => {
          await copy(toCopy)
        })
    )
  } else if (nodePath) {
    const targetFile = app.metadataCache.getFirstLinkpathDest(nodePath, '')

    // New feature: Mutual linking
    menu.addItem((item) =>
      item
        .setTitle('相互リンクを作成')
        .setIcon('link')
        .onClick(async () => {
          const currentFile = app.workspace.getActiveFile()
          if (!currentFile) {
            new Notice('アクティブなファイルがありません。')
            return
          }
          if (currentFile.path === nodePath) {
            new Notice('同じファイルにはリンクできません。')
            return
          }
          if (!targetFile) {
            // Check if it's a tag
            if (nodePath.startsWith('#')) {
              new Notice('タグにはリンクできません。')
              return
            }
            new Notice(`ターゲットファイルが見つかりません: ${nodePath}`)
            return
          }
          await addLinkToMoc(app, currentFile, targetFile)
          await addLinkToMoc(app, targetFile, currentFile)
        })
    )

    // Keep existing functionalities but refactored
    menu.addItem((item) =>
      item
        .setTitle('Create Link: Current')
        .setIcon('documents')
        .onClick((e) => {
          try {
            const currFile = app.workspace.getActiveFile()
            const targetStr = presentPath(nodePath)
            createOrUpdateYaml('key', targetStr, currFile, app)

            new Notice('Write Successful')
          } catch (error) {
            new Notice('Write failed')
          }
        })
    )

    menu.addItem((item) =>
      item
        .setTitle('Create Link: Target')
        .setIcon('documents')
        .onClick((e) => {
          const currStr = app.workspace.getActiveFile().basename
          if (!targetFile) {
            new Notice(
              `${presentPath(nodePath)} does not exist in your vault yet`
            )
            return
          } else {
            createOrUpdateYaml('key', currStr, targetFile, app)
          }
        })
    )
  }
  menu.showAtMouseEvent(event)
}

export function jumpToSelection(app: App, line: number, sentence: string) {
  const view = app.workspace.getActiveViewOfType(MarkdownView)
  // Make sure the user is editing a Markdown file.
  if (view && view.getMode() === 'source') {
    const { editor } = view

    // Creat sel
    const lineStartPos = { ch: 0, line }
    const markStart = editor.posToOffset(lineStartPos)

    // const lineStr = editor.getLine(line)
    // let startOfSentenceInLine = 0
    // if (lineStr !== sentence) {
    //   startOfSentenceInLine = lineStr.indexOf(sentence)
    // }

    // if (startOfSentenceInLine === -1) {
    //   console.log('sentence not in lineStr')
    //   return
    // }

    const markEnd = markStart + sentence.length

    const markSel: EditorRange = {
      from: editor.offsetToPos(markStart),
      to: editor.offsetToPos(markEnd),
    }

    editor.setSelection(markSel.from, markSel.to)
    editor.scrollIntoView(markSel)

    const doc = editor.cm.getDoc()
    const marker = doc.markText(markSel.from, markSel.to, {
      className: 'GA-highlight-sentence',
    })

    setTimeout(() => {
      marker.clear()
    }, 1000)
  } else if (view && view.getMode() === 'preview') {
    // Handle preview mode
  }
}

export function getImgBufferPromise(app: App, fileName: string) {
  const file = app.metadataCache.getFirstLinkpathDest(fileName, '')
  return file ? app.vault.readBinary(file) : null
}

export function getPromiseResults(
  app: App,
  plugin: GraphAnalysisPlugin,
  currNode: string,
  subtype: Subtype,
  resolvedLinks: ResolvedLinks,
  ascOrder = false
): Promise<ComponentResults[]> {
  if (!plugin.g || !currNode) return null

  const greater = ascOrder ? 1 : -1
  const lesser = ascOrder ? -1 : 1
  const resultsPromise = plugin.g.algs[subtype](currNode).then(
    (results: ResultMap) =>
      plugin.g
        .nodes()
        .map((to) => {
          const { measure, extra } = results[to] as {
            measure: number
            extra: any
          }
          const resolved = !to.endsWith('.md') || isInVault(app, to)
          return {
            measure,
            linked: isLinked(resolvedLinks, currNode, to, false),
            to,
            resolved,
            extra,
            img:
              plugin.settings.showImgThumbnails && isImg(to)
                ? getImgBufferPromise(app, to)
                : null,
          }
        })
        .sort((a, b) => {
          return a.measure === b.measure
            ? a.extra?.length > b.extra?.length
              ? greater
              : lesser
            : a.measure > b.measure
            ? greater
            : lesser
        })
  )
  return resultsPromise
}

export function getCounts(arr: any[]) {
  const counts: { [item: string]: number } = {}
  for (const num of arr) {
    counts[num] = counts[num] ? counts[num] + 1 : 1
  }
  return counts
}

export function getMaxKey(obj: Record<string, number>) {
  // Using random resolving of equality
  return Object.keys(obj).reduce((a, b) =>
    obj[a] === obj[b] ? (Math.random() < 0.5 ? a : b) : obj[a] > obj[b] ? a : b
  )
}

export const isImg = (path: string) =>
  IMG_EXTENSIONS.includes(path.split('.').last())

export async function openOrSwitch(
  app: App,
  dest: string,
  event: MouseEvent,
  options: {
    createNewFile: boolean
  } = { createNewFile: true }
): Promise<void> {
  const { workspace } = app
  let destFile = app.metadataCache.getFirstLinkpathDest(dest, '')

  // If dest doesn't exist, make it
  if (!destFile && options.createNewFile) {
    destFile = await createNewMDNote(app, dest)
  } else if (!destFile && !options.createNewFile) return

  // Check if it's already open
  const leavesWithDestAlreadyOpen: WorkspaceLeaf[] = []
  workspace.iterateAllLeaves((leaf) => {
    if (leaf.view instanceof MarkdownView) {
      if (leaf.view?.file?.path === destFile.path) {
        leavesWithDestAlreadyOpen.push(leaf)
      }
    }
  })

  const openInNewTab =
    event.ctrlKey || event.getModifierState('Meta') || event.button === 1

  // Rather switch to it if it is open
  if (leavesWithDestAlreadyOpen.length > 0 && !openInNewTab) {
    workspace.setActiveLeaf(leavesWithDestAlreadyOpen[0])
  } else {
    event.preventDefault()
    // @ts-ignore
    const mode = app.vault.getConfig('defaultViewMode') as string
    const leaf = openInNewTab
      ? workspace.splitActiveLeaf()
      : workspace.getUnpinnedLeaf()

    await leaf.openFile(destFile, { active: true, mode })
  }
}

export function findSentence(
  sentences: [string],
  link: CacheItem
): [number, number, number] {
  let aggrSentenceLength = 0
  let count = 0
  for (const sentence of sentences) {
    const nextLength = aggrSentenceLength + sentence.length
    // Edge case that does not work: If alias has end of sentences.
    if (link.position.end.col <= nextLength) {
      return [count, aggrSentenceLength, nextLength]
    }
    aggrSentenceLength = nextLength
    count += 1
  }
  return [-1, 0, aggrSentenceLength]
}

export function addPreCocitation(
  preCocitations: { [name: string]: [number, CoCitation[]] },
  linkPath: string,
  measure: number,
  sentence: string[],
  source: string,
  line: number
) {
  preCocitations[linkPath][0] = Math.max(preCocitations[linkPath][0], measure)
  preCocitations[linkPath][1].push({
    sentence,
    measure,
    source,
    line,
  })
}

/**
 * 指定されたMOCファイルに、指定されたファイルへのリンクを挿入します。
 * @param app - ObsidianのAppインスタンス
 * @param mocFile - リンクを挿入するMOCファイル
 * @param fileToLink - リンクするファイル
 */
export async function addLinkToMoc(
  app: App,
  mocFile: TFile,
  fileToLink: TFile
) {
  try {
    const content = await app.vault.read(mocFile)
    const result = _addLinkToMocRelateds(
      content,
      fileToLink.basename,
      app.vault.getConfig('tabSize')
    )

    if (result.success) {
      await app.vault.modify(mocFile, result.newContent)
      new Notice(
        `${mocFile.basename} の "Relateds" リストに ${fileToLink.basename} へのリンクを追加しました。`
      )
    } else if (result.message === 'リンクは既に存在します。') {
      new Notice(
        `${mocFile.basename} には既に ${fileToLink.basename} へのリンクが存在します。`
      )
    } else {
      new Notice(`エラー: ${result.message}`)
    }
  } catch (error) {
    console.error('Failed to insert link to MOC:', error)
    new Notice('MOCへのリンク挿入に失敗しました。')
  }
}

/**
 * "## MOC"セクション内の"- Relateds"リストにWikiリンクを挿入します。
 * この関数は副作用がなく、文字列操作のみを行います。
 *
 * @param content - 操作対象のファイルコンテンツ
 * @param linkBasename - 挿入するリンクのファイル名 (拡張子なし)
 * @param tabSize - インデントに使用するスペースの数
 * @returns 成功した場合は更新されたコンテンツ、失敗した場合はエラーメッセージを持つオブジェクト。
 */
export const _addLinkToMocRelateds = (
  content: string,
  linkBasename: string,
  tabSize: number // <--- 変更点: 引数を追加
):
  | { success: true; newContent: string }
  | { success: false; message: string } => {
  const MOC_HEADER_PREFIX = '## MOC'
  const RELATEDS_LIST_PREFIX = '- Relateds'
  const WIKI_LINK_TO_ADD = `[[${linkBasename}]]`

  const lines = content.split('\n')

  const mocHeaderIndex = lines.findIndex((line) =>
    line.trim().startsWith(MOC_HEADER_PREFIX)
  )
  if (mocHeaderIndex === -1) {
    return {
      success: false,
      message: `"${MOC_HEADER_PREFIX}" ヘッダーが見つかりません。`,
    }
  }

  let relatedsListIndex = -1
  for (let i = mocHeaderIndex + 1; i < lines.length; i++) {
    if (lines[i].trim().startsWith('##')) break
    if (lines[i].trim().startsWith(RELATEDS_LIST_PREFIX)) {
      relatedsListIndex = i
      break
    }
  }
  if (relatedsListIndex === -1) {
    return {
      success: false,
      message: `"${MOC_HEADER_PREFIX}" セクションに "${RELATEDS_LIST_PREFIX}" リストが見つかりません。`,
    }
  }

  // 既存リンクのチェック
  for (let i = relatedsListIndex + 1; i < lines.length; i++) {
    const currentLine = lines[i]
    if (currentLine.trim().startsWith('##')) break // 次のセクションに到達
    if (currentLine.includes(WIKI_LINK_TO_ADD)) {
      return { success: false, message: 'リンクは既に存在します。' }
    }
  }

  const relatedsLine = lines[relatedsListIndex]
  const relatedsIndent = relatedsLine.match(/^\s*/)?.[0] || ''

  let insertIndex = relatedsListIndex + 1
  while (insertIndex < lines.length) {
    const currentLine = lines[insertIndex]
    if (currentLine.trim() === '') {
      insertIndex++
      continue
    }
    const currentIndent = currentLine.match(/^\s*/)?.[0] || ''
    if (currentIndent.length <= relatedsIndent.length) break
    insertIndex++
  }

  // <--- 変更点: インデント決定ロジック
  // デフォルトのインデントを tabSize に基づいて設定
  let newLinkIndent = relatedsIndent + ' '.repeat(tabSize)

  const lastSubItem = lines
    .slice(relatedsListIndex + 1, insertIndex)
    .reverse()
    .find((line) => line.trim() !== '')

  if (lastSubItem) {
    // 既存のサブ項目がある場合、そのインデントに合わせる
    const lastItemIndent = lastSubItem.match(/^\s*/)?.[0] || ''
    if (lastItemIndent.length > relatedsIndent.length) {
      newLinkIndent = lastItemIndent
    }
  }

  const newLinkLine = `${newLinkIndent}- ${WIKI_LINK_TO_ADD}`
  lines.splice(insertIndex, 0, newLinkLine)

  return { success: true, newContent: lines.join('\n') }
}

export function getAlgorithmDisplayName(
  subtype: Subtype,
  settings: GraphAnalysisSettings
): string {
  const customName = settings.algorithmRenames?.[subtype]
  if (customName && customName.trim() !== '') {
    return `${customName} (${subtype})`
  }
  return subtype
}

/**
 * Open your view on the chosen `side` if it isn't already open
 * @param  {string} viewType
 * @param  {Constructor<YourView>} viewClass The class constructor of your view
 * @param  {"left"|"right"} [side="right"]
 * @returns {Promise<YourView>} The opened view
 */
export async function openView<YourView extends ItemView>(
  app: App,
  viewType: string,
  viewClass: Constructor<YourView>,
  side: "left" | "right" = "right"
): Promise<YourView> {
  // @ts-expect-error
  let leaf: WorkspaceLeaf = null;
  for (leaf of app.workspace.getLeavesOfType(viewType)) {
    if (leaf.view instanceof viewClass) {
      return leaf.view;
    }
    await leaf.setViewState({ type: "empty" });
    break;
  }
  
// @ts-expect-error
  leaf =
    leaf ?? side === "right"
      ? app.workspace.getRightLeaf(false)
      : app.workspace.getLeftLeaf(false);

  await leaf.setViewState({
    type: viewType,
    active: true,
  });

  return leaf.view as YourView;
}

export const isInVault = (app: App, noteName: string, sourcePath = "") => !!app.metadataCache.getFirstLinkpathDest(noteName, sourcePath);

/**
 * Given a list of resolved links from app.metadataCache, check if `from` has a link to `to`
 * @param  {ResolvedLinks} resolvedLinks
 * @param  {string} from Note name with link leaving (With or without '.md')
 * @param  {string} to Note name with link arriving (With or without '.md')
 * @param {boolean} [directed=true] Only check if `from` has a link to `to`. If not directed, check in both directions
 */
export function isLinked(
  resolvedLinks: ResolvedLinks,
  from: string,
  to: string,
  directed: boolean = true
) {
  from = addMD(from);
  to = addMD(to);

  const fromTo = resolvedLinks[from]?.hasOwnProperty(to);
  if (!fromTo && !directed) {
    const toFrom = resolvedLinks[to]?.hasOwnProperty(from);
    return toFrom;
  } else return fromTo;
}

/**
 * Add '.md' to `noteName` if it isn't already there.
 * @param  {string} noteName with or without '.md' on the end.
 * @returns {string} noteName with '.md' on the end.
 */
export const addMD = (noteName: string): string => {
  return noteName?.match(/\.MD$|\.md$/m) ? noteName : noteName + ".md";
};