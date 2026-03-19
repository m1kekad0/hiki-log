# ギャップ分析レポート: comment

## 1. 現状調査

### 既存アーキテクチャ

| 層 | 現状 |
|---|---|
| ページ | SSG（静的サイト生成）。`generateStaticParams` でビルド時に全記事を静的生成 |
| 動的処理 | `src/app/api/views/[slug]/route.ts` のみ（Vercel Serverless Functions） |
| データストア | Upstash Redis（HTTP REST）。`views:{slug}` キーで閲覧数のみ管理 |
| 認証 | **なし**。既存コードに認証機構は一切存在しない |
| クライアント状態 | `ViewCounter.tsx` が `use client` + `localStorage` で重複排除 |
| コメント関連 | **ゼロ**（ファイル・コンポーネント・API ルートすべて未存在） |

### 再利用可能な既存資産

| 資産 | 再利用可能な点 |
|---|---|
| `src/app/api/views/[slug]/route.ts` | API Route パターン、Redis 接続パターン、isBot() 判定 |
| `src/components/post/ViewCounter.tsx` | `use client` + fetch パターン、エラー時のフォールバック設計 |
| `src/app/posts/[slug]/page.tsx` | コメントセクション追加の挿入ポイント（`<article>` 末尾） |
| `@upstash/redis` | 既存依存関係。Redis の List 型でコメント保存も技術的に可能 |
| Tailwind CSS v4 / `next-themes` | ダークモード対応済みのデザインシステムそのまま利用可 |

---

## 2. 要件フィージビリティ分析

### 技術ニーズと現状のギャップ

| 要件 | 必要な技術 | 現状 | ギャップ |
|---|---|---|---|
| コメント表示 | コメント一覧取得 API / UI コンポーネント | 未存在 | **Missing** |
| コメント投稿 | フォーム UI + POST API + バリデーション | 未存在 | **Missing** |
| 認証・スパム対策 | 認証基盤 OR 外部サービスの認証 | 未存在 | **Missing（高リスク）** |
| モデレーション | 削除 API + 著者識別機構 | 未存在 | **Missing** |
| 遅延読み込み | 動的インポート or 外部スクリプト読み込み | 未存在 | **Missing** |
| アクセシビリティ | label, aria-busy, keyboard nav | パターン既存 | 実装レベルのみ |

### 認証の制約（最大の課題）

現在のコードベースに認証機構が**一切ない**。カスタム実装する場合：
- GitHub OAuth（NextAuth.js 等）の導入が必要
- セッション管理・トークン検証の追加
- 環境変数（Client ID / Secret）の追加管理

これにより実装工数が大幅に増加する。

### Redis によるコメント保存の制約

Upstash Redis を流用する場合：
- `RPUSH comments:{slug} <json>` で追加、`LRANGE` で取得は技術的に可能
- ただし、コメント削除が `LREM` のみで部分的（特定要素のみ削除に制限あり）
- コメント ID による管理、ページネーション、集計が苦手
- **Research Needed**: Redis リストのコメント ID 管理スキーマの設計

---

## 3. 実装アプローチ

### Option A: giscus（GitHub Discussions 埋め込み）

**概要**: GitHub Discussions をバックエンドとした外部 OSS コメントシステム。`<script>` タグで埋め込む。

**対応要件マッピング:**

| 要件 | 対応状況 |
|---|---|
| コメント表示 | ✅ giscus が自動レンダリング |
| コメント投稿 | ✅ GitHub アカウントで投稿可 |
| 認証・スパム対策 | ✅ GitHub 認証が標準で必須 |
| モデレーション | ✅ GitHub Discussions の管理 UI から削除可 |
| 遅延読み込み | ✅ Next.js 動的インポート + `next-themes` 連携で実現 |
| ダークモード | ✅ giscus の `data-theme` に連携 |
| Lighthouse 90+ | ✅ スクリプトは非ブロッキング読み込み |

