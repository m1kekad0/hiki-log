import Link from 'next/link'

/**
 * タグバッジの配色パレット。
 * タグ名の文字コードをもとに色を循環させる。
 */
const TAG_COLORS = [
  'bg-indigo-100 text-indigo-700 hover:bg-indigo-200',
  'bg-violet-100 text-violet-700 hover:bg-violet-200',
  'bg-pink-100 text-pink-700 hover:bg-pink-200',
  'bg-cyan-100 text-cyan-700 hover:bg-cyan-200',
  'bg-emerald-100 text-emerald-700 hover:bg-emerald-200',
  'bg-amber-100 text-amber-700 hover:bg-amber-200',
  'bg-rose-100 text-rose-700 hover:bg-rose-200',
  'bg-sky-100 text-sky-700 hover:bg-sky-200',
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
