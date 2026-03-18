import PostList from '@/components/post/PostList'
import { getAllPostMetas } from '@/lib/posts'

/**
 * トップページ（記事一覧）。
 * 公開済みの全記事を新しい順でカード形式に表示する。
 * Load More ボタンで追加表示する。
 */
export default function HomePage() {
  /** 公開済み記事メタデータ一覧（新しい順） */
  const posts = getAllPostMetas()

  return (
    <div>
      {/* ページヘッダー */}
      <div className="mb-10">
        <h1 className="mb-2 text-3xl font-bold text-gray-900 dark:text-gray-100">記事一覧</h1>
        <p className="text-sm text-gray-400 dark:text-gray-500">{posts.length} 件の記事</p>
      </div>

      {/* 記事が 0 件のときの表示 */}
      {posts.length === 0 ? (
        <p className="py-20 text-center text-gray-400 dark:text-gray-500">まだ記事がありません。</p>
      ) : (
        <PostList posts={posts} />
      )}
    </div>
  )
}
