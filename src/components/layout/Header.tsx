import Link from 'next/link'
import { Suspense } from 'react'

import SearchBox from '@/components/search/SearchBox'
import ThemeToggle from '@/components/layout/ThemeToggle'

/**
 * サイト共通ヘッダーコンポーネント。
 * ブログタイトル・ナビゲーション・検索ボックス・テーマ切り替えボタンを表示する。
 */
export default function Header() {
  return (
    <header className="border-b border-indigo-100 bg-white shadow-sm dark:border-indigo-950 dark:bg-gray-950">
      <div className="mx-auto flex max-w-4xl flex-wrap items-center justify-between gap-3 px-4 py-4">
        {/* ブログタイトル */}
        <Link href="/" className="group flex items-center gap-2">
          <span className="text-2xl">🏠</span>
          <span className="bg-gradient-to-r from-indigo-600 to-violet-600 bg-clip-text text-lg font-bold text-transparent transition-opacity group-hover:opacity-80">
            引きこもりエンジニアの徒然ログ
          </span>
        </Link>

        {/* ナビゲーション + 検索ボックス + テーマ切り替え */}
        <div className="flex items-center gap-5">
          <nav className="flex items-center gap-5 text-sm font-medium text-gray-600 dark:text-gray-300">
            <Link href="/" className="transition-colors hover:text-indigo-600 dark:hover:text-indigo-400">
              記事一覧
            </Link>
            <Link href="/about" className="transition-colors hover:text-indigo-600 dark:hover:text-indigo-400">
              About
            </Link>
          </nav>

          {/* useSearchParams を使うため Suspense でラップ */}
          <Suspense fallback={null}>
            <SearchBox />
          </Suspense>

          {/* ライト / ダークモード切り替えボタン */}
          <ThemeToggle />
        </div>
      </div>
    </header>
  )
}
