'use client'

import { useEffect, useState } from 'react'

/** ViewCounter コンポーネントの Props */
type ViewCounterProps = {
  /** 対象記事のスラッグ */
  slug: string
}

/**
 * 記事の閲覧数を表示するクライアントコンポーネント。
 * マウント時に API を呼び出して閲覧数をインクリメントし、結果を表示する。
 */
export default function ViewCounter({ slug }: ViewCounterProps) {
  /** 閲覧数（null = ローディング中） */
  const [views, setViews] = useState<number | null>(null)

  useEffect(() => {
    /** 閲覧数をインクリメントして取得する */
    async function incrementViews() {
      try {
        const res = await fetch(`/api/views/${slug}`, { method: 'POST' })
        const data = await res.json()
        setViews(data.views)
      } catch {
        // API エラー時は表示しない
      }
    }

    incrementViews()
  }, [slug])

  /* ローディング中または取得失敗時は何も表示しない */
  if (views === null) return null

  return (
    <span className="flex items-center gap-1 text-xs text-gray-400">
      <svg
        xmlns="http://www.w3.org/2000/svg"
        className="h-3.5 w-3.5"
        fill="none"
        viewBox="0 0 24 24"
        stroke="currentColor"
        strokeWidth={2}
        aria-hidden="true"
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
        />
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"
        />
      </svg>
      {views.toLocaleString()} views
    </span>
  )
}
