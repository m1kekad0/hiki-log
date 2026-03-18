import Link from 'next/link'
import { Suspense } from 'react'

import SearchBox from '@/components/search/SearchBox'

/**
 * サイト共通ヘッダーコンポーネント。
 * ブログタイトル・ナビゲーション・検索ボックスを表示する。
 */
export default function Header() {
  return (
    <header className="border-b border-indigo-100 bg-white shadow-sm">
      <div className="mx-auto flex max-w-4xl flex-wrap items-center justify-between gap-3 px-4 py-4">
        {/* ブログタイトル */}
        <Link href="/" className="group flex items-center gap-2">
          <span className="text-2xl">🏠</span>
          <span className="bg-gradient-to-r from-indigo-600 to-violet-600 bg-clip-text text-lg font-bold text-transparent transition-opacity group-hover:opacity-80">
            引きこもりエンジニアの徒然ログ
          </span>
        </Link>

        {/* ナビゲーション + 検索ボックス */}
        <div className="flex items-center gap-5">
          <nav className="flex items-center gap-5 text-sm font-medium text-gray-600">
            <Link href="/" className="transition-colors hover:text-indigo-600">
              記事一覧
            </Link>
            <Link href="/about" className="transition-colors hover:text-indigo-600">
              About
            </Link>
          </nav>

          {/* useSearchParams を使うため Suspense でラップ */}
          <Suspense fallback={null}>
            <SearchBox />
          </Suspense>
        </div>
      </div>
    </header>
  )
}
