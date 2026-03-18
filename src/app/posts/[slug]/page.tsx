import { notFound } from 'next/navigation'

import { format } from 'date-fns'
import { ja } from 'date-fns/locale'

import TagBadge from '@/components/post/TagBadge'
import { compileMdx } from '@/lib/mdx'
import { getAllSlugs, getPostBySlug } from '@/lib/posts'

import type { Metadata } from 'next'

/** ページの動的パラメータの型 */
type Params = {
  params: Promise<{ slug: string }>
}

/**
 * ビルド時に静的生成するスラッグ一覧を返す。
 * content/posts 内の全記事を対象にする。
 */
export async function generateStaticParams() {
  return getAllSlugs().map((slug) => ({ slug }))
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
 * Markdown 本文を MDX としてレンダリングして表示する。
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

  /** 公開日フォーマット */
  const formattedDate = format(new Date(post.publishedAt), 'yyyy年M月d日', { locale: ja })

  /** 更新日フォーマット（存在する場合のみ） */
  const formattedUpdatedAt = post.updatedAt
    ? format(new Date(post.updatedAt), 'yyyy年M月d日', { locale: ja })
    : null

  return (
    <article className="mx-auto max-w-3xl">
      {/* 記事ヘッダー */}
      <header className="mb-10">
        {/* カテゴリ */}
        {post.category && (
          <p className="mb-3 text-sm font-semibold tracking-widest text-indigo-500 uppercase">
            {post.category}
          </p>
        )}

        {/* タイトル */}
        <h1 className="mb-4 text-3xl font-bold leading-tight text-gray-900">{post.title}</h1>

        {/* 日付 */}
        <div className="mb-4 flex flex-wrap items-center gap-3 text-sm text-gray-400">
          <time dateTime={post.publishedAt}>公開: {formattedDate}</time>
          {formattedUpdatedAt && (
            <time dateTime={post.updatedAt}>更新: {formattedUpdatedAt}</time>
          )}
        </div>

        {/* タグ一覧 */}
        {post.tags.length > 0 && (
          <div className="flex flex-wrap gap-2">
            {post.tags.map((tag) => (
              <TagBadge key={tag} tag={tag} />
            ))}
          </div>
        )}

        <hr className="mt-8 border-indigo-100" />
      </header>

      {/* 記事本文 */}
      <div className="prose">{content}</div>
    </article>
  )
}
