import { ImageResponse } from 'next/og'

import { getPostBySlug, getAllSlugs } from '@/lib/posts'

/** OGP 画像のサイズ（Twitter/OGP 標準） */
export const size = { width: 1200, height: 630 }
export const contentType = 'image/png'

/** ビルド時に静的生成するスラッグ一覧 */
export async function generateStaticParams() {
  return getAllSlugs().map((slug) => ({ slug }))
}

/**
 * 記事詳細ページの OGP 画像を動的生成する。
 * 記事タイトル・カテゴリ・ブログ名をデザインレイアウトで描画する。
 *
 * @param params - URL パラメータ（slug）
 */
export default async function OpenGraphImage({
  params,
}: {
  params: Promise<{ slug: string }>
}) {
  const { slug } = await params
  const post = getPostBySlug(slug)

  /** 記事が存在しない場合はデフォルト画像を返す */
  const title = post?.title ?? '記事が見つかりません'
  const category = post?.category ?? ''

  return new ImageResponse(
    (
      <div
        style={{
          width: '1200px',
          height: '630px',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'space-between',
          padding: '60px 72px',
          background: 'linear-gradient(135deg, #eef2ff 0%, #f5f3ff 50%, #fdf4ff 100%)',
          fontFamily: 'sans-serif',
        }}
      >
        {/* 上部：カテゴリラベル */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
          }}
        >
          {category && (
            <span
              style={{
                background: '#6366f1',
                color: '#fff',
                borderRadius: '9999px',
                padding: '6px 20px',
                fontSize: '22px',
                fontWeight: 700,
                letterSpacing: '0.05em',
              }}
            >
              {category}
            </span>
          )}
        </div>

        {/* 中央：記事タイトル */}
        <div
          style={{
            display: 'flex',
            flex: 1,
            alignItems: 'center',
            padding: '24px 0',
          }}
        >
          <p
            style={{
              fontSize: title.length > 30 ? '48px' : '56px',
              fontWeight: 900,
              color: '#1a1a2e',
              lineHeight: 1.3,
              margin: 0,
              wordBreak: 'break-word',
            }}
          >
            {title}
          </p>
        </div>

        {/* 下部：ブログ名 + アクセント */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
          }}
        >
          <span
            style={{
              fontSize: '26px',
              fontWeight: 700,
              color: '#6366f1',
            }}
          >
            🏠 引きこもりエンジニアの徒然ログ
          </span>

          {/* 右下の装飾ドット */}
          <div style={{ display: 'flex', gap: '8px' }}>
            {['#6366f1', '#8b5cf6', '#ec4899'].map((color, i) => (
              <div
                key={i}
                style={{
                  width: '16px',
                  height: '16px',
                  borderRadius: '50%',
                  background: color,
                }}
              />
            ))}
          </div>
        </div>

        {/* 左下のアクセントバー */}
        <div
          style={{
            position: 'absolute',
            bottom: 0,
            left: 0,
            width: '100%',
            height: '8px',
            background: 'linear-gradient(90deg, #6366f1, #8b5cf6, #ec4899)',
          }}
        />
      </div>
    ),
    { ...size },
  )
}
