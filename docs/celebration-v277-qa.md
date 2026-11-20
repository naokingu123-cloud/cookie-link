# v277 — 役成立の画像・ライン・効果音の検査

版 `20261120-v277-illustrated-awards-and-sound` は公開・確認済み。公開コミットは `727b739e1ad0084d6a51b120a832189fc75f2dc4`、最終公開照合は2026-11-20 20:42:33 JST。

## 検査の範囲

全10ゲームの役成立を、実際のエンジンが発行したイベントから確認する。CI専用サーバーで、通常のゲームルールから作った成立直前の盤面を復元し、最後の番号は画面の「番号指定」ボタンで入賞させる。成立イベントを直接呼ぶ公開機能は追加しない。

ブラウザー検査は隔離したローカル版の仮CREDITを使い、`/api/`・`/ws`・外部リクエストを遮断する。この盤面は表示の機能検査用に選んだ例であり、役の成立確率や実測P/Oの標本ではない。

## 通常ルールで成立する確認例

`tests/award-fixtures-v277.mjs` が本番のルールとブラウザー用パッチを読み、次の成立を事前に確かめる。Set/Mapを含む盤面を保存し、ブラウザー側の同じゲームへ戻す。

| ゲーム | 通常の処理で成立させる内容 |
|---|---|
| クッキーリンク | 初回3球の同時HIT後、落下から4個LINKと配当が成立 |
| チョコレートキャニオン | 1・2球目を本物の単球処理で進めた盤面を復元し、3球目のドリル処理で鉱石を回収し配当が成立 |
| シックスドロップ | 支えのHITと重力処理で直線役が成立 |
| ジェラートプリズム | 外周6頂点の最後の1点にHITし24面が完成 |
| ワイナリーピラミッド | 正規のBOOST4球後に注いで15グラスの配当が成立 |
| ポップコーンスプラッシュ | 実際の連鎖と補充を2回進めた盤面から、次の入賞で配当段階を通過 |
| ジェリービンゴ | 仕切り解除5球・色流入3球の最終球で12ラインが完成 |
| ワッフルリバーシ | 本番のPOW拡張を含むルールで、通常の挟み込みによる2枚反転配当 |
| パーティカステラ | 製品内デモと同じ合法な8球列で61個を全焼き |
| ダンゴデビンゴ | 前半5球・6個のFREE確定・後半2球で6個ライン2本の最高役 |

## 単体検査

`tests/award-presentation-v277.mjs` は実装した演出モジュールそのものを読み、次を確認する。

- 全10ゲームのイベントを受け取り、元のイベント関数を1回だけ呼ぶ。戻り値と元の例外を保つ。
- 盤面、配当、エンジン内のカウンター、描画元のイベント情報を変えない。ゲーム用RNGにも、演出用の非決定的な乱数にも触れない。
- 同じ成立の重複、復元、単なる再描画、編集中のFREE配置では再演しない。新しい実入賞と確定したFREE配置では演出を出す。
- 高い役が通常役より優先され、1ゲームの待機件数、表示ライン数、粒の数に上限がある。
- 音は選択中のゲームだけが所有し、ゲーム切替でファンファーレを再演しない。
- 一時停止中は演出時間が進まない。ラウンド変更とタブ非表示で待機・描画を片付ける。
- 「動きを減らす」では動く粒を省き、生成画像による成立表示を残す。精算・ダウンロード計算のworkerでは起動しない。

音の検査は `tests/celebration-audio-v277.mjs` と同名のPythonファイルに分ける。前者は音源の割当、成立音の一元管理、声部数、ミュート、一時停止、復元を確認し、後者は独自生成WAVの長さ、振幅の余裕、フェード、ハッシュを確認する。

## ブラウザー検査

`tests/celebration-v277-browser.mjs` をGitHub Actionsの `Celebration imagery and audio v277` で実行する。

- PC幅1366pxで全10ゲームの成立画像と実ピクセルを保存する。
- ジェリーとダンゴは、演出ラインの端点をネイティブ盤面の成立セル座標と照合する。
- スマートフォン幅390pxのジェリー、非選択ダンゴのミニ盤面、動きを減らすダンゴ、ミュートしたダンゴも確認する。
- 全画像の読み込みと、canvasへの実際のビットマップ描画を確認する。
- 実際の開始操作による音声解錠、成立音の再生、最大8声部、ミュート時の成立音0件、一時停止時の音と待機の停止を確認する。
- ページ例外、素材読込失敗、サーバーAPI・外部通信が0件であることを確認する。

撮影は最後の番号を入力する前にRAF監視を開始する。描画されたフレームのcanvasをその場でPNGに保存するため、クリックの応答を待つ間に短い演出を撮り逃すことがない。本番の演出時間は撮影用に延長しない。

出力先 `qa-celebration-v277/` に、各成立のPNG、全画面PNG、ルール上の成立条件、実イベント、ライン座標、音の状態、例外を含む `report.json` が残る。CIは独立した15シナリオを3分割して並行実行する。Actions artifactの名前は `celebration-v277-display-0`、`-1`、`-2`。各ケースの失敗を保存し、最後に1件でも失敗があればジョブを失敗させる。

## 最終検証結果

全10ゲームのルール上の確認例、演出モジュール単体、音のルーティング、全41音源のPCM・ハッシュ、オフラインの音声Range要求、構文確認が成功した。シックスドロップは実際の `pyramidAward` の加算・端数処理済み金額を使い、BET333の累積直線33/66/100 WIN、三角形100 WIN、六角形199 WINを本番ルールで確認した。直接呼ばれる素材音も各ゲームの割当に揃えた。

