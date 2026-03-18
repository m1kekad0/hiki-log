import Link from 'next/link'

import { format } from 'date-fns'
import { ja } from 'date-fns/locale'

import TagBadge from '@/components/post/TagBadge'
import type { PostMeta } from '@/types/post'

/** PostCard コンポーネントの Props */
type PostCardProps = {
  /** 表示する記事のメタデータ */
  post: PostMeta
}

/**
 * 記事一覧に表示するカードコンポーネント。
 * タイトル・サマリ・タグ・公開日を表示し、記事詳細ページへのリンクになる。
 */
export default function PostCard({ post }: PostCardProps) {
  /** 公開日を「2026年3月18日」形式にフォーマット */
  const formattedDate = format(new Date(post.publishedAt), 'yyyy年M月d日', { locale: ja })

  return (
    <article className="group relative flex flex-col rounded-2xl border border-gray-100 bg-white p-6 shadow-sm transition-all duration-200 hover:-translate-y-1 hover:shadow-md dark:border-gray-800 dark:bg-gray-900 dark:hover:shadow-indigo-950/40">
      {/* カテゴリラベル */}
      {post.category && (
        <span className="mb-3 text-xs font-semibold tracking-widest text-indigo-500 uppercase dark:text-indigo-400">
          {post.category}
        </span>
      )}

      {/* タイトル */}
      <h2 className="mb-2 text-xl font-bold leading-snug text-gray-900 transition-colors group-hover:text-indigo-600 dark:text-gray-100 dark:group-hover:text-indigo-400">
        <Link href={`/posts/${post.slug}`} className="stretched-link">
          {post.title}
        </Link>
      </h2>

      {/* サマリ */}
      <p className="mb-4 flex-1 text-sm leading-relaxed text-gray-500 line-clamp-3 dark:text-gray-400">
        {post.summary}
      </p>

      {/* タグ一覧 */}
      {post.tags.length > 0 && (
        <div className="mb-4 flex flex-wrap gap-1.5">
          {post.tags.map((tag) => (
            <TagBadge key={tag} tag={tag} />
          ))}
        </div>
      )}

      {/* 公開日 */}
      <time
        dateTime={post.publishedAt}
        className="text-xs text-gray-400 dark:text-gray-500"
      >
        {formattedDate}
      </time>
    </article>
  )
}
