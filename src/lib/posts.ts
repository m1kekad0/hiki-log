import fs from 'fs'
import path from 'path'

import matter from 'gray-matter'

import type { Post, PostMeta } from '@/types/post'

/** content/posts ディレクトリへの絶対パス */
const POSTS_DIR = path.join(process.cwd(), 'content/posts')

/**
 * content/posts ディレクトリ内の全 Markdown ファイルのスラッグ一覧を返す。
 * スラッグはファイル名から `.md` 拡張子を除いた文字列。
 */
export function getAllSlugs(): string[] {
  return fs
    .readdirSync(POSTS_DIR)
    .filter((file) => file.endsWith('.md'))
    .map((file) => file.replace(/\.md$/, ''))
}

/**
 * 全記事のメタデータ一覧を返す。
 * published フラグが false の記事は除外する。
 * 公開日の降順（新しい順）でソートされる。
 */
export function getAllPostMetas(): PostMeta[] {
  const slugs = getAllSlugs()

  const metas = slugs
    .map((slug) => {
      const filePath = path.join(POSTS_DIR, `${slug}.md`)
      const raw = fs.readFileSync(filePath, 'utf-8')
      const { data } = matter(raw)

      return {
        slug,
        title: data.title ?? '',
        summary: data.summary ?? '',
        tags: data.tags ?? [],
        category: data.category ?? '',
        publishedAt: data.publishedAt ?? '',
        updatedAt: data.updatedAt,
        published: data.published ?? false,
      } satisfies PostMeta
    })
    .filter((meta) => meta.published)

  // 公開日の降順にソート
  return metas.sort(
    (a, b) => new Date(b.publishedAt).getTime() - new Date(a.publishedAt).getTime(),
  )
}

/**
 * 指定スラッグの記事データ（本文含む）を返す。
 * 記事が存在しない、または published が false の場合は null を返す。
 *
 * @param slug - 取得する記事のスラッグ
 */
export function getPostBySlug(slug: string): Post | null {
  const filePath = path.join(POSTS_DIR, `${slug}.md`)

  if (!fs.existsSync(filePath)) return null

  const raw = fs.readFileSync(filePath, 'utf-8')
  const { data, content } = matter(raw)

  if (!data.published) return null

  return {
    slug,
    title: data.title ?? '',
    summary: data.summary ?? '',
    tags: data.tags ?? [],
    category: data.category ?? '',
    publishedAt: data.publishedAt ?? '',
    updatedAt: data.updatedAt,
    published: data.published ?? false,
    content,
  }
}

/**
 * 全記事のタグを重複なしで返す。
 * アルファベット順でソートされる。
 */
export function getAllTags(): string[] {
  const metas = getAllPostMetas()
  const tagSet = new Set(metas.flatMap((meta) => meta.tags))
  return Array.from(tagSet).sort()
}

/**
 * 全記事のカテゴリを重複なしで返す。
 * アルファベット順でソートされる。
 */
export function getAllCategories(): string[] {
  const metas = getAllPostMetas()
  const categorySet = new Set(metas.map((meta) => meta.category).filter(Boolean))
  return Array.from(categorySet).sort()
}

/**
 * 指定タグを含む記事メタデータ一覧を返す。
 * 公開日の降順でソートされる。
 *
 * @param tag - 絞り込むタグ名
 */
export function getPostMetasByTag(tag: string): PostMeta[] {
  return getAllPostMetas().filter((meta) => meta.tags.includes(tag))
}

/**
 * 指定カテゴリの記事メタデータ一覧を返す。
 * 公開日の降順でソートされる。
 *
 * @param category - 絞り込むカテゴリ名
 */
export function getPostMetasByCategory(category: string): PostMeta[] {
  return getAllPostMetas().filter((meta) => meta.category === category)
}

/**
 * 全記事の検索用データ（slug・title・summary・tags）を返す。
 * クライアントサイド検索のインデックスとして使用する。
 */
export function getSearchIndex(): Pick<PostMeta, 'slug' | 'title' | 'summary' | 'tags' | 'category' | 'publishedAt'>[] {
  return getAllPostMetas().map(({ slug, title, summary, tags, category, publishedAt }) => ({
    slug,
    title,
    summary,
    tags,
    category,
    publishedAt,
  }))
}
