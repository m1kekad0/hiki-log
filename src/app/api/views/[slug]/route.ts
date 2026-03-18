import { NextResponse } from 'next/server'
import { Redis } from '@upstash/redis'

/**
 * Upstash Redis クライアントのシングルトン。
 * HTTP REST API ベースのため Vercel Serverless Functions との相性が良く、
 * TCP コネクションの枯渇問題が発生しない。
 * HIKI_LOG_KV_REST_API_URL / HIKI_LOG_KV_REST_API_TOKEN 環境変数で接続先を指定する。
 */
const redis = new Redis({
  url: process.env.HIKI_LOG_KV_REST_API_URL!,
  token: process.env.HIKI_LOG_KV_REST_API_TOKEN!,
})

/** ルートパラメータの型 */
type Params = {
  params: Promise<{ slug: string }>
}

/**
 * ボットと思われるリクエストかどうか判定する。
 * User-Agent に既知のボット文字列が含まれている場合は true を返す。
 *
 * @param req - リクエストオブジェクト
 * @returns ボット判定結果
 */
function isBot(req: Request): boolean {
  const ua = req.headers.get('user-agent') ?? ''
  return /bot|crawl|spider|slurp|mediapartners|googlebot|bingbot|yandex|facebookexternalhit|twitterbot|rogerbot|linkedinbot|embedly|quora link preview|showyoubot|outbrain|pinterest|developers\.google\.com/i.test(
    ua,
  )
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
  const views = (await redis.get<number>(`views:${slug}`)) ?? 0
  return NextResponse.json({ views: Number(views) })
}

/**
 * 指定記事の閲覧数を 1 増やして返す。
 * ボット判定されたリクエストはカウントせず、現在の閲覧数のみ返す。
 * 記事詳細ページへのアクセス時にクライアントから呼び出す。
 *
 * POST /api/views/[slug]
 *
 * @param req - リクエストオブジェクト
 * @param params - URL パラメータ（slug）
 */
export async function POST(req: Request, { params }: Params) {
  const { slug } = await params

  /* ボットからのリクエストはカウントしない */
  if (isBot(req)) {
    const views = (await redis.get<number>(`views:${slug}`)) ?? 0
    return NextResponse.json({ views: Number(views) })
  }

  /** インクリメント後の閲覧数 */
  const views = await redis.incr(`views:${slug}`)
  return NextResponse.json({ views })
}
