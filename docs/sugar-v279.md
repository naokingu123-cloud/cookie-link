# シュガーチャレンジ v279 — 透過倍率と開始前の旧ルール移行

版: `20261120-v279-sugar-transparent-and-current-rules`。2026-11-20の追加依頼に対応する。

## 倍率素材

倍率ルーレットに使う `assets/sugar-art-v270/multiplier-{n}.png` の6枚はバイト単位で保持する。回転順、回転時間、停止位置、倍率の選択も変更しない。

開始後の表示には、既存の絵を画像生成ツールで背景除去したRGBA PNGを使用する。6枚とも1254×1254で、拡大前提の元解像度を保持している。文字・倍率・色・菓子の装飾は元画像を引き継ぎ、景色と画面全体の光線を透明にした。生成後の縮小・切り抜き・アルファの再加工は行っていない。

| 倍率 | 名称・配色 | 透過素材 |
|---:|---|---|
| 1 | クリーム・銀 | [multiplier-1-transparent.png](../assets/sugar-art-v279/multiplier-1-transparent.png) |
| 2 | ハイパー・緑 | [multiplier-2-transparent.png](../assets/sugar-art-v279/multiplier-2-transparent.png) |
| 3 | スペシャル・黄 | [multiplier-3-transparent.png](../assets/sugar-art-v279/multiplier-3-transparent.png) |
| 4 | ウルトラ・赤 | [multiplier-4-transparent.png](../assets/sugar-art-v279/multiplier-4-transparent.png) |
| 5 | ミラクル・紫 | [multiplier-5-transparent.png](../assets/sugar-art-v279/multiplier-5-transparent.png) |
| 10 | ギャラクシー・虹 | [multiplier-10-transparent.png](../assets/sugar-art-v279/multiplier-10-transparent.png) |

JPヘッダの倍率、チャレンジ中の決定済み倍率、JPC獲得演出を透過版へ切り替え、透過画像の後ろに四角い板や枠が残らないようにした。倍率ルーレット内の元画像と、リール下の停止倍率文字は従来どおり。

将来JPC画面で拡大表示するときは、`SweetsSugarChallengeV254.multiplierArtwork(n)` から `transparentSrc`・`reelSrc`・`label`・`tier` を取得できる。返り値は読み取り専用で、未対応の倍率は `null`。PNGファイルを直接参照することもできる。今回JPC本体のゲームは追加していない。

生成方法、全6プロンプト、元画像と透過版のSHA-256、サイズ、アルファの測定値は [provenance.json](../assets/sugar-art-v279/provenance.json) に記録した。

## 低いゲージでJPCになる原因と修正

新規作成は既にrevision271を使用していた。一方、保存されていた **0球の旧チャレンジ** を再利用すると、ローカル版は旧状態をそのまま復元し、サーバー版も「開始済み」として旧状態を返していた。このため、旧revision270の開始前データでは入賞1〜8・合計36でもJPCになった。

ルールに `upgradeUnstarted` を追加し、所有者が確認した開始前の境界だけを現行条件へ移す。復元関数全体を新ルールへ上書きする方法は使わない。

| カード | 現行JPC条件 |
|---|---|
| 通常 | 合計139以上、または途中合計77に一致 |
| ラッキー | 合計139以上、または途中合計77・88に一致 |
| ワイド | 合計130以上、または途中合計77に一致 |

低合計の範囲だけを理由にJPCへ入る条件はない。途中のラッキーナンバー一致による確定はその後も保持する。既定のカード比率と、一様な非復元8/25抽選での条件付き突入率約9.949938%は変更しない。

移行では、既に決定したJPベース額、倍率、シュガー5個の値、seed、チャレンジIDを保持する。旧版のJP端数処理は `quoteRevision` として保存し、JP金額を再計算によって変えない。シュガーの再消費・倍率の再抽選・CREDITの変更は行わない。通常のはずれ配当は、現行仕様どおり倍率を掛けないJPベースに基づく。

- ローカル版: まだ球を受け取っていない旧保存データを移行する。途中ゲームを再読込した履歴には `started` を保存し、再読込でdrawsが0へ戻る既存経路でも、次の再読込で開始前と誤認しない。
- サーバー版: 実際のBETTING、球0、ready、未精算・未取消を所有者が確認した場合だけ移行する。読み取り専用の状態取得や、進行中・精算済み・取消済みの履歴では移行しない。

実装の再現検査では、旧開始前revision270・JPベース5,000・倍率3・入賞1〜8を使用した。旧経路は合計36でJPC、修正後はJPCにならず現行の通常配当1,000となる。JPベースと倍率はそのまま維持する。旧版で既に進んだゲームや確定した結果は遡って変更しない。

## ダウンロード版の確認

v278公開時の旧ブラウザー検査2件では、8球目の録画時刻へ到達する前に「録画長＋180秒」の検査期限が切れていた。`settlingMs`は全HIT演出の累積値であり、その値だけで7球目が長時間停止したとは判断できない。

再生・配当・ゲーム速度・1球当たり90秒の既存上限は保持する。診断情報へ現在の待機種別・当該球の経過・次HIT時刻を追加した。完了検査は残りの録画時間と各球の既存上限を使う有限の期限にし、別途110秒の無進展で失敗させる。実際のオフライン再開から8球完了・一度だけの精算まで専用CIで確認する。

## 検証と公開

ローカルでは移行の再現、旧ルール互換、正確な突入率、実Arcade、台帳、HTTP/WS精算、倍率表示、loaderの更新、Six Drop精算の回帰を検査した。元のルーレットPNG6枚のSHA-256不変と、透過PNGの実アルファも検査している。

実ブラウザーでの全6倍率・PC/390px・JPC獲得・512px拡大素材、ダウンロードの実録画再開、および公開配信ハッシュの最終結果はCI後に追記する。検査用512px一覧は素材の再利用確認であり、JPC本体の実装を意味しない。

Windows上の稼働サーバーの更新・再起動は未実施。サーバー側の開始前データにも移行を適用するには、最新ソースを反映して再起動する必要がある。`.runtime`・`.tools`・`data`を保持する。

### 再検証

```bash
node tests/sugar-v279-migration.mjs
node tests/sugar-v271-rules.mjs
node tests/sugar-v270-presentation.mjs
node tests/local-debug-v258.mjs
node tests/sugar-v279-browser.mjs
node tests/sugar-challenge-v254-browser.mjs
node tests/download-v255-browser.mjs
node tests/sugar-v279-public.mjs
```
