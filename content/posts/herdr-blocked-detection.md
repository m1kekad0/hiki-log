---
title: "HerdrでAI Workerのblockを低遅延に検知する仕組み"
summary: "Herdrの`agent wait`を使ったイベント駆動のblocked検知を、polling・監視空白・level-triggeredの重複検知・sandbox制約といった実運用上の問題とあわせて整理します。"
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

## Herdr管理下のWorkerが止まったことをどう検知するか

AIコーディングエージェントを複数Workerとして動かしていると、permission promptや質問UIでWorkerが止まることがあります。

CommanderがWorkerをバックグラウンドで動かしている場合、Humanが画面を見続けなくても、この`blocked`状態をできるだけ早く検知したいところです。

現在は、Herdrのネイティブな状態待機APIである`herdr agent wait`を使い、イベント駆動で`blocked`を監視する方式にしています。

結論だけ先に書くと、基本形はこれです。

```bash
herdr agent wait <target> \
  --until blocked \
  --timeout 120000
```

ただし、実運用ではこれを単純にループするだけでは不十分でした。

この記事では、実際に運用して分かった問題と、現在使っている監視方式をまとめます。

---

## 1. pollingではなく`herdr agent wait`を使う

最初に重要なのは、Workerの状態を一定間隔で取得するpollingではなく、Herdr側の状態変化を待つことです。

```bash
herdr agent wait <target> --until blocked
```

`agent wait`はHerdrサーバー側のagent lifecycle eventを待つ仕組みで、固定間隔で`agent get`を繰り返すbusy pollingではありません。

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

---

## 2. `wait --until blocked`を単純にループしない

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

## 3. `state_change_seq`でも重複を防ぐ

blockedイベントを受け取ったときは、Herdrが返す`state_change_seq`も使って重複通知を抑止しています。

監視側が出すイベントは次のような1行JSONです。

```json
{"event":"blocked","target":"worker-a","pane_id":"...","tab_id":"...","state_change_seq":123,"detected_at":"2026-09-06T00:00:00Z"}
```

直前に通知した`state_change_seq`と同じなら再通知しません。

交互waitと合わせて、level-triggeredなAPIをevent-likeに扱うための保険として使っています。

---

## 4. 以前はpolling watcherを検討していた

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

## 5. それでもHerdr CLI再実行には5秒のfloorを入れる

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

## 6. `--max-iterations 1`を繰り返す方式にも問題があった

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

## 7. Commanderからは「persistent monitor + `tail -f`」で見る

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
Commander
```

`tail`は単なるローカルファイル監視なので、Herdrのcontrol plane socketへアクセスする必要がありません。

また、監視本体は継続稼働しているため、Commanderがblocked eventを処理している間も次の状態遷移の監視を続けられます。

---

## 8. 監視プロセスには承認能力を持たせない

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
Commander
  │
  │ prompt内容を確認
  │ policyを判断
  ▼
承認 / Human escalation
```

検知と承認を別capabilityに分けることで、監視ロジックの不具合がそのままpermissionの自動承認につながらないようにしています。

---

## 9. Herdrのレスポンスはfail-closedで分類する

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

## 10. すべてのblockを検知できるわけではない

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

## 現在の構成

現在のblock検知フローをまとめると次のようになります。

```text
             Herdr Server
                  │
      pane.agent_status_changed
                  │
                  ▼
        herdr agent wait
                  │
          event-driven wait
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
              tail -f
                  │
                  ▼
             Commander
```

`herdr agent wait`そのものはHerdr公式が提供している仕組みです。

今回のポイントは、それをそのまま使うだけではなく、実運用で発生した以下の問題を周辺レイヤーで潰したことでした。

- pollingによるCLI再実行
- level-triggered APIによる重複検知
- 短命monitor再起動による監視空白
- Commander側Monitorのsandbox制約
- 監視と承認capabilityの混在
- schema変更時の誤判定

Herdrのnative eventを土台にしつつ、Commander運用向けにhardenedした監視レイヤー、というのが現在の位置付けです。

## 参考

- [Herdr Agent Automation](https://herdr.dev/docs/agent-automation/)
- [Herdr Socket API](https://herdr.dev/docs/socket-api/)
- [herdrdev/herdr](https://github.com/herdrdev/herdr)
