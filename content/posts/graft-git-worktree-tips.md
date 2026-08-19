---
title: "Graft × git worktree 実運用Tips：MCPではなくCLIを使う理由"
summary: "NanoNets/Graft 0.10.1 を git worktree と Claude Code のサブエージェント運用で検証して分かった、MCPのroot固定、CLIのauto-refresh、Graft Skillの.gitignore問題など、実測ベースの注意点をまとめます。"
tags:
  - "Graft"
  - "git"
  - "ClaudeCode"
  - "AIエージェント"
  - "開発効率化"
category: "😎 Daily"
publishedAt: "2026-08-19"
updatedAt: "2026-08-19"
published: true
---

## Graftをgit worktreeで使うときにハマったポイント

[NanoNets/Graft](https://github.com/NanoNets/Graft) を Claude Code のマルチエージェント運用へ導入し、`git worktree` 上のサブエージェントでも使おうとしたところ、通常の1リポジトリ運用では見えない注意点がいくつかありました。

この記事では、**Graft 0.10.1 + Claude Code + git worktree** の構成で実際に確認した内容だけに絞ってまとめます。

結論から言うと、worktree固有の未commit・未マージ差分をGraftで調査したい場合は、**MCPではなく、そのworktreeをcwdにしたGraft CLIを直接使う**のが重要です。

---

## 1. worktree固有の調査ではGraft MCPを使わない

最も重要なポイントです。

`graft mcp` は、MCPサーバー起動時にrootを解決し、そのディレクトリを以後のクエリでも使います。

つまり、メインリポジトリでMCPサーバーが起動した場合、あとからサブエージェントが別worktreeで作業しても、MCP側のrootが自動的にそのworktreeへ切り替わるわけではありません。

概念的には次の状態になります。

```text
main repository
  └─ graft mcp 起動
       └─ root = main に固定

worktree-A
  └─ Claude Code subagent
       └─ MCPを呼んでも参照先はmain
```

Graft 0.10.1 のMCP tool群も、呼び出しごとに `cwd` / `root` を切り替えるためのパラメータを持っていませんでした。

そのため、**worktree固有のコード差分を確認する用途では `mcp__graft__*` を使わない**方針にしています。

---

## 2. worktreeではGraft CLIをcwdから直接呼ぶ

worktree側では、Graft CLIをそのworktreeのディレクトリから直接実行します。

```bash
cd /path/to/worktree

graft map .
graft ask "<question>" . --source
graft grep "<literal>" .
graft skeleton path/to/File.java
graft callers SomeClass.someMethod
```

実際のPoCでは、mainには存在せずworktree側だけに存在する `hc06LimitSubject` というsymbolを使って比較しました。

worktree側では、

```bash
graft grep "hc06LimitSubject" .
```

を実行すると、

```text
[graft] refreshed the graph (4 files changed) before answering
```

と表示され、worktree固有の未マージ差分を正しく検出しました。

一方、mainで同じクエリを実行すると `no hits` となり、こちらも期待どおりでした。

つまりCLI経由なら、**現在のworktreeを基準に差分を検出し、Graft graphを更新した上で検索できる**ことを確認できました。

---

## 3. worktree作成時の `graft build` 強制は不要

最初は、worktreeを作るたびに次のような初期化が必要だと考えていました。

```text
git worktree add
  ↓
cd worktree
  ↓
graft build
  ↓
subagent開始
```

しかし、Graft CLIにはauto-seed / refreshの仕組みがあります。

実測でも初回クエリ時に変更ファイルを自動検出し、graphが更新されました。

そのため、通常は次の流れで十分です。

```text
worktree
  ↓
Graft CLI query
  ↓
auto-seed / refresh
  ↓
query実行
```

Graft自身が持っている仕組みと重複するため、worktree作成hookなどで毎回 `graft build` を強制する独自wrapperは追加していません。

---

## 4. 古いworktreeにはGraft設定が存在しないことがある

`git worktree` は、作成元ブランチのその時点のファイルを持ちます。

そのため、Graft導入前に作成したworktreeには、あとからmainへ追加した次のような設定が存在しないケースがあります。

```text
.mcp.json
.claude/settings.json
.claude/skills/graft/SKILL.md
AGENTS.md のGraftルール
```

今回も、Graft統合PRより前に分岐した複数worktreeでは、Graft設定そのものが存在していませんでした。

このケースを「サブエージェントがGraftを使わなかった」と誤認しないことが重要です。

既存worktreeへ無理に設定をcherry-pickするより、進行中の作業を壊さないことを優先し、必要な場合は通常の `Read` / `grep` へfallbackする運用にしています。

---

## 5. Graftが使えない場合はblockerにしない

Graftはコード探索を効率化するためのツールであり、Graft自体が使えないことを開発作業のblockerにはしません。

運用ルールはシンプルです。

```text
Graft利用可能
  ↓
Graft-firstで探索
  ↓
必要な箇所だけRead/Grep

Graft利用不可
  ↓
通常のRead/Grepへfallback
```

特にGraft導入前から存在するworktreeでは、このfallbackを許可しておいた方が安全です。

---

## 6. `graft/` graph/cacheをworktree間で共有しない

一般的な `git worktree` のTipsでは、ディスク容量削減のためにキャッシュをworktree間で共有する方法がよく紹介されます。

ただし、Graftの `graft/` graph/cacheについては共有しない方針にしました。

理由は、worktreeごとにコード状態が異なるからです。

```text
worktree-A
  └─ ScheduleServiceに未commit変更あり

worktree-B
  └─ ScheduleServiceはmainと同じ
```

この2つが同じgraph/cacheを共有すると、どのworking treeの状態を表しているのかが曖昧になります。

symlinkや共通cacheを独自に用意せず、**各worktreeでCLIのauto-refreshに任せる**方がシンプルで安全です。

---

## 7. Claude Codeのhooksではsession cacheの帰属にも注意

Claude Codeのサブエージェント利用状況を確認していた際、worktree側にGraft cacheが増えていないのに、main側の `graft/.cache/session/` には使用量が加算されているケースがありました。

調査すると、GraftのClaude Code hooksが `CLAUDE_PROJECT_DIR` を基準に動作しており、メイン側のディレクトリへsession情報が記録される構成になっていました。

そのため、

```text
worktree側にcacheがない
  =
Graftが絶対に使われていない
```

とは限りません。

Graftの利用状況を調査するときは、**session cacheの保存先だけでなく、サブエージェントが実際に実行したCLIコマンドも合わせて確認**した方が確実です。

---

## 8. `.gitignore` の `graft/` とGraft Skillが衝突した

Graftはローカルgraph/cacheをGit管理しないため、`.gitignore` に次の行を追加します。

```gitignore
graft/
```

ところがGitのignore patternとしては、これはルート直下だけでなく、任意階層の `graft/` ディレクトリにもマッチします。

その結果、Claude Code用に生成された

```text
.claude/skills/graft/SKILL.md
```

までignoreされ、Graft Skillが一度もGit管理されていないことが判明しました。

最初は次のようにルート限定へ変更しました。

```gitignore
/graft/
```

しかし、これには別の問題がありました。

---

## 9. `/graft/` へ変更するとGraft自身が `graft/` を再追加する

Graft 0.10.1 の `ensureGitIgnored` は、`.gitignore` に `graft/` または `graft` があるかを厳密に確認します。

そのため、こちらで

```gitignore
/graft/
```

へ変更しても、Graft側は「未設定」と判定します。

Claude CodeのStop hookなどから `graft build` が実行されるたびに、再び

```gitignore
graft/
```

が追加されてしまいました。

つまり、repo側だけで `/graft/` に変更する方法はGraftの自己管理と衝突します。

Graft本体へのpatchは避け、最終的には `graft/` をそのまま維持することにしました。

---

## 10. Graft Skillだけnegation patternで再許可する

最終的な `.gitignore` は次の形にしました。

```gitignore
graft/
!.claude/skills/graft/
```

Graft自身が期待する `graft/` を維持しつつ、Claude CodeのGraft Skillディレクトリだけを再許可します。

この状態で次を実測しました。

- ルートの `graft/` cacheは引き続きignoreされる
- `.claude/skills/graft/SKILL.md` はGit管理対象になる
- `graft build` を再実行しても `.gitignore` が書き換わらない
- Claude CodeのStop hook相当の処理を複数回実行しても重複行が追加されない

Graftの自動管理と競合しないため、`/graft/` へ書き換えるよりこちらの方が安定しました。

---

## 実運用ルールまとめ

現在は次のルールで運用しています。

### 通常のリポジトリ

Graftを優先してコードベースを探索します。

- `graft map` : リポジトリ全体の把握
- `graft skeleton` : 大きなファイルの構造把握
- `graft callers` : 呼び出し関係・blast radius調査
- `graft grep` : exhaustiveなliteral検索
- `graft ask` : conceptual searchの補助

Graftで不足する情報だけ、通常の `Read` / `grep` で補完します。

### git worktree

```text
worktree固有差分を調査
  ↓
Graft MCPは使わない
  ↓
worktreeをcwdにしてGraft CLIを直接実行
  ↓
auto-seed / refresh
  ↓
必要な箇所だけRead/Grep
```

### Graftが利用できない場合

通常の `Read` / `grep` へfallbackし、作業自体は継続します。

---

## まとめ

Graftと `git worktree` の組み合わせで特に重要だったのは、次の3点です。

1. **worktree固有差分を見る場合はMCPではなくCLIを使う**
2. **CLIにはauto-seed / refreshがあるため、毎回の `graft build` 強制は不要**
3. **`.gitignore` の `graft/` と `.claude/skills/graft/` の衝突に注意する**

Graft自体はworktreeでも十分活用できますが、通常repoと同じ感覚でMCPだけに任せると、main側のコードを参照したままレビューしてしまう可能性があります。

特に複数のClaude Codeサブエージェントをworktreeへ分離して並列実行する構成では、**「どのworking treeをGraftが見ているか」まで含めて運用ルール化する**のが安全です。

> ※ 本記事はGraft 0.10.1での実測結果です。Graft側でMCPのworktree対応などが変更された場合は、再検証が必要です。
