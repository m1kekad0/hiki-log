# Project Structure

## 組織方針

**関心事別レイヤー構成**。UI コンポーネントはドメイン別サブディレクトリに分類し、ビジネスロジックは `src/lib/` に集約する。

## ディレクトリパターン

### アプリケーション層
**場所**: `src/app/`
**目的**: Next.js App Router のページとレイアウト定義
**パターン**: ルートセグメントに対応したディレクトリ構造
```
src/app/
  layout.tsx          # ルートレイアウト（Header・Footer・ThemeProvider）
  page.tsx            # トップページ（記事一覧）
  posts/[slug]/       # 記事詳細
  tags/[tag]/         # タグ別一覧
  categories/[category]/  # カテゴリ別一覧
  search/             # 検索結果
  api/views/[slug]/   # 閲覧数 API Route
```

### コンポーネント層
**場所**: `src/components/`
**目的**: 再利用可能な UI コンポーネント
**パターン**: ドメイン別サブディレクトリに分類
- `layout/` — ページ共通要素（Header, Footer, ThemeProvider, ThemeToggle）
- `post/` — 記事関連コンポーネント（PostCard, PostList, TagBadge, ViewCounter, TableOfContents）
- `search/` — 検索 UI（SearchBox, SearchResults）
- `ui/` — 汎用プリミティブ（ビジネスロジックを持たない）

### ライブラリ層
**場所**: `src/lib/`
**目的**: ビジネスロジックとユーティリティ
**パターン**: 機能単位の TypeScript モジュール
- `posts.ts` — Markdown ファイルの読み込み・フィルタ・ソートロジック
- `mdx.ts` — MDX レンダリング設定
- `toc.ts` — Markdown から h2・h3 見出しを抽出し `TocItem[]` を返すユーティリティ

### 型定義
**場所**: `src/types/`
**目的**: アプリ全体で共有する TypeScript 型
- `post.ts` — `PostFrontmatter`, `PostMeta`, `Post` 型（継承チェーンで定義）
- `toc.ts` — `TocItem` 型（id / text / level を持つ目次アイテム）

### コンテンツ
**場所**: `content/posts/`
**目的**: ブログ記事の Markdown ソースファイル
**パターン**: `kebab-case.md`、フロントマターに `published` フラグ必須

### スクリプト
**場所**: `scripts/`
**目的**: ビルド補助スクリプト（TypeScript/ESM 除外対象）
- `generate-search-index.mjs` — `prebuild` フックで自動実行

## 命名規則

- **ファイル（コンポーネント）**: PascalCase（例: `PostCard.tsx`, `ThemeToggle.tsx`）
- **ファイル（ライブラリ・型）**: camelCase（例: `posts.ts`, `post.ts`）
- **ファイル（コンテンツ）**: kebab-case（例: `build-my-own-blog.md`）
- **関数**: camelCase
- **型・インターフェース**: PascalCase

## インポート規則

```typescript
// 外部ライブラリ（先）
import { format } from 'date-fns'

// 内部モジュール（絶対パス @/ 使用）
import PostCard from '@/components/post/PostCard'
import type { PostMeta } from '@/types/post'

// 相対インポートは同一ディレクトリ内のみ許容
import './globals.css'
```

**パスエイリアス**: `@/` は `./src/` にマッピング（`tsconfig.json` の `paths` 設定）

## コード組織の原則

- ページコンポーネント（`app/*/page.tsx`）はデータ取得と構成のみ担当し、UI ロジックはコンポーネントに委譲
- `src/lib/posts.ts` がデータアクセス層の単一エントリポイント。ページから直接 `fs` を操作しない
- クライアントコンポーネント（`'use client'`）は必要最小限に限定し、インタラクション必須の箇所のみに使用
