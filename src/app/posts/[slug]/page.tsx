import { notFound } from 'next/navigation'

import { format } from 'date-fns'
import { ja } from 'date-fns/locale'

import CommentSection from '@/components/post/CommentSection'
import TableOfContents from '@/components/post/TableOfContents'
import TagBadge from '@/components/post/TagBadge'
import ViewCounter from '@/components/post/ViewCounter'
import { compileMdx } from '@/lib/mdx'
import { getAllPostMetas, getPostBySlug } from '@/lib/posts'
import { extractTocItems } from '@/lib/toc'

import type { Metadata } from 'next'

/** ページの動的パラメータの型 */
type Params = {
  params: Promise<{ slug: string }>
}

/**
 * ビルド時に静的生成するスラッグ一覧を返す。
 * published: true の公開済み記事のみを対象とし、下書きはビルド対象から除外する。
 */
export async function generateStaticParams() {
  return getAllPostMetas().map(({ slug }) => ({ slug }))
}

/**
 * 各記事ページの動的メタデータを生成する。
 * 記事タイトルと summary を SEO 用に設定する。
 *
 * @param params - URL パラメータ（slug）
 */
export async function generateMetadata({ params }: Params): Promise<Metadata> {
  const { slug } = await params
  const post = getPostBySlug(slug)

  if (!post) return {}

  return {
    title: post.title,
    description: post.summary,
    openGraph: {
      title: post.title,
      description: post.summary,
      type: 'article',
      publishedTime: post.publishedAt,
      modifiedTime: post.updatedAt,
      tags: post.tags,
    },
    twitter: {
      card: 'summary_large_image',
      title: post.title,
      description: post.summary,
    },
  }
}

/**
 * 記事詳細ページ。
 *
 * Markdown 本文を MDX としてレンダリングして表示する。
 * h2・h3 の見出しが 2 件以上ある場合は目次（TableOfContents）を表示する。
 * デスクトップではスティッキーサイドバー、モバイルでは記事先頭に折りたたみ形式で配置する。
 *
 * @param params - URL パラメータ（slug）
 */
export default async function PostPage({ params }: Params) {
  const { slug } = await params
  const post = getPostBySlug(slug)

  /* 記事が存在しない場合は 404 */
  if (!post) notFound()

  /** MDX コンパイル済みコンテンツ */
  const { content } = await compileMdx(post.content)

  /**
   * 目次アイテムを抽出する。
   * 抽出に失敗した場合は空配列にフォールバックしてページ表示を継続する。
   */
  let tocItems: ReturnType<typeof extractTocItems> = []
  try {
    tocItems = extractTocItems(post.content)
  } catch {
    tocItems = []
  }

  /** h2・h3 が 2 件以上ある場合のみ目次を表示する（要件 1.3） */
  const showToc = tocItems.length >= 2

  /** 公開日フォーマット */
  const formattedDate = format(new Date(post.publishedAt), 'yyyy年M月d日', { locale: ja })

  /** 更新日フォーマット（存在する場合のみ） */
  const formattedUpdatedAt = post.updatedAt
    ? format(new Date(post.updatedAt), 'yyyy年M月d日', { locale: ja })
    : null

  return (
    /* 2 カラムレイアウト対応のため max-w-5xl に拡張（要件 4.1） */
    <div className="mx-auto max-w-5xl">
      <div className="lg:flex lg:items-start lg:gap-10">
        {/* 記事本文エリア */}
        <article className="min-w-0 flex-1">
          {/*
           * モバイル用 TOC（lg 以上では非表示）。
           * 記事本文の先頭に折りたたみ形式で配置する（要件 4.2）。
           */}
          {showToc && (
            <div className="mb-6 lg:hidden">
              <TableOfContents items={tocItems} />
            </div>
          )}

          {/* 記事ヘッダー */}
          <header className="mb-10">
            {/* カテゴリ */}
            {post.category && (
              <p className="mb-3 text-sm font-semibold tracking-widest text-indigo-500 uppercase dark:text-indigo-400">
                {post.category}
              </p>
            )}

            {/* タイトル */}
            <h1 className="mb-4 text-3xl font-bold leading-tight text-gray-900 dark:text-gray-100">
              {post.title}
            </h1>

            {/* 日付・閲覧数 */}
            <div className="mb-4 flex flex-wrap items-center gap-3 text-sm text-gray-400 dark:text-gray-500">
              <time dateTime={post.publishedAt}>公開: {formattedDate}</time>
              {formattedUpdatedAt && (
                <time dateTime={post.updatedAt}>更新: {formattedUpdatedAt}</time>
              )}
              <ViewCounter slug={post.slug} />
            </div>

            {/* タグ一覧 */}
            {post.tags.length > 0 && (
              <div className="flex flex-wrap gap-2">
                {post.tags.map((tag) => (
                  <TagBadge key={tag} tag={tag} />
                ))}
              </div>
            )}

            <hr className="mt-8 border-indigo-100 dark:border-indigo-950" />
          </header>

          {/* 記事本文 */}
          <div className="prose">{content}</div>

          {/* コメントセクション（'use client' + mounted フラグにより hydration 前は非表示） */}
          <CommentSection slug={post.slug} />
        </article>

        {/*
         * デスクトップ用 TOC サイドバー（lg 未満では非表示）。
         * sticky で画面上部に追従する（要件 4.1）。
         */}
        {showToc && (
          <aside className="hidden w-56 flex-shrink-0 lg:block">
            <div className="sticky top-24">
              <TableOfContents items={tocItems} />
            </div>
          </aside>
        )}
      </div>
    </div>
  )
}
