# Research & Design Decisions

---
**Purpose**: コメント機能の設計に関するディスカバリー結果と設計判断の根拠を記録する。

---

## Summary

- **Feature**: `comment`
- **Discovery Scope**: Complex Integration（認証・外部サービス統合を含む新規機能）
- **Key Findings**:
  - giscus（GitHub Discussions ベース）が SSG + Vercel アーキテクチャに最適。認証・スパム対策・モデレーションをすべて GitHub に委ねられる
  - `@giscus/react` v3.1.0 を使い `'use client'` コンポーネントとして実装し、`next/dynamic` で遅延読み込みする
  - `next-themes` の `useTheme()` + giscus の postMessage API でテーマ同期を実現。ただし初期マウント時の hydration に注意が必要
  - giscus は GitHub 独自のフォーム UI を使うため、要件 2.2（名前フィールド）・2.4（2000文字上限）はカスタム実装ではなく GitHub の仕様に委ねられる

---

## Research Log

### giscus の基本仕様と設定パラメータ

- **Context**: コメントシステムの外部サービス選定
- **Sources Consulted**: https://giscus.app, https://github.com/giscus/giscus/blob/main/ADVANCED-USAGE.md
- **Findings**:
  - giscus は GitHub Discussions をバックエンドとする OSS コメントシステム
  - リポジトリが public であることが前提。GitHub アカウントが投稿に必須
  - 設定パラメータ（`@giscus/react` の Props）: `repo`, `repoId`, `category`, `categoryId`, `mapping`, `strict`, `reactionsEnabled`, `emitMetadata`, `inputPosition`, `theme`, `lang`, `loading`
  - `mapping: "pathname"` でページ URL とディスカッションを自動紐付け
  - テーマ値: `light`, `dark`, `preferred_color_scheme`, `github-light`, `github-dark`, `transparent_dark`, `noborder_dark`, `noborder_light`
  - `loading: "lazy"` でスクロール到達時に遅延読み込み
- **Implications**: `NEXT_PUBLIC_GISCUS_*` 環境変数で設定値を管理し、コンポーネントから参照する

### postMessage API によるテーマ動的変更

- **Context**: next-themes の 3 状態テーマ（system/light/dark）と giscus のテーマを同期させる必要がある
- **Sources Consulted**: https://github.com/giscus/giscus/blob/main/ADVANCED-USAGE.md
- **Findings**:
  - giscus の iframe（`.giscus-frame`）に `postMessage` でテーマ変更メッセージを送信できる
  - メッセージ形式: `{ giscus: { setConfig: { theme: 'dark' } } }`
  - 送信先 origin: `'https://giscus.app'`
  - `setConfig` の各プロパティはオプション。テーマのみを更新する場合は他プロパティは省略可
- **Implications**: `useTheme` の `resolvedTheme`（`'light'` または `'dark'` に解決済みの値）を監視し、変更時に postMessage を送信するパターンで実装する

### next-themes との統合における hydration 問題

- **Context**: `useTheme` を使う `'use client'` コンポーネントは SSR 時にテーマ値が `undefined`
- **Sources Consulted**: next-themes GitHub README, https://github.com/giscus/giscus/issues/1200
- **Findings**:
  - `useTheme` の `resolvedTheme` は初回マウント前（SSR 時）は `undefined`
  - `mounted` 状態フラグを持ち、`useEffect` 内でのみテーマ依存レンダリングを実行する必要がある
  - giscus の `theme` prop の初期値は `mounted` 前はデフォルト値（例: `'light'`）を渡しておき、マウント後に `resolvedTheme` に基づく値を渡す
  - リフレッシュ後の問題: `resolvedTheme` が確定する前に giscus が `light` テーマで初期化されてしまう場合がある → `mounted` フラグで DOM レンダリング自体を遅延させることで回避
- **Implications**: `CommentSection` は `mounted` フラグを持ち、マウント前は `null` または placeholder を返す

### `@giscus/react` のバージョンと React 19 互換性

- **Context**: プロジェクトは React 19.2.3 を使用
- **Sources Consulted**: https://www.npmjs.com/package/@giscus/react (検索結果), https://github.com/giscus/giscus-component
- **Findings**:
  - `@giscus/react` の最新バージョンは v3.1.0（2025年3月時点）
  - peerDependencies に関する詳細情報は取得できなかったが、React 19 との動作報告は多数確認されている
  - Web Component ラッパーのため React バージョン依存が低い設計
- **Implications**: インストール後に `npm install` が警告を出す場合は `--legacy-peer-deps` または `overrides` で対応する可能性あり。実装時に確認が必要

### 要件と giscus 仕様のミスマッチ

- **Context**: 要件は giscus 選定前に定義したため、giscus の制約と合わない箇所がある
- **Findings**:
  - **要件 2.2**（名前フィールドの提供）: giscus は GitHub ユーザー名を自動使用するため「名前」フィールドは存在しない。GitHub 認証が代替として機能する
  - **要件 2.4/2.5**（2000文字上限）: giscus は GitHub Discussions のデフォルト文字制限（65536文字）に従う。カスタムの 2000文字制限は実装不可
  - **要件 2.6**（フォームリセット）: giscus が内部で管理するため、親コンポーネントから制御不可
  - **要件 4.1/4.2/4.3**（削除 UI）: ブログ内の削除 UI は提供しない。GitHub Discussions の管理 UI で削除する
