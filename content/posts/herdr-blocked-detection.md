---
title: "Claude司令塔でWorkerのblockを安全に検知する仕組み"
summary: "Claudeを司令塔にしたマルチエージェント構成で、Humanが行っていたWorkerのコマンド承認をCommanderへ委譲するために整備した、Herdrの`agent wait`を使うblocked検知の仕組みとその経緯をまとめます。"
tags:
  - "Herdr"
  - "AIエージェント"
  - "ClaudeCode"
  - "マルチエージェント"
  - "開発効率化"
category: "😎 Daily"
publishedAt: "2026-09-06"
updatedAt: "2026-09-06"
published: false
---

## はじめに

個人開発では、Claudeを司令塔（Commander）にして、実作業をその都度起動したWorkerへ任せるマルチエージェント構成を使っています。

イメージとしては次のような形です。

```text
Human
  │
  │ 要求・優先順位・最終判断
  ▼
Claude Commander
  │
  ├─ Worker A
  ├─ Worker B
  └─ Worker C
```

Commander自身がすべての実装を行うのではなく、IssueやタスクごとにWorkerを起動して、調査・実装・レビューなどを委譲します。

この構成で意外と負担になったのが、**Workerのコマンド実行承認**でした。

当初は、Workerがpermission promptで止まるたびにHumanが画面を確認し、コマンド内容を読んで承認していました。

ただ、Workerを複数動かすようになると、この承認待ちがHuman側の監視タスクになってきます。

そこで、日常的な作業範囲の承認はCommanderに任せることにしました。

一方で、Workerを完全な無制限モードにして、すべてのコマンドを無条件に承認することには抵抗がありました。

```text
Humanが毎回承認
      ↓
監視負担が大きい
      ↓
Commanderへ承認判断を委譲したい
      ↓
でも全コマンドのpermission bypassは避けたい
```

この要件を成立させるには、Commanderがまず**「Workerが承認待ちで止まった」ことを確実に検知できる仕組み**が必要です。

この記事では、そのために整備したHerdrベースの`blocked`検知について、現在の方式だけでなく、そこに至るまでの失敗や設計判断も含めてまとめます。

---

## 1. なぜCommanderに承認判断を任せるのか

### Human承認は安全だが、監視コストが高い

最初の運用は単純でした。

Workerがコマンド実行前にpermission promptを出したら、Humanが内容を見て承認します。

```text
Worker
  │
  │ permission prompt
  ▼
Human
  │
  │ 内容確認
  ▼
approve / reject
```

1 Workerだけなら大きな問題ではありません。

しかし、実作業をWorkerへ委譲する構成では、Humanが別のことをしている間にもWorkerは進みます。

途中でpermission promptが出るたびに、Humanがターミナルへ戻って判断する必要がありました。

つまり、Workerへ実作業を任せても、Humanは完全には離れられません。

### Commanderなら作業コンテキストを持っている

Commanderは、Workerへ何を依頼したか、そのIssueでどこまでを許容するかを把握しています。

そのため、例えば次のような通常作業はCommanderが判断できます。

- workspace / worktree内のread / edit / write
- test / lint / format
- `git status` / `git diff` / `git log`
- `git add`
- `git commit`
- remote stateを変更しないread-only操作

一方で、remote mutationや危険な削除などはHumanへ上げます。

```text
Worker permission prompt
          │
          ▼
     Claude Commander
       │        │
       │        └─ 判断困難 / 高リスク → Human
       │
       └─ task scope内 → 承認
```

この形なら、Humanの監視負担を減らしつつ、判断レイヤー自体は残せます。

---

## 2. なぜpermission bypassにしなかったのか

最も簡単なのは、Workerを最初から「すべて承認」のモードで起動することです。

そうすれば、そもそもpermission promptを監視する必要はありません。

ただし、それではWorker自身が出したコマンドが、そのまま無条件で実行されます。

```text
Worker
  │
  │ command
  ▼
無条件実行
```

