'use client'

import { useMemo } from 'react'

import PostCard from '@/components/post/PostCard'
import type { PostMeta } from '@/types/post'

/** SearchResults コンポーネントの Props */
type SearchResultsProps = {
  /** 全記事のメタデータ一覧（サーバーコンポーネントから渡す） */
  allPosts: PostMeta[]
  /** 検索クエリ文字列 */
  query: string
}

/**
 * クライアントサイド検索結果コンポーネント。
 * タイトル・サマリ・タグ・カテゴリを対象にキーワード検索を行い、
 * マッチした記事をカード形式で表示する。
 */
export default function SearchResults({ allPosts, query }: SearchResultsProps) {
  /**
   * クエリにマッチする記事を絞り込む。
   * 大文字小文字を無視した部分一致で検索する。
   */
  const results = useMemo(() => {
    const q = query.trim().toLowerCase()
    if (!q) return []

    return allPosts.filter((post) => {
      const searchTarget = [
        post.title,
        post.summary,
        post.category,
        ...post.tags,
      ]
        .join(' ')
        .toLowerCase()

      return searchTarget.includes(q)
    })
  }, [allPosts, query])

  /* クエリが空の場合 */
  if (!query.trim()) {
    return <p className="py-20 text-center text-gray-400">検索キーワードを入力してください。</p>
  }

  /* 検索結果が 0 件の場合 */
  if (results.length === 0) {
    return (
      <p className="py-20 text-center text-gray-400">
        「{query}」に一致する記事は見つかりませんでした。
      </p>
    )
  }

  return (
    <div className="grid gap-6 sm:grid-cols-2">
      {results.map((post) => (
        <PostCard key={post.slug} post={post} />
      ))}
    </div>
  )
}
