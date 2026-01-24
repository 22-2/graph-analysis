import { addIcon, Notice, Plugin, WorkspaceLeaf } from 'obsidian'
import { LRUCache } from 'lru-cache'
import AnalysisView from 'src/AnalysisView'
import {
  DEFAULT_SETTINGS,
  iconSVG,
  VIEW_TYPE_GRAPH_ANALYSIS,
} from 'src/Constants'
import type { GraphAnalysisSettings } from 'src/Interfaces'
import MyGraph from 'src/MyGraph'
import { SampleSettingTab } from 'src/Settings'
import { debug, openView } from './Utility'

export default class GraphAnalysisPlugin extends Plugin {
  settings!: GraphAnalysisSettings
  g!: MyGraph
  private pendingRefresh = false
  private analysisCache!: LRUCache<string, any>

  async onload() {
    console.log('loading graph analysis plugin')

    await this.loadSettings()

    // キャッシュを初期化（最大100エントリ、30分間有効）
    this.analysisCache = new LRUCache({
      max: 100,
      ttl: 1000 * 60 * 30,
    })

    this.setupUI()
    this.registerCommands()
    this.registerViews()

    // ワークスペースの準備が整い、メタデータが解決された後にグラフを初期化
    this.handleLayoutReady()
  }

  onunload() {
    console.log('unloading graph analysis plugin')
    // このタイプのビューをすべてデタッチする
    // leaf.detach() は view.unload() も呼び出す
    this.app.workspace
      .getLeavesOfType(VIEW_TYPE_GRAPH_ANALYSIS)
      .forEach((leaf) => {
        leaf.detach()
      })
  }

  async loadSettings() {
    this.settings = Object.assign({}, DEFAULT_SETTINGS, await this.loadData())
  }

  async saveSettings() {
    await this.saveData(this.settings)
  }

  // --- セットアップヘルパー ---

  /**
   * アイコンやリボンボタンなどのUI要素をセットアップします。
   */
  private setupUI() {
    addIcon('GA-ICON', iconSVG)
    this.addRibbonIcon('GA-ICON', 'Open Graph Analysis View', async () => {
      await this.activateAnalysisView()
    })
  }

  /**
   * プラグインのすべてのコマンドを登録します。
   */
  private registerCommands() {
    this.addCommand({
      id: 'show-graph-analysis-view',
      name: 'Open Graph Analysis View',
      checkCallback: (checking: boolean) => {
        // ビューがまだ開かれていない場合のみコマンドを有効にする
        const viewExists =
          this.app.workspace.getLeavesOfType(VIEW_TYPE_GRAPH_ANALYSIS).length >
          0
        if (!viewExists) {
          if (!checking) {
            this.activateAnalysisView()
          }
          return true
        }
        return false
      },
    })

    this.addCommand({
      id: 'refresh-analysis-view',
      name: 'Refresh Graph Analysis View',
      callback: async () => {
        await this.refreshGraphAndViews()
      },
    })

    // ANALYSIS_TYPES.forEach((sub) => {
    //   this.addCommand({
    //     id: `open-${sub.subtype}`,
    //     name: `Open ${getAlgorithmDisplayName(sub.subtype, this.settings)}`,
    //     callback: async () => {
    //       const view = await this.getCurrentView(true) // 存在しない場合は開く
    //       if (view) {
    //         await view.draw(sub.subtype)
    //       }
    //     },
    //   })
    // })
  }

  /**
   * カスタムビューと設定タブを登録します。
   */
  private registerViews() {
    this.registerView(
      VIEW_TYPE_GRAPH_ANALYSIS,
      (leaf: WorkspaceLeaf) => new AnalysisView(leaf, this, null)
    )
    this.addSettingTab(new SampleSettingTab(this.app, this))
  }

  /**
   * ワークスペースのレイアウトが準備完了した後の処理をハンドリングします。
   */
  private handleLayoutReady() {
    this.app.workspace.onLayoutReady(() => {
      // whileループでポーリングする代わりに、メタデータキャッシュの'resolved'イベントを使用する
      // これはより信頼性が高く効率的
      this.registerEvent(
        this.app.metadataCache.on('resolved', () => {
          this.tryExecutePendingRefresh()
        })
      )

      // ビューの表示/非表示を監視
      this.registerEvent(
        this.app.workspace.on('active-leaf-change', () => {
          this.tryExecutePendingRefresh()
        })
      )
    })
  }