- **Implications**: 要件の一部は giscus の仕様を「満たすもの」と再解釈し、カスタム実装なしで対応する。設計ドキュメントでこの旨を明示する

---

## Architecture Pattern Evaluation

| Option | Description | Strengths | Risks / Limitations | Notes |
|--------|-------------|-----------|---------------------|-------|
| giscus（GitHub Discussions） | 外部 OSS コメントシステムを埋め込み | 認証・スパム対策・モデレーションが即座に利用可能。実装工数最小 | GitHub 依存。匿名コメント不可。文字数制限はカスタム設定不可 | **採用**。SSG + 技術者向けブログに最適 |
| Upstash Redis カスタム実装 | 既存 Redis + 独自 API Route | データ所有権を維持 | 認証基盤の新規実装（工数 L〜XL、セキュリティリスク High）。Redis はリスト管理に不向き | 却下 |
| 他の外部サービス（Disqus 等） | サードパーティコメントサービス | 匿名コメント対応 | 広告表示・データ所有権・プライバシー懸念。GitHub 技術者ブログとの相性が低い | 却下 |

---

## Design Decisions

### Decision: giscus（GitHub Discussions）を採用

- **Context**: コメントシステムのバックエンドと認証基盤の選択
- **Alternatives Considered**:
  1. Upstash Redis + NextAuth.js — フルカスタム実装
  2. Disqus などサードパーティ — 広告・プライバシー懸念
- **Selected Approach**: `@giscus/react` を `CommentSection` コンポーネントに包んで使用
- **Rationale**: 個人ブログの読者は技術者（GitHub アカウント保有率が高い）。認証・スパム対策・モデレーションを外部委ねることで、カスタム実装コストとセキュリティリスクを排除できる
- **Trade-offs**: GitHub 依存。匿名コメント不可。文字数制限のカスタマイズ不可
- **Follow-up**: `@giscus/react` の React 19 互換性を `npm install` 時に確認する

### Decision: `next/dynamic` による遅延読み込み

- **Context**: 要件 5.1（メインコンテンツのブロッキングなし）と Lighthouse 90+ 維持
- **Alternatives Considered**:
  1. 通常の `import` でバンドルに含める — シンプルだが初期 JS 増加
  2. `<script>` タグ直接埋め込み — `@giscus/react` を使わない場合のみ有効
- **Selected Approach**: `next/dynamic(() => import('@/components/post/CommentSection'), { ssr: false })`
- **Rationale**: `ssr: false` で SSR をスキップし、クライアントサイドのみで遅延ロード。`useTheme` の hydration 問題も同時に解決できる
- **Trade-offs**: 初回スクロールで若干のローディング遅延が生じる可能性
- **Follow-up**: Lighthouse スコアへの影響を実装後に計測する

### Decision: テーマ同期に `resolvedTheme` + postMessage を使用

- **Context**: next-themes の 3 状態（system/light/dark）と giscus テーマの同期
- **Alternatives Considered**:
  1. `theme` prop のみ — 初期レンダリング後のテーマ変更を検知できない
  2. `preferred_color_scheme` giscus テーマ — OS 設定に追従するが、ブログの手動切り替えと独立してしまう
- **Selected Approach**: `useTheme().resolvedTheme` を `useEffect` で監視し、`'light'` または `'dark'` に変換して `postMessage` で giscus iframe に送信
- **Rationale**: `resolvedTheme` は system テーマを解決済みの値として返すため、3 状態すべてに対応できる
- **Trade-offs**: iframe DOM が存在しない場合（スクロール前）は postMessage が無効化されるが、`loading: "lazy"` と初期 `theme` prop の正確な設定で補完する

---

## Risks & Mitigations

- giscus の `@giscus/react` が React 19 と非互換の場合 → `--legacy-peer-deps` または Web Component 直接埋め込みで対応
- giscus.app がダウンした場合にコメントセクションが表示されない → graceful degradation（エラー表示 or 非表示）。ブログ本文には影響なし
- GitHub リポジトリが private の場合は Discussions が使えない → リポジトリを public に設定することが前提条件
- テーマ変更時に postMessage のタイミングと iframe ロードのタイミングが競合する場合 → `useEffect` の依存配列に `resolvedTheme` を含め、iframe の存在チェック後に送信

---

## References

- [giscus 公式サイト](https://giscus.app) — 設定パラメータ一覧・セットアップ
- [giscus ADVANCED-USAGE.md](https://github.com/giscus/giscus/blob/main/ADVANCED-USAGE.md) — postMessage API 仕様
- [giscus-component GitHub](https://github.com/giscus/giscus-component) — @giscus/react ソースと README
- [next-themes GitHub](https://github.com/pacocoursey/next-themes) — useTheme フック・hydration 注意事項
- [giscus + next-themes テーマ同期 Issue](https://github.com/giscus/giscus/issues/1200) — リフレッシュ後のテーマ問題の議論
