import Link from 'next/link'

/**
 * タグバッジの配色パレット（ライト / ダーク両対応）。
 * タグ名の文字コードをもとに色を循環させる。
 */
const TAG_COLORS = [
  'bg-indigo-100 text-indigo-700 hover:bg-indigo-200 dark:bg-indigo-950 dark:text-indigo-300 dark:hover:bg-indigo-900',
  'bg-violet-100 text-violet-700 hover:bg-violet-200 dark:bg-violet-950 dark:text-violet-300 dark:hover:bg-violet-900',
  'bg-pink-100 text-pink-700 hover:bg-pink-200 dark:bg-pink-950 dark:text-pink-300 dark:hover:bg-pink-900',
  'bg-cyan-100 text-cyan-700 hover:bg-cyan-200 dark:bg-cyan-950 dark:text-cyan-300 dark:hover:bg-cyan-900',
  'bg-emerald-100 text-emerald-700 hover:bg-emerald-200 dark:bg-emerald-950 dark:text-emerald-300 dark:hover:bg-emerald-900',
  'bg-amber-100 text-amber-700 hover:bg-amber-200 dark:bg-amber-950 dark:text-amber-300 dark:hover:bg-amber-900',
  'bg-rose-100 text-rose-700 hover:bg-rose-200 dark:bg-rose-950 dark:text-rose-300 dark:hover:bg-rose-900',
  'bg-sky-100 text-sky-700 hover:bg-sky-200 dark:bg-sky-950 dark:text-sky-300 dark:hover:bg-sky-900',
] as const

/**
 * タグ名から配色インデックスを決定するハッシュ関数。
 *
 * @param tag - タグ名
 * @returns TAG_COLORS の配列インデックス
 */
function getTagColorIndex(tag: string): number {
  const code = tag.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0)
  return code % TAG_COLORS.length
}

/** TagBadge コンポーネントの Props */
type TagBadgeProps = {
  /** 表示するタグ名 */
  tag: string
  /** タグページへのリンクを無効にするフラグ。デフォルト false */
  noLink?: boolean
}

/**
 * タグ名をカラフルなバッジで表示するコンポーネント。
 * デフォルトではタグ一覧ページへのリンクになる。
 */
export default function TagBadge({ tag, noLink = false }: TagBadgeProps) {
  const colorClass = TAG_COLORS[getTagColorIndex(tag)]
  const className = `inline-block rounded-full px-3 py-0.5 text-xs font-medium transition-colors ${colorClass}`

  if (noLink) {
    return <span className={className}>{tag}</span>
  }

  return (
    <Link href={`/tags/${encodeURIComponent(tag)}`} className={className}>
      {tag}
    </Link>
  )
}
