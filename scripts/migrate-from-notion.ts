/**
 * Notion データベースから記事を取得し、Markdown ファイルとして出力する移行スクリプト。
 *
 * 使い方:
 *   npx tsx scripts/migrate-from-notion.ts
 *
 * 必要な環境変数（.env.local に設定済み）:
 *   NOTION_TOKEN       - Notion Integration Token
 *   NOTION_DATABASE_ID - 対象データベースの ID
 */

import fs from 'fs'
import path from 'path'

import { Client, isFullPage } from '@notionhq/client'
import { NotionToMarkdown } from 'notion-to-md'

// .env.local を読み込む
import { config } from 'dotenv'
config({ path: '.env.local' })

/** Notion クライアント */
const notion = new Client({ auth: process.env.NOTION_TOKEN })

/** Notion ブロック → Markdown 変換ツール */
const n2m = new NotionToMarkdown({ notionClient: notion })

/** 出力先ディレクトリ */
const OUTPUT_DIR = path.join(process.cwd(), 'content/posts')

/**
 * Notion の rich_text プロパティからプレーンテキストを取得する。
 *
 * @param prop - Notion プロパティオブジェクト
 */
function getRichText(prop: unknown): string {
  const p = prop as { type: string; rich_text: { plain_text: string }[] }
  if (p?.type === 'rich_text' && Array.isArray(p.rich_text)) {
    return p.rich_text.map((t) => t.plain_text).join('')
  }
  return ''
}

/**
 * Notion の title プロパティからテキストを取得する。
 *
 * @param prop - Notion プロパティオブジェクト
 */
function getTitle(prop: unknown): string {
  const p = prop as { type: string; title: { plain_text: string }[] }
  if (p?.type === 'title' && Array.isArray(p.title)) {
    return p.title.map((t) => t.plain_text).join('')
  }
  return ''
}

/**
 * Notion の select プロパティから値を取得する。
 *
 * @param prop - Notion プロパティオブジェクト
 */
function getSelect(prop: unknown): string {
  const p = prop as { type: string; select: { name: string } | null }
  if (p?.type === 'select' && p.select) {
    return p.select.name
  }
  return ''
}

/**
 * Notion の multi_select プロパティから値の配列を取得する。
 *
 * @param prop - Notion プロパティオブジェクト
 */
function getMultiSelect(prop: unknown): string[] {
  const p = prop as { type: string; multi_select: { name: string }[] }
  if (p?.type === 'multi_select' && Array.isArray(p.multi_select)) {
    return p.multi_select.map((s) => s.name)
  }
  return []
}

/**
 * Notion の date プロパティから ISO 8601 文字列を取得する。
 *
 * @param prop - Notion プロパティオブジェクト
 */
function getDate(prop: unknown): string {
  const p = prop as { type: string; date: { start: string } | null }
  if (p?.type === 'date' && p.date) {
    return p.date.start
  }
  return ''
}

/**
 * タイトルから URL スラッグを生成する（slug プロパティが空の場合のフォールバック）。
 * 英数字・ハイフン以外を除去し、小文字に変換する。
 *
 * @param title - 記事タイトル
 * @param pageId - Notion ページ ID（最終フォールバック）
 */
function slugify(title: string, pageId: string): string {
  const s = title
    .toLowerCase()
    .replace(/\s+/g, '-')
    .replace(/[^\w-]/g, '')
    .replace(/--+/g, '-')
    .replace(/^-|-$/g, '')
  return s || pageId.replace(/-/g, '').slice(0, 12)
}

/**
 * フロントマターを YAML 形式の文字列に変換する。
 *
 * @param data - フロントマターのデータオブジェクト
 */
function toFrontmatter(data: Record<string, unknown>): string {
  const lines = Object.entries(data).map(([key, value]) => {
    if (Array.isArray(value)) {
      if (value.length === 0) return `${key}: []`
      return `${key}:\n${value.map((v) => `  - "${v}"`).join('\n')}`
    }
    if (typeof value === 'boolean') return `${key}: ${value}`
    if (value === '' || value == null) return `${key}: ""`
    return `${key}: "${String(value).replace(/"/g, '\\"')}"`
  })
  return `---\n${lines.join('\n')}\n---`
}

/** メイン処理 */
async function main() {
  const databaseId = process.env.NOTION_DATABASE_ID
  if (!databaseId) {
    console.error('❌ NOTION_DATABASE_ID が設定されていません')
    process.exit(1)
  }

  console.log('📚 Notion データベースから記事を取得中...\n')

  // データベースの全ページを取得（ページネーション対応）
  const pages: Awaited<ReturnType<typeof notion.databases.query>>['results'] = []
  let cursor: string | undefined = undefined

  do {
    const response = await notion.databases.query({
      database_id: databaseId,
      start_cursor: cursor,
      page_size: 100,
    })
    pages.push(...response.results)
    cursor = response.has_more ? (response.next_cursor ?? undefined) : undefined
  } while (cursor)

  console.log(`📄 ${pages.length} 件のページを取得しました\n`)

  let successCount = 0
  let skipCount = 0

  for (const page of pages) {
    if (!isFullPage(page)) continue

    const props = page.properties

    /** 各プロパティを取得 */
    const title = getTitle(props.title)
    const slugProp = getRichText(props.slug)
    const status = getSelect(props.status)
    const category = getSelect(props.category)
    const tags = getMultiSelect(props.tags)
    const summary = getRichText(props.summary)
    const createdAt = getDate(props.createdAt) || page.created_time.slice(0, 10)
    const updatedAt = getDate(props.updatedAt) || page.last_edited_time.slice(0, 10)

    /** 公開済み記事のみ移行（status が "Published" または "公開" の記事） */
    const isPublished = ['Published', '公開', 'published'].includes(status)

    if (!title) {
      console.log(`⚠️  タイトルなし（スキップ）: ${page.id}`)
      skipCount++
      continue
    }

    /** スラッグ決定（プロパティ → タイトルから生成） */
    const slug = slugProp || slugify(title, page.id)

    /** 既存ファイルがあればスキップ */
    const outputPath = path.join(OUTPUT_DIR, `${slug}.md`)
    if (fs.existsSync(outputPath)) {
      console.log(`⏭️  スキップ（既存）: ${slug}.md`)
      skipCount++
      continue
    }

    console.log(`⬇️  変換中: ${title}`)

    try {
      /** Notion ブロックを Markdown に変換 */
      const mdBlocks = await n2m.pageToMarkdown(page.id)
      const mdContent = n2m.toMarkdownString(mdBlocks).parent

      /** フロントマターを生成 */
      const frontmatter = toFrontmatter({
        title,
        summary,
        tags,
        category,
        publishedAt: createdAt,
        updatedAt,
        published: isPublished,
      })

      /** ファイルに書き出し */
      fs.writeFileSync(outputPath, `${frontmatter}\n\n${mdContent}`, 'utf-8')
      console.log(`   ✅ ${slug}.md （published: ${isPublished}）`)
      successCount++
    } catch (err) {
      console.error(`   ❌ エラー: ${title}`, err)
      skipCount++
    }

    // API レート制限対策（300ms 待機）
    await new Promise((resolve) => setTimeout(resolve, 300))
  }

  console.log(`\n🎉 完了！ 成功: ${successCount} 件 / スキップ: ${skipCount} 件`)
  console.log(`📁 出力先: ${OUTPUT_DIR}`)
}

main().catch((err) => {
  console.error('❌ 予期しないエラーが発生しました', err)
  process.exit(1)
})
