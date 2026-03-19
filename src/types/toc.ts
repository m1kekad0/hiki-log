/**
 * 目次アイテムの型定義。
 * rehype-slug が付与する見出し ID と一致するアンカーを持つ。
 */
export type TocItem = {
  /** rehype-slug と一致するアンカー ID */
  id: string
  /** 見出しの表示テキスト（Markdown 記法をそのまま含む） */
  text: string
  /** 見出しレベル（h2 = 2、h3 = 3） */
  level: 2 | 3
}
