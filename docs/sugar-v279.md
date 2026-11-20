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

再生・配当・ゲーム速度・1球当たり90秒の既存上限は保持する。診断情報へ現在の待機種別・当該球の経過・次HIT時刻を追加した。完了検査は残りの録画時間と各球の既存上限を使う有限の期限にし、別途110秒の無進展で失敗させる。

初回候補 `52f6b6d` の [Download検査](https://github.com/naokingu123-cloud/cookie-link/actions/runs/44746679806/job/136323684824) は実際のオフライン再開から8球完了・再接続・一度だけの精算まで成功した。全10ゲームがprocessed 8・paid true、CREDITは準備時から完了・再読込まで999,264（revision 2）のまま、roundsは1。重複completeでもwallet・statsは一致した。録画122.37秒に対して実再生の計測は400.53秒、うちネイティブ演出の累計は290.31秒で、旧「録画長＋180秒」の検査予算が不足する事例を実完走で確認できた。各球の90秒上限は超えていない。

別の候補 `582df7c` では、球間の状態を観測した後、別のブラウザー呼出しでpauseする間に次HITへ進んでいた。実際のpauseはcursor 2・stableBall 1・settling trueで、切断後の通常演出が9.90秒進んだ時点で「録画時刻が10秒以内に進む」という検査に達した。ゲームはplaying true・errorなしで、複数エンジンの処理数も増えていた。この検査競合を、条件の観測とpauseを同一ブラウザータスクで行う修正により解消した。初回pauseではcursorとstableBallの一致、settling false、次HITまで1秒以上を明示確認する。切断中の200ms進行観測とpauseも同一タスクにした。10秒の検査期限自体は変更していない。

初回候補から最終候補 `3174c71` までに変えたのはブラウザー検査2ファイルのみで、配信するゲーム本体・画像・ルールは同一。もう1件のリール検査は、サーバー時計の差を含めて実際の停止フレームを待つようにした。最終候補とmainの検査結果は下記を参照。

## 検証と公開

ローカルでは移行の再現、旧ルール互換、正確な突入率、実Arcade、台帳、HTTP/WS精算、倍率表示、loaderの更新、Six Drop精算の回帰を検査した。元のルーレットPNG6枚のSHA-256不変と、透過PNGの実アルファも検査している。

[PR #4](https://github.com/naokingu123-cloud/cookie-link/pull/4) をmain `004372c6a0b810d06adefb69ba21409d17e77659` へマージした。最終候補 `3174c71` とmergeのtreeは `197c2b2e97b05ee32259951b9ab92ddd35f95dcd` で一致する。

- [main専用CI 44749112751](https://github.com/naokingu123-cloud/cookie-link/actions/runs/44749112751) はルール・ブラウザー2種・Download・公開照合の全5jobが成功。全6倍率、PC/390px、JPC獲得、512pxの拡大素材を検査し、例外・素材失敗は0。旧254/268/270の途中状態を維持し、表示前後のcredit/bets/draws/totalWin/phaseも一致した。
- 最終Downloadは球間でcursor=stableBall=2、settling=falseを確認。一時切断から自動ACKへ回復し、オフライン再読込から8球・全10ゲームの処理と精算が完了した。同じsessionの再接続・重複complete・再読込でもCREDIT999,513、wallet revision2、rounds1を維持した。
- [Pages 44749111680](https://github.com/naokingu123-cloud/cookie-link/actions/runs/44749111680) は成功。2026-11-20 **23:13:50 JST**の公開照合で28/28ファイルのHTTP200・bytes・SHA-256が一致。旧ルーレットPNG6枚、透過PNG6枚、provenance、runtime/cacheと公開serverソースを含む。
- 関連するv277演出・音声CIとv278シックスドロップCIも成功し、公開ファイル照合はそれぞれ64/64・24/24が一致。全ての歴史的workflowの成功を意味しない。
- PR317の補足Downloadは日本語フォント取得が360秒で期限切れとなり、実テストは未実行だった。再実行は行わず、同じtreeのmainで準備と本テストの成功を確認した。リール時計とpauseの検査競合も履歴に保持する。

[検証集計](qa-v279/verification-summary.json)、[公開照合原本](qa-v279/public-verification.json)、[CI原本との対応と途中履歴](qa-v279/artifact-evidence-manifest.json)、[全6種の512px確認](qa-v279/jpc-artwork-enlarged-512.png)、[390pxチャレンジ](qa-v279/challenge-10-mobile.png)、[390px JPC獲得](qa-v279/jpc-10-mobile.png)。512px一覧は素材の再利用確認であり、JPC本体のゲーム実装を意味しない。

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
