# Implementation Plan

## Task Format

- [ ] でチェックされていないタスクが残作業
- `(P)` は並列実行可能なタスクを示す
- `- [ ]*` はオプション（MVP 後に対応可能）なテストタスクを示す

---

- [x] 1. giscus の環境セットアップ

- [x] 1.1 (P) GitHub リポジトリで Discussions を有効化し giscus 設定値を取得する
  - hiki-log リポジトリの Settings → Features → Discussions を有効化する
  - `giscus.app` でリポジトリを設定し、リポジトリ ID・カテゴリ ID・カテゴリ名を取得する
  - Discussions カテゴリとして「Comments」（または同等の名称）を作成する
  - 取得した値を `.env.local` に `NEXT_PUBLIC_GISCUS_REPO` 等の環境変数として追記する
  - `.env.example` に対応するキー（値は空）を追記してドキュメントとして保持する
  - _Requirements: 3.1, 3.2, 3.3, 3.4, 4.1, 4.2, 4.3_

- [x] 1.2 (P) `@giscus/react` パッケージをインストールする
  - `npm install @giscus/react` を実行してパッケージを追加する
  - インストール時に React 19 との peer dependency 警告が出る場合は `package.json` の `overrides` セクションで解決する
  - インストール後に `npm run build` が通ることを確認する
  - _Requirements: 1.1, 2.1_

- [x] 2. CommentSection コンポーネントの実装

- [x] 2.1 giscus を表示するクライアントコンポーネントの基本構造を作成する
  - `src/components/post/` 配下に `CommentSection.tsx` を作成し `'use client'` を宣言する
  - `@giscus/react` の `Giscus` コンポーネントを使用し、`mapping="pathname"`・`loading="lazy"` を設定する
  - 環境変数から `repo`・`repoId`・`category`・`categoryId` を読み込んで `Giscus` に渡す
  - コンポーネント全体を `<section aria-label="コメント">` でラップしてアクセシビリティを確保する
  - `inputPosition="top"`・`lang="ja"`・`reactionsEnabled="1"` を設定する
  - _Requirements: 1.1, 1.2, 1.3, 1.4, 2.1, 2.2, 2.3, 2.4, 2.5, 2.6, 2.7, 3.1, 3.2, 3.3, 3.4, 5.2, 5.3, 5.4_

- [x] 2.2 `next-themes` のテーマ状態と giscus のテーマをリアルタイムで同期する
  - `useTheme()` フックから `resolvedTheme` を取得する
  - hydration 完了前はコンポーネントを非表示にする `mounted` 状態フラグを実装する（`resolvedTheme` が `undefined` の間は `null` を返す）
  - `useEffect` で `resolvedTheme` の変化を監視し、`'light'` または `'dark'` に変換した値を `Giscus` の `theme` prop に渡す
  - テーマ変更後の即時反映のため、`iframe.giscus-frame` に `postMessage` でテーマを送信する処理を追加する（iframe 未存在時は送信をスキップする）
  - _Requirements: 1.5_

- [x] 3. 記事詳細ページへの CommentSection 統合
  - `src/app/posts/[slug]/page.tsx` にて `next/dynamic` を使い `CommentSection` を `ssr: false` で動的インポートする
  - `<article>` 内の `<div className="prose">` の直後に動的インポートした `CommentSection` を `slug` prop とともに挿入する
  - `loading` prop にロード中を示す空の `<div>` プレースホルダを指定しレイアウトシフトを防ぐ
  - _Requirements: 1.1, 5.1, 5.5_

- [ ]* 4. 動作確認（手動 E2E 検証）
  - ローカル開発サーバーで任意の記事ページを開き、スクロールすると giscus iframe が表示されることを確認する
  - ライトモード → ダークモード → システムモードの切り替えを行い、giscus のテーマが即時変わることを確認する
  - ページをリロードした際も正しいテーマで giscus が初期化されることを確認する
  - GitHub アカウントでサインインしてコメントを投稿できることを確認する
  - 記事ページの Lighthouse Performance スコアが 90 以上であることを確認する
  - _Requirements: 1.1, 1.5, 2.1, 2.7, 5.1, 5.5_
