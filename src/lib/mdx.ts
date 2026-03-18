import { compileMDX } from 'next-mdx-remote/rsc'
import rehypePrettyCode from 'rehype-pretty-code'
import rehypeSlug from 'rehype-slug'
import remarkGfm from 'remark-gfm'

/**
 * rehype-pretty-code の設定オプション。
 * Shiki のテーマや行番号表示などを制御する。
 */
const prettyCodeOptions = {
  /** コードブロックのカラーテーマ */
  theme: 'catppuccin-mocha',
  /** 行番号を表示する */
  keepBackground: true,
}

/**
 * Markdown 文字列を MDX コンポーネントとしてコンパイルする。
 * remark-gfm・rehype-slug・rehype-pretty-code プラグインを適用する。
 *
 * @param source - Markdown 本文の文字列
 * @returns コンパイル済みの MDX コンテンツ（React コンポーネント）
 */
export async function compileMdx(source: string) {
  return compileMDX({
    source,
    options: {
      mdxOptions: {
        remarkPlugins: [
          // GitHub Flavored Markdown（テーブル・打ち消し線など）を有効化
          remarkGfm,
        ],
        rehypePlugins: [
          // 見出しに id 属性を付与（アンカーリンク用）
          rehypeSlug,
          // シンタックスハイライト
          [rehypePrettyCode, prettyCodeOptions],
        ],
      },
    },
  })
}
