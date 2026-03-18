import { notFound } from 'next/navigation'

import PostList from '@/components/post/PostList'
import { getAllTags, getPostMetasByTag } from '@/lib/posts'

import type { Metadata } from 'next'

/** ページの動的パラメータの型 */
type Params = {
  params: Promise<{ tag: string }>
}

/**
 * ビルド時に静的生成するタグ一覧を返す。
 */
export async function generateStaticParams() {
  return getAllTags().map((tag) => ({ tag: encodeURIComponent(tag) }))
}

/**
 * タグページの動的メタデータを生成する。
 *
 * @param params - URL パラメータ（tag）
 */
export async function generateMetadata({ params }: Params): Promise<Metadata> {
  const { tag } = await params
  const decoded = decodeURIComponent(tag)
  return {
    title: `#${decoded} の記事一覧`,
    description: `タグ「${decoded}」が付いた記事の一覧です。`,
  }
}

/**
 * タグ別記事一覧ページ。
 * 指定タグを持つ公開済み記事をカード形式で表示する。
 *
 * @param params - URL パラメータ（tag）
 */
export default async function TagPage({ params }: Params) {
  const { tag } = await params
  const decoded = decodeURIComponent(tag)
  const posts = getPostMetasByTag(decoded)

  if (posts.length === 0) notFound()

  return (
    <div>
      {/* ページヘッダー */}
      <div className="mb-10">
        <p className="mb-1 text-sm text-gray-400">タグ</p>
        <h1 className="mb-2 text-3xl font-bold text-gray-900">
          <span className="text-indigo-500">#</span>
          {decoded}
        </h1>
        <p className="text-sm text-gray-400">{posts.length} 件の記事</p>
      </div>

      <PostList posts={posts} />
    </div>
  )
}
