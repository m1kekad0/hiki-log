'use client'

import { useEffect, useMemo, useState } from 'react'

import PostCard from '@/components/post/PostCard'
import type { PostMeta } from '@/types/post'

/** 検索インデックスのエントリ型（body を除いたメタデータ） */
type SearchEntry = Pick<PostMeta, 'slug' | 'title' | 'summary' | 'tags' | 'category' | 'publishedAt'>

/** SearchResults コンポーネントの Props */
type SearchResultsProps = {
  /** 検索クエリ文字列 */
  query: string
}

/**
 * クライアントサイド検索結果コンポーネント。
 * ビルド時に生成された `/search-index.json` を初回マウント時にフェッチし、
 * タイトル・サマリ・タグ・カテゴリを対象にキーワード検索を行う。
 * インデックスは CDN キャッシュが効くため高速に取得できる。
 */
export default function SearchResults({ query }: SearchResultsProps) {
  /** 全記事の検索インデックス（初回フェッチ後にセット） */
  const [allPosts, setAllPosts] = useState<SearchEntry[]>([])
  /** フェッチ中フラグ */
  const [loading, setLoading] = useState(true)

  /** コンポーネントマウント時に検索インデックスを取得する */
  useEffect(() => {
    fetch('/search-index.json')
      .then((res) => res.json())
      .then((data: SearchEntry[]) => {
        setAllPosts(data)
        setLoading(false)
      })
      .catch(() => {
        setLoading(false)
      })
  }, [])

  /**
   * クエリにマッチする記事を絞り込む。
   * 大文字小文字を無視した部分一致で検索する。
   */
  const results = useMemo(() => {
    const q = query.trim().toLowerCase()
    if (!q || allPosts.length === 0) return []

    return allPosts.filter((post) => {
      const searchTarget = [post.title, post.summary, post.category, ...post.tags]
        .join(' ')
        .toLowerCase()

      return searchTarget.includes(q)
    })
  }, [allPosts, query])

  /* クエリが空の場合 */
  if (!query.trim()) {
    return (
      <p className="py-20 text-center text-gray-400 dark:text-gray-500">
        検索キーワードを入力してください。
      </p>
    )
  }

  /* インデックス読み込み中 */
  if (loading) {
    return <p className="py-20 text-center text-gray-400 dark:text-gray-500">検索中...</p>
  }

  /* 検索結果が 0 件の場合 */
  if (results.length === 0) {
    return (
      <p className="py-20 text-center text-gray-400 dark:text-gray-500">
        「{query}」に一致する記事は見つかりませんでした。
      </p>
    )
  }

  return (
    <div className="grid gap-6 sm:grid-cols-2">
      {results.map((post) => (
        <PostCard
          key={post.slug}
          post={{ ...post, published: true }}
        />
      ))}
    </div>
  )
}