**必要な追加作業:**
- giscus.app で GitHub Discussions リポジトリを設定
- `CommentSection.tsx`（`use client`）を新規作成
- `src/app/posts/[slug]/page.tsx` にコンポーネントを挿入
- 環境変数: `NEXT_PUBLIC_GISCUS_REPO`, `NEXT_PUBLIC_GISCUS_REPO_ID`, `NEXT_PUBLIC_GISCUS_CATEGORY`, `NEXT_PUBLIC_GISCUS_CATEGORY_ID`
- `giscus` npm パッケージ（またはスクリプト直接）の追加

**Trade-offs:**
- ✅ 認証・スパム対策・モデレーションがすべて GitHub で完結
- ✅ バックエンド追加なし。カスタム API Route 不要
- ✅ 実装工数が最小（主に UI 連携のみ）
- ✅ SSG アーキテクチャを完全維持
- ❌ GitHub アカウントが投稿に必須（匿名コメント不可）
- ❌ コメントデータが GitHub に依存（ポータビリティ低）
- ❌ プライベートリポジトリでは Discussions が利用できない

---

### Option B: カスタム実装（Upstash Redis + 独自認証）

**概要**: Upstash Redis の List 型でコメントを保存、NextAuth.js で GitHub OAuth 認証を追加。

**必要なコンポーネント:**
- `src/app/api/comments/[slug]/route.ts`（GET / POST / DELETE）
- `src/app/api/auth/[...nextauth]/route.ts`（NextAuth.js）
- `src/components/post/CommentSection.tsx`（フォーム + 一覧）
- `src/types/comment.ts`（Comment 型定義）
- 環境変数: `GITHUB_CLIENT_ID`, `GITHUB_CLIENT_SECRET`, `NEXTAUTH_SECRET`

**Trade-offs:**
- ✅ 完全カスタマイズ可能。データ所有権を維持
- ✅ 将来的に他の認証プロバイダへの切り替えが容易
- ❌ 認証基盤の新規実装（NextAuth.js のセットアップ）
- ❌ Redis によるコメント管理は設計が複雑（ID 管理、削除）
- ❌ 実装工数が大幅に増加（L〜XL）
- ❌ セキュリティリスクが高い（認証の誤実装リスク）

---

### Option C: ハイブリッド（giscus 表示 + 管理補助スクリプト）

**概要**: コメント表示・投稿は giscus に委ね、モデレーション通知を GitHub webhook で補完。

現時点ではサーバー管理インフラが不要なため、Option A で十分と判断。Option C の追加価値は低い。

---

## 4. 実装複雑度とリスク

| | Option A (giscus) | Option B (カスタム) |
|---|---|---|
| **工数** | S（1〜3日） | L（1〜2週間） |
| **リスク** | Low | High |
| **工数根拠** | 既存パターンに沿った UI 追加のみ。認証・API 不要 | 認証基盤の新規構築、Redis スキーマ設計、セキュリティ考慮が必要 |
| **リスク根拠** | 外部サービス依存だが GitHub は高可用。実装範囲が限定的 | 認証の誤実装リスク。Redis のリスト操作によるデータ整合性リスク |

---

## 5. デザインフェーズへの推奨事項

### 推奨アプローチ: **Option A (giscus)**

個人ブログの運用コンテキスト（SSG + Vercel + 低管理コスト）に最も適合する。読者も GitHub アカウントを持つ技術者が主体であり、GitHub 認証の要件は実質的な障壁にならない。

### 設計フェーズで調査すべき事項（Research Needed）

1. **giscus の `data-theme` と `next-themes` の連携方法** — `useTheme()` フックでテーマ変更を検知し giscus の iframe にメッセージを送る方法
2. **Next.js 動的インポート（`next/dynamic`）での giscus 埋め込み** — SSR 無効化と遅延読み込みの両立
3. **giscus の環境変数管理** — `NEXT_PUBLIC_` プレフィックス付き変数の Vercel 設定方法
4. **`@giscus/react` vs 生スクリプト埋め込みの比較** — React コンポーネントとして使うか、`<script>` タグを直接埋め込むかの選択

### 既存コードへの影響ポイント

- `src/app/posts/[slug]/page.tsx` — コメントセクションの挿入（`<article>` 末尾）
- `src/components/post/` — `CommentSection.tsx` の追加
- `src/app/layout.tsx` — 変更なし（テーマは `ThemeProvider` 経由でアクセス可能）
