'use client'

import { useRouter, useSearchParams } from 'next/navigation'
import { useEffect, useRef, useState } from 'react'

/**
 * 検索ボックスコンポーネント（クライアントコンポーネント）。
 * 入力値を URL の `?q=` パラメータに反映し、検索ページへ遷移する。
 */
export default function SearchBox() {
  const router = useRouter()
  const searchParams = useSearchParams()
  /** 現在の検索クエリ（URL パラメータから初期値を取得） */
  const [query, setQuery] = useState(searchParams.get('q') ?? '')
  const inputRef = useRef<HTMLInputElement>(null)

  /** URL の `q` パラメータが変わったら入力欄に反映する */
  useEffect(() => {
    setQuery(searchParams.get('q') ?? '')
  }, [searchParams])

  /**
   * フォーム送信時に検索ページへ遷移する。
   *
   * @param e - フォーム送信イベント
   */
  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    const trimmed = query.trim()
    if (trimmed) {
      router.push(`/search?q=${encodeURIComponent(trimmed)}`)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="flex items-center gap-2">
      <input
        ref={inputRef}
        type="search"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder="記事を検索..."
        aria-label="記事を検索"
        className="w-48 rounded-full border border-gray-200 bg-gray-50 px-4 py-1.5 text-sm outline-none transition focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100"
      />
      <button
        type="submit"
        aria-label="検索実行"
        className="flex h-8 w-8 items-center justify-center rounded-full bg-indigo-500 text-white transition hover:bg-indigo-600"
      >
        <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-4.35-4.35M17 11A6 6 0 1 1 5 11a6 6 0 0 1 12 0z" />
        </svg>
      </button>
    </form>
  )
}
