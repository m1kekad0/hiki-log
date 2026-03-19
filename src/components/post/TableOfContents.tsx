'use client'

import { useEffect, useState } from 'react'

import type { TocItem } from '@/types/toc'

/**
 * TableOfContents コンポーネントの Props。
 */
type TableOfContentsProps = {
  /** 表示する目次アイテムの配列 */
  items: TocItem[]
}

/**
 * 記事目次コンポーネント。
 *
 * - h2・h3 の見出しリストをアンカーリンクとして表示する
 * - IntersectionObserver でスクロール位置を監視し、現在表示中の見出しをハイライトする
 * - モバイル（lg 未満）ではデフォルト折りたたみ状態でトグルボタンを表示する
 * - デスクトップ（lg 以上）では常時展開状態で表示する
 * - WCAG 準拠の ARIA 属性（aria-label / aria-expanded / aria-current）を付与する
 */
export default function TableOfContents({ items }: TableOfContentsProps) {
  /**
   * 現在ビューポートに入っている見出しの ID。
   * 初期値は先頭アイテムの ID（要件 3.2: ページロード時は最初の見出しをアクティブにする）。
   */
  const [activeId, setActiveId] = useState<string>(items[0]?.id ?? '')

  /**
   * モバイルでの展開・折りたたみ状態。
   * 初期値は false（要件 4.4: モバイルデフォルト折りたたみ）。
   */
  const [isOpen, setIsOpen] = useState<boolean>(false)

  useEffect(() => {
    /** .prose 内の h2・h3 要素を取得する */
    const headings = document.querySelectorAll<HTMLElement>('.prose h2, .prose h3')

    /** 要素が存在しない場合、または IntersectionObserver 未対応環境ではスキップする */
    if (headings.length === 0 || typeof IntersectionObserver === 'undefined') return

    /**
     * ビューポート上部付近の帯域（-80px〜30%）に入った見出しを検知する。
     * rootMargin でヘッダー高さ分の上部オフセットと下部 70% 除外を設定する。
     */
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            setActiveId(entry.target.id)
          }
        })
      },
      { rootMargin: '-80px 0px -70% 0px' },
    )

    headings.forEach((heading) => observer.observe(heading))

    /** コンポーネントアンマウント時に監視を解除する */
    return () => observer.disconnect()
  }, [])

  /** items が空の場合は何も表示しない（呼び出し側でも 2 件未満チェックを行うが二重防衛） */
  if (items.length === 0) return null

  return (
    <nav aria-label="目次" className="text-sm">
      {/*
       * モバイル専用トグルボタン（lg 以上では非表示）。
       * aria-expanded で開閉状態をスクリーンリーダーに伝える（要件 5.3）。
       */}
      <button
        type="button"
        className="flex w-full items-center justify-between rounded-lg border border-border bg-card px-4 py-2 font-semibold text-foreground lg:hidden"
        onClick={() => setIsOpen((prev) => !prev)}
        aria-expanded={isOpen}
      >
        <span>目次</span>
        {/* アイコンはスクリーンリーダーに不要なため aria-hidden を付与する */}
        <span aria-hidden="true">{isOpen ? '▲' : '▼'}</span>
      </button>

      {/*
       * デスクトップ専用ラベル（モバイルでは非表示）。
       * デスクトップではトグルなしで常時表示するため静的な見出しとして配置する。
       */}
      <p className="mb-3 hidden font-semibold text-foreground lg:block">目次</p>

      {/*
       * 目次リスト。
       * - モバイル: isOpen が true の場合のみ表示する
       * - デスクトップ: 常時表示する（lg:block で上書き）
       */}
      <ul className={`mt-2 space-y-1 ${isOpen ? 'block' : 'hidden'} lg:block`}>
        {items.map((item) => (
          <li
            key={item.id}
            /* h3 は h2 よりインデントして階層を表現する（要件 2.1） */
            className={item.level === 3 ? 'ml-4' : ''}
          >
            <a
              href={`#${item.id}`}
              /*
               * アクティブなアイテムに aria-current="true" を付与する（要件 5.4）。
               * 非アクティブ時は属性ごと除去する（undefined を渡すと属性が付与されない）。
               */
              aria-current={activeId === item.id ? 'true' : undefined}
              className={[
                'block rounded px-2 py-1 leading-snug transition-colors',
                activeId === item.id
                  ? 'font-medium text-accent'
                  : 'text-muted hover:text-foreground',
              ].join(' ')}
            >
              {item.text}
            </a>
          </li>
        ))}
      </ul>
    </nav>
  )
}
