import { Suspense } from 'react'

import SearchResults from '@/components/search/SearchResults'
import { getAllPostMetas } from '@/lib/posts'

import type { Metadata } from 'next'

/** ページの検索パラメータの型 */
type SearchPageProps = {
  searchParams: Promise<{ q?: string }>
}

/** 検索ページのメタデータ */
export const metadata: Metadata = {
  title: '記事を検索',
  description: 'ブログ記事をキーワードで検索します。',
}

/**
 * 検索結果ページ（サーバーコンポーネント）。
 * URL の `?q=` パラメータを受け取り、クライアントコンポーネントに渡す。
 * 全記事データはサーバー側でフェッチしてクライアントに渡す。
 *
 * @param searchParams - URL 検索パラメータ
 */
export default async function SearchPage({ searchParams }: SearchPageProps) {
  const { q = '' } = await searchParams
  /** 全公開済み記事のメタデータ */
  const allPosts = getAllPostMetas()

  return (
    <div>
      {/* ページヘッダー */}
      <div className="mb-10">
        <h1 className="mb-2 text-3xl font-bold text-gray-900">検索</h1>
        {q && (
          <p className="text-sm text-gray-400">
            「<span className="font-medium text-indigo-500">{q}</span>」の検索結果
          </p>
        )}
      </div>

      {/* 検索結果（Suspense でラップしてストリーミング対応） */}
      <Suspense fallback={<p className="text-center text-gray-400">検索中...</p>}>
        <SearchResults allPosts={allPosts} query={q} />
      </Suspense>
    </div>
  )
}
