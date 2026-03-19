# Research & Design Decisions

---
**Purpose**: ディスカバリーフェーズの調査結果と設計根拠を記録する。

---

## Summary

- **Feature**: `table-of-contents`
- **Discovery Scope**: Extension（既存の記事詳細ページへの機能追加）
- **Key Findings**:
  - `rehype-slug` は内部で `github-slugger` v2.0.0 を使用しており、アルゴリズムは「小文字化 → 非英数字・ハイフン以外を除去 → スペースをハイフンに置換」のシンプルな変換。独自実装より `github-slugger` を直接依存関係に追加することで ID 一致を保証できる。
  - `IntersectionObserver` API はすべてのモダンブラウザで利用可能（IE11 除く）。`rootMargin` の調整でアクティブセクション検出精度を制御できる。
  - 既存クライアントコンポーネント（`ViewCounter`, `SearchResults`）が `'use client'` + `useEffect` + `useState` のパターンを確立済みであり、TOC コンポーネントも同パターンに準拠する。

---

## Research Log

### `rehype-slug` の ID 生成アルゴリズム

- **Context**: TOC の見出し ID は `rehype-slug` が付与した `id` と一致しなければならない
- **Sources Consulted**: `node_modules/rehype-slug/package.json`、`node_modules/github-slugger/index.js`
- **Findings**:
  - `rehype-slug` v6.0.0 は `github-slugger` v2.0.0 に依存
  - アルゴリズム: `value.toLowerCase().replace(regex, '').replace(/ /g, '-')`
  - `regex` は Unicode 制御文字・句読点・記号を除去する大きな正規表現（`regex.js`）
  - 同一テキストの見出しが重複する場合は `-1`, `-2` サフィックスで一意化
  - 日本語文字はすべて除去されるため、日本語のみの見出しは空文字 or 数字ハイフンになる
- **Implications**:
  - 正規表現を自前実装するよりも `github-slugger` を direct dependency に追加する方が安全
  - 日本語見出し（英数字を含まない）では ID が空になるリスクがある → 実装時に空 ID のアイテムを除外する

### `IntersectionObserver` によるアクティブ検出

- **Context**: スクロール連動ハイライト（Requirement 3）の実装方針
- **Sources Consulted**: MDN Web Docs（IntersectionObserver API）、既存クライアントコンポーネント調査
- **Findings**:
  - `rootMargin: '-80px 0px -70% 0px'` でビューポート上部 80px〜30% の帯域を検知エリアに設定するのが一般的
  - 複数見出しが同時に検知帯域に入る場合は「最後に intersecting になった見出し」をアクティブとする
  - `threshold: 0` （見出しの 1px でも見えたら発火）が基本設定
  - Cleanup: `useEffect` の return でオブザーバーを disconnect する（`ViewCounter` 等の既存パターンに準拠）
- **Implications**:
  - Header の高さ（`sticky` header がある場合）を `rootMargin` の top 値に反映する必要がある

### 既存レイアウト制約

- **Context**: デスクトップでの TOC スティッキーサイドバー実装（Requirement 4.1）
- **Sources Consulted**: `src/app/posts/[slug]/page.tsx`、`src/app/layout.tsx`
- **Findings**:
  - Root layout: `mx-auto min-h-screen max-w-4xl px-4 py-10`
  - Post page article: `mx-auto max-w-3xl`
  - 2 カラムにするには post page のアウターコンテナを `flex` に変更し、記事コンテンツとサイドバーを並列配置する
  - Root layout の `max-w-4xl` 内では、サイドバー（約 `w-56`）+ 記事本文（`max-w-prose`）が収まる
- **Implications**:
  - `src/app/posts/[slug]/page.tsx` のレイアウト構造を変更する。Root layout は変更不要

---

## Architecture Pattern Evaluation

| Option | 説明 | Strengths | Risks / Limitations | Notes |
|--------|-----|-----------|---------------------|-------|
| A | `compileMdx` の rehype プラグインで見出しを抽出 | AST 経由で ID が完全一致 | `compileMDX` の返り値型変更が必要 | `next-mdx-remote/rsc` の非公式 API 利用 |
| B（採用） | 独立した `src/lib/toc.ts` で raw Markdown をパース | 既存 API に影響なし・テストしやすい | `github-slugger` との ID 一致確認が必要 | steering の lib 責務分離パターンに合致 |
| C | Option B + rehype プラグインで ID 検証 | 最も堅牢 | 開発オーバーヘッドが大きい | オーバーエンジニアリングと判断 |

**採用: Option B**

---

## Design Decisions

### Decision: `github-slugger` を direct dependency に追加

- **Context**: `extractTocItems()` が生成する `id` と `rehype-slug` が付与する `id` が一致する必要がある
- **Alternatives Considered**:
  1. 正規表現を自前実装（`regex.js` を複製）
  2. `github-slugger` を direct dependency として追加
- **Selected Approach**: `github-slugger` を `dependencies` に追加して `GithubSlugger` クラスを使用
- **Rationale**: アルゴリズムの正確な再現を保証し、将来の `rehype-slug` アップデートにも追従しやすい
- **Trade-offs**: 依存関係が 1 つ増えるが、既にトランジティブ依存として存在するため実態の増加はほぼゼロ
- **Follow-up**: 日本語のみ見出しで ID が空になるケースのテストを実装時に確認する

### Decision: TOC コンポーネントのモバイル・デスクトップ対応

- **Context**: モバイルとデスクトップで異なる表示形式（Requirement 4）
- **Alternatives Considered**:
  1. 1 コンポーネントで `isMobile?: boolean` prop で分岐
  2. ページ側で 2 インスタンスを配置し、それぞれを CSS で表示・非表示
  3. 1 コンポーネントがすべてのブレークポイントを内部で処理
- **Selected Approach**: 案 3（1 コンポーネント内部で Tailwind レスポンシブ対応）
- **Rationale**: コンポーネント数を最小化し、重複レンダリングを避ける。Tailwind の `lg:` プレフィックスで切り替え可能
- **Trade-offs**: コンポーネントの JSX が若干複雑になるが、許容範囲

---

## Risks & Mitigations

- **日本語見出しの ID 空問題**: `extractTocItems` で ID が空のアイテムを除外する。除外後の件数でも 2 未満なら TOC 非表示
- **`IntersectionObserver` の精度**: 見出しが近接している場合、アクティブ切り替えが不自然になる可能性。`rootMargin` の調整で対処
- **スクロール速度**: 高速スクロール時に `IntersectionObserver` イベントが間引かれることがある。UX 上許容範囲と判断

---

## References

- `node_modules/github-slugger/index.js` — slug 生成アルゴリズムの実装
- `node_modules/rehype-slug/index.js` — `GithubSlugger` の使用箇所
- `src/components/post/ViewCounter.tsx` — `'use client'` + `useEffect` のパターン参考
- `src/components/search/SearchResults.tsx` — `useEffect` + `useState` + `useMemo` のパターン参考
