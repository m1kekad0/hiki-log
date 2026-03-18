/**
 * ビルド時に検索インデックス JSON を生成するスクリプト。
 * `public/search-index.json` に公開済み記事のメタデータを書き出す。
 *
 * 実行タイミング: next build の前（package.json の prebuild で呼び出す）
 */

import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

import matter from 'gray-matter'

/** スクリプトのディレクトリ（scripts/）から見たプロジェクトルート */
const ROOT_DIR = path.join(path.dirname(fileURLToPath(import.meta.url)), '..')

/** content/posts ディレクトリへの絶対パス */
const POSTS_DIR = path.join(ROOT_DIR, 'content/posts')

/** 出力先の JSON ファイルパス */
const OUTPUT_PATH = path.join(ROOT_DIR, 'public/search-index.json')

/**
 * 公開済み記事のメタデータを収集して JSON ファイルを生成する。
 * 検索対象フィールド: slug / title / summary / tags / category
 */
function generateSearchIndex() {
  const files = fs.readdirSync(POSTS_DIR).filter((f) => f.endsWith('.md'))

  const index = files
    .map((file) => {
      const slug = file.replace(/\.md$/, '')
      const raw = fs.readFileSync(path.join(POSTS_DIR, file), 'utf-8')
      const { data } = matter(raw)

      return {
        slug,
        title: data.title ?? '',
        summary: data.summary ?? '',
        tags: data.tags ?? [],
        category: data.category ?? '',
        publishedAt: data.publishedAt ?? '',
        published: data.published ?? false,
      }
    })
    /* 公開済み記事のみ対象 */
    .filter((post) => post.published)
    /* 公開日の降順 */
    .sort((a, b) => new Date(b.publishedAt).getTime() - new Date(a.publishedAt).getTime())
    /* published フラグ自体は JSON に含めない */
    .map(({ slug, title, summary, tags, category, publishedAt }) => ({
      slug,
      title,
      summary,
      tags,
      category,
      publishedAt,
    }))

  fs.writeFileSync(OUTPUT_PATH, JSON.stringify(index), 'utf-8')
  console.log(`✓ search-index.json を生成しました (${index.length} 件)`)
}

generateSearchIndex()
