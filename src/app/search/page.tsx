import { Suspense } from 'react'

import SearchResults from '@/components/search/SearchResults'

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
 * 記事データは SearchResults がビルド時生成の `/search-index.json` からフェッチする。
 *
 * @param searchParams - URL 検索パラメータ
 */
export default async function SearchPage({ searchParams }: SearchPageProps) {
  const { q = '' } = await searchParams

  return (
    <div>
      {/* ページヘッダー */}
      <div className="mb-10">
        <h1 className="mb-2 text-3xl font-bold text-gray-900 dark:text-gray-100">検索</h1>
        {q && (
          <p className="text-sm text-gray-400 dark:text-gray-500">
            「<span className="font-medium text-indigo-500 dark:text-indigo-400">{q}</span>」の検索結果
          </p>
        )}
      </div>

      {/* 検索結果（Suspense でラップしてストリーミング対応） */}
      <Suspense fallback={<p className="text-center text-gray-400 dark:text-gray-500">検索中...</p>}>
        <SearchResults query={q} />
      </Suspense>
    </div>
  )
}
