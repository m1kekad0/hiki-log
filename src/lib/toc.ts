import GithubSlugger from 'github-slugger'

import type { TocItem } from '@/types/toc'

/**
 * Markdown 本文から h2・h3 の見出しを抽出し TocItem 配列を返す。
 *
 * - `##` で始まる行を h2（level: 2）として解析する
 * - `###` で始まる行を h3（level: 3）として解析する
 * - `github-slugger` で生成した ID が `rehype-slug` の付与する ID と一致することを保証する
 * - 重複見出しテキストには `-1`, `-2` のサフィックスを自動付与する
 * - ID が空文字になる見出し（日本語のみ等）は結果から除外する
 *
 * @param markdown - 記事の raw Markdown 文字列
 * @returns TocItem の配列。ID が空のアイテムは除外される。
 */
export function extractTocItems(markdown: string): TocItem[] {
  /** 空文字や空白のみの場合は早期リターン */
  if (!markdown.trim()) return []

  /** slugger インスタンスは呼び出しごとに新規生成し、重複カウンタをリセットする */
  const slugger = new GithubSlugger()

  const items: TocItem[] = []

  for (const line of markdown.split('\n')) {
    /** h3（`### ` で始まる行）を先に判定して h2 と区別する */
    if (line.startsWith('### ')) {
      const text = line.slice(4).trim()
      if (text === '') continue
      const id = slugger.slug(text)
      if (id === '') continue
      items.push({ id, text, level: 3 })
      continue
    }

    /** h2（`## ` で始まる行、ただし `### ` は除く） */
    if (line.startsWith('## ')) {
      const text = line.slice(3).trim()
      if (text === '') continue
      const id = slugger.slug(text)
      if (id === '') continue
      items.push({ id, text, level: 2 })
    }
  }

  return items
}
