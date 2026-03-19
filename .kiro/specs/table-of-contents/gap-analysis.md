# ギャップ分析: table-of-contents

> 作成日: 2026-03-19

---

## 1. 現状調査

### 関連する既存アセット

| アセット | パス | 関連性 |
|---------|------|--------|
| MDX コンパイル | `src/lib/mdx.ts` | `rehype-slug` で見出し ID 付与済み |
| 記事詳細ページ | `src/app/posts/[slug]/page.tsx` | TOC の挿入先・レイアウト変更が必要 |
| 型定義 | `src/types/post.ts` | `Post` 型（`content: string` 保持） |
| クライアントコンポーネント例 | `src/components/post/ViewCounter.tsx` | `'use client'` + `useEffect`/`useState` の実装パターン |
| グローバル CSS | `src/app/globals.css` | `.prose` スタイル・カスタム CSS 変数（`--accent` 等） |

### 既存の優位性

- **`rehype-slug` が導入済み**: Markdown の見出しに `id` 属性が自動付与されている。TOC のアンカーリンクと一致させるためには、同一のスラッグ生成アルゴリズムを再現する必要がある。
- **クライアントコンポーネントのパターン確立**: `ViewCounter` が `'use client'` + `useEffect` + 非同期処理のパターンを示している。スクロール追跡にも同様のパターンが使える。
- **CSS 変数で色体系が統一**: `--accent`・`--border` などを利用することで、ダークモード対応のスタイルが一貫して適用できる。
- **Tailwind CSS v4**: ユーティリティクラスで `sticky`・`top-[...]`・`max-h-[...]`・`overflow-y-auto` を直接指定でき、サイドバーのスティッキーレイアウトが容易。

### 不足している能力（ギャップ）

| # | ギャップ | 分類 |
|---|---------|------|
| G-1 | Markdown 本文から見出し（テキスト・レベル・ID）を抽出するユーティリティが存在しない | **Missing** |
| G-2 | 目次コンポーネント（`TableOfContents`）が存在しない | **Missing** |
| G-3 | スクロール連動の `IntersectionObserver` 実装が存在しない | **Missing** |
| G-4 | 記事詳細ページのレイアウトがシングルカラム（`max-w-3xl`）のみで、TOC 用サイドバー列がない | **Constraint** |
| G-5 | `rehype-slug` の ID 生成アルゴリズム（GitHub Slugger 互換）を独立して再現する実装が存在しない | **Unknown → Research Needed** |

---

## 2. 要件実現性分析

### 技術ニーズの整理

| 要件 | 必要な技術要素 | 現状 |
|------|--------------|------|
| Req.1 見出し抽出 | Markdown パーサー or 正規表現、rehype-slug ID 再現 | **なし** |
| Req.2 表示・ジャンプ | TOC コンポーネント（アンカーリンク）、スムーズスクロール（CSS） | **なし**（CSS `scroll-behavior` は追加可能） |
| Req.3 スクロール連動 | `IntersectionObserver` API（クライアントコンポーネント） | **なし** |
| Req.4 レスポンシブ対応 | デスクトップ: `sticky` サイドバー、モバイル: `useState` 折りたたみ | **一部可能**（Tailwind）|
| Req.5 アクセシビリティ | `<nav>`, `aria-label`, `aria-expanded`, `aria-current` | **パターン既存**（ViewCounter で `aria-hidden` の実績あり） |

### 制約事項

- **サーバーコンポーネント / クライアントコンポーネントの境界**
  スクロール連動（`IntersectionObserver`）はブラウザ API のため `'use client'` が必須。
  一方、見出し抽出はサーバーサイドで行い、データとして渡す方が SSG 最適化と相性が良い。

- **レイアウト変更の影響**
  記事詳細ページのアウターコンテナ（`mx-auto max-w-4xl` ← ルートレイアウト側が `max-w-4xl`、記事は `max-w-3xl`）を見直す必要がある。サイドバーを置くには `flex` や `grid` での 2 カラム構成に変更する。

---

## 3. 実装アプローチの選択肢

