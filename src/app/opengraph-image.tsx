import { ImageResponse } from 'next/og'

/** OGP 画像のサイズ */
export const size = { width: 1200, height: 630 }
export const contentType = 'image/png'

/**
 * サイトのデフォルト OGP 画像を生成する。
 * トップページや記事以外のページで使われる。
 */
export default function OpenGraphImage() {
  return new ImageResponse(
    (
      <div
        style={{
          width: '1200px',
          height: '630px',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          background: 'linear-gradient(135deg, #eef2ff 0%, #f5f3ff 50%, #fdf4ff 100%)',
          fontFamily: 'sans-serif',
          gap: '24px',
        }}
      >
        {/* アイコン */}
        <span style={{ fontSize: '80px' }}>🏠</span>

        {/* ブログタイトル */}
        <p
          style={{
            fontSize: '60px',
            fontWeight: 900,
            margin: 0,
            background: 'linear-gradient(90deg, #6366f1, #8b5cf6)',
            backgroundClip: 'text',
            color: 'transparent',
          }}
        >
          引きこもりエンジニアの徒然ログ
        </p>

        {/* サブタイトル */}
        <p
          style={{
            fontSize: '28px',
            color: '#6b7280',
            margin: 0,
          }}
        >
          技術系の記事を自由気ままに書き残す個人ブログ
        </p>

        {/* 下部グラデーションバー */}
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
