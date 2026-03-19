'use client'

import { useTheme } from 'next-themes'
import { useEffect, useState } from 'react'

/**
 * ライト / ダークモードを切り替えるトグルボタン。
 * ハイドレーション不一致を防ぐため、マウント後のみ表示する。
 */
export default function ThemeToggle() {
  /** ハイドレーション完了フラグ */
  const [mounted, setMounted] = useState(false)
  const { theme, setTheme } = useTheme()

  /* クライアントマウント後にのみ表示する */
  useEffect(() => {
    setMounted(true)
  }, [])

  if (!mounted) return null

  /**
   * ライト / ダーク / システム を順に切り替える。
   * system → light → dark → system の順で循環する。
   */
  function handleToggle() {
    if (theme === 'system') setTheme('light')
    else if (theme === 'light') setTheme('dark')
    else setTheme('system')
  }

  /** 次のモードを示す aria-label */
  const ariaLabel =
    theme === 'system' ? 'ライトモードに切り替え' :
    theme === 'light'  ? 'ダークモードに切り替え' :
                         'システム設定に戻す'

  return (
    <button
      onClick={handleToggle}
      aria-label={ariaLabel}
      className="flex h-8 w-8 items-center justify-center rounded-full text-gray-500 transition-colors hover:bg-gray-100 dark:text-gray-400 dark:hover:bg-gray-800"
    >
      {theme === 'dark' ? (
        /* 月アイコン（ダーク固定時） */
        <svg xmlns="http://www.w3.org/2000/svg" className="h-4.5 w-4.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} aria-hidden="true">
          <path strokeLinecap="round" strokeLinejoin="round" d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" />
        </svg>
      ) : theme === 'light' ? (
        /* 太陽アイコン（ライト固定時） */
        <svg xmlns="http://www.w3.org/2000/svg" className="h-4.5 w-4.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} aria-hidden="true">
          <circle cx="12" cy="12" r="5" />
          <line x1="12" y1="1" x2="12" y2="3" />
          <line x1="12" y1="21" x2="12" y2="23" />
          <line x1="4.22" y1="4.22" x2="5.64" y2="5.64" />
          <line x1="18.36" y1="18.36" x2="19.78" y2="19.78" />
          <line x1="1" y1="12" x2="3" y2="12" />
          <line x1="21" y1="12" x2="23" y2="12" />
          <line x1="4.22" y1="19.78" x2="5.64" y2="18.36" />
          <line x1="18.36" y1="5.64" x2="19.78" y2="4.22" />
        </svg>
      ) : (
        /* モニターアイコン（OS 設定に追従するシステム時） */
        <svg xmlns="http://www.w3.org/2000/svg" className="h-4.5 w-4.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <rect x="2" y="3" width="20" height="14" rx="2" />
          <line x1="8" y1="21" x2="16" y2="21" />
          <line x1="12" y1="17" x2="12" y2="21" />
        </svg>
      )}
    </button>
  )
}
