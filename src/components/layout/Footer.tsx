/**
 * サイト共通フッターコンポーネント。
 * コピーライト表示を含む。
 */
export default function Footer() {
  return (
    <footer className="mt-20 border-t border-indigo-100 bg-white py-8 text-center text-sm text-gray-400">
      <p>© {new Date().getFullYear()} 引きこもりエンジニアの徒然ログ</p>
    </footer>
  )
}