これでは、Commanderという判断レイヤーを置いている意味が薄くなります。

特にマルチエージェント構成では、Workerごとにモデルやproviderが異なり、誤ったコマンド生成や想定外の操作が起きる可能性も考慮したいところです。

そのため現在は、

> **permission prompt自体は残し、日常的な承認判断だけをHumanからCommanderへ移す**

という方針にしています。

つまり目指したのは、

```text
完全手動
Humanが全部承認
```

でも、

```text
完全自動
Workerを無制限モードで実行
```

でもなく、

```text
半自動
Workerはpermission boundaryを維持
        ↓
Commanderが通常操作を判断
        ↓
必要なものだけHumanへescalation
```

という中間の運用です。

この方式では、**CommanderがWorkerの停止を見逃さないこと**が前提になります。

そこで必要になったのが`blocked`監視です。

---

## 3. block検知にHerdrを使う

Workerのterminal管理にはHerdrを使っています。

Herdrはagent lifecycleとして、概ね次の状態を持っています。

```text
working
blocked
idle
done
unknown
```

permission promptや質問UIをHerdrが検知すると、Workerは`blocked`になります。

そのため、Commander側ではこの状態変化を監視します。

現在の基本形は次のコマンドです。

```bash
herdr agent wait <target> \
  --until blocked \
  --timeout 120000
```

ここで重要なのは、`agent get`を一定間隔で繰り返すpollingではなく、Herdr側の状態変化を待つことです。

概念的には次のようになります。

```text
Worker
  │
  │ working -> blocked
  ▼
Herdr Server
  │
  │ pane.agent_status_changed
  ▼
herdr agent wait
  │
  ▼
Commander側の監視処理
```

Herdr公式のAgent Automationでも、`blocked`待機の例として`agent wait`が使われています。

