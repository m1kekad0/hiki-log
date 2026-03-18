import { getAllPostMetas, getAllTags, getAllCategories } from '@/lib/posts'

import type { MetadataRoute } from 'next'

/** サイト URL */
const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? 'http://localhost:3001'

/**
 * サイトマップを動的生成する。
 * トップページ・記事詳細・タグ別・カテゴリ別ページを含む。
 */
export default function sitemap(): MetadataRoute.Sitemap {
  const posts = getAllPostMetas()
  const tags = getAllTags()
  const categories = getAllCategories()

  /** 記事詳細ページのエントリ */
  const postEntries: MetadataRoute.Sitemap = posts.map((post) => ({
    url: `${siteUrl}/posts/${post.slug}`,
    lastModified: new Date(post.updatedAt ?? post.publishedAt),
    changeFrequency: 'monthly',
    priority: 0.8,
  }))

  /** タグ別一覧ページのエントリ */
  const tagEntries: MetadataRoute.Sitemap = tags.map((tag) => ({
    url: `${siteUrl}/tags/${encodeURIComponent(tag)}`,
    changeFrequency: 'weekly',
    priority: 0.5,
  }))

  /** カテゴリ別一覧ページのエントリ */
  const categoryEntries: MetadataRoute.Sitemap = categories.map((category) => ({
    url: `${siteUrl}/categories/${encodeURIComponent(category)}`,
    changeFrequency: 'weekly',
    priority: 0.5,
  }))

  return [
    {
      url: siteUrl,
      changeFrequency: 'daily',
      priority: 1.0,
    },
    ...postEntries,
    ...tagEntries,
    ...categoryEntries,
  ]
}
