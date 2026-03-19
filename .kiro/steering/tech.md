# Technology Stack

## アーキテクチャ

Next.js App Router による SSG（静的サイト生成）。記事は `content/posts/*.md` を `gray-matter` でパースしてビルド時に静的生成する。
閲覧数のみ動的（Vercel Serverless Functions + Upstash Redis）。

## コア技術

- **言語**: TypeScript 5（strict モード）
- **フレームワーク**: Next.js 16（App Router）
- **UI**: React 19
- **スタイリング**: Tailwind CSS v4（ユーティリティファースト）
- **ランタイム**: Node.js（Vercel Serverless Functions）

## 主要ライブラリ

- `gray-matter` — Markdown フロントマターのパース
- `next-mdx-remote` — MDX レンダリング
- `rehype-pretty-code` + `shiki` — コードシンタックスハイライト
- `rehype-slug` + `remark-gfm` — MDX プラグイン
- `date-fns` — 日付フォーマット（`ja` ロケール使用）
- `next-themes` — ダークモード管理（system / light / dark の 3 状態）
- `github-slugger` — 見出し ID 生成（`rehype-slug` と同一アルゴリズムで TOC アンカーと一致保証）
- `@upstash/redis` — 閲覧数カウント用 Redis クライアント（HTTP REST ベース）

## 開発標準

### 型安全
- `tsconfig.json` の `strict: true` を維持する
- `any` 型の使用禁止
- コンポーネントの Props は必ず型定義する

### コード品質
- ESLint（`eslint-config-next`）でコードスタイルを統一
- Prettier + `prettier-plugin-tailwindcss` で自動フォーマット
- コメントはすべて日本語で記述する
- JSDoc（`/** */`）を private を含むすべてのクラス・関数・コンポーネントに付与する

### テスト
- 現状テストコードなし（未対応）

## 開発コマンド

```bash
# 開発サーバー起動
npm run dev

# ビルド（search-index.json 自動生成 → next build）
npm run build

# フォーマット
npm run format

# Lint
npm run lint
```

## 環境変数

| 変数名 | 用途 |
|--------|------|
| `NEXT_PUBLIC_SITE_URL` | OGP・sitemap の絶対 URL 生成 |
| `HIKI_LOG_KV_REST_API_URL` | Upstash Redis REST エンドポイント |
| `HIKI_LOG_KV_REST_API_TOKEN` | Upstash Redis 認証トークン |

API キーは必ず環境変数で管理し、クライアントコードに露出しないこと（`NEXT_PUBLIC_` プレフィックスを付けない）。

## 主要技術判断

- **`@upstash/redis` 採用**: Vercel KV が 2024年12月廃止のため代替。HTTP REST ベースで TCP コネクション問題なし
- **検索インデックス**: ビルド時に `scripts/generate-search-index.mjs` で `public/search-index.json` を生成し CDN 配信。本文全文検索は対象外
- **SSG + 部分的 API Route**: ほぼ全ページが静的生成。閲覧数のみ `src/app/api/views/[slug]/route.ts` で動的処理
