import { kv } from '@vercel/kv'
import { NextResponse } from 'next/server'

/** ルートパラメータの型 */
type Params = {
  params: Promise<{ slug: string }>
}

/**
 * 指定記事の現在の閲覧数を返す。
 *
 * GET /api/views/[slug]
 *
 * @param params - URL パラメータ（slug）
 */
export async function GET(_req: Request, { params }: Params) {
  const { slug } = await params
  const views = (await kv.get<number>(`views:${slug}`)) ?? 0
  return NextResponse.json({ views })
}

/**
 * 指定記事の閲覧数を 1 増やして返す。
 * 記事詳細ページへのアクセス時にクライアントから呼び出す。
 *
 * POST /api/views/[slug]
 *
 * @param params - URL パラメータ（slug）
 */
export async function POST(_req: Request, { params }: Params) {
  const { slug } = await params
  /** インクリメント後の閲覧数 */
  const views = await kv.incr(`views:${slug}`)
  return NextResponse.json({ views })
}
