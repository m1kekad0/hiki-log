import type { Metadata } from 'next'
import { Geist, Geist_Mono } from 'next/font/google'

import Footer from '@/components/layout/Footer'
import Header from '@/components/layout/Header'
import ThemeProvider from '@/components/layout/ThemeProvider'

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

/** サイト URL（OGP・sitemap の絶対 URL 生成に使用） */
const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? 'http://localhost:3001'

/** サイト全体のデフォルトメタデータ */
export const metadata: Metadata = {
  /** OGP・canonical URL の基底 URL */
  metadataBase: new URL(siteUrl),
  title: {
    default: '引きこもりエンジニアの徒然ログ',
    template: '%s | 引きこもりエンジニアの徒然ログ',
  },
  description: '技術系の記事を自由気ままに書き残す個人ブログです。',
  openGraph: {
    type: 'website',
    locale: 'ja_JP',
    siteName: '引きこもりエンジニアの徒然ログ',
  },
  twitter: {
    card: 'summary_large_image',
  },
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
    /* suppressHydrationWarning はダークモードのハイドレーション不一致を抑制するために必要 */
    <html lang="ja" suppressHydrationWarning>
      <body className={`${geistSans.variable} ${geistMono.variable} antialiased`}>
        <ThemeProvider>
          <Header />
          <main className="mx-auto min-h-screen max-w-4xl px-4 py-10">{children}</main>
          <Footer />
        </ThemeProvider>
      </body>
    </html>
  )
}
