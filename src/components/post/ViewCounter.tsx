'use client'

import { useEffect, useState } from 'react'

/** localStorage に保存するキーのプレフィックス */
const VIEWED_KEY_PREFIX = 'viewed:'

/** ViewCounter コンポーネントの Props */
type ViewCounterProps = {
  /** 対象記事のスラッグ */
  slug: string
}

/**
 * 記事の閲覧数を表示するクライアントコンポーネント。
 * localStorage を使って同一ブラウザからの重複カウントを防ぐ。
 * - 未訪問の場合: POST でカウントをインクリメントして localStorage に記録
 * - 訪問済みの場合: GET で現在のカウントを取得するのみ（インクリメントしない）
 */
export default function ViewCounter({ slug }: ViewCounterProps) {
  /** 閲覧数（null = ローディング中） */
  const [views, setViews] = useState<number | null>(null)

  useEffect(() => {
    async function fetchViews() {
      try {
        /** localStorage に訪問済みフラグがあるか確認 */
        const viewedKey = `${VIEWED_KEY_PREFIX}${slug}`
        const alreadyViewed = localStorage.getItem(viewedKey) === '1'

        if (alreadyViewed) {
          /** 訪問済み: カウントを増やさず現在値を取得 */
          const res = await fetch(`/api/views/${slug}`)
          const data = await res.json()
          setViews(data.views)
        } else {
          /** 未訪問: カウントをインクリメントして訪問済みとして記録 */
          const res = await fetch(`/api/views/${slug}`, { method: 'POST' })
          const data = await res.json()
          setViews(data.views)
          localStorage.setItem(viewedKey, '1')
        }
      } catch {
        // API エラー時は表示しない
      }
    }

    fetchViews()
  }, [slug])

  /* ローディング中または取得失敗時は何も表示しない */
  if (views === null) return null

  return (
    <span className="flex items-center gap-1 text-xs text-gray-400 dark:text-gray-500">
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
