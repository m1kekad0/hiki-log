/**
 * ブログ記事のフロントマター（Markdown ヘッダー）の型定義。
 */
export type PostFrontmatter = {
  /** 記事タイトル */
  title: string
  /** 一覧カード・OGP 用のサマリ */
  summary: string
  /** タグの一覧 */
  tags: string[]
  /** カテゴリ名 */
  category: string
  /** 公開日（ISO 8601 形式） */
  publishedAt: string
  /** 更新日（ISO 8601 形式）。任意 */
  updatedAt?: string
  /** 公開フラグ。false の場合は一覧・詳細に表示しない */
  published: boolean
}

/**
 * 一覧表示用の記事メタデータ（本文を含まない軽量版）。
 */
export type PostMeta = PostFrontmatter & {
  /** URL スラッグ（ファイル名から自動生成） */
  slug: string
}

/**
 * 詳細表示用の記事データ（本文を含む完全版）。
 */
export type Post = PostMeta & {
  /** Markdown 本文のソース（MDX Remote に渡す用） */
  content: string
}