### Option A: `mdx.ts` の rehype プラグイン拡張 + 新規 TOC コンポーネント

- `compileMdx` に独自 rehype プラグインを追加し、AST から見出し情報を抽出して返す
- `next-mdx-remote/rsc` の `compileMDX` は `frontmatter` を通じて任意データを返せるため、見出しデータをここに乗せる

**Trade-offs:**
- ✅ MDX パイプラインで一元処理でき、rehype-slug と同じ AST を参照するため ID が確実に一致する
- ✅ 別途 Markdown 解析ライブラリが不要
- ❌ `compileMdx` の返り値型の変更が必要（後方互換性への配慮が必要）
- ❌ `next-mdx-remote/rsc` の `frontmatter` を介したデータ受け渡しは非公式的な使い方

### Option B: 独立した見出し抽出ユーティリティ + 新規 TOC コンポーネント（**推奨候補**）

- `src/lib/toc.ts` として独立したユーティリティを作成し、raw Markdown を受け取って見出しリストを返す
- `rehype-slug` が使う `github-slugger` 互換のスラッグ生成を自前で実装（または `github-slugger` パッケージを流用）
- `src/components/post/TableOfContents.tsx` を新規作成（クライアントコンポーネント）
- `src/app/posts/[slug]/page.tsx` で `toc.ts` を呼んで見出しデータを生成し TOC コンポーネントへ渡す

**Trade-offs:**
- ✅ `compileMdx` に変更を加えず既存 API を維持できる
- ✅ `src/lib/` の責務分離に合致（`toc.ts` は独立した関心事）
- ✅ テストしやすい純粋関数として実装できる
- ❌ `rehype-slug` の ID 生成と厳密に一致するか検証が必要（**Research Needed**）

### Option C: ハイブリッド（Option B + rehype プラグインで ID 検証）

- 基本は Option B だが、`rehype-slug` が実際に生成する ID を rehype プラグインで収集し、`toc.ts` の出力と照合するバリデーションを開発時のみ実行する

**Trade-offs:**
- ✅ 最も堅牢
- ❌ 開発オーバーヘッドが大きい

---

## 4. Research Needed

| # | 調査項目 |
|---|---------|
| R-1 | `rehype-slug` の ID 生成アルゴリズム（内部実装 or `github-slugger` の使用確認）。`github-slugger` が npm に存在するか、または自前の正規表現で再現できるかを設計フェーズで確認する |
| R-2 | `IntersectionObserver` のスレッショルド設定。複数見出しが画面内に収まる場合のアクティブ判定ロジックを設計フェーズで決定する |
| R-3 | モバイルでデフォルト折りたたみ時のアニメーション実装方針（CSS transition vs Tailwind `transition`）|

---

## 5. 実装複雑度・リスク評価

| 評価軸 | レベル | 根拠 |
|-------|--------|------|
| 工数 | **M（3〜7日）** | 新規ユーティリティ・新規コンポーネント・ページレイアウト変更が必要だが、スコープは明確 |
| リスク | **低〜中** | `rehype-slug` ID 一致（R-1）と `IntersectionObserver` 精度（R-2）に不確実性があるが、解決策は既知のパターンの範囲内 |

---

## 6. 設計フェーズへの推奨事項

### 推奨アプローチ
**Option B**（独立した `src/lib/toc.ts` + 新規 `TableOfContents` コンポーネント）

- 既存の `compileMdx` API に影響を与えない
- `src/lib/` の責務分離パターンに自然に合致する
- 設計フェーズで R-1（ID 一致）の確認を最優先に行う

### 設計フェーズで決定すべき主要事項

1. **見出し抽出方法**: 正規表現 vs `unified`/`remark-parse` パーサー
2. **ID 生成の一致確認**: `github-slugger` の採用可否
3. **レイアウト構造**: `max-w-4xl` の 2 カラム Grid vs Flex レイアウトの詳細
4. **スムーズスクロール**: CSS `scroll-behavior: smooth` の適用箇所
5. **`IntersectionObserver` 設定**: `rootMargin`・`threshold` の最適値