  /**
   * ビューが表示されている場合はrefreshを実行、非表示の場合はpendingをセット
   */
  private tryExecutePendingRefresh() {
    if (this.checkGAViewVisibility()) {
      this.initializeGraphAndViews()
    } else {
      this.pendingRefresh = true
    }
  }

  private checkGAViewVisibility() {
    const view = this.app.workspace
      .getLeavesOfType(VIEW_TYPE_GRAPH_ANALYSIS)
      .first()?.view as AnalysisView
    return view?.leaf.isVisible()
  }

  // --- コアロジック ---

  /**
   * グラフを初期化し、分析ビューを更新または開きます。
   * メタデータキャッシュが完全に解決された後に呼び出されます。
   */
  private async initializeGraphAndViews() {
    await this.refreshGraph()
    await this.updateOrOpenViews()
  }

  /**
   * グラフデータを更新し、現在開いている分析ビューを再描画します。
   */
  public async refreshGraphAndViews() {
    await this.refreshGraph()
    const view = this.getCurrentView(false) // 存在しない場合は開かない
    if (view) {
      await view.draw(view.currSubtype)
    }
  }

  /**
   * Vaultのデータから内部グラフ表現を更新します。
   */
  public async refreshGraph() {
    try {
      if (this.settings.debugMode) console.time('Initialise Graph')
      const oldGraphHash = this.g ? `${this.g.order}:${this.g.size}` : ''
      this.g = new MyGraph(this.app, this.settings)
      await this.g.initGraph()
      const newGraphHash = `${this.g.order}:${this.g.size}`

      // グラフの構造が実際に変わった場合だけキャッシュをクリアするっす
      if (oldGraphHash !== newGraphHash) {
        this.analysisCache.clear()
      }

      debug(this.settings, { graph: this.g })
      if (this.settings.debugMode) console.timeEnd('Initialise Graph')
    } catch (error) {
      console.error('Graph Analysis Error:', error)
      new Notice(
        'グラフの更新中にエラーが発生しました。詳細はコンソールを確認してください。'
      )
    }
  }

  // --- ビュー管理ヘルパー ---

  /**
   * 既存のビューを更新するか、まだ開いていなければ新しいビューを開きます。
   * 主に起動時に呼び出されます。
   */
  private async updateOrOpenViews() {
    const leaves = this.app.workspace.getLeavesOfType(VIEW_TYPE_GRAPH_ANALYSIS)

    if (leaves.length > 0) {
      // 既存のビューのコンテンツを更新
      for (const leaf of leaves) {
        const view = leaf.view as AnalysisView
        if (view?.draw) {
          await view.draw(view.currSubtype ?? this.settings.defaultSubtypeType)
        }
      }
    } else {
      // ビューが開かれていない場合、新しいビューを開く
      await this.activateAnalysisView()
    }
  }

  /**
   * 分析ビューを開きます。
   * @returns 開かれた、またはアクティブになったAnalysisViewのインスタンス
   */
  public async activateAnalysisView(): Promise<AnalysisView> {
    await openView(
      this.app,
      VIEW_TYPE_GRAPH_ANALYSIS,
      AnalysisView
    )
    if (this.app.workspace.rightSplit.collapsed) {
      this.app.workspace.rightSplit.expand()
    }
    this.tryExecutePendingRefresh()
    const view = this.getCurrentView(false)
    if (!view) {
      throw new Error('Failed to activate Analysis View')
    }
    return view
  }

  /**
   * 現在アクティブなAnalysisViewのインスタンスを取得します。
   * @param openIfNot - trueの場合、ビューが存在しなければ新しく開きます。
   * @returns AnalysisViewのインスタンス、または見つからずopenIfNotがfalseの場合はnull。
   */
  public getCurrentView(openIfNot = true): AnalysisView | null {
    const leaf = this.app.workspace.getLeavesOfType(
      VIEW_TYPE_GRAPH_ANALYSIS
    )?.[0]

    if (leaf) {
      return leaf.view as AnalysisView
    }

    if (openIfNot) {
      this.activateAnalysisView()
    }

    return null
  }
}
