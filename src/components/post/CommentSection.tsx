'use client'

import Giscus from '@giscus/react'
import { useTheme } from 'next-themes'
import { useEffect, useState } from 'react'

/** giscus iframe に送信するテーマ変更メッセージの型 */
type GiscusSetConfigMessage = {
  giscus: {
    setConfig: {
      /** 適用するテーマ */
      theme: 'light' | 'dark'
    }
  }
}

/** CommentSection コンポーネントの Props */
type CommentSectionProps = {
  /** 対象記事のスラッグ（giscus の pathname マッピングに使用） */
  slug: string
}

/**
 * giscus を使ったコメントセクションのクライアントコンポーネント。
 * - `next-themes` の `resolvedTheme` を監視し、giscus iframe とテーマをリアルタイム同期する
 * - hydration 完了前は非表示にしてテーマ不一致フラッシュを防ぐ
 * - `section[aria-label]` でアクセシビリティ要件を満たす
 */
export default function CommentSection({ slug: _slug }: CommentSectionProps) {
  /** hydration 完了フラグ。false の間はレンダリングをスキップする */
  const [mounted, setMounted] = useState(false)

  /** next-themes から現在の解決済みテーマを取得 */
  const { resolvedTheme } = useTheme()

  /** `resolvedTheme` を giscus が受け付ける 'light' | 'dark' に変換したテーマ値 */
  const giscusTheme: 'light' | 'dark' = resolvedTheme === 'dark' ? 'dark' : 'light'

  /** マウント後に hydration 完了フラグを立てる */
  useEffect(() => {
    setMounted(true)
  }, [])

  /**
   * テーマ変更時に giscus iframe へ postMessage でテーマを伝達する。
   * iframe が存在しない場合（未ロード時など）は送信をスキップする。
   */
  useEffect(() => {
    if (!mounted) return

    const iframe = document.querySelector<HTMLIFrameElement>('iframe.giscus-frame')
    if (!iframe?.contentWindow) return

    const message: GiscusSetConfigMessage = {
      giscus: {
        setConfig: {
          theme: giscusTheme,
        },
      },
    }

    iframe.contentWindow.postMessage(message, 'https://giscus.app')
  }, [giscusTheme, mounted])

  /* hydration 完了前は何も表示しない（テーマ値 undefined によるフラッシュを防ぐ） */
  if (!mounted) return null

  return (
    <section aria-label="コメント" className="mt-12">
      <Giscus
        repo={process.env.NEXT_PUBLIC_GISCUS_REPO as `${string}/${string}`}
        repoId={process.env.NEXT_PUBLIC_GISCUS_REPO_ID!}
        category={process.env.NEXT_PUBLIC_GISCUS_CATEGORY!}
        categoryId={process.env.NEXT_PUBLIC_GISCUS_CATEGORY_ID!}
        mapping="pathname"
        strict="0"
        reactionsEnabled="1"
        emitMetadata="0"
        inputPosition="top"
        theme={giscusTheme}
        lang="ja"
        loading="lazy"
      />
    </section>
  )
}