- [Agent automation | Herdr](https://herdr.dev/docs/agent-automation/)
- [Socket API | Herdr](https://herdr.dev/docs/socket-api/)

ただし、実運用では`agent wait --until blocked`をそのままループするだけでは不十分でした。

---

## 4. `wait --until blocked`を単純にループしない

`herdr agent wait`はlevel-triggeredです。

つまり、呼び出した時点ですでにWorkerが`blocked`なら即座にreturnします。

そのため、次のような単純ループは避けます。

```bash
while true; do
  herdr agent wait worker --until blocked
  echo blocked
done
```

Workerが`blocked`のままなら、同じ状態を繰り返し検知する可能性があります。

現在は次のような交互waitにしています。

```text
blockedを待つ
  ↓
blocked eventを1回出力
  ↓
blockedが解除されるまで待つ
  ↓
working / idle / done
  ↓
次のblockedを待つ
```

実際のwaitは概ね次の2段階です。

```bash
herdr agent wait "$TARGET" \
  --until blocked \
  --timeout "$ARM_TIMEOUT"

herdr agent wait "$TARGET" \
  --until working \
  --until idle \
  --until done \
  --timeout "$RESOLVE_TIMEOUT"
```

これにより、同じpermission promptを何度も通知せず、承認後にすぐ次のpermission promptが出た場合は別イベントとして検知できます。

---

## 5. `state_change_seq`でも重複を防ぐ

blockedイベントを受け取ったときは、Herdrが返す`state_change_seq`も使って重複通知を抑止しています。

監視側が出すイベントは次のような1行JSONです。

```json
{"event":"blocked","target":"worker-a","pane_id":"...","tab_id":"...","state_change_seq":123,"detected_at":"2026-09-06T00:00:00Z"}
```

直前に通知した`state_change_seq`と同じなら再通知しません。

交互waitと合わせて、level-triggeredなAPIをevent-likeに扱うための保険として使っています。

---

## 6. 以前はpolling watcherを検討していた

以前はbackground watcherから定期的にHerdr CLIを呼び出して状態を確認する方式も検討しました。

例えば、一定間隔で`herdr agent get`を実行する形です。

```text
agent get
  ↓
sleep
  ↓
agent get
  ↓
sleep
  ↓
...
```

しかし、Commander側でsandboxをbypassした状態から`herdr` executableをpathname経由で繰り返し実行すると、same-UID環境では実行ファイル置換に対するTOCTOUを完全には閉じられません。

絶対パス固定やhash確認をしても、「確認後から次回実行まで」の差し替え余地そのものは残ります。

この問題から、高頻度pollingを主経路にする方式はやめました。

`agent wait`なら、1回起動したCLIがHerdrサーバー側のイベントを待つため、状態確認のためにCLIを何度も短周期で再起動する必要がありません。

---

## 7. それでもHerdr CLI再実行には5秒のfloorを入れる

イベント駆動なのに、監視スクリプトではHerdr CLIの連続実行間に5秒のminimum intervalを設けています。

これはpolling intervalではありません。

`agent wait`はlevel-triggeredなので、状態によっては次のように連続で即時returnすることがあります。

```text
wait(blocked)
  ↓ 即時return
wait(resolved)
  ↓ 即時return
wait(blocked)
  ↓ 即時return
```

この場合、結果的に`herdr` executableを短時間で何度も再実行できます。

そこで、すべての`herdr agent wait`を単一のchokepoint関数経由にし、前回のHerdr CLI終了から次の起動まで最低5000ms空けています。

```text
herdr終了
  ↓
最低5秒
  ↓
次のherdr起動
```

重要なのは、これは「5秒ごとにWorker状態を確認する」という意味ではない点です。

待機中はHerdrのevent subscriptionに任せ、CLI再起動が必要になった場合だけ安全側のfloorを適用します。

---

## 8. `--max-iterations 1`を繰り返す方式にも問題があった

イベント監視スクリプトを1サイクルだけ起動し、終了するたびにCommanderが再起動する方式も試しました。

```bash
scripts/herdr-blocked-monitor.sh \
  --max-iterations 1 \
  <target>
```

しかし、この方式には監視空白ができます。

```text
Monitor N 終了
  │
  │ 監視プロセスなし
  │
Commanderが結果を処理
  │
  │ 監視プロセスなし
  │
Monitor N+1 起動
```

この間にWorkerの状態が遷移すると、blocked eventを取りこぼす可能性があります。

実運用でも、Humanから見るとWorkerがずっと止まっているのにCommander側の検知が後手に回るケースがありました。

そのため、`--max-iterations`はテスト用途に限定し、productionでは監視プロセスを1回だけ起動して継続稼働させています。

---

## 9. Commanderからは「persistent monitor + `tail -f`」で見る

Claude CodeなどをCommanderとして使う場合、もう1つ問題になるのがsandboxです。

Herdr CLIはcontrol plane socketへアクセスする必要がありますが、Commander側のMonitorツールから直接実行すると、そのsocketへ到達できない場合があります。

そのため現在は、HerdrへアクセスできるバックグラウンドBashから監視スクリプトを1回だけ起動します。

```bash
scripts/herdr-blocked-monitor.sh <target> \
  > /tmp/herdr-monitor-<target>.log 2>&1
```

そしてCommander側のMonitorはHerdrを直接呼ばず、ログだけを監視します。

```bash
tail -f -n0 /tmp/herdr-monitor-<target>.log
```

構成は次のようになります。

```text
Herdr Server
    │
    │ native event
    ▼
herdr agent wait
    │
    ▼
herdr-blocked-monitor.sh
    │
    │ JSON event
    ▼
/tmp/herdr-monitor-<target>.log
    │
    │ tail -f
    ▼
Claude Commander
```

`tail`は単なるローカルファイル監視なので、Herdrのcontrol plane socketへアクセスする必要がありません。

また、監視本体は継続稼働しているため、Commanderがblocked eventを処理している間も次の状態遷移の監視を続けられます。

---

## 10. 監視プロセスには承認能力を持たせない

監視処理はblockを検知するだけに限定しています。

監視スクリプトが使うのは基本的に次のread-only操作です。

```text
herdr agent get   # 起動時preflight
herdr agent wait  # 状態待機
```

`agent prompt`や`send-keys`など、Workerへ入力するcapabilityは持たせません。

```text
Monitor
  │
  │ blockedを検知するだけ
  ▼
Claude Commander
  │
  │ prompt内容を確認
  │ policyを判断
  ▼
承認 / Human escalation
```

ここは、permission bypassを避けた理由ともつながっています。

監視ロジックが「blockを見つけたからそのままEnterを押す」ような作りでは、実質的に無条件承認へ近づいてしまいます。

そこで、

```text
Detection capability
        ≠
Approval capability
```

として分離しています。

監視処理に不具合があっても、それだけでWorkerのコマンドが実行されることはありません。

---

## 11. Herdrのレスポンスはfail-closedで分類する

`agent wait`の結果も、「何となくJSONが読めたから続行」にはしていません。

監視側では結果を次の4種類に分類します。

```text
OK
RETRY_TIMEOUT
TARGET_GONE
FATAL
```

想定外のerror code、JSON schema不整合、必要fieldの欠落などは`FATAL`として監視を停止します。

Herdr側のレスポンス仕様が将来変わったときに、未知の状態を正常系と誤認して監視し続けるより、Human確認へ倒す方針です。

---

## 12. すべてのblockを検知できるわけではない

この方式にも限界があります。

Herdrが`blocked`として認識できないUIは、`agent wait --until blocked`でも検知できません。

実際にAntigravityのWorkspace Trust dialogは、Herdr上では`idle`のままとなり、`blocked`として検知できないケースがありました。

そのため、最終的には次のsignalを併用します。

- Herdr native state
- terminal / Herdr UI
- Workerからのagmsg checkpoint
- Human観測

これらが矛盾する場合は、自動的に正常とみなさずfail-closedでHumanへ上げます。

---

## 現在の全体像

ここまでを、最初のマルチエージェント構成まで含めてまとめると次のようになります。

```text
Human
  │
  │ 要求・最終判断
  ▼
Claude Commander
  │
  │ task dispatch
  ▼
Worker
  │
  │ working -> blocked
  ▼
Herdr Server
  │
  │ pane.agent_status_changed
  ▼
herdr agent wait
  │
  ▼
herdr-blocked-monitor.sh
  │
  ├─ read-only
  ├─ typed whitelist
  ├─ fail-closed
  ├─ 5s execution floor
  ├─ blocked/resolved alternating wait
  └─ state_change_seq dedup
  │
  ▼
append-only log
  │
  │ tail -f
  ▼
Claude Commander
  │
  ├─ task scope内 → 個別承認
  └─ 判断困難 / 高リスク → Human escalation
```

最初の課題は「Workerが止まったらどう検知するか」ではありませんでした。

もともとは、

> **Workerへ実作業を任せたいが、permission promptのたびにHumanが監視する状態からは抜けたい。ただし、無条件のpermission bypassにはしたくない。**

という運用上の課題がありました。

そこから、Commanderへ承認判断を委譲するための前提として、低遅延で安全なblocked検知が必要になりました。

`herdr agent wait`そのものはHerdr公式が提供している仕組みです。

今回のポイントは、それをそのまま使うだけではなく、実運用で発生した以下の問題を周辺レイヤーで潰したことでした。

- pollingによるCLI再実行
- level-triggered APIによる重複検知
- 短命monitor再起動による監視空白
- Commander側Monitorのsandbox制約
- 監視と承認capabilityの混在
- schema変更時の誤判定

結果として、Humanの監視負担は減らしつつ、Workerのpermission boundary自体は残す構成にしています。

完全自動化ではなく、**判断ポイントをHumanからCommanderへ1段移した**という表現が一番近いかもしれません。

## 参考

- [Herdr Agent Automation](https://herdr.dev/docs/agent-automation/)
- [Herdr Socket API](https://herdr.dev/docs/socket-api/)
- [herdrdev/herdr](https://github.com/herdrdev/herdr)
