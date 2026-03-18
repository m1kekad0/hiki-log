'use client'

import { ThemeProvider as NextThemesProvider } from 'next-themes'

/** ThemeProvider コンポーネントの Props */
type ThemeProviderProps = {
  /** 子コンポーネント */
  children: React.ReactNode
}

/**
 * next-themes の ThemeProvider をラップするクライアントコンポーネント。
 * `attribute="class"` により、ダークモード時に <html class="dark"> が付与される。
 * `defaultTheme="system"` によりシステムの設定に従い、手動切り替えも可能。
 */
export default function ThemeProvider({ children }: ThemeProviderProps) {
  return (
    <NextThemesProvider attribute="class" defaultTheme="system" enableSystem>
      {children}
    </NextThemesProvider>
  )
}
