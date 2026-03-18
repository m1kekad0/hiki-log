import Link from 'next/link'

/**
 * サイト共通ヘッダーコンポーネント。
 * ブログタイトルとナビゲーションリンクを表示する。
 */
export default function Header() {
  return (
    <header className="border-b border-indigo-100 bg-white shadow-sm">
      <div className="mx-auto flex max-w-4xl items-center justify-between px-4 py-4">
        {/* ブログタイトル */}
        <Link href="/" className="group flex items-center gap-2">
          <span className="text-2xl">🏠</span>
          <span className="bg-gradient-to-r from-indigo-600 to-violet-600 bg-clip-text text-lg font-bold text-transparent transition-opacity group-hover:opacity-80">
            引きこもりエンジニアの徒然ログ
          </span>
        </Link>

        {/* ナビゲーション */}
        <nav className="flex items-center gap-6 text-sm font-medium text-gray-600">
          <Link href="/" className="hover:text-indigo-600 transition-colors">
            記事一覧
          </Link>
          <Link href="/about" className="hover:text-indigo-600 transition-colors">
            About
          </Link>
        </nav>
      </div>
    </header>
  )
}
