'use client'

import { useState } from 'react'

import PostCard from '@/components/post/PostCard'
import type { PostMeta } from '@/types/post'

/** 最初に表示する記事数 */
const INITIAL_COUNT = 10

/** Load More で追加表示する記事数 */
const LOAD_MORE_COUNT = 10

/** PostList コンポーネントの Props */
type PostListProps = {
  /** 全記事のメタデータ一覧 */
  posts: PostMeta[]
}

/**
 * 記事一覧と「Load More」ボタンを管理するクライアントコンポーネント。
 * 最初は INITIAL_COUNT 件のみ表示し、ボタンを押すたびに LOAD_MORE_COUNT 件ずつ追加表示する。
 */
export default function PostList({ posts }: PostListProps) {
  /** 現在表示している件数 */
  const [displayCount, setDisplayCount] = useState(INITIAL_COUNT)

  /** 現在表示中の記事一覧 */
  const displayedPosts = posts.slice(0, displayCount)

  /** まだ表示していない記事が残っているか */
  const hasMore = displayCount < posts.length

  /** Load More ボタンを押したときに表示件数を増やす */
  function handleLoadMore() {
    setDisplayCount((prev) => Math.min(prev + LOAD_MORE_COUNT, posts.length))
  }

  return (
    <div>
      {/* 記事カードグリッド */}
      <div className="grid gap-6 sm:grid-cols-2">
        {displayedPosts.map((post) => (
          <PostCard key={post.slug} post={post} />
        ))}
      </div>

      {/* Load More ボタン */}
      {hasMore && (
        <div className="mt-10 flex flex-col items-center gap-2">
          <button
            onClick={handleLoadMore}
            className="rounded-full border border-indigo-200 bg-white px-8 py-2.5 text-sm font-medium text-indigo-600 transition hover:border-indigo-400 hover:bg-indigo-50"
          >
            もっと見る（残り {posts.length - displayCount} 件）
          </button>
        </div>
      )}
    </div>
  )
}
