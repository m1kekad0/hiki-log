import { notFound } from 'next/navigation'

import PostList from '@/components/post/PostList'
import { getAllCategories, getPostMetasByCategory } from '@/lib/posts'

import type { Metadata } from 'next'

/** ページの動的パラメータの型 */
type Params = {
  params: Promise<{ category: string }>
}

/**
 * ビルド時に静的生成するカテゴリ一覧を返す。
 */
export async function generateStaticParams() {
  return getAllCategories().map((category) => ({ category: encodeURIComponent(category) }))
}

/**
 * カテゴリページの動的メタデータを生成する。
 *
 * @param params - URL パラメータ（category）
 */
export async function generateMetadata({ params }: Params): Promise<Metadata> {
  const { category } = await params
  const decoded = decodeURIComponent(category)
  return {
    title: `${decoded} の記事一覧`,
    description: `カテゴリ「${decoded}」の記事一覧です。`,
  }
}

/**
 * カテゴリ別記事一覧ページ。
 * 指定カテゴリの公開済み記事をカード形式で表示する。
 *
 * @param params - URL パラメータ（category）
 */
export default async function CategoryPage({ params }: Params) {
  const { category } = await params
  const decoded = decodeURIComponent(category)
  const posts = getPostMetasByCategory(decoded)

  if (posts.length === 0) notFound()

  return (
    <div>
      {/* ページヘッダー */}
      <div className="mb-10">
        <p className="mb-1 text-sm text-gray-400">カテゴリ</p>
        <h1 className="mb-2 text-3xl font-bold text-gray-900">{decoded}</h1>
        <p className="text-sm text-gray-400">{posts.length} 件の記事</p>
      </div>

      <PostList posts={posts} />
    </div>
  )
}
