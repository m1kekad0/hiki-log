import type { Metadata } from 'next'
import { Geist, Geist_Mono } from 'next/font/google'

import Footer from '@/components/layout/Footer'
import Header from '@/components/layout/Header'

import './globals.css'

/** サイト全体で使用する sans-serif フォント */
const geistSans = Geist({
  variable: '--font-geist-sans',
  subsets: ['latin'],
})

/** コードブロックなどで使用する monospace フォント */
const geistMono = Geist_Mono({
  variable: '--font-geist-mono',
  subsets: ['latin'],
})

/** サイト全体のデフォルトメタデータ */
export const metadata: Metadata = {
  title: {
    default: '引きこもりエンジニアの徒然ログ',
    template: '%s | 引きこもりエンジニアの徒然ログ',
  },
  description: '技術系の記事を自由気ままに書き残す個人ブログです。',
}

/** ルートレイアウトの Props */
type RootLayoutProps = {
  children: React.ReactNode
}

/**
 * アプリ全体を包むルートレイアウト。
 * Header・main コンテンツエリア・Footer を配置する。
 */
export default function RootLayout({ children }: RootLayoutProps) {
  return (
    <html lang="ja">
      <body className={`${geistSans.variable} ${geistMono.variable} antialiased`}>
        <Header />
        <main className="mx-auto min-h-screen max-w-4xl px-4 py-10">{children}</main>
        <Footer />
      </body>
    </html>
  )
}