この実行環境ではChromiumがページ読込前に `socket() failed: Operation not permitted` で停止したため、実画面と実際の開始操作による音声解錠はGitHub Actionsで検査した。最終候補とマージ後の検査はともに成功している。

| 検証・公開工程 | 結果と証拠 |
|---|---|
| [PR #2](https://github.com/naokingu123-cloud/cookie-link/pull/2) の最終検査 | [run 44728312185](https://github.com/naokingu123-cloud/cookie-link/actions/runs/44728312185) 成功。15ブラウザーケースを3分割で実行 |
| マージ後のv277検査 | [run 44729122651](https://github.com/naokingu123-cloud/cookie-link/actions/runs/44729122651) の全5ジョブ成功 |
| GitHub Pagesのbuild/deploy | [run 44729122125](https://github.com/naokingu123-cloud/cookie-link/actions/runs/44729122125) 成功 |
| 公開内容の照合 | [public-verification.json](qa-v277/public-verification.json)：64/64ファイルがHTTP200、バイト数・SHA-256一致。失敗0件 |

ブラウザーの15ケースは、PC全10ゲームに加えて390pxのジェリー、非選択ダンゴのmini、動きを減らすダンゴ、ミュートしたダンゴ、シックスドロップの一時停止。全画面PNG15枚と成立canvas PNG15枚、計30枚の視認レビューを完了した。JavaScript例外、素材読込失敗、API要求、外部要求はいずれも0件。音声の観測最大声部数は6で、実装上限8を超えていない。ミュート・一時停止・復元抑制も成功した。

集計は [verification-summary.json](qa-v277/verification-summary.json)、ケースごとの実イベント・座標・音声状態は [shard 0](qa-v277/browser-report-0.json)、[shard 1](qa-v277/browser-report-1.json)、[shard 2](qa-v277/browser-report-2.json) に保存している。

初回CIではクッキーの実画像描画を確認した後、キャニオンの確認盤面が旧来の3球まとめ処理を前提にしていた不一致を検出。確認例を現行の単球処理による実際の2球後チェックポイントへ修正した。新規エンジンへの復元後も3球目で本物の成立イベントと確定配当を再現することを確認した。

`tests/celebration-v277-public.mjs` による公開照合は20:42:31〜20:42:33 JSTに完了した。[公開URL](https://naokingu123-cloud.github.io/cookie-link/) から、新PNG5枚、全WAV41種、変更runtime、manifestなど64ファイルを取得し、すべてのバイト数とSHA-256が検証済みローカル内容に一致した。最終 `app-version.json` もv277と一致。結果の原本を [public-verification.json](qa-v277/public-verification.json) として保存している。公開照合は静的GETだけを使用し、公開ゲームのAPI・BET操作は行っていない。

クラウドブラウザーでは [v277更新URL](https://naokingu123-cloud.github.io/cookie-link/?appv=20261120-v277-illustrated-awards-and-sound) の版選択画面を確認した。local debugでは既知の抽選機読込失敗が見られ、Windows/3D抽選の実機確認は未実施。上記15ケースのCIは番号指定による実エンジンの成立演出検査として成功している。

Windowsの物理ホストは今回更新・再起動していない。Pagesの公開完了とWindows側の適用状況は別であり、ホストへ適用する際は既存の `.runtime`・`.tools`・`data` を保持する。

## 保存した画面証拠

各ゲームの成立canvasと主要な全画面PNGを `qa-v277/` に保存した。全30PNGは上記PR検査runの `celebration-v277-display-0`、`-1`、`-2` artifactに含まれる。

| ゲーム・条件 | 保存画像 |
|---|---|
| クッキーリンク | [成立演出](qa-v277/award-cookie-overlay.png) |
| チョコレートキャニオン | [鉱石回収](qa-v277/award-choco-overlay.png) |
| シックスドロップ | [全画面](qa-v277/award-candy.png)、[成立演出](qa-v277/award-candy-overlay.png) |
| ジェラートプリズム | [全埋め](qa-v277/award-gelato-overlay.png) |
| ワイナリーピラミッド | [グラス成立](qa-v277/award-winery-overlay.png) |
| ポップコーンスプラッシュ | [配当獲得](qa-v277/award-popcorn-overlay.png) |
| ジェリービンゴ | [成立ライン](qa-v277/award-jelly-overlay.png)、[390px全画面](qa-v277/award-jelly-mobile.png) |
| ワッフルリバーシ | [反転配当](qa-v277/award-stick-overlay.png) |
| パーティカステラ | [全焼き](qa-v277/award-castella-overlay.png) |
| ダンゴデビンゴ | [全画面](qa-v277/award-dango.png)、[最高役](qa-v277/award-dango-overlay.png) |
| 追加の表示条件 | [mini](qa-v277/award-dango-mini-overlay.png)、[動きを減らす](qa-v277/award-dango-reduced-overlay.png)、[ミュート](qa-v277/award-dango-muted-overlay.png)、[一時停止対象](qa-v277/award-candy-pause-overlay.png) |

## 再検証コマンド

```bash
node tests/award-fixtures-v277.mjs
node tests/award-presentation-v277.mjs
node tests/celebration-audio-v277.mjs
python3 tests/celebration-audio-v277.py
node tests/download-v255-cache.mjs
# ブラウザーの実行はGitHub Actions
node tests/celebration-v277-browser.mjs
```
