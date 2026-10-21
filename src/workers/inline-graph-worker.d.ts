// esbuild.config.mjs でワーカーのバンドルを文字列として埋め込む
declare module 'inline-graph-worker' {
  const source: string
  export default source
}
