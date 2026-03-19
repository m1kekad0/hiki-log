# Requirements Document

## Introduction

「引きこもりエンジニアの徒然ログ」にコメント機能を追加する。読者が記事に対してフィードバックや質問を投稿できるようにし、著者と読者間のインタラクションを促進する。既存の SSG + Vercel Serverless Functions アーキテクチャに統合し、Lighthouse Score 90+ を維持しながら実装する。

## Requirements

### 1. コメント表示

**Objective:** 読者として、記事ページで他の読者のコメントを読みたい。記事へのフィードバックや議論を確認できるようにするため。

#### Acceptance Criteria

1. The hiki-log shall コメントセクションを各記事詳細ページ（`/posts/[slug]`）の本文末尾に表示する。
2. When コメントが存在する場合、the hiki-log shall コメントを投稿日時の昇順（古い順）で表示する。
3. The hiki-log shall 各コメントに投稿者名・投稿日時・本文を表示する。
4. When コメントが 0 件の場合、the hiki-log shall 「まだコメントはありません」などの空状態メッセージを表示する。
5. The hiki-log shall ダークモード・ライトモード両方でコメントセクションを適切な配色で表示する。

### 2. コメント投稿

**Objective:** 読者として、記事に対してコメントを投稿したい。著者や他の読者に意見・質問を伝えるため。

#### Acceptance Criteria

1. When 読者がコメント入力フォームを送信した場合、the hiki-log shall コメントを保存して表示に反映する。
2. The hiki-log shall 投稿フォームに「名前」と「コメント本文」の入力欄を提供する。
3. If 名前またはコメント本文が空のまま送信された場合、the hiki-log shall バリデーションエラーメッセージを表示してコメントを保存しない。
4. The hiki-log shall コメント本文を 2000 文字以内に制限する。
5. If コメント本文が 2000 文字を超えた場合、the hiki-log shall 超過を示すエラーメッセージを表示する。
6. When コメントの送信が成功した場合、the hiki-log shall フォームをリセットして新しいコメントを表示に反映する。
7. If コメント送信中にネットワークエラーが発生した場合、the hiki-log shall エラーメッセージを表示して入力内容を保持する。

### 3. 認証・スパム対策

**Objective:** ブログ運営者として、スパムや悪意あるコメントを防止したい。コメントセクションの品質を維持するため。

#### Acceptance Criteria

1. The hiki-log shall コメント投稿に何らかの認証または bot 対策を適用する。
2. Where GitHub 認証が使用される場合、the hiki-log shall GitHub アカウントでのサインインを経由してコメントを投稿させる。
3. If 未認証のユーザーがコメントを投稿しようとした場合、the hiki-log shall 認証を促すメッセージを表示する。
4. The hiki-log shall 連続した同一内容の重複コメントを拒否する。

### 4. コメント管理（モデレーション）

**Objective:** ブログ著者として、不適切なコメントを削除または非表示にしたい。コメントセクションを適切な状態に保つため。

#### Acceptance Criteria

1. The hiki-log shall 著者が不適切なコメントを削除できる手段を提供する。
2. When 著者がコメントを削除した場合、the hiki-log shall 該当コメントを表示から即時除外する。
3. The hiki-log shall 著者以外のユーザーがコメントを削除できないよう制御する。

### 5. パフォーマンスとアクセシビリティ

**Objective:** 読者として、コメント機能が既存のページ体験を損なわないことを期待する。高速なページロードと操作性を維持するため。

#### Acceptance Criteria

1. The hiki-log shall コメントセクションをメインコンテンツの読み込みをブロックしない方法（遅延読み込みなど）で統合する。
2. The hiki-log shall コメントフォームをキーボードのみで操作可能にする。
3. The hiki-log shall コメントフォームの入力欄に適切な `label` または `aria-label` を付与する。
4. The hiki-log shall コメント送信ボタンの処理中に `aria-busy` または disabled 状態を表示し、二重送信を防止する。
5. The hiki-log shall コメント機能追加後も Lighthouse Performance スコアを 90 以上に維持する。
